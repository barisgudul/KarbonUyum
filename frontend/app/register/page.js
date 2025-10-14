// frontend/app/register/page.js
'use client';
import { useState } from 'react';
import api from '../../lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Backend'deki şifre kuralıyla uyumlu (min_length=8)
    if (password.length < 8) {
        setError("Şifre en az 8 karakter olmalıdır.");
        return;
    }

    try {
      await api.post('/users/', { email, password });
      setSuccess(true);
      // Başarılı kayıt sonrası 2 saniye bekleyip login sayfasına yönlendir
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Kayıt başarısız oldu. Bu email adresi zaten kullanılıyor olabilir.');
    }
  };

  // Başarılı kayıt sonrası gösterilecek ekran
  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-green-600">Kayıt Başarılı!</h1>
          <p className="mt-2 text-gray-700">Giriş sayfasına yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Hesap Oluştur</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta Adresiniz" required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifre (en az 8 karakter)" required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
            Kayıt Ol
          </button>
          {error && <p className="mt-4 text-center text-red-600 text-sm">{error}</p>}
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Zaten bir hesabın var mı?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-semibold">
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}