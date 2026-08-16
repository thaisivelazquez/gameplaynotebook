import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const stored = localStorage.getItem('pickem_auth');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((user, token) => {
    const value = { user, token };
    localStorage.setItem('pickem_auth', JSON.stringify(value));
    setAuth(value);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pickem_auth');
    setAuth(null);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
