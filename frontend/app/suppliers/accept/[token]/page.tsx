// frontend/app/suppliers/accept/[token]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader, Package, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface InvitationData {
  supplier_id: number;
  supplier_name: string;
  company_name: string;
  invited_at: string;
  expires_at: string;
  status: string;
}

export default function SupplierAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    const loadInvitation = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/suppliers/invitation/${token}`
        );

        if (response.ok) {
          const data = await response.json();
          setInvitation(data);
        } else if (response.status === 404) {
          setError('Davet bulunamadı veya zaman aşımına uğramış olabilir');
        } else {
          setError('Davet yüklenemedi');
        }
      } catch (err) {
        setError('Bağlantı hatası');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      loadInvitation();
    }
  }, [token]);

  const handleAcceptInvitation = async () => {
    setIsAccepting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/suppliers/accept/${token}`,
        { method: 'POST' }
      );

      if (response.ok) {
        setIsAccepted(true);
        toast.success('Davet kabul edildi! Platform üzerinde ürün ekleyebilirsiniz.');
        setTimeout(() => {
          router.push('/suppliers/dashboard');
        }, 2000);
      } else {
        throw new Error('Kabul işlemi başarısız');
      }
    } catch (err) {
      toast.error('Davet kabul edilemedi');
    } finally {
      setIsAccepting(false);
    }
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
          <p className="text-emerald-300 text-lg font-semibold">Davet yükleniyor...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-8 bg-gradient-to-br from-red-500/10 to-slate-900 rounded-2xl border-2 border-red-500/30 text-center space-y-4"
        >
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="text-2xl font-bold text-red-300">{error}</h2>
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

  if (isAccepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <CheckCircle className="w-24 h-24 text-emerald-400 mx-auto" />
          </motion.div>
          <div>
            <h2 className="text-3xl font-bold text-emerald-300 mb-2">Başarılı!</h2>
            <p className="text-emerald-300/70">
              {invitation?.company_name}'den gelen daveti kabul ettiniz.
            </p>
            <p className="text-emerald-300/70 text-sm mt-2">
              Panele yönlendiriliyorsunuz...
            </p>
          </div>
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
            <Package className="w-12 h-12 text-emerald-400" />
          </motion.div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
            Tedarikçi Daveti
          </h1>
        </div>

        {/* Bilgi */}
        <div className="space-y-3 text-center">
          <p className="text-emerald-300/70">
            Sizi olarak davet ediyoruz:
          </p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30"
          >
            <p className="flex items-center gap-2 text-emerald-300 font-semibold mb-2">
              <Building2 className="w-5 h-5" />
              {invitation?.company_name}
            </p>
            <p className="text-emerald-300/70 text-sm">
              Size ürün ve karbon ayak izi bilgilerini paylaşmak istiyor.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30"
          >
            <p className="text-cyan-300 text-sm">
              <strong>Ne yapabileceksiniz?</strong>
            </p>
            <ul className="text-cyan-300/70 text-xs mt-2 space-y-1 text-left">
              <li>✓ Ürünleriniz için karbon ayak izi tanımlayın</li>
              <li>✓ Müşteri tarafından otomatik olarak Kapsam 3 hesaplamalarında kullanılacak</li>
              <li>✓ Platform üzerinde erişim ve ürün yönetimi</li>
            </ul>
          </motion.div>
        </div>

        {/* Davet Tarihi */}
        <div className="text-center text-xs text-emerald-300/50">
          <p>Davet süresi: {new Date(invitation?.expires_at || '').toLocaleDateString('tr-TR')}</p>
        </div>

        {/* Kabul Butonu */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAcceptInvitation}
          disabled={isAccepting}
          className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold rounded-lg shadow-lg hover:shadow-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isAccepting ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Kabul Ediliyor...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Daveti Kabul Et
            </>
          )}
        </motion.button>

        {/* İptal */}
        <button
          onClick={() => router.push('/')}
          disabled={isAccepting}
          className="w-full px-6 py-2 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 font-bold rounded-lg transition-all disabled:opacity-50"
        >
          Daha Sonra
        </button>
      </motion.div>
    </div>
  );
}
