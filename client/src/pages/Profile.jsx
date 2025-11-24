// client/src/pages/Profile.jsx
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Profile() {
  const { auth, login, logout } = useContext(AuthContext);
  const token = auth?.token;
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const BASE_URL = "http://localhost:3000";

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return;

    const fetchUser = async () => {
      setLoading(true);
      setMessage("");
      try {
        const res = await fetch(`${BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          logout();
          navigate("/login", { replace: true });
          return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error loading profile");

        setUsername(data.username || "");
        setEmail(data.email || "");
      } catch (err) {
        console.error("Fetch profile error:", err);
        setMessage(err.message || "Error loading profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token, navigate, logout]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!username.trim()) return setMessage("❌ Username cannot be empty");

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error updating profile");

      setMessage(data.message);
      setEditing(false);
      login({
        user: { ...auth.user, username: data.updatedFields.username || username.trim() },
        token,
      });
    } catch (err) {
      console.error("Update username error:", err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage("");
    const { currentPassword, newPassword, confirmPassword } = passwords;

    if (!currentPassword || !newPassword || !confirmPassword)
      return setMessage("❌ All fields are required");
    if (newPassword !== confirmPassword)
      return setMessage("❌ New passwords do not match");

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error changing password");

      setMessage(data.message || "✅ Password updated successfully!");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (err) {
      console.error("Change password error:", err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = { background: "#fff", padding: "15px", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" };
  const inputStyle = { width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" };
  const btnStyle = { fontWeight: "bold", borderRadius: "8px", cursor: "pointer", border: "none", padding: "12px", flex: 1 };
  const saveBtn = { ...btnStyle, backgroundColor: "#2ecc71", color: "#fff" };
  const cancelBtn = { ...btnStyle, backgroundColor: "#e74c3c", color: "#fff" };
  const editBtn = { ...btnStyle, backgroundColor: "#3498db", color: "#fff" };
  const toggleBtn = { ...btnStyle, backgroundColor: "#34495e", color: "#fff" };
  const messageStyle = { color: message?.startsWith("❌") ? "red" : "green", marginBottom: "12px" };

  return (
    <div style={{ padding: "15px", maxWidth: "100%", margin: "auto" }}>
      <h2>My Profile</h2>
      {message && <p style={messageStyle}>{message}</p>}

      <div style={cardStyle}>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label>Username:</label>
          <input type="text" value={username} disabled={!editing} onChange={(e) => setUsername(e.target.value)} style={inputStyle} />

          <label>Email:</label>
          <input type="email" value={email} disabled style={{ ...inputStyle, backgroundColor: "#f3f3f3" }} />

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            {editing ? (
              <>
                <button type="button" onClick={() => { setEditing(false); setUsername(auth.user.username); }} style={cancelBtn} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" style={saveBtn} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setEditing(true)} style={editBtn}>Edit Profile</button>
            )}
          </div>
        </form>
      </div>

      <div style={{ ...cardStyle, marginTop: "20px" }}>
        <button
          type="button"
          onClick={() => { setShowPasswordForm(!showPasswordForm); setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" }); setMessage(""); }}
          style={toggleBtn}
        >
          {showPasswordForm ? "Cancel" : "Change Password"}
        </button>

        {showPasswordForm && (
          <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
            <label>Current Password:</label>
            <input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} style={inputStyle} required />

            <label>New Password:</label>
            <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} style={inputStyle} required />

            <label>Confirm New Password:</label>
            <input type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} style={inputStyle} required />

            <button type="submit" style={saveBtn} disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
