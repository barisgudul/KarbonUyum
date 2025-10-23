// frontend/app/register/page.js
'use client';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Leaf, Mail, Lock, UserPlus, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { register } = useAuth();
  const router = useRouter();

  const checkPasswordStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.match(/[a-z]/) && pwd.match(/[A-Z]/)) strength++;
    if (pwd.match(/\d/)) strength++;
    if (pwd.match(/[\W]/)) strength++;
    setPasswordStrength(strength);
    return strength;
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    checkPasswordStrength(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== passwordConfirm) {
      toast.error('Şifreler eşleşmiyor!');
      return;
    }

    if (password.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır!');
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password);
      toast.success('Hesap başarıyla oluşturuldu! Giriş yapılıyor...');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Kayıt başarısız oldu!');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const strengthLabels = ['Çok Zayıf', 'Zayıf', 'Orta', 'İyi', 'Çok İyi'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-green-500 opacity-20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500 opacity-20 rounded-full blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Leaf className="w-8 h-8 text-green-400" />
            <h1 className="text-3xl font-bold text-white">KarbonUyum</h1>
          </div>
          <p className="text-green-200 text-sm">Karbon Ayak İzi Yönetim Platformu</p>
        </div>

        {/* Register Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-2">Kayıt Ol</h2>
          <p className="text-green-200 text-sm mb-8">Yeni bir hesap oluştur ve başla</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-green-200 mb-2">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-green-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@sirket.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-green-300/50 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-green-200 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-green-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="En az 8 karakter"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-green-300/50 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition"
                />
              </div>
              
              {password && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-green-200">Şifre Gücü:</span>
                    <span className={`text-xs font-semibold ${strengthColors[passwordStrength - 1]?.replace('bg-', 'text-')}`}>
                      {strengthLabels[passwordStrength - 1]}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${strengthColors[passwordStrength - 1]} transition-all`} style={{ width: `${(passwordStrength / 4) * 100}%` }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Password Confirm Field */}
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-green-200 mb-2">
                Şifreyi Onayla
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-green-400" />
                <input
                  id="passwordConfirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Şifreyi tekrar girin"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-green-300/50 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition"
                />
              </div>
              
              {passwordConfirm && (
                <div className="mt-2 flex items-center gap-2">
                  {password === passwordConfirm ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-green-400">Şifreler eşleşiyor</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-xs text-red-400">Şifreler eşleşmiyor</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-green-500 focus:ring-green-400"
              />
              <label htmlFor="terms" className="text-sm text-green-200">
                <span>Hizmet Şartları&apos;nı ve Gizlilik Politikası&apos;nı kabul ediyorum</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password || !passwordConfirm || password !== passwordConfirm}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-3 rounded-lg transition transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
            >
              {isLoading ? 'Kayıt yapılıyor...' : (
                <>
                  Hesap Oluştur <UserPlus className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900 text-green-200">veya</span>
            </div>
          </div>

          {/* Login Link */}
          <Link href="/login" className="block w-full text-center py-3 border border-white/30 hover:border-green-400 rounded-lg text-green-200 hover:text-green-100 font-medium transition">
            Zaten Hesabın Var mı? Giriş Yap
          </Link>
        </div>

        {/* Features highlight */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          {[
            { icon: '📊', text: 'CSV Yükleme' },
            { icon: '📈', text: 'Benchmarking' },
            { icon: '💡', text: 'AI Öneriler' },
            { icon: '🔒', text: 'Yasal Uyumlu' },
          ].map((item, i) => (
            <div key={i} className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="text-xs text-green-200">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}