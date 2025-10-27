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
import { ChevronDown, ChevronUp, Trash2, Upload, Plus, FileText, Zap } from 'lucide-react';

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

      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-emerald-500/40 hover:border-emerald-500/60 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 backdrop-blur-xl">
        {/* Header */}
        <div
          className="p-4 cursor-pointer hover:bg-emerald-500/5 flex items-center justify-between transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex-1">
            <h4 className="font-black text-emerald-200">{facility.name}</h4>
            <p className="text-sm text-emerald-300/70 font-semibold mt-1">
              {facility.facility_type && `Tür: ${facility.facility_type}`}
              {facility.activity_data && facility.activity_data.length > 0 && (
                <span className="ml-4 flex items-center gap-1"><FileText className="w-4 h-4" /> {facility.activity_data.length} veri kaydı</span>
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
              className="flex items-center gap-1 bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-400/60 font-bold transition-all"
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
              className="flex items-center gap-1 bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-400/60 font-bold transition-all"
            >
              <Upload className="w-4 h-4" /> CSV
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmingDelete(true);
              }}
              disabled={isDeleting}
              className="flex items-center gap-1 bg-red-600/80 hover:bg-red-700 text-white font-bold transition-all"
            >
              <Trash2 className="w-4 h-4" /> Sil
            </Button>

            <div className="ml-2">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-emerald-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-emerald-400" />
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        {isExpanded && (
          <div className="border-t border-emerald-500/20 p-4 bg-emerald-500/5">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-emerald-300/70 font-semibold">Adres</p>
                <p className="font-bold text-emerald-200">{facility.address || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-emerald-300/70 font-semibold">Bölge</p>
                <p className="font-bold text-emerald-200">{facility.region || '-'}</p>
              </div>
            </div>

            {/* Aktivite Verisi Listesi */}
            {facility.activity_data && facility.activity_data.length > 0 && (
              <div className="mt-4">
                <h5 className="font-black text-emerald-200 mb-3">Son Aktiviteler</h5>
                <div className="space-y-2">
                  {facility.activity_data.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-emerald-200">
                            <span className="font-bold">{activity.activity_type}</span>
                            {' - '}
                            <span className="text-emerald-300/70">{activity.quantity} {activity.unit}</span>
                          </p>
                          <p className="text-emerald-400/70 text-xs mt-1">
                            {new Date(activity.start_date).toLocaleDateString('tr-TR')} - {new Date(activity.end_date).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {activity.co2e_emissions !== null && activity.co2e_emissions !== undefined ? (
                            <div className="flex flex-col items-end">
                              <p className="text-emerald-400 text-sm font-black flex items-center gap-1">
                                <Zap className="w-3 h-3" /> {activity.co2e_emissions.toFixed(2)} kg
                              </p>
                              <p className="text-emerald-500/70 text-xs font-semibold">CO₂e emisyonu</p>
                            </div>
                          ) : (
                            <p className="text-orange-400 text-xs font-semibold">Hesaplanıyor...</p>
                          )}
                        </div>
                      </div>
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
