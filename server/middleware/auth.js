// middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = "supersecretkey123";

function auth(req, res, next) {
  const authHeader = req.header('Authorization');

  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1]; // "Bearer <token>"

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // attach user info to request
    next(); // continue to actual route
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
}

module.exports = auth;
