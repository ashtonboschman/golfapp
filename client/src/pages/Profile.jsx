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
        console.error(err);
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
        user: { ...auth.user, username: data.updatedFields?.username || username.trim() },
        token,
      });
    } catch (err) {
      console.error(err);
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
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">

      {message && (
        <p className={`message ${message.startsWith("❌") ? "error" : "success"}`}>
          {message}
        </p>
      )}

      <form onSubmit={handleSave} className="card flex flex-column gap-12">
        <label className="form-label">Username:</label>
        <input
          type="text"
          value={username}
          disabled={!editing}
          onChange={(e) => setUsername(e.target.value)}
          className="form-input"
        />

        <label className="form-label">Email:</label>
        <input type="email" value={email} disabled className="form-input disabled" />

        <div className="form-actions">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => { setEditing(false); setUsername(auth.user.username); }}
                className="btn btn-cancel"
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-save" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="btn btn-edit">
              Edit Username
            </button>
          )}
        </div>
      </form>

      {showPasswordForm ? (
        <form onSubmit={handlePasswordChange} className="card flex flex-column gap-12">
          <label className="form-label">Current Password:</label>
          <input
            type="password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
            className="form-input"
            required
          />

          <label className="form-label">New Password:</label>
          <input
            type="password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            className="form-input"
            required
          />

          <label className="form-label">Confirm New Password:</label>
          <input
            type="password"
            value={passwords.confirmPassword}
            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
            className="form-input"
            required
          />

          <div className="form-actions">
            <button type="button" className="btn btn-cancel" onClick={() => setShowPasswordForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-save" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      ) : (
        <div className="card flex justify-center">
          <button
            type="button"
            className="btn btn-toggle"
            onClick={() => { setShowPasswordForm(true); setMessage(""); }}
          >
            Change Password
          </button>
        </div>
      )}

      <div className="card flex justify-center">
        <button
          type="button"
          className="btn btn-logout"
          onClick={() => { logout(); navigate("/login", { replace: true }); }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}