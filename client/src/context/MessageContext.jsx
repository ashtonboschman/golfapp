import { createContext, useState, useContext, useCallback } from "react";

const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
  const [message, setMessage] = useState("");
  const [type, setType] = useState("success");

  const showMessage = useCallback((msg, msgType = "success") => {
    setMessage(msg);
    setType(msgType);
  }, []);

  const clearMessage = useCallback(() => setMessage(""), []);

  return (
    <MessageContext.Provider value={{ message, type, showMessage, clearMessage }}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessage = () => useContext(MessageContext);