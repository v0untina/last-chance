import { create } from "zustand";
import { api } from "@/lib/api";

const TOKEN_KEY = "algo.auth.token";

export interface User {
  user_id: number;
  username: string;
  email: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: getStoredToken(),
  loading: true,

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    const { user, token } = data.data;
    setStoredToken(token);
    set({ user, token });
  },

  register: async (username, email, password) => {
    const { data } = await api.post("/auth/register", { username, email, password });
    const { user, token } = data.data;
    setStoredToken(token);
    set({ user, token });
  },

  logout: () => {
    setStoredToken(null);
    set({ user: null, token: null });
  },

  loadUser: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data.data, token, loading: false });
    } catch {
      setStoredToken(null);
      set({ user: null, token: null, loading: false });
    }
  },
}));
