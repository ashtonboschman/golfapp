import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../css/Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { auth, login } = useContext(AuthContext);
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Lock scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  useEffect(() => {
    if (auth?.user) navigate("/dashboard", { replace: true });
  }, [auth, navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
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
        login({ user: data.user, token: data.token });
        navigate("/dashboard", { replace: true });
      } else {
        setMessage("✅ Registered! You can now login.");
        setIsRegister(false);
        setForm({ username: "", email: "", password: "" });
      }
    } catch (err) {
      console.error("Login/register error:", err);
      setMessage(err.message || "Server error. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2 style={{ textAlign: "center" }}>{isRegister ? "Register" : "Login"}</h2>
        {message && (
          <p className={`login-message ${message.includes("Error") ? "error" : "success"}`}>
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <input
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
              className="login-input"
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="login-input"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="login-input"
          />
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (isRegister ? "Registering..." : "Logging in...") : isRegister ? "Register" : "Login"}
          </button>
        </form>

        <button onClick={() => setIsRegister(!isRegister)} className="login-toggle-button">
          {isRegister ? "Already have an account? Login" : "Need an account? Register"}
        </button>
      </div>
    </div>
  );
}