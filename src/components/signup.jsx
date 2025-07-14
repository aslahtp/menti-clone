import axios from "axios";
import { useNavigate } from "react-router";

function Signup() {
    const navigate = useNavigate();
    const handleSignup = async () => {
        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const role = document.getElementById("role").value;
        const response = await axios.post("http://localhost:3000/signup", {
            name: name,
            email: email,
            password: password,
            role: role
        });
        if (response.status === 200) {
            navigate("/signin");
        }
        console.log(response);
    }
    return (
        <div>
            <h1>Signup</h1>
                <input type="text" placeholder="Name" id="name" />
                <input type="email" placeholder="Email" id="email" />
                <input type="password" placeholder="Password" id="password" />
                <select name="role" id="role">
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                </select>
                <button type="submit" onClick={handleSignup}>Signup</button>
        </div>
    )
}
export default Signup;