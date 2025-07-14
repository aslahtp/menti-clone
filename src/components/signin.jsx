import axios from "axios";
import { useNavigate } from "react-router";

function Signin() {
    const navigate = useNavigate();
    const handleSignin = async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const response = await axios.post("http://localhost:3000/signin", {
            email: email,
            password: password
        });
        if (response.status === 200) {
            const res = await axios.get("http://localhost:3000/profile", {
                headers: {
                    Authorization: response.data.token
                }
            });
            localStorage.setItem("token", response.data.token);
            localStorage.setItem("role", res.data.role);
            navigate("/dashboard");
        }
        console.log(response);
    }
    return (
        <div>
            <h1>Signin</h1>
                <input type="email" placeholder="Email" id="email" />
                <input type="password" placeholder="Password" id="password" />
                <button type="submit" onClick={handleSignin}>Signin</button>
        </div>
    )
}
export default Signin;