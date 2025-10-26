// frontend/components/ActivityDataForm.js
'use client';
import { useState, useEffect } from 'react';
import { useCreateActivityData } from '../hooks/useCompanies';
import toast from 'react-hot-toast';

// Desteklenen birim seçeneklerini tanımla
const UNIT_OPTIONS = {
  electricity: ['kWh', 'MWh', 'GJ'],
  natural_gas: ['m3', 'l'],
  diesel_fuel: ['l', 'm3'],
};

export default function ActivityDataForm({ facilityId, onFormSubmit, initialData = null }) {
  const [formData, setFormData] = useState({
    activity_type: 'electricity',
    quantity: '',
    unit: UNIT_OPTIONS['electricity'][0],
    start_date: '',
    end_date: '',
  });

  const { mutate: createActivityData, isPending: isLoading } = useCreateActivityData();

  useEffect(() => {
    if (initialData) {
      setFormData({
        activity_type: initialData.activity_type,
        quantity: initialData.quantity,
        unit: initialData.unit,
        start_date: initialData.start_date.split('T')[0],
        end_date: initialData.end_date.split('T')[0],
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    if (name === 'activity_type') {
      newFormData.unit = UNIT_OPTIONS[value][0];
    }
    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataPayload = { ...formData, quantity: parseFloat(formData.quantity) };

    createActivityData(
      { facilityId, data: dataPayload },
      {
        onSuccess: (response) => {
          onFormSubmit(response.data);
          // Reset form
          setFormData({
            activity_type: 'electricity',
            quantity: '',
            unit: UNIT_OPTIONS['electricity'][0],
            start_date: '',
            end_date: '',
          });
        },
        onError: (error) => {
          const errorMessage = error.response?.data?.detail || 'Bir hata oluştu.';
          // Eğer errorMessage string değilse, stringify et
          const message = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
          toast.error(message);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 mt-2 ml-0 border-0 bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-xl border border-emerald-500/30 backdrop-blur-xl">
      <h5 className="font-black text-emerald-200 mb-4 pb-2 border-b border-emerald-500/20">
        {initialData ? 'Aktivite Verisini Düzenle' : 'Yeni Aktivite Verisi Ekle'}
      </h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <select name="activity_type" value={formData.activity_type} onChange={handleChange} disabled={isLoading} className="w-full px-3 py-2.5 bg-white/5 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer disabled:opacity-50">
          <option value="electricity" className="bg-slate-800">Elektrik</option>
          <option value="natural_gas" className="bg-slate-800">Doğal Gaz</option>
          <option value="diesel_fuel" className="bg-slate-800">Dizel Yakıt</option>
        </select>
        <input type="number" step="any" name="quantity" value={formData.quantity} onChange={handleChange} disabled={isLoading} placeholder="Tüketim Miktarı" required className="w-full px-3 py-2.5 bg-white/5 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50" />
        
        <select name="unit" value={formData.unit} onChange={handleChange} disabled={isLoading} required className="w-full px-3 py-2.5 bg-white/5 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer disabled:opacity-50">
          {UNIT_OPTIONS[formData.activity_type].map(unitOption => (
            <option key={unitOption} value={unitOption} className="bg-slate-800">{unitOption}</option>
          ))}
        </select>
        
        <div>
          <label className="text-sm text-emerald-300 font-bold block mb-1">Başlangıç Tarihi *</label>
          <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} disabled={isLoading} required className="w-full px-3 py-2.5 bg-white/5 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50" />
        </div>
        <div>
          <label className="text-sm text-emerald-300 font-bold block mb-1">Bitiş Tarihi *</label>
          <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} disabled={isLoading} required className="w-full px-3 py-2.5 bg-white/5 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50" />
        </div>
      </div>
      <button type="submit" disabled={isLoading} className="mt-4 px-6 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-black rounded-lg transition-all duration-300 shadow-lg hover:shadow-emerald-500/50 transform hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:cursor-not-allowed">
        {isLoading ? 'Kaydediliyor...' : (initialData ? 'Güncelle' : 'Veri Ekle')}
      </button>
    </form>
  );
}