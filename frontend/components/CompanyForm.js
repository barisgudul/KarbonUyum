// frontend/components/CompanyForm.js
'use client';
import { useState, useEffect } from 'react';
import { useCreateCompany, useUpdateCompany } from '../hooks/useCompanies';
import toast from 'react-hot-toast';

export default function CompanyForm({ onFormSubmit, initialData = null }) {
  const [name, setName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [industryType, setIndustryType] = useState('');

  const { mutate: createCompany, isPending: isCreating } = useCreateCompany();
  const { mutate: updateCompany, isPending: isUpdating } = useUpdateCompany();

  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setTaxNumber(initialData.tax_number);
      setIndustryType(initialData.industry_type || '');
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const companyData = { 
      name, 
      tax_number: taxNumber,
      industry_type: industryType || null
    };

    if (initialData) {
      // Düzenleme
      updateCompany(
        { companyId: initialData.id, data: companyData },
        {
          onSuccess: () => {
            onFormSubmit();
          },
        }
      );
    } else {
      // Yeni oluşturma
      createCompany(companyData, {
        onSuccess: () => {
          onFormSubmit();
        },
      });
    }
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
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
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
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-emerald-300 mb-2">Sektör Tipi</label>
          <select
            value={industryType}
            onChange={(e) => setIndustryType(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer disabled:opacity-50"
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
        disabled={isLoading}
        className="w-full mt-6 px-4 py-3 font-black text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 rounded-lg transition-all duration-300 shadow-lg hover:shadow-emerald-500/50 transform hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Kaydediliyor...' : (initialData ? 'Güncelle' : 'Şirket Ekle')}
      </button>
    </form>
  );
}