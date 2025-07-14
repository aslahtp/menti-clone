import { useNavigate } from "react-router";
import axios from "axios";
import { useState, useEffect } from "react";

function DashboardAdmin() {
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);
    const handleGetQuizzes = async () => {
        const response = await axios.get("http://localhost:3000/quiz", {
            headers: {
                Authorization: localStorage.getItem("token")
            }
        });
        console.log(response.data);
        setQuizzes(response.data.quizzes);
    }

    useEffect(() => {
        handleGetQuizzes();
    }, []);
    return (
        <div>
            <h1>Dashboard Admin</h1>
            <button onClick={() => navigate("/createquiz")}>Create Quiz</button>
            <div id="quizzes">
                {quizzes.map((quiz) => (
                    <div key={quiz.id}>
                        <p>{quiz.title}
                        <button onClick={() => navigate(`/startquiz/${quiz.id}`)}>Start Quiz</button></p>
                    </div>
                ))}
            </div>
        </div>
    )
}
export default DashboardAdmin;