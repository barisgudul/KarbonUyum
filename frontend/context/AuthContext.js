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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/users/me/');
      setUser(data);
    } catch (error) {
      console.error("Failed to fetch user, token might be invalid", error);
      localStorage.removeItem('token'); // Geçersiz token'ı temizle
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    // FastAPI'nin /token endpoint'i 'application/x-www-form-urlencoded' bekler
    const params = new URLSearchParams();
    params.append('username', email); // FastAPI'nin OAuth2 standardı 'username' bekler
    params.append('password', password);

    const { data } = await api.post('/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    localStorage.setItem('token', data.access_token);
    api.defaults.headers.Authorization = `Bearer ${data.access_token}`; // axios instance'ını anında güncelle
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.Authorization;
    setUser(null);
    router.push('/login'); // Çıkış yapınca login sayfasına yönlendir
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);