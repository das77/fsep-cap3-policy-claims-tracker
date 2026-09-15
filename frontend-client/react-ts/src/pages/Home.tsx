import { useAuth } from "../useAuth";

// Placeholder — the real dashboard is a separate task.
// Rendered only inside ProtectedRoute, so `user` is always set here.
export default function Home() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <section>
      <h1>Welcome, {user.name}</h1>
      <button type="button" onClick={logout}>
        Log out
      </button>
    </section>
  );
}
