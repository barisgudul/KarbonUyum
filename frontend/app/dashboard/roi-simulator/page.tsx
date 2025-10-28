// frontend/app/dashboard/roi-simulator/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ROISimulator from '../../../components/ROISimulator';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ROISimulatorPage() {
  const searchParams = useSearchParams();
  const companyId = parseInt(searchParams.get('company_id') || '0', 10);

  if (!companyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
            Şirket ID'si bulunamadı. Lütfen dashboard'tan erişin.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Dashboard'a Dön
        </Link>

        {/* Main Content */}
        <ROISimulator companyId={companyId} />
      </div>
    </div>
  );
}
