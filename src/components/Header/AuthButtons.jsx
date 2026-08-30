import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess, logout } from "../../slices/authSlice";
import { syncPendingReceiptsRequested } from "../../slices/receptsSlice";
import { clearSaveStatus } from "../../slices/saveStatusSlice";

const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
    : window.location.origin);

export default function AuthButtons() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");

  const isSignedIn = useMemo(() => Boolean(auth?.user && auth?.token), [auth?.user, auth?.token]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password.trim()) {
      return;
    }

    const normalizedMode = mode === "register" ? "register" : "login";
    const token = `${normalizedMode}:${trimmedUsername}:${password}`;
    dispatch(
      loginSuccess({
        user: { id: `user-${trimmedUsername.toLowerCase()}`, username: trimmedUsername },
        token,
      })
    );
    dispatch(clearSaveStatus());
    dispatch(syncPendingReceiptsRequested());
    setPassword("");
  };

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearSaveStatus());
    setUsername("");
    setPassword("");
  };

  const handleSocialLogin = (provider) => {
    window.location.href = `${AUTH_BASE_URL}/auth/${provider}`;
  };

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700 dark:text-gray-200">{auth.user?.username}</span>
        <button
          onClick={handleLogout}
          className="border rounded px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          className="border rounded px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Sign in with Google
        </button>
      </div>
    </form>
  );
}
