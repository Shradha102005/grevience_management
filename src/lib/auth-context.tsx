import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import api from "./api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "citizen" | "officer" | "admin";
  is_active: boolean;
  phone_number?: string | null;
  zone?: string | null;
  created_at: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

// SSR-safe localStorage helper
const getLocalStorage = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
};

const setLocalStorage = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value);
};

const removeLocalStorage = (key: string): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Hydrate from localStorage on first render (client only)
    const stored = getLocalStorage("civicos_user");
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Verify token with backend on mount
  useEffect(() => {
    const token = getLocalStorage("access_token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    api
      .get<AuthUser>("/api/auth/me")
      .then(({ data }) => {
        setUser(data);
        setLocalStorage("civicos_user", JSON.stringify(data));
      })
      .catch((error: any) => {
        // Only clear if auth definitively failed, avoid clearing on network errors (server restarts)
        if (error.response?.status === 401 || error.response?.status === 403) {
          removeLocalStorage("access_token");
          removeLocalStorage("civicos_user");
          setUser(null);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ access_token: string; user: AuthUser }>(
      "/api/auth/login",
      { email, password },
    );
    setLocalStorage("access_token", data.access_token);
    setLocalStorage("civicos_user", JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, role: string) => {
      const { data } = await api.post<{ access_token: string; user: AuthUser }>(
        "/api/auth/register",
        { name, email, password, role },
      );
      setLocalStorage("access_token", data.access_token);
      setLocalStorage("civicos_user", JSON.stringify(data.user));
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      removeLocalStorage("access_token");
      removeLocalStorage("civicos_user");
      setUser(null);
      if (typeof window !== "undefined") window.location.href = "/login";
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
