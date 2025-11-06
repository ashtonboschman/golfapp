import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Profile() {
  const { user, login } = useContext(AuthContext);
  const [username, setUsername] = useState(user?.username || "");
  const [email] = useState(user?.email || "");
  const [editing, setEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const BASE_URL = "http://localhost:3000";
  const token = localStorage.getItem("token");

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

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error updating username");

      login({ ...user, username: data.username });
      setMessage("✅ Username updated successfully!");
      setEditing(false);
    } catch (err) {
      console.error(err);
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
      return setMessage("❌ All password fields are required");
    if (newPassword !== confirmPassword)
      return setMessage("❌ New passwords do not match");

    setLoading(true);
    try {
      console.log("Sending password change:", { currentPassword, newPassword });
      const res = await fetch(`${BASE_URL}/api/users/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error changing password");

      setMessage("✅ Password updated successfully!");
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
    <div style={styles.container}>
      <h2>My Profile</h2>
      {message && <p style={styles.message}>{message}</p>}

      <div style={styles.card}>
        <form onSubmit={handleSave}>
          <label style={styles.label}>Username:</label>
          <input
            type="text"
            value={username}
            disabled={!editing}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label}>Email:</label>
          <input
            type="email"
            value={email}
            disabled
            style={{ ...styles.input, backgroundColor: "#f3f3f3" }}
          />

          <div style={styles.buttonRow}>
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setUsername(user.username);
                    setMessage("");
                }}
                  style={styles.cancelButton}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.saveButton} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                style={styles.editButton}
              >
                Edit Profile
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={styles.passwordSection}>
  <button
    onClick={() => {
      setShowPasswordForm(!showPasswordForm);
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" }); // ✅ clear inputs
      setMessage(""); // ✅ clear any messages
    }}
    style={styles.passwordToggle}
  >
    {showPasswordForm ? "Cancel" : "Change Password"}
  </button>

  {showPasswordForm && (
    <form onSubmit={handlePasswordChange} style={styles.passwordForm}>
      <label style={styles.label}>Current Password:</label>
      <input
        type="password"
        value={passwords.currentPassword}
        onChange={(e) =>
          setPasswords({ ...passwords, currentPassword: e.target.value })
        }
        style={styles.input}
        required
      />

      <label style={styles.label}>New Password:</label>
      <input
        type="password"
        value={passwords.newPassword}
        onChange={(e) =>
          setPasswords({ ...passwords, newPassword: e.target.value })
        }
        style={styles.input}
        required
      />

      <label style={styles.label}>Confirm New Password:</label>
      <input
        type="password"
        value={passwords.confirmPassword}
        onChange={(e) =>
          setPasswords({ ...passwords, confirmPassword: e.target.value })
        }
        style={styles.input}
        required
      />

      <button type="submit" style={styles.saveButton} disabled={loading}>
        {loading ? "Updating..." : "Update Password"}
      </button>
    </form>
  )}
</div>


      <div style={styles.futureSections}>
        <h3>Upcoming Features</h3>
        <ul>
          <li>🏌️ Handicap Tracking</li>
          <li>📊 Club Distances</li>
          <li>👥 Friends List</li>
          <li>🏆 Achievements</li>
          <li>🖼️ Profile Photo</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "40px", maxWidth: "600px", margin: "auto" },
  card: {
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    padding: "20px",
  },
  label: { display: "block", marginTop: "10px", fontWeight: "bold" },
  input: {
    width: "100%",
    padding: "8px",
    marginTop: "5px",
    borderRadius: "4px",
    border: "1px solid #ccc",
  },
  buttonRow: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
  },
  editButton: {
    backgroundColor: "#3498db",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  saveButton: {
    backgroundColor: "#2ecc71",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  cancelButton: {
    backgroundColor: "#e74c3c",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  passwordSection: {
    marginTop: "30px",
    padding: "20px",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  passwordToggle: {
    backgroundColor: "#34495e",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    width: "100%",
  },
  passwordForm: {
    marginTop: "15px",
  },
  message: {
    color: "#2c3e50",
    backgroundColor: "#ecf0f1",
    padding: "10px",
    borderRadius: "6px",
  },
  futureSections: {
    marginTop: "30px",
    background: "#f9f9f9",
    borderRadius: "8px",
    padding: "15px 20px",
  },
};
