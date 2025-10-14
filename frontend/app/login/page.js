// frontend/app/login/page.js
'use client';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push('/dashboard'); // Başarılı girişte dashboard'a yönlendir
    } catch (error) {
      alert('Giriş başarısız oldu! Email veya şifre hatalı.');
      console.error(error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto' }}>
      <h1>Giriş Yap</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre"
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px' }}>
          Giriş Yap
        </button>
      </form>
      <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
      Hesabın yok mu?{' '}
      <Link href="/register" style={{ color: '#2563EB', textDecoration: 'underline' }}>
        Kayıt Ol
      </Link>
    </p>
    </div>
  );
}