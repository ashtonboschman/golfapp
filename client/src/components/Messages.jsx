import { useEffect, useRef } from "react";
import { useMessage } from "../context/MessageContext";

export default function Messages({ duration = 3000 }) {
  const { message, type, clearMessage } = useMessage();
  const lastMessageRef = useRef("");

  useEffect(() => {
    if (!message || lastMessageRef.current === message) return;

    lastMessageRef.current = message;
    const timer = setTimeout(() => {
      clearMessage();
      lastMessageRef.current = "";
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, clearMessage]);

  if (!message) return null;

  const isError = type === "error";

  return (
    <div className={`message-toast ${isError ? "error" : "success"}`}>
      <span className="message-emoji">
        {isError ? "⚠️" : "✅"}
      </span>
      <span>{message}</span>
    </div>
  );
}