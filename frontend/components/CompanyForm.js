// frontend/components/CompanyForm.js
'use client';
import { useState, useEffect } from 'react'; // useEffect'i ekliyoruz
import api from '../lib/api';
import toast from 'react-hot-toast'; // react-hot-toast'u import ediyoruz

// Prop adını onFormSubmit olarak daha genel hale getirdik
export default function CompanyForm({ onFormSubmit, initialData = null }) {
  const [name, setName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [industryType, setIndustryType] = useState(''); // YENİ: Sektör tipi

  // Eğer initialData varsa (yani düzenleme modundaysak), formu doldur
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setTaxNumber(initialData.tax_number);
      setIndustryType(initialData.industry_type || ''); // YENİ: Sektör tipini doldur
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const companyData = { 
      name, 
      tax_number: taxNumber,
      industry_type: industryType || null // YENİ: Sektör tipini ekle
    };

    // Düzenleme modunda mıyız yoksa yeni kayıt mı?
    const request = initialData
      ? api.put(`/companies/${initialData.id}`, companyData) // Düzenleme ise PUT isteği
      : api.post('/companies/', companyData); // Yeni ise POST isteği

    // react-hot-toast ile şık bir bildirim gösteriyoruz
    toast.promise(request, {
      loading: 'Kaydediliyor...',
      success: () => {
        onFormSubmit(); // Parent component'e (Dashboard) haber ver
        return initialData ? 'Başarıyla güncellendi!' : 'Başarıyla eklendi!';
      },
      error: (err) => err.response?.data?.detail || 'Bir hata oluştu.',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-bold text-emerald-300 mb-2">Şirket Adı *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn: ABC Şirketi A.Ş."
            required
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-emerald-300 mb-2">Vergi Numarası *</label>
          <input
            type="text"
            value={taxNumber}
            onChange={(e) => setTaxNumber(e.target.value)}
            placeholder="Örn: 1234567890"
            required
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-emerald-300 mb-2">Sektör Tipi</label>
          <select
            value={industryType}
            onChange={(e) => setIndustryType(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
          >
            <option value="" className="bg-slate-800">Sektör Tipi Seçiniz...</option>
            <option value="manufacturing" className="bg-slate-800">İmalat</option>
            <option value="services" className="bg-slate-800">Hizmet</option>
            <option value="retail" className="bg-slate-800">Perakende</option>
            <option value="other" className="bg-slate-800">Diğer</option>
          </select>
        </div>
      </div>
      
      <button 
        type="submit" 
        className="w-full mt-6 px-4 py-3 font-black text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 rounded-lg transition-all duration-300 shadow-lg hover:shadow-emerald-500/50 transform hover:scale-105 active:scale-95"
      >
        {initialData ? 'Güncelle' : 'Şirket Ekle'}
      </button>
    </form>
  );
}