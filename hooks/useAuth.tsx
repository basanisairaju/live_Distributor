import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
// FIX: Moved PortalState to types.ts and imported it here to break a circular dependency.
import { User, UserRole, PortalState } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userRole: UserRole | null;
  portal: PortalState | null;
  setPortal: (portal: PortalState | null) => void;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

// Provide a default value that matches the context type to ensure stability.
const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    userRole: null,
    portal: null,
    setPortal: () => {},
    login: async () => {},
    logout: () => {},
    isLoading: true,
});

const USER_SESSION_KEY = 'distributorAppSession';
const PORTAL_SESSION_KEY = 'distributorAppPortal';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [portal, setPortalState] = useState<PortalState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = () => {
        try {
          const savedSessionJson = sessionStorage.getItem(USER_SESSION_KEY);
          const savedPortalJson = sessionStorage.getItem(PORTAL_SESSION_KEY);
          if (savedSessionJson) {
            const user: User = JSON.parse(savedSessionJson);
            setCurrentUser(user);
          }
          if (savedPortalJson) {
            const portal: PortalState = JSON.parse(savedPortalJson);
            setPortalState(portal);
          }
        } catch (error) {
          console.error("Failed to restore session from storage:", error);
          sessionStorage.clear();
        } finally {
          setIsLoading(false);
        }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    const user = await api.login(email, pass);
    setCurrentUser(user);
    sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
  }, []);
  
  const setPortal = useCallback((newPortal: PortalState | null) => {
      if (newPortal) {
          sessionStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(newPortal));
      } else {
          sessionStorage.removeItem(PORTAL_SESSION_KEY);
      }
      setPortalState(newPortal);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setCurrentUser(null);
    setPortal(null);
    sessionStorage.removeItem(USER_SESSION_KEY);
    sessionStorage.removeItem(PORTAL_SESSION_KEY);
  }, [setPortal]);

  const value = useMemo(() => ({
    currentUser,
    userRole: currentUser?.role || null,
    portal,
    setPortal,
    login,
    logout,
    isLoading,
  }), [currentUser, portal, isLoading, login, logout, setPortal]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  // The context will now always have a value, so the undefined check is no longer needed.
  return useContext(AuthContext);
};