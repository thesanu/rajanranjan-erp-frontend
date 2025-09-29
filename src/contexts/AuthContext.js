// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import * as authService from '../services/authService';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser?.token) {
        setUser(parsedUser);
        setLoading(false); // ✅ Don't fetch again if valid user with token
        return;
      }
    }

    const fetchSession = async () => {
      try {
        const sessionUser = await authService.checkSession();

        if (sessionUser) {
          const normalizedUser = {
            userID: sessionUser.userId, // ✅ Backend returns userId (lowercase)
            username: sessionUser.username,
            fullName: sessionUser.fullName,
            role: sessionUser.role,
            companyProfileId: sessionUser.companyProfileId,
            token: 'cookie' // ✅ Placeholder token for cookie-based auth
          };

          setUser(normalizedUser);
          localStorage.setItem('user', JSON.stringify(normalizedUser));
        } else {
          setUser(null);
          localStorage.removeItem('user');
        }
      } catch {
        setUser(null);
        localStorage.removeItem('user');
        setError('Session expired or not authenticated.');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.login(credentials);
       console.log('Full login response:', response); // ✅ ADD THIS LINE
    console.log('User from response:', response.user); // ✅ ADD THIS LINE

      const normalizedUser = {
        userID: response.user.userID, // ✅ FIXED: Backend returns userID (uppercase)
        username: response.user.username,
        fullName: response.user.fullName,
        role: response.user.role,
        companyProfileId: response.user.companyProfileId,
        token: response.token || 'cookie', // fallback token for cookie-based auth
      };

      setUser(normalizedUser);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      navigate('/');
      return response;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      await authService.logout();
      setUser(null);
      localStorage.removeItem('user');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const roleFlags = useMemo(
    () => ({
      isGlobalAdmin: user?.role === 'GlobalAdmin',
      isAdmin: user?.role === 'Admin',
      isUser: user?.role === 'User',
    }),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error, ...roleFlags }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);