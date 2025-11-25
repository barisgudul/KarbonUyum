// frontend/lib/api.js
import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
});

// Token'ı her isteğe otomatik ekleyen interceptor
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
    console.error("API Request Error:", {
      message: error.message,
      code: error.code,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        headers: error.config?.headers
      },
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No response received'
    });
    return Promise.reject(error);
  }
);

// YENİ: Response interceptor - Rate limiting ve diğer hataları yakalama
api.interceptors.response.use(
  (response) => response,  // Başarılı yanıtlar olduğu gibi geçer
  (error) => {
    // Rate limiting hatası (429 Too Many Requests)
    if (error.response && error.response.status === 429) {
      toast.error(
        '⏱️ Çok fazla istek gönderdiniz. Lütfen bir dakika sonra tekrar deneyin.',
        {
          duration: 5000,
          icon: '⚠️',
        }
      );
    }

    // Sunucu hatası (500+)
    else if (error.response && error.response.status >= 500) {
      toast.error(
        'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
        {
          duration: 4000,
          icon: '🔧',
        }
      );
    }

    // Diğer hataları olduğu gibi döndür (component'lerde yakalanacak)
    return Promise.reject(error);
  }
);

export default api;