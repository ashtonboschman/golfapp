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

  // Redirect if not logged in
  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  // Fetch current user (only sets local state)
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
        // DO NOT call login here
      } catch (err) {
        console.error("Fetch profile error:", err);
        setMessage(err.message || "Error loading profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token, navigate, logout]);

// Update username
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

    // Use backend message and updatedFields
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

// Update password
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

    // Use backend message directly
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


  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "auto" }}>
      <h2>My Profile</h2>
      {message && <p style={{ color: message.startsWith("❌") ? "red" : "green" }}>{message}</p>}

      <div style={{ background: "#fff", borderRadius: "8px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
        <form onSubmit={handleSave}>
          <label style={{ display: "block", marginTop: "10px", fontWeight: "bold" }}>Username:</label>
          <input
            type="text"
            value={username}
            disabled={!editing}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: "100%", padding: "8px", marginTop: "5px", borderRadius: "4px", border: "1px solid #ccc" }}
          />

          <label style={{ display: "block", marginTop: "10px", fontWeight: "bold" }}>Email:</label>
          <input
            type="email"
            value={email}
            disabled
            style={{ width: "100%", padding: "8px", marginTop: "5px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "#f3f3f3" }}
          />

          <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setUsername(auth.user.username); }}
                  style={{ backgroundColor: "#e74c3c", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "4px", cursor: "pointer" }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: "#2ecc71", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "4px", cursor: "pointer" }}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                style={{ backgroundColor: "#3498db", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "4px", cursor: "pointer" }}
              >
                Edit Profile
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={{ marginTop: "30px", padding: "20px", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <button
          onClick={() => { setShowPasswordForm(!showPasswordForm); setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" }); setMessage(""); }}
          style={{ backgroundColor: "#34495e", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "4px", cursor: "pointer", width: "100%" }}
        >
          {showPasswordForm ? "Cancel" : "Change Password"}
        </button>

        {showPasswordForm && (
          <form onSubmit={handlePasswordChange} style={{ marginTop: "15px" }}>
            <label style={{ display: "block", marginTop: "10px", fontWeight: "bold" }}>Current Password:</label>
            <input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "5px", borderRadius: "4px", border: "1px solid #ccc" }} required />

            <label style={{ display: "block", marginTop: "10px", fontWeight: "bold" }}>New Password:</label>
            <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "5px", borderRadius: "4px", border: "1px solid #ccc" }} required />

            <label style={{ display: "block", marginTop: "10px", fontWeight: "bold" }}>Confirm New Password:</label>
            <input type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} style={{ width: "100%", padding: "8px", marginTop: "5px", borderRadius: "4px", border: "1px solid #ccc" }} required />

            <button type="submit" style={{ backgroundColor: "#2ecc71", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "4px", cursor: "pointer", marginTop: "10px" }} disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
