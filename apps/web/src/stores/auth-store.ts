import { api } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/constants";
import type { User } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

interface AuthResponse {
  user: User;
  token: string;
}

function persistToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const data = await api.post<AuthResponse>("/auth/sign-in", { email, password });
        persistToken(data.token);
        set({ user: data.user, token: data.token, isAuthenticated: true });
      },

      register: async (name, email, password) => {
        const data = await api.post<AuthResponse>("/auth/sign-up", { name, email, password });
        persistToken(data.token);
        set({ user: data.user, token: data.token, isAuthenticated: true });
      },

      logout: () => {
        persistToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "kronostore-auth",
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          persistToken(state.token);
        }
      },
    },
  ),
);
