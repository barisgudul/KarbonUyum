// frontend/components/QuickInvoiceModal.tsx

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileText, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { useCreateActivityData } from '../hooks/useActivityData';

interface QuickInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
  companyId: number;
  onSuccess?: () => void;
}

type ActivityType = 'electricity' | 'natural_gas' | 'diesel_fuel';

interface FormData {
  activityType: ActivityType;
  quantity: number;
  cost: number;
  startDate: string;
  endDate: string;
}

export default function QuickInvoiceModal({
  open,
  onOpenChange,
  facilityId,
  companyId,
  onSuccess
}: QuickInvoiceModalProps) {
  const [formData, setFormData] = useState<FormData>({
    activityType: 'electricity',
    quantity: 0,
    cost: 0,
    startDate: '',
    endDate: ''
  });
  
  // React-Query hook kullan
  const createActivityMutation = useCreateActivityData();
  const { isPending, isError, error } = createActivityMutation;
  
  const activityTypes = [
    { value: 'electricity' as const, label: '⚡ Elektrik (kWh)', unit: 'kWh' },
    { value: 'natural_gas' as const, label: '🔥 Doğalgaz (m³)', unit: 'm³' },
    { value: 'diesel_fuel' as const, label: '🚗 Yakıt (Litre)', unit: 'litre' }
  ];
  
  const currentType = activityTypes.find(t => t.value === formData.activityType);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const activityData = {
      activity_type: formData.activityType,
      quantity: formData.quantity,
      unit: currentType?.unit || 'kWh',
      start_date: formData.startDate,
      end_date: formData.endDate,
      cost_tl: formData.cost
    };
    
    // Hook'un mutate fonksiyonunu çağır
    createActivityMutation.mutate(
      { facilityId, data: activityData }
    );
  };

  // Success ve error handlers
  React.useEffect(() => {
    if (createActivityMutation.isSuccess) {
      setTimeout(() => {
        onOpenChange(false);
        setFormData({ activityType: 'electricity', quantity: 0, cost: 0, startDate: '', endDate: '' });
        if (onSuccess) onSuccess();
      }, 1500);
    }
  }, [createActivityMutation.isSuccess, onOpenChange, onSuccess]);
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ ...formData, quantity: val === '' ? 0 : parseFloat(val) });
  };

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ ...formData, cost: val === '' ? 0 : parseFloat(val) });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/40 shadow-2xl">
        {/* @ts-ignore */}
        <DialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                Hızlı Fatura Kaydı
              </DialogTitle>
              <DialogDescription className="text-emerald-300/70">
                Fatura bilgilerinizi girip birim maliyetinizi otomatik hesapla
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        {!isPending ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-emerald-300 font-semibold mb-2">Enerji Tipi</label>
              <select
                value={formData.activityType}
                onChange={(e) => setFormData({ ...formData, activityType: e.target.value as ActivityType })}
                className="w-full px-4 py-3 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-400"
              >
                {activityTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-emerald-300 font-semibold mb-2">
                Tüketim Miktarı ({currentType?.unit})
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.quantity || ''}
                onChange={handleQuantityChange}
                placeholder="Örn: 5000"
                required
                disabled={isPending}
                className="w-full px-4 py-3 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-400 disabled:opacity-50"
              />
            </div>
            
            <div>
              <label className="block text-emerald-300 font-semibold mb-2">Fatura Tutarı (TL)</label>
              <input
                type="number"
                step="0.01"
                value={formData.cost || ''}
                onChange={handleCostChange}
                placeholder="Örn: 2500"
                required
                disabled={isPending}
                className="w-full px-4 py-3 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-400 disabled:opacity-50"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-emerald-300 font-semibold mb-2 text-sm">Başlangıç</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  disabled={isPending}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-emerald-300 font-semibold mb-2 text-sm">Bitiş</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                  disabled={isPending}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400 disabled:opacity-50"
                />
              </div>
            </div>
            
            {formData.quantity > 0 && formData.cost > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
              >
                <p className="text-emerald-300 font-semibold text-sm">
                  📊 Birim Maliyet: {(formData.cost / formData.quantity).toFixed(2)} TL/{currentType?.unit}
                </p>
              </motion.div>
            )}
            
            {isError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <p className="text-red-300 text-sm">
                  {error?.message || 'Veri kaydı sırasında bir hata oluştu. Lütfen tekrar deneyin.'}
                </p>
              </motion.div>
            )}
            
            <Button
              type="submit"
              variant="default"
              size="lg"
              disabled={isPending || !formData.quantity || !formData.cost || !formData.startDate || !formData.endDate}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold rounded-lg py-3 shadow-lg hover:shadow-emerald-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Fatura Kaydet
                </>
              )}
            </Button>
          </form>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold text-white mb-2">Başarıyla Kaydedildi!</h3>
            <p className="text-emerald-300/70">Verileriniz sistem tarafından işleniyor...</p>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
