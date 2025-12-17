const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../middleware/auth");

// Helper for MySQL datetime format
const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");

// --------------------------------------------------
// SEARCH USERS WITH FRIEND STATUS
// GET /api/friends/search?q=
// --------------------------------------------------
router.get("/search", auth, (req, res) => {
  const userId = req.user.id;
  const query = (req.query.q || "").trim();

  if (!query) return res.status(400).json({ type: "error", message: "Query required" });

  const likeQuery = `%${query}%`;

  const sql = `
    SELECT 
      u.id,
      u.username,
      u.email,
      CASE
        WHEN f.friend_id IS NOT NULL THEN 'friend'
        WHEN fr_sent.id IS NOT NULL THEN 'pending'
        WHEN fr_recv.id IS NOT NULL THEN 'incoming'
        ELSE 'none'
      END AS status
    FROM users u
    LEFT JOIN friends f 
      ON (f.user_id = ? AND f.friend_id = u.id) OR (f.user_id = u.id AND f.friend_id = ?)
    LEFT JOIN friend_requests fr_sent 
      ON fr_sent.requester_id = ? AND fr_sent.recipient_id = u.id AND fr_sent.status = 'pending'
    LEFT JOIN friend_requests fr_recv 
      ON fr_recv.recipient_id = ? AND fr_recv.requester_id = u.id AND fr_recv.status = 'pending'
    WHERE u.id != ? AND u.username LIKE ?
    GROUP BY u.id
    ORDER BY u.username
    LIMIT 50
  `;

  db.query(sql, [userId, userId, userId, userId, userId, likeQuery], (err, results) => {
    if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
    res.json({ type: "success", results });
  });
});

// --------------------------------------------------
// GET FRIENDS LIST
// GET /api/friends
// --------------------------------------------------
router.get("/", auth, (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT u.id, u.username
    FROM friends f
    JOIN users u ON (u.id = f.friend_id OR u.id = f.user_id)
    WHERE (f.user_id = ? OR f.friend_id = ?) AND u.id != ?
    GROUP BY u.id
    ORDER BY u.username
  `;
  db.query(sql, [userId, userId, userId], (err, results) => {
    if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
    res.json({ type: "success", results });
  });
});

// --------------------------------------------------
// INCOMING FRIEND REQUESTS
// GET /api/friends/incoming
// --------------------------------------------------
router.get("/incoming", auth, (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT fr.id, fr.created_date, u.id AS user_id, u.username
    FROM friend_requests fr
    JOIN users u ON u.id = fr.requester_id
    WHERE fr.recipient_id = ? AND fr.status = 'pending'
    ORDER BY fr.created_date DESC
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
    res.json({ type: "success", results });
  });
});

// --------------------------------------------------
// OUTGOING FRIEND REQUESTS
// GET /api/friends/outgoing
// --------------------------------------------------
router.get("/outgoing", auth, (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT fr.id, fr.created_date, u.id AS user_id, u.username
    FROM friend_requests fr
    JOIN users u ON u.id = fr.recipient_id
    WHERE fr.requester_id = ? AND fr.status = 'pending'
    ORDER BY fr.created_date DESC
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
    res.json({ type: "success", results });
  });
});

// --------------------------------------------------
// SEND FRIEND REQUEST
// POST /api/friends
// --------------------------------------------------
router.post("/", auth, (req, res) => {
  const requesterId = req.user.id;
  const { recipientId } = req.body;

  if (!recipientId || requesterId === recipientId) {
    return res.status(400).json({ type: "error", message: "Invalid recipient" });
  }

  db.query(
    "SELECT 1 FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
    [requesterId, recipientId, recipientId, requesterId],
    (err, results) => {
      if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
      if (results.length > 0) return res.status(409).json({ type: "error", message: "Already friends" });

      db.query(
        "SELECT 1 FROM friend_requests WHERE requester_id = ? AND recipient_id = ? AND status = 'pending'",
        [requesterId, recipientId],
        (err2, results2) => {
          if (err2) return res.status(500).json({ type: "error", message: "Database error", details: err2.code });
          if (results2.length > 0) return res.status(409).json({ type: "error", message: "Friend request already exists" });

          db.query(
            "INSERT INTO friend_requests (requester_id, recipient_id, status, created_date) VALUES (?, ?, 'pending', ?)",
            [requesterId, recipientId, now()],
            (err3) => {
              if (err3) return res.status(500).json({ type: "error", message: "Database error", details: err3.code });
              res.status(201).json({ type: "success", message: "Friend request sent" });
            }
          );
        }
      );
    }
  );
});

// --------------------------------------------------
// ACCEPT FRIEND REQUEST
// POST /api/friends/:id/accept
// --------------------------------------------------
router.post("/:id/accept", auth, (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;

  db.query(
    "SELECT requester_id FROM friend_requests WHERE id = ? AND recipient_id = ? AND status = 'pending'",
    [requestId, userId],
    (err, results) => {
      if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
      if (results.length === 0) return res.status(404).json({ type: "error", message: "Friend request not found" });

      const requesterId = results[0].requester_id;

      db.beginTransaction(txErr => {
        if (txErr) return res.status(500).json({ type: "error", message: "Transaction error" });

        db.query(
          "INSERT INTO friends (user_id, friend_id, created_date) VALUES (?, ?, ?), (?, ?, ?)",
          [userId, requesterId, now(), requesterId, userId, now()],
          err2 => {
            if (err2) return db.rollback(() => res.status(500).json({ type: "error", message: "Database error", details: err2.code }));

            db.query("DELETE FROM friend_requests WHERE id = ?", [requestId], err3 => {
              if (err3) return db.rollback(() => res.status(500).json({ type: "error", message: "Database error", details: err3.code }));

              db.commit(commitErr => {
                if (commitErr) return db.rollback(() => res.status(500).json({ type: "error", message: "Commit failed" }));
                res.json({ type: "success", message: "Friend request accepted" });
              });
            });
          }
        );
      });
    }
  );
});

// --------------------------------------------------
// DECLINE FRIEND REQUEST
// POST /api/friends/:id/decline
// --------------------------------------------------
router.post("/:id/decline", auth, (req, res) => {
  db.query(
    "DELETE FROM friend_requests WHERE id = ? AND recipient_id = ? AND status = 'pending'",
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
      if (result.affectedRows === 0) return res.status(404).json({ type: "error", message: "Friend request not found" });
      res.json({ type: "success", message: "Friend request declined" });
    }
  );
});

// --------------------------------------------------
// CANCEL OUTGOING FRIEND REQUEST
// POST /api/friends/:id/cancel
// --------------------------------------------------
router.post("/:id/cancel", auth, (req, res) => {
  db.query(
    "DELETE FROM friend_requests WHERE id = ? AND requester_id = ? AND status = 'pending'",
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
      if (result.affectedRows === 0) return res.status(404).json({ type: "error", message: "Friend request not found" });
      res.json({ type: "success", message: "Outgoing friend request cancelled" });
    }
  );
});

// --------------------------------------------------
// REMOVE FRIEND
// DELETE /api/friends/:id
// --------------------------------------------------
router.delete("/:id", auth, (req, res) => {
  const friendId = req.params.id;
  const userId = req.user.id;

  db.query(
    "DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
    [userId, friendId, friendId, userId],
    (err, result) => {
      if (err) return res.status(500).json({ type: "error", message: "Database error", details: err.code });
      if (result.affectedRows === 0) return res.status(404).json({ type: "error", message: "Friend not found" });
      res.json({ type: "success", message: "Friend removed" });
    }
  );
});

module.exports = router;