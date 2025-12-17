import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import PrivateRoute from "./routes/PrivateRoute";
import "./css/App.css";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RoundForm from "./pages/RoundForm";
import Courses from "./pages/Courses";
import Leaderboard from "./pages/Leaderboard";
import Rounds from "./pages/Rounds";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import CourseDetails from "./pages/CourseDetails";
import AddFriends from "./pages/AddFriends";
import Friends from "./pages/Friends";

// Layout
import { MessageProvider } from "./context/MessageContext";
import Layout from "./components/Layout";

// For Home redirect logic
function HomeRedirect() {
  const { auth } = React.useContext(AuthContext);
  return auth?.user ? <Dashboard /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <MessageProvider>
        <BrowserRouter>
          <Routes>
            {/* Login Route */}
            <Route
              path="/login"
              element={
                <Layout>
                  <Login />
                </Layout>
              }
            />

            {/* Routes with Layout */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout>
                    <HomeRedirect />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/rounds"
              element={
                <PrivateRoute>
                  <Layout>
                    <Rounds />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/rounds/add"
              element={
                <PrivateRoute>
                  <Layout>
                    <RoundForm mode="add" />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/rounds/edit/:id"
              element={
                <PrivateRoute>
                  <Layout>
                    <RoundForm mode="edit" />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/courses"
              element={
                <PrivateRoute>
                  <Layout>
                    <Courses />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/courses/:id"
              element={
                <PrivateRoute>
                  <Layout>
                    <CourseDetails />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <PrivateRoute>
                  <Layout>
                    <Leaderboard />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/friends"
              element={
                <PrivateRoute>
                  <Layout>
                    <Friends />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/friends/add"
              element={
                <PrivateRoute>
                  <Layout>
                    <AddFriends />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/round-history"
              element={
                <PrivateRoute>
                  <Layout>
                    <Rounds />
                  </Layout>
                </PrivateRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </MessageProvider>
    </AuthProvider>
  );
}