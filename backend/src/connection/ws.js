/* eslint-disable no-undef */
const { WebSocketServer } = require("ws");
const { PrismaClient } = require("@prisma/client");
const { verifyWSToken } = require("../middlewares/jwt");

const prisma = new PrismaClient();

class QuizSession {
    constructor(quiz, adminWs, adminUserId) {
        this.id = quiz.id;
        this.title = quiz.title;
        this.questions = quiz.questions;
        this.currentQuestionIndex = 0;
        this.adminWs = adminWs;
        this.adminUserId = adminUserId;
        this.participants = new Set();
        this.startTime = Date.now();
        this.isActive = adminWs !== null;
    }

    getCurrentQuestion() {
        return this.questions[this.currentQuestionIndex] || null;
    }

    moveToNextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            return this.getCurrentQuestion();
        }
        return null;
    }

    hasMoreQuestions() {
        return this.currentQuestionIndex < this.questions.length - 1;
    }

    addParticipant(ws) {
        this.participants.add(ws);
    }

    removeParticipant(ws) {
        this.participants.delete(ws);
    }

    broadcastToParticipants(message) {
        this.participants.forEach(participantWs => {
            if (participantWs.readyState === 1) {
                participantWs.send(JSON.stringify(message));
            }
        });
    }

    cleanup() {
        this.isActive = false;
        this.participants.clear();
    }
}

const activeSessions = new Map(); // quizId -> QuizSession
const connectionRegistry = new Map(); // ws -> {userId, role, sessionId}

const authCache = new Map();
const AUTH_CACHE_TTL = 5 * 60 * 1000;

function authenticateConnection(ws, token) {
    console.log(`[AUTH] Authenticating token: ${token?.substring(0, 20)}...`);

    // Check cache first for performance
    const cached = authCache.get(token);
    if (cached && Date.now() - cached.timestamp < AUTH_CACHE_TTL) {
        console.log(`[AUTH] Using cached token for user ${cached.decoded.id}`);
        return cached.decoded;
    }

    const tokenVerification = verifyWSToken(token);
    console.log(`[AUTH] Token verification result:`, {
        success: tokenVerification.success,
        error: tokenVerification.error
    });

    if (!tokenVerification.success) {
        console.log(`[AUTH ERROR] Token verification failed: ${tokenVerification.error}`);
        ws.send(JSON.stringify({
            type: "error",
            message: tokenVerification.error
        }));
        return null;
    }

    console.log(`[AUTH SUCCESS] Token verified for user:`, tokenVerification.decoded);

    // Cache the result
    authCache.set(token, {
        decoded: tokenVerification.decoded,
        timestamp: Date.now()
    });

    return tokenVerification.decoded;
}

// Clean up expired auth cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [token, cache] of authCache.entries()) {
        if (now - cache.timestamp > AUTH_CACHE_TTL) {
            authCache.delete(token);
        }
    }
}, AUTH_CACHE_TTL);

