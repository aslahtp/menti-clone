import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router";
import axios from "axios";

function JoinQuiz() {
    const { quizId } = useParams();
    const [status, setStatus] = useState("Connecting...");
    const [question, setQuestion] = useState(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [response, setResponse] = useState("");
    const [responses, setResponses] = useState([]);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [errorCount, setErrorCount] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [isQuizCompleted, setIsQuizCompleted] = useState(false);
    const [finalScore, setFinalScore] = useState(null);

    // Use ref to track WebSocket to avoid stale closures
    const wsRef = useRef(null);
    const mountedRef = useRef(true);
    const responsesRef = useRef([]);

    // Update ref when responses change
    useEffect(() => {
        responsesRef.current = responses;
    }, [responses]);

    function loadQuiz() {
        // Prevent multiple connections
        if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
            console.log("WebSocket connection already in progress");
            return;
        }

        console.log("Attempting to connect to WebSocket...");

        try {
            const websocket = new WebSocket(`ws://localhost:3000/user/${quizId}`);
            wsRef.current = websocket;

            websocket.onopen = () => {
                if (!mountedRef.current) return;

                console.log("WebSocket connected successfully");
                setStatus("Connected");
                setErrorCount(0); // Reset error count on successful connection

                const token = localStorage.getItem("token");
                if (!token) {
                    console.log("ERROR: No token found in localStorage");
                    setStatus("Error: No authentication token");
                    return;
                }

                console.log("Sending join message...");
                try {
                    websocket.send(JSON.stringify({
                        type: "join",
                        quizId: quizId,
                        token: token
                    }));
                } catch (error) {
                    console.error("Error sending join message:", error);
                    setStatus("Error sending join message");
                }
            };

            websocket.onmessage = (event) => {
                if (!mountedRef.current) return;

                try {
                    const data = JSON.parse(event.data);
                    console.log(`Received: ${JSON.stringify(data)}`);

                    switch (data.type) {
                        case "joined":
                            setStatus("Joined quiz - Question ready");
                            setQuestion(data.question);
                            setIsSubmitted(false);
                            setResponses([]);
                            if (data.questionIndex !== undefined) setQuestionIndex(data.questionIndex);
                            if (data.totalQuestions !== undefined) setTotalQuestions(data.totalQuestions);
                            break;

                        case "waiting":
                            setStatus("Waiting for admin to start quiz...");
                            setQuestion(null);
                            setIsSubmitted(false);
                            setResponses([]);
                            break;

                        case "quiz_started":
                            setStatus("Quiz started! Answer the questions");
                            setQuestion(data.question);
                            setIsSubmitted(false);
                            if (data.questionIndex !== undefined) setQuestionIndex(data.questionIndex);
                            if (data.totalQuestions !== undefined) setTotalQuestions(data.totalQuestions);
                            break;

                        case "question_update":
                            setStatus("New question received");
                            setQuestion(data.question);
                            setIsSubmitted(false);
                            if (data.questionIndex !== undefined) setQuestionIndex(data.questionIndex);
                            break;

                        case "quiz_completed":
                            setStatus("Quiz completed! Submitting answers...");
                            setQuestion(null);
                            setIsSubmitted(false);
                            handleQuizSubmit();
                            break;

                        case "quiz_ended":
                            setStatus("Quiz ended by admin");
                            setQuestion(null);
                            break;

                        case "admin_disconnected":
                            setStatus("Quiz admin disconnected");
                            setQuestion(null);
                            break;

                        case "answer_submitted":
                            console.log("Answer submission confirmed:", data.message);
                            break;

                        case "error":
                            console.error("WebSocket error:", data.message);
                            setStatus(`Error: ${data.message}`);
                            break;

                        case "leaderboard":
                            setLeaderboard(data.leaderboard || []);
                            setIsLeaderboardOpen(true);
                            break;

                        default:
                            console.warn("Unknown message type:", data.type);
                    }
                } catch (error) {
                    console.error("Error parsing WebSocket message:", error);
                    setStatus("Error parsing server message");
                }
            };

            websocket.onerror = (error) => {
                console.error(`WebSocket error:`, error);
                setStatus("Connection error");
                setErrorCount(prev => prev + 1);
            };

            websocket.onclose = (event) => {
                console.log("WebSocket connection closed", event.code, event.reason);

                if (!mountedRef.current) return;

                if (event.code === 1000) {
                    setStatus("Disconnected normally");
                } else {
                    setStatus(`Disconnected (${event.code}): ${event.reason || 'Unknown reason'}`);

                    // Auto-reconnect on unexpected disconnection (with exponential backoff)
                    if (errorCount < 3 && event.code !== 1000) {
                        const delay = Math.min(1000 * Math.pow(2, errorCount), 10000);
                        console.log(`Attempting to reconnect in ${delay}ms...`);
                        setTimeout(() => {
                            if (mountedRef.current) {
                                loadQuiz();
                            }
                        }, delay);
                    }
                }
            };

        } catch (error) {
            console.error("Error creating WebSocket connection:", error);
            setStatus("Failed to create connection");
        }
    }

    useEffect(() => {
        mountedRef.current = true;
        loadQuiz();

        return () => {
            mountedRef.current = false;
            if (wsRef.current) {
                console.log("Cleaning up WebSocket connection");
                wsRef.current.close(1000, "Component unmounted");
                wsRef.current = null;
            }
        };
    }, [quizId]); // Add quizId as dependency

    function handleQuestionSubmit(questionId) {
        if (!response.trim()) {
            alert("Please select an answer before submitting");
            return;
        }

        if (isSubmitted) {
            console.log("Question already submitted");
            return;
        }

        setIsSubmitted(true);

        // Store response immediately
        const newResponse = { "questionId": `${questionId}`, "selectedOption": `${response}` };
        const updatedResponses = [...responses, newResponse];
        setResponses(updatedResponses);

        // Update ref for immediate access
        responsesRef.current = updatedResponses;

        // Send individual answer to backend (backend expects "submit_answer" type)
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
                wsRef.current.send(JSON.stringify({
                    type: "submit_answer",
                    questionId: questionId,
                    answer: response,
                    token: localStorage.getItem("token")
                }));
                console.log("Individual answer submitted:", { questionId, answer: response });
            } catch (error) {
                console.error("Error submitting individual answer:", error);
            }
        }

        setResponse(""); // Reset for next question
    }

    async function handleQuizSubmit() {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.error("WebSocket not connected for final submission");
            return;
        }

        // Use ref to get the most current responses
        const finalResponses = responsesRef.current;
        console.log(finalResponses);

        try {
            const response = await axios.post(`http://localhost:3000/quiz/${quizId}/submit`, {
                answers: finalResponses,
            }, {
                headers: {
                    "Authorization": localStorage.getItem("token")
                }
            });
            console.log("Final quiz submission:", response);

            const scoreInfo = `Score: ${response.data.score}/${response.data.total}`;
            setStatus(response.data.message + " " + scoreInfo);
            setFinalScore({ score: response.data.score, total: response.data.total });
            setIsQuizCompleted(true);

            // Automatically fetch leaderboard after a short delay to ensure data is saved
            setTimeout(() => {
                handleGetLeaderboardWS();
            }, 1000);

        } catch (error) {
            console.error("Error submitting final quiz:", error);
            setStatus("Error submitting quiz");
        }
    }

    function handleReconnect() {
        setStatus("Reconnecting...");
        setErrorCount(0);
        loadQuiz();
    }

    // Add a function to request leaderboard via WebSocket
    function handleGetLeaderboardWS() {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: "get_leaderboard",
                quizId,
                token: localStorage.getItem("token")
            }));
        }
    }

    // If quiz is completed, show only the leaderboard
    if (isQuizCompleted && isLeaderboardOpen) {
        return (
            <div style={{ padding: "20px", fontFamily: "Arial", textAlign: "center" }}>
                <h1>🎉 Quiz Completed!</h1>
                <h2>Final Results for Quiz {quizId}</h2>

                {finalScore && (
                    <div style={{
                        backgroundColor: "#e8f5e8",
                        padding: "20px",
                        borderRadius: "8px",
                        marginBottom: "30px",
                        border: "2px solid #4caf50"
                    }}>
                        <h3>Your Score: {finalScore.score}/{finalScore.total}</h3>
                        <p>Percentage: {Math.round((finalScore.score / finalScore.total) * 100)}%</p>
                    </div>
                )}

                <div style={{
                    backgroundColor: "#f5f5f5",
                    padding: "20px",
                    borderRadius: "8px",
                    maxWidth: "600px",
                    margin: "0 auto"
                }}>
                    <h3>🏆 Final Leaderboard</h3>
                    {leaderboard.length > 0 ? (
                        <div style={{ textAlign: "left" }}>
                            {leaderboard.map((leader, index) => (
                                <div
                                    key={index}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        padding: "10px",
                                        backgroundColor: index === 0 ? "#ffd700" : index === 1 ? "#c0c0c0" : index === 2 ? "#cd7f32" : "white",
                                        margin: "5px 0",
                                        borderRadius: "4px",
                                        border: "1px solid #ddd"
                                    }}
                                >
                                    <span>
                                        <strong>#{index + 1}</strong> {leader.name}
                                    </span>
                                    <span><strong>{leader.score}/{leader.totalQuestions}</strong></span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>Loading leaderboard...</p>
                    )}
                </div>

                <button
                    onClick={() => window.location.href = '/'}
                    style={{
                        marginTop: "30px",
                        padding: "12px 24px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "16px",
                        cursor: "pointer"
                    }}
                >
                    Back to Home
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: "20px", fontFamily: "Arial" }}>
            <h1>Join Quiz {quizId}</h1>

            <div style={{ marginBottom: "20px" }}>
                <strong>Status:</strong> {status}
                {status.includes("Error") && (
                    <button
                        onClick={handleReconnect}
                        style={{ marginLeft: "10px", padding: "5px 10px" }}
                    >
                        Retry Connection
                    </button>
                )}
            </div>

            {totalQuestions > 0 && (
                <div style={{ marginBottom: "20px" }}>
                    <strong>Progress:</strong> Question {questionIndex + 1} of {totalQuestions}
                </div>
            )}

            {question && (
                <div style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "20px" }}>
                    <h3>Current Question:</h3>
                    <p><strong>{question.title}</strong></p>

                    {question.options && question.options.length > 0 && (
                        <div>
                            <p>Options:</p>
                            <ul style={{ listStyleType: "none", padding: 0 }}>
                                {question.options.map((option, index) => (
                                    <li key={index} style={{ marginBottom: "10px" }}>
                                        <label style={{ display: "flex", alignItems: "center" }}>
                                            <input
                                                type="radio"
                                                name="option"
                                                value={option.title}
                                                checked={response === option.title}
                                                onChange={(e) => setResponse(e.target.value)}
                                                disabled={isSubmitted}
                                                style={{ marginRight: "8px" }}
                                            />
                                            {option.title}
                                        </label>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleQuestionSubmit(question.id)}
                                disabled={isSubmitted || !response.trim()}
                                style={{
                                    padding: "10px 15px",
                                    backgroundColor: isSubmitted ? "#ccc" : "#007bff",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: isSubmitted || !response.trim() ? "not-allowed" : "pointer"
                                }}
                            >
                                {isSubmitted ? "Submitted ✓" : "Submit Answer"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {responses.length > 0 && (
                <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f5f5f5" }}>
                    <h4>Your Responses:</h4>
                    <ul>
                        {responses.map((resp, index) => (
                            <li key={index}>
                                Question {resp.questionId}: {resp.selectedOption}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isLeaderboardOpen && leaderboard.length > 0 && (
                <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f5f5f5" }}>
                    <h4>Leaderboard :</h4>
                    <ul style={{ listStyleType: "-moz-initial", padding: "15px" }}>
                        {leaderboard.map((leader, index) => (
                            <li key={index}>{leader.name}: {leader.score}/{leader.totalQuestions}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default JoinQuiz;