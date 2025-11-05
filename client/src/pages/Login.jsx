import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [isRegister, setIsRegister] = useState(false);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: ""
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const endpoint = isRegister ? "/api/users/register" : "/api/users/login";

    try {
      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) return alert(data.message);

      if (!isRegister) {
        localStorage.setItem("token", data.token || "dummy"); // add token later
        nav("/dashboard");
      } else {
        alert("Registered! You can now login");
        setIsRegister(false);
        setForm({ username: "", email: "", password: "" });
      }
    } catch {
      alert("Server error");
    }
  }

  return (
    <div style={{ padding: "40px", maxWidth: "400px", margin: "auto" }}>
      <h2>{isRegister ? "Register" : "Login"}</h2>

      <form onSubmit={handleSubmit}>
        {isRegister && (
          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            required
          />
        )}
        <br />

        <input
          name="email"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <br />

        <input
          name="password"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <br /><br />

        <button type="submit">
          {isRegister ? "Register" : "Login"}
        </button>
      </form>

      <br />

      <button onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? "Already have an account? Login" : "Need an account? Register"}
      </button>
    </div>
  );
}