// Optimized message handlers
const messageHandlers = {
    async join(ws, data, decoded) {
        console.log(`[USER JOIN] User ${decoded.id} joining quiz ${data.quizId}`);

        const quizId = parseInt(data.quizId);
        let session = activeSessions.get(quizId);

        // If session doesn't exist, create a waiting session
        if (!session) {
            console.log(`[USER JOIN] Creating waiting session for quiz ${quizId}`);

            // Verify quiz exists in database
            try {
                const quiz = await prisma.quiz.findUnique({
                    where: { id: quizId },
                    include: {
                        questions: {
                            include: { options: true },
                            orderBy: { id: 'asc' }
                        }
                    }
                });

                if (!quiz) {
                    return this.sendError(ws, "Quiz not found");
                }

                // Create waiting session (no admin yet)
                session = new QuizSession(quiz, null, null);
                session.currentQuestionIndex = -1; // Indicates not started
                activeSessions.set(quizId, session);

            } catch (error) {
                console.error(`[USER JOIN ERROR] Database error:`, error);
                return this.sendError(ws, "Database error occurred");
            }
        }

        // Add user to session
        session.addParticipant(ws);
        connectionRegistry.set(ws, {
            userId: decoded.id,
            role: decoded.role,
            sessionId: quizId
        });

        // Send current question to user or waiting message
        const currentQuestion = session.getCurrentQuestion();
        if (currentQuestion && session.currentQuestionIndex >= 0) {
            ws.send(JSON.stringify({
                type: "joined",
                question: currentQuestion,
                questionIndex: session.currentQuestionIndex,
                totalQuestions: session.questions.length
            }));
            console.log(`[USER JOIN SUCCESS] User ${decoded.id} joined active quiz ${quizId}`);
        } else {
            ws.send(JSON.stringify({
                type: "waiting",
                message: "Waiting for admin to start the quiz"
            }));
            console.log(`[USER JOIN WAITING] User ${decoded.id} waiting for quiz ${quizId} to start`);
        }

        // Notify admin
        if (session.adminWs && session.adminWs.readyState === 1) {
            session.adminWs.send(JSON.stringify({
                type: "user_joined",
                userId: decoded.id,
                participantCount: session.participants.size
            }));
        }
    },

    async start(ws, data, decoded) {
        console.log(`[QUIZ START] User ${decoded.id} starting quiz ${data.quizId}`);
        console.log(`[QUIZ START] User role: "${decoded.role}" (type: ${typeof decoded.role})`);
        console.log(`[QUIZ START] Full decoded token:`, decoded);

        // Role validation - be more flexible with role checking
        const userRole = decoded.role?.toLowerCase?.() || decoded.role;
        if (userRole !== "admin") {
            console.log(`[QUIZ START ERROR] Role validation failed. Expected: "admin", Got: "${decoded.role}"`);
            return this.sendError(ws, `Admin access required to start quiz. Your role: "${decoded.role}"`);
        }

        const quizId = parseInt(data.quizId);

        // Check if quiz is already started (not just waiting)
        const existingSession = activeSessions.get(quizId);
        if (existingSession && existingSession.adminWs && existingSession.currentQuestionIndex >= 0) {
            return this.sendError(ws, "Quiz is already started by another admin");
        }

        try {
            const quiz = await prisma.quiz.findUnique({
                where: {
                    id: quizId,
                    adminId: decoded.id
                },
                include: {
                    questions: {
                        include: {
                            options: true
                        },
                        orderBy: {
                            id: 'asc'
                        }
                    }
                }
            });

            if (!quiz) {
                return this.sendError(ws, "Quiz not found or unauthorized");
            }

            if (!quiz.questions || quiz.questions.length === 0) {
                return this.sendError(ws, "Quiz has no questions");
            }

            // Create or take over session
            let session = existingSession;
            if (session) {
                // Take over existing waiting session
                console.log(`[QUIZ START] Taking over existing session with ${session.participants.size} waiting participants`);
                session.adminWs = ws;
                session.adminUserId = decoded.id;
                session.currentQuestionIndex = 0;
                session.isActive = true;
            } else {
                // Create new session
                console.log(`[QUIZ START] Creating new session`);
                session = new QuizSession(quiz, ws, decoded.id);
                activeSessions.set(quizId, session);
            }

            // Register connection
            connectionRegistry.set(ws, {
                userId: decoded.id,
                role: decoded.role,
                sessionId: quizId
            });

            const firstQuestion = session.getCurrentQuestion();

            // Send response in exact frontend format
            const response = {
                type: "start",
                liveQuiz: {
                    title: firstQuestion.title,
                    options: firstQuestion.options
                }
            };

            console.log(`[QUIZ START SUCCESS] Quiz ${quizId} started with ${quiz.questions.length} questions`);
            ws.send(JSON.stringify(response));

            // Broadcast quiz start to all waiting participants
            const participantResponse = {
                type: "quiz_started",
                question: firstQuestion,
                questionIndex: 0,
                totalQuestions: quiz.questions.length,
                message: "Quiz has started!"
            };

            session.broadcastToParticipants(participantResponse);
            console.log(`[BROADCAST] Quiz start broadcasted to ${session.participants.size} participants`);

        } catch (error) {
            console.error(`[QUIZ START ERROR] Database error for quiz ${quizId}:`, error);
            return this.sendError(ws, "Database error occurred");
        }
    },

    async next(ws, data, decoded) {
        console.log(`[NEXT QUESTION] User ${decoded.id} requesting next question`);

        const connection = connectionRegistry.get(ws);
        if (!connection || !connection.sessionId) {
            return this.sendError(ws, "No active quiz session");
        }

        const session = activeSessions.get(connection.sessionId);
        if (!session || !session.isActive) {
            return this.sendError(ws, "Quiz session not found or inactive");
        }

        // Verify admin permission
        if (session.adminWs !== ws) {
            return this.sendError(ws, "Only quiz admin can control questions");
        }

        const nextQuestion = session.moveToNextQuestion();

        if (nextQuestion) {
            const response = {
                type: "next",
                liveQuiz: {
                    title: nextQuestion.title,
                    options: nextQuestion.options
                }
            };

            console.log(`[NEXT QUESTION SUCCESS] Moving to question ${session.currentQuestionIndex + 1}`);
            ws.send(JSON.stringify(response));

            // Broadcast to participants if any
            session.broadcastToParticipants({
                type: "question_update",
                question: nextQuestion,
                questionIndex: session.currentQuestionIndex
            });

        } else {
            // Quiz completed
            console.log(`[QUIZ COMPLETE] Quiz ${session.id} completed`);

            const response = {
                type: "end",
                message: "Quiz completed"
            };

            ws.send(JSON.stringify(response));

            // Notify participants
            session.broadcastToParticipants({
                type: "quiz_completed",
                message: "Quiz has ended"
            });

            // Cleanup
            this.cleanupSession(connection.sessionId);
        }
    },

    async end(ws, data, decoded) {
        console.log(`[QUIZ END] User ${decoded.id} ending quiz`);

        const connection = connectionRegistry.get(ws);
        if (!connection || !connection.sessionId) {
            return this.sendError(ws, "No active quiz session");
        }

        const session = activeSessions.get(connection.sessionId);
        if (!session) {
            return this.sendError(ws, "Quiz session not found");
        }

        // Verify admin permission
        if (session.adminWs !== ws) {
            return this.sendError(ws, "Only quiz admin can end quiz");
        }

        const response = {
            type: "end",
            message: "Quiz ended by admin"
        };

        ws.send(JSON.stringify(response));

        // Notify participants
        session.broadcastToParticipants({
            type: "quiz_ended",
            message: "Quiz ended by admin"
        });

        console.log(`[QUIZ END SUCCESS] Quiz ${session.id} ended by admin`);

        // Cleanup
        this.cleanupSession(connection.sessionId);
    },

    async submit_answer(ws, data, decoded) {
        console.log(`[SUBMIT ANSWER] User ${decoded.id} submitting answer`);

        const connection = connectionRegistry.get(ws);
        if (!connection || !connection.sessionId) {
            return this.sendError(ws, "Not joined to any quiz");
        }

        const session = activeSessions.get(connection.sessionId);
        if (!session || !session.isActive) {
            return this.sendError(ws, "Quiz not active");
        }

        // Confirm answer submission to user
        ws.send(JSON.stringify({
            type: "answer_submitted",
            message: "Answer recorded successfully",
            questionIndex: session.currentQuestionIndex

        }));

        // Notify admin
        if (session.adminWs && session.adminWs.readyState === 1) {
            session.adminWs.send(JSON.stringify({
                type: "answer_received",
                userId: decoded.id,
                userName: decoded.name || "Anonymous",
                answer: data.answer,
                questionIndex: session.currentQuestionIndex
            }));
        }


        console.log(`[SUBMIT ANSWER SUCCESS] Answer from user ${decoded.id} recorded`);
    },

    async leave(ws, data, decoded) {
        console.log(`[LEAVE QUIZ] User ${decoded.id} leaving quiz`);

        const connection = connectionRegistry.get(ws);
        if (!connection || !connection.sessionId) {
            return this.sendError(ws, "Not joined to any quiz");
        }

        const session = activeSessions.get(connection.sessionId);
        if (session) {
            session.removeParticipant(ws);

            // Notify admin
            if (session.adminWs && session.adminWs.readyState === 1) {
                session.adminWs.send(JSON.stringify({
                    type: "user_left",
                    userId: decoded.id,
                    userName: decoded.name || "Anonymous",
                    participantCount: session.participants.size
                }));
            }
        }

        connectionRegistry.delete(ws);
        ws.send(JSON.stringify({
            type: "left_quiz",
            message: "Successfully left the quiz"
        }));

        console.log(`[LEAVE QUIZ SUCCESS] User ${decoded.id} left quiz`);
    },

    async get_leaderboard(ws) {
        const connection = connectionRegistry.get(ws);
        if (!connection || !connection.sessionId) {
            return this.sendError(ws, "Not joined to any quiz");
        }
        try {
            console.log(`[LEADERBOARD] Fetching leaderboard for quiz ${connection.sessionId}`);

            // Fetch leaderboard from correct table
            const results = await prisma.leaderboard.findMany({
                where: { quizId: connection.sessionId },
                orderBy: { score: 'desc' },
                include: { user: true }
            });

            console.log(`[LEADERBOARD] Found ${results.length} results for quiz ${connection.sessionId}`);

            const leaderboardData = results.map(r => ({
                name: r.name || r.user?.name || "Anonymous",
                score: r.score,
                totalQuestions: r.totalQuestions
            }));

            ws.send(JSON.stringify({
                type: "leaderboard",
                leaderboard: leaderboardData
            }));

            console.log(`[LEADERBOARD SUCCESS] Sent leaderboard with ${leaderboardData.length} entries`);

        } catch (error) {
            console.error("[LEADERBOARD ERROR]", error);
            this.sendError(ws, "Failed to fetch leaderboard");
        }
    },

    // Utility methods
    sendError(ws, message) {
        console.log(`[ERROR] ${message}`);
        ws.send(JSON.stringify({
            type: "error",
            message: message
        }));
    },

    cleanupSession(sessionId) {
        const session = activeSessions.get(sessionId);
        if (session) {
            session.cleanup();
            activeSessions.delete(sessionId);
            console.log(`[CLEANUP] Session ${sessionId} cleaned up`);
        }
    }
};

