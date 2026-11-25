import { NavLink, Outlet } from "react-router-dom";
import Logo from "./Logo.jsx";

const links = [
  ["/", "Dashboard"],
  ["/billing", "Billing"],
  ["/items", "Items"],
  ["/stock-in", "Stock in"],
  ["/stock-out", "Stock out"],
  ["/accounting", "Accounting"],
];

export default function Layout({ user, role, onLogout }) {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><Logo size={36} />SM TRANSPORT</div>
        <nav aria-label="Main">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="who">
          <span>
            <strong>{user}</strong>
            {role}
          </span>
          <button className="ghost" onClick={onLogout}>Log out</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
