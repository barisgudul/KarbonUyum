// frontend/components/InvoiceVerificationModal.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, AlertCircle, Loader, X, Edit2, Save,
  Calendar, DollarSign, Zap, Wind, Fuel, Gauge
} from 'lucide-react';
import toast from 'react-hot-toast';

interface InvoiceData {
  id: number;
  filename: string;
  status: 'completed' | 'failed' | 'pending' | 'processing';
  extracted_activity_type: string | null;
  extracted_quantity: number | null;
  extracted_cost_tl: number | null;
  extracted_start_date: string | null;
  extracted_end_date: string | null;
  is_verified: boolean;
}

interface InvoiceVerificationModalProps {
  invoice: InvoiceData | null;
  isOpen: boolean;
  onClose: () => void;
  onVerify: (data: any) => void;
}

const activityIcons = {
  electricity: <Zap className="w-5 h-5 text-yellow-400" />,
  natural_gas: <Wind className="w-5 h-5 text-blue-400" />,
  diesel_fuel: <Fuel className="w-5 h-5 text-red-400" />,
};

const activityLabels = {
  electricity: '⚡ Elektrik (kWh)',
  natural_gas: '🌬️ Doğalgaz (m³)',
  diesel_fuel: '🛢️ Yakıt (Litre)',
};

