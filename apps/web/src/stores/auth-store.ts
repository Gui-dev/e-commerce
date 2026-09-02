import { api } from "@/lib/api";
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const data = await api.post<AuthResponse>("/auth/sign-in", { email, password });
        set({ user: data.user, token: data.token, isAuthenticated: true });
      },

      register: async (name, email, password) => {
        const data = await api.post<AuthResponse>("/auth/sign-up", { name, email, password });
        set({ user: data.user, token: data.token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "kronostore-auth",
    },
  ),
);
