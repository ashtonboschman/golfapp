// client/src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import PrivateRoute from "./routes/PrivateRoute";

import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RoundForm from "./pages/RoundForm";
import Courses from "./pages/Courses";
import Leaderboard from "./pages/Leaderboard";
import Rounds from "./pages/Rounds";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

function HomeRedirect() {
  const { auth } = React.useContext(AuthContext);
  return auth?.user ? <Dashboard /> : <Navigate to="/login" replace />;
}


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          {/* Login */}
          <Route path="/login" element={<Login />} />

          {/* Home redirects to dashboard if logged in */}
          <Route path="/" element={<HomeRedirect />} />

          {/* Dashboard is same as Home */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/rounds" element={<PrivateRoute><Rounds /></PrivateRoute>} />
          <Route path="/rounds/add" element={<PrivateRoute><RoundForm mode="add" /></PrivateRoute>} />
          <Route path="/rounds/edit/:id" element={<PrivateRoute><RoundForm mode="edit" /></PrivateRoute>} />
          <Route path="/courses" element={<PrivateRoute><Courses /></PrivateRoute>} />
          <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="/round-history" element={<PrivateRoute><Rounds /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />

          {/* Catch-all route: redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}