export default function InvoiceVerificationModal({
  invoice,
  isOpen,
  onClose,
  onVerify,
}: InvoiceVerificationModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState({
    activity_type: '',
    quantity: 0,
    cost_tl: 0,
    start_date: '',
    end_date: '',
    verification_notes: '',
  });

  useEffect(() => {
    if (invoice && isOpen) {
      setFormData({
        activity_type: invoice.extracted_activity_type || '',
        quantity: invoice.extracted_quantity || 0,
        cost_tl: invoice.extracted_cost_tl || 0,
        start_date: invoice.extracted_start_date || '',
        end_date: invoice.extracted_end_date || '',
        verification_notes: '',
      });
      setIsEditing(false);
    }
  }, [invoice, isOpen]);

  const handleVerify = async () => {
    if (!formData.activity_type || !formData.quantity || !formData.cost_tl) {
      toast.error('Tüm alanları doldurunuz');
      return;
    }

    setIsVerifying(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoice?.id}/verify`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            extracted_data: formData,
            verification_notes: formData.verification_notes,
          }),
        }
      );

      if (response.ok) {
        toast.success('Fatura doğrulandı ve kaydedildi!');
        onVerify(formData);
        onClose();
      } else {
        throw new Error('Doğrulama başarısız');
      }
    } catch (err) {
      toast.error('Fatura doğrulama hatası');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-emerald-500/40 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-emerald-500/20 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-black text-emerald-300">
              Fatura Doğrulama
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-emerald-500/20 rounded-lg transition-all"
          >
            <X className="w-6 h-6 text-emerald-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Dosya Adı */}
          <div className="p-4 bg-slate-700/30 rounded-lg border border-emerald-500/20">
            <p className="text-sm text-emerald-300/70 font-semibold">Fatura</p>
            <p className="text-white font-bold mt-1">{invoice.filename}</p>
            <p className="text-xs text-emerald-300/50 mt-2">
              Durum:{' '}
              {invoice.status === 'completed' ? (
                <span className="text-emerald-300">✅ İşlendi</span>
              ) : (
                <span className="text-yellow-300">⏳ İşleniyor</span>
              )}
            </p>
          </div>

          {/* Çıkarılan Veriler */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-emerald-300 font-bold flex items-center gap-2">
                <Gauge className="w-5 h-5" />
                Çıkarılan Veriler
              </h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg flex items-center gap-1 transition-all"
              >
                {isEditing ? (
                  <>
                    <X className="w-4 h-4" />
                    İptal
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4" />
                    Düzenle
                  </>
                )}
              </button>
            </div>

            {/* Grid: Aktivite Türü + Miktar */}
            <div className="grid grid-cols-2 gap-4">
              {/* Aktivite Türü */}
              <div className={`p-4 rounded-lg border-2 transition-all ${
                isEditing
                  ? 'bg-slate-700/50 border-emerald-500/50'
                  : 'bg-slate-700/20 border-emerald-500/20'
              }`}>
                <label className="block text-emerald-300/70 text-sm font-semibold mb-2">
                  Enerji Türü
                </label>
                {isEditing ? (
                  <select
                    value={formData.activity_type}
                    onChange={(e) =>
                      setFormData({ ...formData, activity_type: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
                  >
                    <option value="">Seçin</option>
                    <option value="electricity">Elektrik (kWh)</option>
                    <option value="natural_gas">Doğalgaz (m³)</option>
                    <option value="diesel_fuel">Yakıt (Litre)</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2 text-white font-semibold">
                    {formData.activity_type && (
                      activityIcons[formData.activity_type as keyof typeof activityIcons]
                    )}
                    {activityLabels[formData.activity_type as keyof typeof activityLabels]}
                  </div>
                )}
              </div>

              {/* Miktar */}
              <div className={`p-4 rounded-lg border-2 transition-all ${
                isEditing
                  ? 'bg-slate-700/50 border-emerald-500/50'
                  : 'bg-slate-700/20 border-emerald-500/20'
              }`}>
                <label className="block text-emerald-300/70 text-sm font-semibold mb-2">
                  Miktar
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
                  />
                ) : (
                  <p className="text-white font-bold text-lg">{formData.quantity.toFixed(2)}</p>
                )}
              </div>
            </div>

            {/* Maliyet + Tarihler */}
            <div className="grid grid-cols-3 gap-4">
              {/* Maliyet */}
              <div className={`p-4 rounded-lg border-2 transition-all ${
                isEditing
                  ? 'bg-slate-700/50 border-emerald-500/50'
                  : 'bg-slate-700/20 border-emerald-500/20'
              }`}>
                <label className="block text-emerald-300/70 text-sm font-semibold mb-2 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Maliyet (TL)
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.cost_tl}
                    onChange={(e) =>
                      setFormData({ ...formData, cost_tl: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
                  />
                ) : (
                  <p className="text-white font-bold text-lg">{formData.cost_tl.toFixed(2)}</p>
                )}
              </div>

              {/* Başlangıç Tarihi */}
              <div className={`p-4 rounded-lg border-2 transition-all ${
                isEditing
                  ? 'bg-slate-700/50 border-emerald-500/50'
                  : 'bg-slate-700/20 border-emerald-500/20'
              }`}>
                <label className="block text-emerald-300/70 text-sm font-semibold mb-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Başlangıç
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
                  />
                ) : (
                  <p className="text-white font-bold">{formData.start_date}</p>
                )}
              </div>

              {/* Bitiş Tarihi */}
              <div className={`p-4 rounded-lg border-2 transition-all ${
                isEditing
                  ? 'bg-slate-700/50 border-emerald-500/50'
                  : 'bg-slate-700/20 border-emerald-500/20'
              }`}>
                <label className="block text-emerald-300/70 text-sm font-semibold mb-2 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Bitiş
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
                  />
                ) : (
                  <p className="text-white font-bold">{formData.end_date}</p>
                )}
              </div>
            </div>

            {/* Doğrulama Notları (Edit Mode'da) */}
            {isEditing && (
              <div className="p-4 bg-slate-700/30 rounded-lg border-2 border-emerald-500/20">
                <label className="block text-emerald-300/70 text-sm font-semibold mb-2">
                  Doğrulama Notları (Opsiyonel)
                </label>
                <textarea
                  value={formData.verification_notes}
                  onChange={(e) =>
                    setFormData({ ...formData, verification_notes: e.target.value })
                  }
                  placeholder="Örn: Veriler manuel olarak kontrol edildi, OCR başarılı"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-emerald-500/30 rounded-lg text-white text-sm placeholder-emerald-300/50 focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>
            )}
          </div>

          {/* Butonlar */}
          <div className="flex gap-3 pt-4 border-t border-emerald-500/20">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 font-bold rounded-lg transition-all"
            >
              İptal
            </button>
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Doğrula ve Kaydet
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
