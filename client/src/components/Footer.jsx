import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Footer() {
  const { auth } = useContext(AuthContext);
  const user = auth?.user;
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const buttons = [
    { path: "/leaderboard", emoji: "🏆", label: "Leaderboard" },
    { path: "/courses", emoji: "⛳", label: "Courses" },
    { path: "/", emoji: "📊", label: "Dashboard" },
    { path: "/rounds", emoji: "🏌️‍♂️", label: "Rounds" },
    { path: "/profile", emoji: "👤", label: "Profile" },
  ];

  const isButtonActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <footer className="footer-menu">
      <div className="footer-menu-inner">
        {buttons.map(({ path, emoji, label }) => (
          <button
            key={path}
            className={isButtonActive(path) ? "active" : ""}
            onClick={() => navigate(path)}
          >
            <span className="emoji">{emoji}</span>
            <span className="label">{label}</span>
          </button>
        ))}
      </div>
    </footer>
  );
}