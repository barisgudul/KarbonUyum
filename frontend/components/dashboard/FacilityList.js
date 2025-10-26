// frontend/components/dashboard/FacilityList.js
'use client';

import FacilityItem from './FacilityItem';
import { Building2 } from 'lucide-react';

export default function FacilityList({ companyId, facilities = [] }) {
  if (!facilities || facilities.length === 0) {
    return (
      <div className="p-6 text-center bg-gradient-to-br from-slate-800/50 to-slate-900/30 border-2 border-dashed border-emerald-500/40 rounded-2xl backdrop-blur-xl">
        <Building2 className="w-10 h-10 text-emerald-400/50 mx-auto mb-3" />
        <p className="text-emerald-300 font-bold">Tesis bulunmuyor</p>
        <p className="text-emerald-300/60 text-sm mt-1">Bu şirkete tesis ekleyerek başlayın</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {facilities.map((facility) => (
        <FacilityItem key={facility.id} facility={facility} companyId={companyId} />
      ))}
    </div>
  );
}
