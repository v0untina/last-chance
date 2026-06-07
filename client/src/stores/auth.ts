import { create } from "zustand";
import { api } from "@/lib/api";
import type { User, Role } from "@/types/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

// Публичный режим — пользователь всегда "гость" с правами на чтение
const GUEST: User = {
  user_id: 0,
  username: "Гость",
  email: "guest@local",
  role: "student",
};

export const useAuth = create<AuthState>((set, get) => ({
  user: GUEST,
  loading: false,
  initialized: true,

  initialize: async () => {
    set({ initialized: true });
  },

  logout: () => {
    set({ user: GUEST });
  },

  hasRole: (...roles) => {
    const u = get().user;
    return u ? roles.includes(u.role) : false;
  },
}));
