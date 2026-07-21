import { describe, expect, it } from "vitest";
import { authReducer, loginSuccess, logout } from "./authSlice";

describe("auth reducer", () => {
  it("stores the authenticated user and token", () => {
    const state = authReducer(
      undefined,
      loginSuccess({
        user: { id: "user-1", username: "demo" },
        token: "token-123",
      })
    );

    expect(state.user?.username).toBe("demo");
    expect(state.token).toBe("token-123");
  });

  it("clears auth state on logout", () => {
    const state = authReducer(
      {
        user: { id: "user-1", username: "demo" },
        token: "token-123",
      },
      logout()
    );

    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });
});
