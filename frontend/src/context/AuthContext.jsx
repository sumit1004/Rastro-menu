import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('rastro_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const verifyToken = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('rastro_user'));
      if (!storedUser?.token) return;

      const { data } = await api.get('/auth/me');
      
      const updatedUser = { ...storedUser, ...data };
      localStorage.setItem('rastro_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      console.error('Failed to verify token:', err);
      logout();
    }
  };

  const login = (userData) => {
    localStorage.setItem('rastro_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('rastro_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, verifyToken }}>
      {children}
    </AuthContext.Provider>
  );
};
