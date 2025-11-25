// frontend/context/AuthContext.js
'use client';
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../lib/api';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // fetchUser'ı dışarı taşıdık ki her yerden erişebilelim
  const fetchUser = async () => {
    try {
      const { data } = await api.get('/users/me/');
      setUser(data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.warn("Session expired or invalid token.");
      } else {
        console.error("Failed to fetch user", error);
      }
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    const { data } = await api.post('/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    localStorage.setItem('token', data.access_token);
    // Interceptor handles the header
    await fetchUser();
  };

  const register = async (email, password) => {
    const { data } = await api.post('/users/', {
      email,
      password
    });
    // Login sonrası JWT token al
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    const loginResponse = await api.post('/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    localStorage.setItem('token', loginResponse.data.access_token);
    // Interceptor handles the header
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
  };

  return (
    // YENİ: value objesine fetchUser'ı ekledik
    <AuthContext.Provider value={{ user, login, logout, register, loading, fetchUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);