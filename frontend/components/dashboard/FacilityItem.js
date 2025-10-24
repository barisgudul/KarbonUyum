// frontend/components/dashboard/FacilityItem.js
'use client';

import { useState } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useDeleteFacility } from '../../hooks/useFacilities';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import ConfirmDialog from '../ConfirmDialog';
import ActivityDataForm from '../ActivityDataForm';
import CSVUploader from '../CSVUploader';
import { ChevronDown, ChevronUp, Trash2, UploadCloud, Plus } from 'lucide-react';

export default function FacilityItem({ facility, companyId }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);

  const { openDialog } = useUIStore();
  const { mutate: deleteFacility, isPending: isDeleting } = useDeleteFacility();

  const handleDelete = () => {
    deleteFacility(facility.id, {
      onSuccess: () => setConfirmingDelete(false),
    });
  };

  return (
    <>
      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setConfirmingDelete}
        onConfirm={handleDelete}
        title="Tesisi Silmek Üzeresiniz"
        description={`"${facility.name}" adlı tesis ve ilişkili tüm veriler kalıcı olarak silinecektir. Bu işlem geri alınamaz.`}
        confirmText="Evet, Sil"
        cancelText="İptal"
        isLoading={isDeleting}
        variant="destructive"
      />

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition">
        {/* Header */}
        <div
          className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800">{facility.name}</h4>
            <p className="text-sm text-gray-600 mt-1">
              {facility.facility_type && `Tür: ${facility.facility_type}`}
              {facility.activity_data && facility.activity_data.length > 0 && (
                <span className="ml-4">📊 {facility.activity_data.length} veri kaydı</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openDialog('addActivity', { facilityId: facility.id, companyId });
              }}
              className="flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Aktivite
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openDialog('uploadCSV', { facilityId: facility.id });
              }}
              className="flex items-center gap-1"
            >
              <UploadCloud className="w-4 h-4" /> CSV
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmingDelete(true);
              }}
              disabled={isDeleting}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" /> Sil
            </Button>

            <div className="ml-2">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        {isExpanded && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Adres</p>
                <p className="font-semibold text-gray-800">{facility.address || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Bölge</p>
                <p className="font-semibold text-gray-800">{facility.region || '-'}</p>
              </div>
            </div>

            {/* Aktivite Verisi Listesi */}
            {facility.activity_data && facility.activity_data.length > 0 && (
              <div className="mt-4">
                <h5 className="font-semibold text-gray-700 mb-2">Son Aktiviteler</h5>
                <div className="space-y-2">
                  {facility.activity_data.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="p-2 bg-white rounded border border-gray-200 text-sm">
                      <p className="text-gray-800">
                        <span className="font-semibold">{activity.activity_type}</span>
                        {' - '}
                        <span className="text-gray-600">{activity.quantity} {activity.unit}</span>
                      </p>
                      {activity.co2e_emissions && (
                        <p className="text-green-600 text-xs">
                          CO₂e: {activity.co2e_emissions.toFixed(2)} kg
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
