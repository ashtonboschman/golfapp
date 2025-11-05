import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function Dashboard() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div style={{ padding: "50px" }}>
      <h2>Welcome, {user.name}!</h2>
      <button onClick={logout}>Logout</button>
      <p>Dashboard content coming soon...</p>
    </div>
  );
}

export default Dashboard;
