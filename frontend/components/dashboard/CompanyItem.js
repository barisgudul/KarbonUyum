// frontend/components/dashboard/CompanyItem.js
'use client';

import { useState } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useDeleteCompany } from '../../hooks/useCompanies';
import { Button } from '../ui/button';
import ConfirmDialog from '../ConfirmDialog';
import FacilityList from './FacilityList';
import { Trash2, Edit, ChevronDown, ChevronUp } from 'lucide-react';

export default function CompanyItem({ company }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  
  const { openDialog } = useUIStore();
  const { mutate: deleteCompany, isPending: isDeleting } = useDeleteCompany();

  const handleDelete = () => {
    deleteCompany(company.id, {
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
        title={`"${company.name}" Şirketini Silmek Üzeresiniz`}
        description="Bu işlem geri alınamaz. İlişkili tüm tesisler ve veriler kalıcı olarak silinecektir."
        confirmText="Evet, Sil"
        cancelText="İptal"
        isLoading={isDeleting}
        variant="destructive"
      />

      <div className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/30 border-2 border-emerald-500/40 hover:border-emerald-400/60 rounded-2xl shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 overflow-hidden backdrop-blur-xl">
        {/* Header - şirket özeti */}
        <div
          className="p-6 cursor-pointer hover:bg-emerald-500/5 flex items-center justify-between transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex-1">
            <h3 className="text-xl font-black text-emerald-200">{company.name}</h3>
            <p className="text-sm text-emerald-300/70 font-semibold mt-1">
              {company.industry_type && `Sektör: ${company.industry_type}`}
              {company.facilities && company.facilities.length > 0 && (
                <span className="ml-4">📍 {company.facilities.length} tesis</span>
              )}
            </p>
          </div>

          {/* Aksiyon butonları */}
          <div className="flex items-center gap-2 ml-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1 bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-400/60 font-bold transition-all"
              onClick={(e) => {
                e.stopPropagation();
                openDialog('editCompany', { companyData: company });
              }}
            >
              <Edit className="w-4 h-4" /> Düzenle
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

            {/* Genişlet/Daralt İkonu */}
            <div className="ml-2">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-emerald-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-emerald-400" />
              )}
            </div>
          </div>
        </div>

        {/* Detay Bölümü - Tesisler */}
        {isExpanded && (
          <div className="border-t border-emerald-500/20 p-6 bg-emerald-500/5">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-black text-emerald-200">Tesisler</h4>
              <Button 
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold text-sm rounded-lg shadow-lg hover:shadow-emerald-500/50 transition-all transform hover:scale-105"
                onClick={() => openDialog('newFacility', { companyId: company.id })}
              >
                + Yeni Tesis
              </Button>
            </div>

            {/* Tesis Listesi */}
            <FacilityList companyId={company.id} facilities={company.facilities} />
          </div>
        )}
      </div>
    </>
  );
}
