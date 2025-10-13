// frontend/lib/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Token'ı her isteğe otomatik ekleyen sihirli kısım (interceptor)
api.interceptors.request.use(
  (config) => {
    // Tarayıcı ortamında çalışıyorsak localStorage'dan token'ı al
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;