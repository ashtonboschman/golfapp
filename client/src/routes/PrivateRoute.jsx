// client/src/routes/PrivateRoute.jsx
import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
  const { user } = useContext(AuthContext);

  // Show nothing while checking user from localStorage
  if (user === undefined) return null;

  // Redirect guests to login
  return user ? children : <Navigate to="/login" replace />;
}
