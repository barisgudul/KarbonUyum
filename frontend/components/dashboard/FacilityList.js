// frontend/components/dashboard/FacilityList.js
'use client';

import FacilityItem from './FacilityItem';

export default function FacilityList({ companyId, facilities = [] }) {
  if (!facilities || facilities.length === 0) {
    return (
      <div className="p-4 text-center bg-white rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-500">Bu şirkette henüz tesis bulunmamaktadır.</p>
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
