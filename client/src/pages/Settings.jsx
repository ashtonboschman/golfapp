import React from "react";

export default function Settings() {
  const cardStyle = {
    background: "#fff",
    padding: "15px",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    marginTop: "15px",
  };

  return (
    <div style={{ padding: "15px", maxWidth: "100%", margin: "auto" }}>
      <div style={cardStyle}>
        <p>Manage preferences, app behavior, and more ⚙️</p>
      </div>
    </div>
  );
}
