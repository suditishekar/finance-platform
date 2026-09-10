import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiRequest, clearToken, getToken, setToken, setUnauthorizedHandler } from '../services/api';
import type { LoginData, User } from '../types/api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(getToken()));

  const logout = () => {
    clearToken();
    setUser(null);
  };

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) {
      setIsLoading(false);
      return;
    }

    apiRequest<{ user: User }>('/auth/me')
      .then(data => setUser(data.user))
      .catch(() => logout())
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiRequest<LoginData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    await apiRequest<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  };

  const value = useMemo(() => ({ user, isLoading, login, register, logout }), [user, isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
