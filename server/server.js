// server.js
require("dotenv").config(); // load .env variables
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json()); // allows reading JSON body
app.use(cors({ origin: ["http://localhost:5173"] }));

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/tees', require('./routes/tees'));
app.use('/api/rounds', require('./routes/rounds'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/', (req, res) => {
  res.send("Welcome to the golf API server!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