// Optimized connection handler
function handleConnection(ws, req) {
    const url = req.url || '/';
    console.log(`[CONNECTION] New WebSocket connection to: ${url}`);

    // Log connection type from URL
    if (url.includes('/user/')) {
        console.log(`[CONNECTION] User connection detected`);
    } else if (url.includes('/admin/')) {
        console.log(`[CONNECTION] Admin connection detected`);
    } else if (url.includes('/quiz/')) {
        console.log(`[CONNECTION] Legacy admin connection detected`);
    }

    // Performance optimization: pre-bind context
    const boundHandlers = {};
    for (const [key, handler] of Object.entries(messageHandlers)) {
        if (typeof handler === 'function') {
            boundHandlers[key] = handler.bind(messageHandlers);
        }
    }

    ws.on("message", async (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`[MESSAGE] Received:`, { type: data.type, quizId: data.quizId });

            // Fast authentication
            const decoded = authenticateConnection(ws, data.token);
            if (!decoded) return;

            // Route to optimized handler
            const handler = boundHandlers[data.type];
            if (handler) {
                await handler(ws, data, decoded);
            } else {
                console.log(`[WARNING] Unknown message type: ${data.type}`);
                messageHandlers.sendError(ws, `Unknown message type: ${data.type}`);
            }

        } catch (error) {
            console.error(`[MESSAGE ERROR] Parse/Handle error:`, error);
            messageHandlers.sendError(ws, "Invalid message format");
        }
    });

    ws.on("close", () => {
        console.log(`[DISCONNECT] WebSocket connection closed`);

        const connection = connectionRegistry.get(ws);
        if (connection) {
            // Cleanup session if this was an admin
            const session = activeSessions.get(connection.sessionId);
            if (session && session.adminWs === ws) {
                console.log(`[ADMIN DISCONNECT] Admin disconnected, cleaning up session ${connection.sessionId}`);

                // Notify participants
                session.broadcastToParticipants({
                    type: "admin_disconnected",
                    message: "Quiz admin disconnected"
                });

                messageHandlers.cleanupSession(connection.sessionId);
            } else if (session) {
                // Remove participant
                session.removeParticipant(ws);
            }

            connectionRegistry.delete(ws);
        }
    });

    ws.on("error", (error) => {
        console.error(`[WS ERROR] WebSocket error:`, error);
    });
}

// Initialize optimized WebSocket server
function initializeWebSocket(server) {
    const wss = new WebSocketServer({
        server,
        perMessageDeflate: true, // Enable compression for performance
        maxPayload: 1024 * 1024, // 1MB limit
    });

    wss.on("connection", handleConnection);

    // Cleanup inactive sessions periodically
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        const INACTIVE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

        for (const [sessionId, session] of activeSessions.entries()) {
            if (now - session.startTime > INACTIVE_THRESHOLD && !session.isActive) {
                console.log(`[PERIODIC CLEANUP] Removing inactive session ${sessionId}`);
                messageHandlers.cleanupSession(sessionId);
            }
        }
    }, 10 * 60 * 1000); // Run every 10 minutes

    // Cleanup on server shutdown
    process.on('SIGTERM', () => {
        clearInterval(cleanupInterval);
        activeSessions.clear();
        connectionRegistry.clear();
        authCache.clear();
    });

    console.log(`[WEBSOCKET INIT] WebSocket server initialized with optimizations`);
    return wss;
}

module.exports = { initializeWebSocket };
