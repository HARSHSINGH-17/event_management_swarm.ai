import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
}

// ── Demo user for hackathon demo (no backend required) ──────────────────────
const DEMO_USER: User = {
  id: "demo-001",
  email: "demo@eventswarm.ai",
  name: "Demo User",
  role: "admin",
};

const DEMO_PASSWORD = "demo123";
const STORAGE_KEY = "swarm_auth_user";

// ── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Demo shortcut — works without any backend
      if (email === DEMO_USER.email && password === DEMO_PASSWORD) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USER));
        localStorage.removeItem("swarm_token");
        setUser(DEMO_USER);
        return;
      }

      // Real backend auth
      try {
        const res = await fetch("http://localhost:8000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (res.ok) {
          const data = await res.json();
          // Map backend camelCase fields to our User type
          const loggedInUser: User = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.fullName || data.user.name || email.split("@")[0],
            role: data.user.role === "admin" ? "admin" : "user",
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedInUser));
          // Store JWT token for API calls
          if (data.token) localStorage.setItem("swarm_token", data.token);
          if (data.refreshToken) localStorage.setItem("swarm_refresh_token", data.refreshToken);
          setUser(loggedInUser);
          return;
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Invalid email or password");
      } catch (err: any) {
        throw err;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // backend expects full_name (snake_case)
        body: JSON.stringify({ full_name: name, email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        const newUser: User = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.fullName || name,
          role: data.user.role === "admin" ? "admin" : "user",
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
        if (data.token) localStorage.setItem("swarm_token", data.token);
        if (data.refreshToken) localStorage.setItem("swarm_refresh_token", data.refreshToken);
        setUser(newUser);
        return;
      }

      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("swarm_token");
    localStorage.removeItem("swarm_refresh_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
