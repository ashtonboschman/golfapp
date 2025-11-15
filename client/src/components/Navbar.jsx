// client/src/components/Navbar.jsx
import { useState, useContext, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Navbar() {
  const { auth, logout } = useContext(AuthContext);
  const user = auth?.user; // updated from previous "user"
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav style={styles.nav}>
      {/* Hamburger Menu */}
      {user && (
        <div style={styles.hamburgerContainer}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={styles.hamburgerButton}>
            ☰
          </button>
          {menuOpen && (
            <div style={styles.menuDropdown}>
              <Link to="/" style={styles.menuItem} onClick={() => setMenuOpen(false)}>Home</Link>
              <Link to="/rounds" style={styles.menuItem} onClick={() => setMenuOpen(false)}>Rounds</Link>
              <Link to="/courses" style={styles.menuItem} onClick={() => setMenuOpen(false)}>Courses</Link>
              <Link to="/leaderboard" style={styles.menuItem} onClick={() => setMenuOpen(false)}>Leaderboard</Link>
            </div>
          )}
        </div>
      )}

      {/* Logo → Clickable Home link */}
      <h1
        style={{ ...styles.logo, cursor: "pointer" }}
        onClick={() => navigate("/")}
      >
        GolfApp ⛳
      </h1>

      {/* Profile Dropdown */}
      {user && (
        <div style={styles.profileContainer} ref={profileRef}>
          <button onClick={() => setProfileOpen(!profileOpen)} style={styles.profileButton}>
            {user.username} ⬇
          </button>
          {profileOpen && (
            <div style={styles.profileDropdown}>
              <Link to="/profile" style={styles.profileItem} onClick={() => setProfileOpen(false)}>Profile</Link>
              <Link to="/settings" style={styles.profileItem} onClick={() => setProfileOpen(false)}>Settings</Link>
              <button onClick={handleLogout} style={styles.profileItem}>Logout</button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
    backgroundColor: "#2c3e50",
    color: "#fff",
    position: "relative",
    zIndex: 100,
  },
  hamburgerContainer: {
    position: "relative",
  },
  hamburgerButton: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "24px",
    cursor: "pointer",
  },
  menuDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    backgroundColor: "#fff",
    color: "#333",
    border: "1px solid #ccc",
    borderRadius: "4px",
    minWidth: "150px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    marginTop: "5px",
    zIndex: 1000,
  },
  menuItem: {
    padding: "8px 12px",
    textDecoration: "none",
    color: "#333",
    background: "none",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
  },
  logo: {
    margin: 0,
  },
  profileContainer: {
    position: "relative",
  },
  profileButton: {
    background: "none",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
  },
  profileDropdown: {
    position: "absolute",
    top: "100%",
    right: 0,
    backgroundColor: "#fff",
    color: "#333",
    border: "1px solid #ccc",
    borderRadius: "4px",
    minWidth: "120px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    marginTop: "5px",
    zIndex: 1000,
  },
  profileItem: {
    padding: "8px 12px",
    textDecoration: "none",
    color: "#333",
    background: "none",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
  },
};
