// src/store/useAuthStore.ts — JWT auth state (persisted in localStorage)
import { create } from "zustand";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const isBrowser = typeof window !== "undefined";

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: isBrowser ? localStorage.getItem("taxease_token") : null,
  user: (() => {
    if (!isBrowser) return null;
    try { return JSON.parse(localStorage.getItem("taxease_user") ?? "null"); } catch { return null; }
  })(),

  login: (token, user) => {
    if (isBrowser) {
      localStorage.setItem("taxease_token", token);
      localStorage.setItem("taxease_user", JSON.stringify(user));
    }
    set({ token, user });
  },

  logout: () => {
    if (isBrowser) {
      localStorage.removeItem("taxease_token");
      localStorage.removeItem("taxease_user");
    }
    set({ token: null, user: null });
    window.location.href = "/login";
  },

  isAuthenticated: () => !!get().token,
}));
