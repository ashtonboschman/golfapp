import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
  const { auth } = useContext(AuthContext);

  // Wait until auth state is loaded
  if (auth === undefined) return <p>Loading...</p>;

  // Redirect guests to login
  return auth?.user ? children : <Navigate to="/login" replace />;
}
