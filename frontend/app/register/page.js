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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background - Premium blur blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-1/3 -right-40 w-[450px] h-[450px] bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 opacity-40" style={{backgroundImage: "radial-gradient(circle, #10b981 0.5px, transparent 0.5px)", backgroundSize: "50px 50px"}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="relative group mb-4 flex justify-center">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
            <div className="relative p-3 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl shadow-2xl transform group-hover:scale-110 transition-transform">
              <Leaf className="w-7 h-7 text-white" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent mb-2">KarbonUyum</h1>
          <p className="text-emerald-400/70 text-sm font-bold tracking-widest">SÜRDÜRÜLEBİLİRLİK PLATFORMU</p>
        </div>

        {/* Register Card - Glassmorphic Premium */}
        <div className="relative group mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/30 backdrop-blur-xl rounded-3xl p-8 border-2 border-emerald-500/40 hover:border-emerald-500/60 transition-all duration-300 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent mb-2">Kayıt Ol</h2>
            <p className="text-emerald-300/70 text-sm font-semibold mb-8">Yeni bir hesap oluştur ve başla</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-emerald-300 mb-3">
                  E-posta Adresi
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-4 w-5 h-5 text-emerald-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@sirket.com"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-400/50 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition backdrop-blur"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-emerald-300 mb-3">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 w-5 h-5 text-emerald-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="En az 8 karakter"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-400/50 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition backdrop-blur"
                  />
                </div>
                
                {password && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-emerald-300">Şifre Gücü:</span>
                      <span className={`text-xs font-semibold ${strengthColors[passwordStrength - 1]?.replace('bg-', 'text-')}`}>
                        {strengthLabels[passwordStrength - 1]}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-emerald-500/20">
                      <div className={`h-full ${strengthColors[passwordStrength - 1]} transition-all`} style={{ width: `${(passwordStrength / 4) * 100}%` }}></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Password Confirm Field */}
              <div>
                <label htmlFor="passwordConfirm" className="block text-sm font-bold text-emerald-300 mb-3">
                  Şifreyi Onayla
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 w-5 h-5 text-emerald-400" />
                  <input
                    id="passwordConfirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Şifreyi tekrar girin"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-emerald-500/30 rounded-xl text-white placeholder-emerald-400/50 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition backdrop-blur"
                  />
                </div>
                
                {passwordConfirm && (
                  <div className="mt-2 flex items-center gap-2">
                    {password === passwordConfirm ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-400">Şifreler eşleşiyor</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-semibold text-red-400">Şifreler eşleşmiyor</span>
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
                  className="mt-1 w-4 h-4 rounded border-emerald-500/30 bg-white/5 text-emerald-500 focus:ring-emerald-400 accent-emerald-500"
                />
                <label htmlFor="terms" className="text-sm text-emerald-300 font-semibold">
                  <span>Hizmet Şartları&apos;nı ve Gizlilik Politikası&apos;nı kabul ediyorum</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !email || !password || !passwordConfirm || password !== passwordConfirm}
                className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold py-3 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/50 hover:shadow-2xl disabled:cursor-not-allowed"
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
                <div className="w-full border-t border-emerald-500/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-900/80 text-emerald-400/70 font-semibold">veya</span>
              </div>
            </div>

            {/* Login Link */}
            <Link href="/login" className="block w-full text-center py-3 border-2 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-500/10 rounded-xl text-emerald-300 hover:text-emerald-200 font-bold transition-all duration-300">
              Zaten Hesabın Var mı? Giriş Yap
            </Link>
          </div>
        </div>

        {/* Features highlight */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          {[
            { icon: '📊', text: 'CSV Yükleme' },
            { icon: '📈', text: 'Benchmarking' },
            { icon: '💡', text: 'AI Öneriler' },
            { icon: '🔒', text: 'Yasal Uyumlu' },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur border border-emerald-500/30 rounded-xl p-3 text-center hover:border-emerald-400/60 hover:bg-emerald-500/30 transition-all duration-300">
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="text-xs font-bold text-emerald-300">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}