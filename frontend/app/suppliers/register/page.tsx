// frontend/app/suppliers/register/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Mail, Building2, CheckCircle, Loader, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInvitationDetails, useOnboardSupplier } from '@/hooks/useSuppliers';

export default function SupplierRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // React Query hooks
  const { data: invitation, isLoading, error } = useInvitationDetails(token || '');
  const onboardMutation = useOnboardSupplier();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const validatePassword = () => {
    if (formData.password.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validatePassword()) return;
    if (!token) {
      toast.error('Davet token\'ı bulunamadı');
      return;
    }

    onboardMutation.mutate(
      { token, password: formData.password } as any,
      {
        onSuccess: () => {
          // Dashboard'a yönlendir
          setTimeout(() => {
            router.push('/suppliers/dashboard');
          }, 1500);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-center"
        >
          <Loader className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-spin" />
          <p className="text-emerald-300 text-lg font-semibold">Yükleniyor...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-8 bg-gradient-to-br from-red-500/10 to-slate-900 rounded-2xl border-2 border-red-500/30 text-center space-y-4"
        >
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="text-2xl font-bold text-red-300">
            {!token ? 'Davet token\'ı bulunamadı' : 'Davet yüklenemedi'}
          </h2>
          <p className="text-red-300/70 text-sm">
            Lütfen davet bağlantısını kontrol ediniz veya yeniden davet isteyin.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all"
          >
            Ana Sayfaya Dön
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full p-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-emerald-500/20 space-y-6"
      >
        {/* Başlık */}
        <div className="text-center space-y-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="flex justify-center"
          >
            <Lock className="w-12 h-12 text-emerald-400" />
          </motion.div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
            Hesap Oluştur
          </h1>
          <p className="text-emerald-300/70 text-sm">
            Tedarikçi platformuna hoş geldiniz
          </p>
        </div>

        {/* Davet Bilgisi */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30 space-y-2"
        >
          <div className="flex items-center gap-2 text-emerald-300">
            <Building2 className="w-5 h-5" />
            <span className="font-semibold">{invitation?.company_name}</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-300/70 text-sm">
            <Mail className="w-4 h-4" />
            <span>{invitation?.email}</span>
          </div>
        </motion.div>

        {/* Form */}
        <div className="space-y-4">
          {/* Şifre */}
          <div>
            <label className="block text-emerald-300/70 text-sm font-semibold mb-2">
              Şifre
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="En az 8 karakter"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                disabled={onboardMutation.isPending}
                className="w-full px-4 py-2 pr-10 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm placeholder-emerald-300/50 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300/50 hover:text-emerald-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Şifre Tekrar */}
          <div>
            <label className="block text-emerald-300/70 text-sm font-semibold mb-2">
              Şifre Tekrar
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Şifreyi tekrar girin"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                disabled={onboardMutation.isPending}
                className="w-full px-4 py-2 pr-10 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm placeholder-emerald-300/50 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300/50 hover:text-emerald-300"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Şifre Gereksinimleri */}
          <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <p className="text-cyan-300 text-xs font-semibold mb-1">Şifre Gereksinimleri:</p>
            <ul className="text-cyan-300/70 text-xs space-y-1">
              <li className={formData.password.length >= 8 ? 'text-green-400' : ''}>
                • En az 8 karakter
              </li>
              <li className={formData.password === formData.confirmPassword && formData.password.length > 0 ? 'text-green-400' : ''}>
                • Şifreler eşleşmeli
              </li>
            </ul>
          </div>
        </div>

        {/* Kayıt Butonu */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRegister}
          disabled={onboardMutation.isPending || !formData.password || !formData.confirmPassword}
          className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold rounded-lg shadow-lg hover:shadow-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {onboardMutation.isPending ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Hesap Oluşturuluyor...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Hesabı Oluştur
            </>
          )}
        </motion.button>

        {/* İptal */}
        <button
          onClick={() => router.push('/')}
          disabled={onboardMutation.isPending}
          className="w-full px-6 py-2 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 font-bold rounded-lg transition-all disabled:opacity-50"
        >
          İptal
        </button>
      </motion.div>
    </div>
  );
}

