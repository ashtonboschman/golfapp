import { useEffect, useRef } from "react";
import { useMessage } from "../context/MessageContext";

export default function Messages({ duration = 5000 }) {
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
  return <p className={`message ${type === "error" ? "error" : "success"}`}>{message}</p>;
}