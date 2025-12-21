import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, LoginCredentials, RegisterData, AuthResponse, ApiResponse } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<ApiResponse<User>>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token and user on mount
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await authApi.login(credentials);
    
    if (response.success && response.access_token && response.data) {
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.data));
      setUser(response.data);
    }
    
    return response;
  };

  const register = async (data: RegisterData): Promise<ApiResponse<User>> => {
    return authApi.register(data);
  };

  const logout = () => {
    void authApi.logout();
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
