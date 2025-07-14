import { useState } from "react";
import { useNavigate } from "react-router";
//import axios from "axios";



function DashboardUser() {
    const navigate = useNavigate();
    const [quizId, setQuizId] = useState("");
    return (
        <div>
            <h1>Dashboard User</h1>
            <input type="text" placeholder="Enter Quiz ID" value={quizId} onChange={(e) => setQuizId(e.target.value)} />
            <button onClick={() => navigate(`/joinquiz/${quizId}`)}>Join Quiz</button>
        </div>
    )
}
export default DashboardUser;