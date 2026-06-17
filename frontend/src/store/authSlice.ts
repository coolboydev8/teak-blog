import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: any | null;
  token: string | null;
  refreshToken: string | null;
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
};

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
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);
    },
    logOut: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    },
  },
});

export const { setCredentials, logOut } = authSlice.actions;
export default authSlice.reducer;
