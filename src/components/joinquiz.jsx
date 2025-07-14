import { useState, useEffect } from "react";
import { useParams } from "react-router";

function JoinQuiz() {
    const { quizId } = useParams();
    const [status, setStatus] = useState("Connecting...");
    const [question, setQuestion] = useState(null);
    const [ws, setWs] = useState(null);



    function loadQuiz() {
        console.log("Attempting to connect to WebSocket...");

        const websocket = new WebSocket(`ws://localhost:3000/user/${quizId}`);
        setWs(websocket);

        websocket.onopen = () => {
            console.log("WebSocket connected successfully");
            setStatus("Connected");

            const token = localStorage.getItem("token");
            if (!token) {
                console.log("ERROR: No token found in localStorage");
                setStatus("Error: No authentication token");
                return;
            }

            console.log("Sending join message...");
            websocket.send(JSON.stringify({
                type: "join",
                quizId: quizId,
                token: token
            }));
        };

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log(`Received: ${JSON.stringify(data)}`);

            if (data.type === "joined") {
                setStatus("Joined quiz - Question ready");
                setQuestion(data.question);
            } else if (data.type === "waiting") {
                setStatus("Waiting for admin to start quiz...");
                setQuestion(null);
            } else if (data.type === "quiz_started") {
                setStatus("Quiz started! Answer the questions");
                setQuestion(data.question);
            } else if (data.type === "error") {
                setStatus(`Error: ${data.message}`);
            } else if (data.type === "question_update") {
                setStatus("New question received");
                setQuestion(data.question);
            } else if (data.type === "quiz_completed") {
                setStatus("Quiz completed");
                setQuestion(null);
            } else if (data.type === "quiz_ended") {
                setStatus("Quiz ended");
                setQuestion(null);
            }
        };

        websocket.onerror = (error) => {
            console.log(`WebSocket error: ${error}`);
            setStatus("Connection error");
        };

        websocket.onclose = () => {
            console.log("WebSocket connection closed");
            setStatus("Disconnected");
        };
    }

    useEffect(() => {
        loadQuiz();

        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, []);

    return (
        <div style={{ padding: "20px", fontFamily: "Arial" }}>
            <h1>Join Quiz {quizId}</h1>

            <div style={{ marginBottom: "20px" }}>
                <strong>Status:</strong> {status}
            </div>

            {question && (
                <div style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "20px" }}>
                    <h3>Current Question:</h3>
                    <p><strong>{question.title}</strong></p>

                    {question.options && question.options.length > 0 && (
                        <div>
                            <p>Options:</p>
                            <ul>
                                {question.options.map((option, index) => (
                                    <li key={index}>{option.title}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}



        </div>
    );
}

export default JoinQuiz;