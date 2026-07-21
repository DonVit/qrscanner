import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess, logout } from "../../slices/authSlice";

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
    setPassword("");
  };

  const handleLogout = () => {
    dispatch(logout());
    setUsername("");
    setPassword("");
  };

  const handleSocialLogin = (provider) => {
    // Open backend OAuth start endpoint in new window/tab
    // backend will redirect to provider and then callback to /auth/:provider/callback
    window.location.href = `/auth/${provider}`;
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
      <input
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        placeholder="Username"
        className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
      />
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
        className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
      />
      <button
        type="submit"
        className="bg-gray-900 text-white dark:bg-gray-200 dark:text-black rounded px-3 py-1 text-sm hover:opacity-90"
      >
        {mode === "register" ? "Register" : "Sign in"}
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          className="border rounded px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Sign in with Google
        </button>
        <button
          type="button"
          onClick={() => handleSocialLogin("facebook")}
          className="border rounded px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Sign in with Facebook
        </button>
      </div>
      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="border rounded px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        {mode === "login" ? "Register" : "Sign in"}
      </button>
    </form>
  );
}
