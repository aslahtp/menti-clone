import { useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";

function CreateQuiz() {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const handleAddQuestion = () => {
        const title = document.getElementById("question").value;
        const option1 = document.getElementById("option1").value;
        const option2 = document.getElementById("option2").value;
        const option3 = document.getElementById("option3").value;
        const option4 = document.getElementById("option4").value;
        const answer = document.getElementById("answer").value;
        setQuestions([...questions, { title, option1, option2, option3, option4, answer }]);
    }
    const handleCreateQuiz = async () => {
        const title = document.getElementById("quizName").value;
        const response = await axios.post("http://localhost:3000/quiz", {
            title: title,
            questions: questions
        },
        {
            headers: {
                Authorization: localStorage.getItem("token")
            }
        }
        );
        if (response.status === 200) {
            //navigate("/dashboard");
            alert("Quiz created successfully");
        }
    }
    return (
        <div>
            <h1>Create Quiz</h1>
            <input type="text" placeholder="Quiz Name" id="quizName" /><br /><br />
            <input type="text" placeholder="Question" id="question" />
            <input type="text" placeholder="Option 1" id="option1" />
            <input type="text" placeholder="Option 2" id="option2" />
            <input type="text" placeholder="Option 3" id="option3" />
            <input type="text" placeholder="Option 4" id="option4" />
            <input type="text" placeholder="Answer" id="answer" />
            <button onClick={handleAddQuestion}>Add Question</button><br /><br />
            <div id="questions">
                {questions.map((question, index) => (
                    <div key={index}>
                        <p>Question {index + 1}:
                            {question.title} <span>Option 1: {question.option1} Option 2: {question.option2} Option 3: {question.option3} Option 4: {question.option4} Answer: {question.answer}</span>
                        </p>
                    </div>
                ))}
            </div>
            <button onClick={handleCreateQuiz}>Create Quiz</button>
        </div>
    )
}
export default CreateQuiz;