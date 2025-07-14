import { useParams } from "react-router";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

function StartQuiz() {
    const { quizId } = useParams();
    const [title, setTitle] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [liveQuizQuestion, setLiveQuizQuestion] = useState("");
    const [liveQuizOptions, setLiveQuizOptions] = useState([]);
    const [isQuizStarted, setIsQuizStarted] = useState(false);
    const [isQuizEnded, setIsQuizEnded] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const wsRef = useRef(null);

    // Connect WebSocket on mount
    useEffect(() => {
        const ws = new window.WebSocket(`ws://localhost:3000/quiz/${quizId}`);
        wsRef.current = ws;
        ws.onopen = () => {
            setWsConnected(true);
            console.log("WebSocket connected");
        };
        ws.onclose = () => {
            setWsConnected(false);
            console.log("WebSocket closed");
        };
        ws.onerror = () => {
            setWsConnected(false);
            console.log("WebSocket error");
        };
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log(data);
            if (data.type === "start") {
                setLiveQuizQuestion(data.liveQuiz.title);
                setLiveQuizOptions(data.liveQuiz.options);
                setIsQuizStarted(true);
                setIsQuizEnded(false); // Reset ended state on start
            }
            if (data.type === "next") {
                setLiveQuizQuestion(data.liveQuiz.title);
                setLiveQuizOptions(data.liveQuiz.options);
            }
            if (data.type === "end") {
                setLiveQuizQuestion("");
                setLiveQuizOptions([]);
                setIsQuizStarted(false);
                setIsQuizEnded(true);
            }
        };
        // Cleanup on unmount
        return () => {
            ws.close();
        };
    }, [quizId]);

    const handleStartQuiz = async () => {
        if (wsRef.current && wsConnected) {
            wsRef.current.send(JSON.stringify({
                type: "start",
                quizId: quizId,
                token: localStorage.getItem("token")
            }));
        }
    };
    const handleNextQuestion = () => {
        if (wsRef.current && wsConnected) {
            wsRef.current.send(JSON.stringify({
                type: "next",
                quizId: quizId,
                token: localStorage.getItem("token")
            }));
        }
    };
    const handleEndQuiz = () => {
        if (wsRef.current && wsConnected) {
            wsRef.current.send(JSON.stringify({
                type: "end",
                quizId: quizId,
                token: localStorage.getItem("token")
            }));
        }
        setIsQuizStarted(false);
        setIsQuizEnded(true);
        setLiveQuizQuestion("");
        setLiveQuizOptions([]);
    };
    const handleGetQuiz = async () => {
        const response = await axios.get(`http://localhost:3000/quiz/admin/${quizId}`, {
            headers: {
                Authorization: localStorage.getItem("token")
            }
        });
        console.log(response.data);
        setTitle(response.data.title);
        setQuestions(response.data.questions);
    };
    useEffect(() => {
        handleGetQuiz();
    }, []);
    return (
        <div>
            <h1>Start Quiz {quizId}</h1>
            <h2>{title}</h2>
            {!wsConnected && <p style={{ color: 'red' }}>WebSocket not connected. Please check your connection.</p>}
            <button onClick={handleStartQuiz} disabled={!wsConnected || isQuizStarted}>Start Quiz</button>
            <button onClick={handleEndQuiz} disabled={!wsConnected || !isQuizStarted || isQuizEnded}>End Quiz</button>
            <b><p>Question: {liveQuizQuestion}</p></b>
            Options: {liveQuizOptions.map((option, index) => (
                <p key={index}>{index + 1}. {option.title}</p>
            ))}
            <button onClick={handleNextQuestion} disabled={!wsConnected || liveQuizQuestion === ""}>Next Question</button>
            <div id="questions">
                {questions.map((question, index) => (
                    <div key={index}>
                        <p>Question {index + 1}:
                            {question.title} <span>Option 1: {question.option1} Option 2: {question.option2} Option 3: {question.option3} Option 4: {question.option4} Answer: {question.answer}</span>
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}
export default StartQuiz;