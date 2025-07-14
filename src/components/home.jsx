import { useNavigate } from "react-router";

function Home() {
    const navigate = useNavigate();
    return (
        <div>
            <h1>Home</h1>
            <button onClick={() => navigate("/signup")}>Signup</button>
            <button onClick={() => navigate("/signin")}>Signin</button>
        </div>
    )
}
export default Home;