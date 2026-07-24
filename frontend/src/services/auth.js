import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, getMe } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('opcrime_token'));
  const [role, setRole] = useState(localStorage.getItem('opcrime_role'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getMe()
        .then((res) => {
          setUser(res.data);
          setRole(res.data.role || localStorage.getItem('opcrime_role'));
        })
        .catch(() => {
          // On failure use stored role — don't auto-logout
          const storedRole = localStorage.getItem('opcrime_role');
          if (storedRole && storedRole !== 'undefined') {
            setRole(storedRole);
          } else {
            logout();
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await apiLogin(email, password);
    const { access_token, role: userRole } = res.data;
    localStorage.setItem('opcrime_token', access_token);
    localStorage.setItem('opcrime_role', userRole);
    setToken(access_token);
    setRole(userRole);
    return userRole;
  };

  const register = async (name, email, password, userRole) => {
    const res = await apiRegister(name, email, password, userRole);
    return res.data;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('opcrime_token');
    localStorage.removeItem('opcrime_role');
    localStorage.removeItem('opcrime_user');
    setToken(null);
    setUser(null);
    setRole(null);
  }, []);

  const isAuthenticated = () => !!token;

  return (
    <AuthContext.Provider
      value={{ user, token, role, login, register, logout, isAuthenticated, loading }}
    >
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

export default AuthContext;
