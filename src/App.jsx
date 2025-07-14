import { BrowserRouter, Routes, Route } from "react-router";
import Home from "./components/home";
import Signup from "./components/signup";
import Signin from "./components/signin";
import DashboardUser from "./components/dashuser";
import DashboardAdmin from "./components/dashadmin";
import CreateQuiz from "./components/createquiz";
import StartQuiz from "./components/startquiz";

function App() {


  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        {localStorage.getItem("role") === "USER" && <Route path="/dashboard" element={<DashboardUser />} />}
        {localStorage.getItem("role") === "ADMIN" && <Route path="/dashboard" element={<DashboardAdmin />} />}
        {localStorage.getItem("role") === "ADMIN" && <Route path="/createquiz" element={<CreateQuiz />} />}
        {localStorage.getItem("role") === "ADMIN" && <Route path="/startquiz/:quizId" element={<StartQuiz />} />}
      </Routes>
    </BrowserRouter>
  )
}

export default App
