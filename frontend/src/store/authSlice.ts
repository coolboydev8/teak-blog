import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Idle timeout: users are logged out after 1 hour of INACTIVITY. The window
// slides forward on user activity (see touchSession), so an actively-used
// session never expires. The backend refresh token is the longer absolute cap.
export const IDLE_TIMEOUT_MS = 60 * 60 * 1000;

interface AuthState {
  user: any | null;
  token: string | null;
  refreshToken: string | null;
  sessionExpiry: number | null; // epoch ms of the idle deadline (slides on activity)
}

function loadInitialState(): AuthState {
  const expiryRaw = localStorage.getItem('sessionExpiry');
  const sessionExpiry = expiryRaw ? Number(expiryRaw) : null;
  // A session that has already elapsed is treated as logged out on load.
  if (sessionExpiry && Date.now() > sessionExpiry) {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('sessionExpiry');
    return { user: null, token: null, refreshToken: null, sessionExpiry: null };
  }
  return {
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token'),
    refreshToken: localStorage.getItem('refreshToken'),
    sessionExpiry,
  };
}

const initialState: AuthState = loadInitialState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: any; access: string; refresh: string }>
    ) => {
      const { user, access, refresh } = action.payload;
      state.user = user;
      state.token = access;
      state.refreshToken = refresh;
      // Start the idle window at login; it slides forward as the user is active.
      state.sessionExpiry = Date.now() + IDLE_TIMEOUT_MS;
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('sessionExpiry', String(state.sessionExpiry));
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      localStorage.setItem('token', action.payload);
    },
    touchSession: (state) => {
      // Slide the idle deadline forward on user activity. No-op when logged out
      // or already expired (the timer/guard handles the actual logout).
      if (state.user && state.sessionExpiry && Date.now() < state.sessionExpiry) {
        state.sessionExpiry = Date.now() + IDLE_TIMEOUT_MS;
        localStorage.setItem('sessionExpiry', String(state.sessionExpiry));
      }
    },
    setUser: (state, action: PayloadAction<any>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    logOut: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.sessionExpiry = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('sessionExpiry');
    },
  },
});

export const { setCredentials, setAccessToken, touchSession, setUser, logOut } = authSlice.actions;
export default authSlice.reducer;
