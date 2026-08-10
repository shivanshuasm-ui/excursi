"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiJson, tokenStore } from "@/lib/client";
import type { AuthResponse, AuthUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setUser(tokenStore.user);
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiJson<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    tokenStore.setSession(session);
    setUser(session.user);
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      const session = await apiJson<AuthResponse>("/auth/signup", {
        method: "POST",
        body: { name, email, password },
      });
      tokenStore.setSession(session);
      setUser(session.user);
    },
    [],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout }),
    [user, loading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
