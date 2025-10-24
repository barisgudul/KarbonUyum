// frontend/components/dashboard/CompanyList.js
'use client';

import { useCompanies } from '../../hooks/useCompanies';
import CompanyItem from './CompanyItem';

export default function CompanyList() {
  const { data: companies, isLoading, error } = useCompanies();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
        Şirketler yüklenemedi: {error.message}
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500">Henüz şirket eklenmedi. Yeni bir şirket oluşturarak başlayın.</p>
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
