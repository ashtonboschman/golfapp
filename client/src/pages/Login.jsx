// client/src/pages/Login.jsx
import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { auth, login } = useContext(AuthContext);
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const NAVBAR_HEIGHT = 60;

  // Lock scroll on mount, unlock on unmount
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
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

  const pageStyle = {
    height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
    padding: "20px",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    backgroundColor: "#f5f5f5",
    boxSizing: "border-box",
  };

  const containerStyle = {
    width: "100%",
    maxWidth: "400px",
    margin: "0 auto",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    padding: "20px",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    fontSize: "1rem",
    borderRadius: "6px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
  };

  const buttonStyle = {
    width: "100%",
    padding: "12px",
    fontSize: "1rem",
    fontWeight: "bold",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#3498db",
    color: "#fff",
    cursor: "pointer",
  };

  const toggleButtonStyle = {
    width: "100%",
    padding: "10px",
    fontSize: "0.9rem",
    borderRadius: "8px",
    border: "1px solid #ccc",
    backgroundColor: "#f5f5f5",
    cursor: "pointer",
  };

  const messageStyle = {
    color: message?.includes("Error") ? "red" : "green",
    fontSize: "0.9rem",
    textAlign: "center",
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h2 style={{ textAlign: "center" }}>{isRegister ? "Register" : "Login"}</h2>
        {message && <p style={messageStyle}>{message}</p>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {isRegister && (
            <input
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            style={inputStyle}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? (isRegister ? "Registering..." : "Logging in...") : isRegister ? "Register" : "Login"}
          </button>
        </form>

        <button onClick={() => setIsRegister(!isRegister)} style={toggleButtonStyle}>
          {isRegister ? "Already have an account? Login" : "Need an account? Register"}
        </button>
      </div>
    </div>
  );
}
