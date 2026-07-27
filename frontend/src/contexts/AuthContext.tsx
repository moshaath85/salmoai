import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { AUTH_TOKEN_KEY, apiClient } from '../lib/sdk';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  avatar?: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  setToken: (token: string) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const userData = await apiClient.get<User>('/api/v1/auth/me');
      setUser(userData);
    } catch (err: any) {
      // If 401, token is invalid — clear it
      if (err?.status === 401 || err?.response?.status === 401) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = () => {
    window.location.href = '/login';
  };

  const logout = async () => {
    try {
      setError(null);
      await apiClient.post('/api/v1/auth/logout');
    } catch (err) {
      // Logout endpoint may fail if token already expired, that's fine
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setUser(null);
      window.location.href = '/';
    }
  };

  const setToken = async (token: string) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setLoading(true);
    await fetchUser();
  };

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    refetch: fetchUser,
    setToken,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AUTH_TOKEN_KEY };