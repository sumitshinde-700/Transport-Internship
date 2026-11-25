import { useState } from "react";

import Logo from "../components/Logo.jsx";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (onLogin(username.trim(), password)) return;
    setError("Username or password is wrong. Check both and try again.");
  }

  return (
    <div className="login">
      <div className="login-side">
        <div className="brand"><Logo size={52} />SM</div>
        <p>Stock, bills and accounts in one place.</p>
      </div>
      <div className="login-main">
        <form onSubmit={submit}>
          <h2>Log in</h2>
          <label className="field">
            <span>Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit">Log in</button>
        </form>
      </div>
    </div>
  );
}
