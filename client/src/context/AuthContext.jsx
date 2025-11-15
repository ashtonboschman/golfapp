// client/src/context/AuthContext.jsx
import { createContext, useState } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem("auth");
      return saved ? JSON.parse(saved) : null;
    } catch (err) {
      console.error("Failed to parse auth from localStorage", err);
      return null;
    }
  });

  const login = ({ user, token }) => {
    setAuth({ user, token });
    localStorage.setItem("auth", JSON.stringify({ user, token }));
  };

  const logout = () => {
    setAuth(null);
    localStorage.removeItem("auth");
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
