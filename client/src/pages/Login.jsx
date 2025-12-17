import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useMessage } from "../context/MessageContext";
import "../css/App.css";

export default function Login() {
  const navigate = useNavigate();
  const { auth, login } = useContext(AuthContext);
  const { showMessage, clearMessage } = useMessage();
  
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  // Lock scroll while on login page
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (auth?.user) navigate("/dashboard", { replace: true });
  }, [auth, navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessage();

    const BASE_URL = "http://localhost:3000";
    const endpoint = isRegister ? "/api/users/register" : "/api/users/login";

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Server error");

      if (!isRegister) {
        // Login
        login({ user: data.user, token: data.token });
        navigate("/dashboard", { replace: true });
      } else {
        // Registration successful
        showMessage(data.message || "Registered! You can now login", data.type || "success");
        setIsRegister(false);
        setForm({ username: "", email: "", password: "" });
      }
    } catch (err) {
      console.error("Login/register error:", err);
      showMessage(err.message || "Server error. Check console", err.type || "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="card login-card">
        <form onSubmit={handleSubmit} className="form">
          {isRegister && (
            <input
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
              className="form-input"
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="form-input"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="form-input"
          />
          <button type="submit" className="btn btn-save" disabled={loading}>
            {loading ? (isRegister ? "Registering..." : "Logging in...") : isRegister ? "Register" : "Login"}
          </button>
        </form>

        <button
          onClick={() => setIsRegister(!isRegister)}
          className="btn btn-toggle"
        >
          {isRegister ? "Already have an account? Login" : "Need an account? Register"}
        </button>
      </div>
    </div>
  );
}