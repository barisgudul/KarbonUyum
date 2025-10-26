// frontend/components/dashboard/CompanyList.js
'use client';

import { useCompanies } from '../../hooks/useCompanies';
import CompanyItem from './CompanyItem';
import { AlertCircle, Inbox } from 'lucide-react';

export default function CompanyList() {
  const { data: companies, isLoading, error, refetch } = useCompanies();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-emerald-500/20 animate-pulse rounded-2xl"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gradient-to-br from-red-600/20 to-red-700/20 border-2 border-red-500/40 rounded-2xl text-center backdrop-blur-xl">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 font-bold mb-2">Şirketler yüklenemedi</p>
        <p className="text-red-200/70 text-sm mb-4">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-bold transition"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="p-8 text-center bg-gradient-to-br from-slate-800/50 to-slate-900/30 border-2 border-dashed border-emerald-500/40 rounded-2xl backdrop-blur-xl">
        <Inbox className="w-12 h-12 text-emerald-400/50 mx-auto mb-4" />
        <p className="text-emerald-300 font-bold text-lg">Henüz şirket eklenmedi</p>
        <p className="text-emerald-300/60 text-sm mt-2">Yeni bir şirket oluşturarak başlayın</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {companies.map((company) => (
        <CompanyItem key={company.id} company={company} />
      ))}
    </div>
  );
}
