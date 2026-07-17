import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Organization, AuthTokens } from "@/lib/api";

interface AuthState {
  user: User | null;
  organization: Organization | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  setAuth: (user: User, organization: Organization, tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  setOrganization: (organization: Organization) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      tokens: null,
      isAuthenticated: false,
      setAuth: (user, organization, tokens) =>
        set({ user, organization, tokens, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      setOrganization: (organization) => set({ organization }),
      logout: () =>
        set({ user: null, organization: null, tokens: null, isAuthenticated: false }),
    }),
    { name: "optimiza-crm-auth" }
  )
);


interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  toggleCollapsed: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isOpen: false,
      isCollapsed: false,
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      setOpen: (open) => set({ isOpen: open }),
      toggleCollapsed: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
    }),
    { name: "optimiza-crm-sidebar" }
  )
);
