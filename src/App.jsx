import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Items from "./pages/Items.jsx";
import StockIn from "./pages/StockIn.jsx";
import StockOut from "./pages/StockOut.jsx";
import Accounting from "./pages/Accounting.jsx";
import Billing from "./pages/Billing.jsx";
import NewBill from "./pages/NewBill.jsx";
import InvoiceView from "./pages/InvoiceView.jsx";
import Login from "./pages/Login.jsx";

const USERS = {
  sumyaa: { password: "1900", role: "user" },
  mandar: { password: "1800", role: "admin" },
};
const KEY = "transport-auth";

export default function App() {
  const [authed, setAuthed] = useState(() => {
    const saved = localStorage.getItem(KEY);
    return saved && USERS[saved] ? saved : null;
  });

  function login(username, password) {
    const u = USERS[username];
    if (u && u.password === password) {
      localStorage.setItem(KEY, username);
      setAuthed(username);
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem(KEY);
    setAuthed(null);
  }

  if (!authed) return <Login onLogin={login} />;

  return (
    <Routes>
      <Route element={<Layout user={authed} role={USERS[authed].role} onLogout={logout} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/billing/new" element={<NewBill user={authed} />} />
        <Route path="/billing/:id" element={<InvoiceView user={authed} />} />
        <Route path="/items" element={<Items />} />
        <Route path="/stock-in" element={<StockIn />} />
        <Route path="/stock-out" element={<StockOut />} />
        <Route path="/accounting" element={<Accounting />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
