import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Header() {
  const { auth } = useContext(AuthContext);
  const user = auth?.user;
  const navigate = useNavigate();

  return (
    <header className="header">
      <h1 className="logo" onClick={() => { if (user) navigate("/"); }}>
        GolfApp ⛳
      </h1>

      {user && (
        <button
          className="settings-button"
          onClick={() => navigate("/settings")}
          title="Settings"
        >
          ⚙️
        </button>
      )}
    </header>
  );
}