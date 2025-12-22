// Layout.jsx
import Header from "./Header";
import Footer from "./Footer";
import Messages from "./Messages";

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <Header />
      <Messages />
      <main className="page-container">
        {children}
      </main>
      <Footer />
    </div>
  );
}