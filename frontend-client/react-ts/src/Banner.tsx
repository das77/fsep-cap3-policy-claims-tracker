import { Link } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function Banner() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="app-banner">
      <Link to="/" className="app-banner-title">
        Welcome, {user.name}
      </Link>
      <nav className="app-banner-nav">
        <Link to="/">Dashboard</Link>
        <Link to="/claims">Claims</Link>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </nav>
    </header>
  );
}
