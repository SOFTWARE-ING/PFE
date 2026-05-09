import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { UserInfo } from "../types";
import { authAPI, tokenStorage, userStorage } from "../services/api";

interface AuthContextValue {
  user: UserInfo | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (token: string, user: UserInfo) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(userStorage.get());
  const [token, setToken] = useState<string | null>(tokenStorage.get());
  const [isLoading, setIsLoading] = useState(true);

  // On mount, verify stored token is still valid
  useEffect(() => {
    const storedToken = tokenStorage.get();
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    authAPI
      .getMe()
      .then((me) => {
        setUser(me);
        userStorage.set(me);
        setToken(storedToken);
      })
      .catch(() => {
        tokenStorage.remove();
        userStorage.remove();
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setAuth = useCallback((newToken: string, newUser: UserInfo) => {
    tokenStorage.set(newToken);
    userStorage.set(newUser);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.remove();
    userStorage.remove();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        setAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
