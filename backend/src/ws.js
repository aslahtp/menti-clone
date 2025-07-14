/* eslint-disable no-undef */
const { WebSocketServer } = require("ws");
const { PrismaClient } = require("@prisma/client");
const { verifyWSToken } = require("./middlewares/jwt");

const prisma = new PrismaClient();

// Store quiz state per connection instead of globally
const clientQuizzes = new Map();

// Helper function to verify JWT token for WebSocket messages
function authenticateWSMessage(ws, token) {
    const tokenVerification = verifyWSToken(token);
    if (!tokenVerification.success) {
        ws.send(JSON.stringify({
            type: "error",
            message: tokenVerification.error
        }));
        return null;
    }
    return tokenVerification.decoded;
}

// Initialize WebSocket server
function initializeWebSocket(server) {
    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws) => {
        console.log("Client connected");

        ws.on("message", async (message) => {
            try {
                const data = JSON.parse(message);

                if (data.type === "next") {
                    const decoded = authenticateWSMessage(ws, data.token);
                    if (!decoded) return; // Authentication failed, error already sent

                    const clientQuiz = clientQuizzes.get(ws);

                    if (clientQuiz.questions.length > 0) {
                        // Remove the current question
                        clientQuiz.questions.shift();
                    }

                    // Check if there are more questions
                    if (clientQuiz.questions.length > 0 && clientQuiz.questions[0]) {
                        ws.send(JSON.stringify({
                            type: "next",
                            liveQuiz: clientQuiz.questions[0]
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            type: "end",
                            message: "Quiz completed"
                        }));
                        clientQuizzes.delete(ws);
                        ws.close();
                    }
                }

                if (data.type === "end") {
                    const decoded = authenticateWSMessage(ws, data.token);
                    if (!decoded) return; // Authentication failed, error already sent

                    clientQuizzes.delete(ws);
                    ws.close();
                }

                if (data.type === "start") {
                    const quizId = data.quizId;
                    const decoded = authenticateWSMessage(ws, data.token);
                    if (!decoded) return; // Authentication failed, error already sent

                    const quiz = await prisma.quiz.findUnique({
                        where: {
                            id: parseInt(quizId),
                            adminId: decoded.id
                        },
                        include: {
                            questions: {
                                include: {
                                    options: true
                                }
                            }
                        }
                    });

                    if (!quiz) {
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Quiz not found"
                        }));
                        return;
                    }

                    // Store quiz questions for this specific client
                    clientQuizzes.set(ws, { questions: [...quiz.questions] });

                    if (quiz.questions.length > 0) {
                        ws.send(JSON.stringify({
                            type: "start",
                            liveQuiz: quiz.questions[0]
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            type: "error",
                            message: "Quiz has no questions"
                        }));
                    }
                }
            } catch (error) {
                console.error("WebSocket message error:", error);
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Invalid message format"
                }));
            }
        });

        ws.on("close", () => {
            console.log("Client disconnected");
            // Clean up quiz state for this client
            clientQuizzes.delete(ws);
        });
    });

    return wss;
}

module.exports = { initializeWebSocket };
