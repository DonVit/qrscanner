import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

export interface AuthUser {
  id: string;
  username: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
};

const persistConfig = {
  key: "auth",
  storage,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{ user: AuthUser; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
export default persistReducer(persistConfig, authReducer);
