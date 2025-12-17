import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useMessage } from "../context/MessageContext";
import Messages from "../components/Messages";

export default function Profile() {
  const { auth, login, logout } = useContext(AuthContext);
  const { showMessage, clearMessage } = useMessage();
  const token = auth?.token;
  const navigate = useNavigate();

  const [username, setUsername] = useState(auth?.user?.username || "");
  const [email, setEmail] = useState(auth?.user?.email || "");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const BASE_URL = "http://localhost:3000";

  // Redirect if not authenticated
  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  // Fetch user profile once
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return;
      setLoading(true);
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

        setUsername(data.user?.username || "");
        setEmail(data.user?.email || "");
      } catch (err) {
        console.error(err);
        showMessage(err.message || "Error loading profile", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token, navigate, logout]); // Removed showMessage from dependencies

  // -----------------------------
  // Handlers
  // -----------------------------
  const handleSave = async (e) => {
    e.preventDefault();
    clearMessage();

    if (!username.trim()) {
      showMessage("Username cannot be empty", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error updating profile");

      showMessage(data.message || "Profile updated", data.type || "success");
      setEditing(false);
      login({ user: { ...auth.user, username: username.trim() }, token });
    } catch (err) {
      console.error(err);
      showMessage(err.message || "Error updating profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    clearMessage();

    const { currentPassword, newPassword, confirmPassword } = passwords;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage("All fields are required", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("New passwords do not match", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/users/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.status === 401 || res.status === 403) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error changing password");

      showMessage(data.message || "Password updated successfully", data.type || "success");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (err) {
      console.error(err);
      showMessage(err.message || "Error changing password", "error");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="page-stack">

      <form onSubmit={handleSave} className="card flex flex-column gap-12">
        <label className="form-label">Username:</label>
        <input
          type="text"
          value={username}
          disabled={!editing || loading}
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
                className="btn btn-cancel"
                onClick={() => {
                  setEditing(false);
                  setUsername(auth.user.username);
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-save" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-edit" onClick={() => setEditing(true)}>
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
            disabled={loading}
          />
          <label className="form-label">New Password:</label>
          <input
            type="password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            className="form-input"
            required
            disabled={loading}
          />
          <label className="form-label">Confirm New Password:</label>
          <input
            type="password"
            value={passwords.confirmPassword}
            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
            className="form-input"
            required
            disabled={loading}
          />

          <div className="form-actions">
            <button type="button" className="btn btn-cancel" onClick={() => setShowPasswordForm(false)} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-save" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      ) : (
        <div className="card flex justify-center">
          <button type="button" className="btn btn-toggle" onClick={() => setShowPasswordForm(true)} disabled={loading}>
            Change Password
          </button>
        </div>
      )}

      <div className="card flex justify-center">
        <button
          type="button"
          className="btn btn-logout"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          disabled={loading}
        >
          Logout
        </button>
      </div>
    </div>
  );
}