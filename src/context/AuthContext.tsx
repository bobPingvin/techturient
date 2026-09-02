import React, { createContext, useContext, useState, useEffect } from 'react';
import { logAction } from '../lib/logger';

interface UserSession {
  username: string;
  role: string;
  loginTime: number;
}

interface AuthContextType {
  user: UserSession | null;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('nek_auth_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse saved auth', e);
    }
    return null;
  });

  const login = async (username: string, pass: string): Promise<boolean> => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = pass.trim();

    // Check predefined commission credentials: nekpriem / nek12345678
    if ((cleanUser === 'nekpriem' || cleanUser === 'nekpriem@nek.ru') && cleanPass === 'nek12345678') {
      const session: UserSession = {
        username: 'nekpriem',
        role: 'Сотрудник приёмной комиссии',
        loginTime: Date.now(),
      };
      setUser(session);
      localStorage.setItem('nek_auth_user', JSON.stringify(session));
      await logAction('nekpriem', 'LOGIN', 'Сотрудник вошёл в систему');
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nek_auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
