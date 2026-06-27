import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CurrentUser } from "../types";
import { fetchCurrentUser, loginAccount, logoutAccount, registerAccount, googleLogin } from "./api";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (payload: { email: string; password: string }) => Promise<CurrentUser>;
  register: (payload: {
    name: string;
    email: string;
    phone: string;
    wilaya: string;
    password: string;
  }) => Promise<CurrentUser>;
  loginWithGoogle: (idToken: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  setUser: (user: CurrentUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On load, ask the server who (if anyone) the session cookie belongs to.
  // Real accounts now live server-side — there is nothing to read from
  // localStorage anymore.
  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(payload: { email: string; password: string }) {
    const loggedInUser = await loginAccount(payload);
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function register(payload: {
    name: string;
    email: string;
    phone: string;
    wilaya: string;
    password: string;
  }) {
    const newUser = await registerAccount(payload);
    setUser(newUser);
    return newUser;
  }

  async function loginWithGoogle(idToken: string) {
    const loggedInUser = await googleLogin(idToken);
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function logout() {
    await logoutAccount().catch(() => {});
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
