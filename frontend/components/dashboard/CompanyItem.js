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

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition overflow-hidden">
        {/* Header - şirket özeti */}
        <div
          className="p-6 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800">{company.name}</h3>
            <p className="text-sm text-gray-600 mt-1">
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
              className="flex items-center gap-1"
              onClick={(e) => {
                e.stopPropagation();
                // Global state'i kullanarak dialog'u aç
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
              className="flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" /> Sil
            </Button>

            {/* Genişlet/Daralt İkonu */}
            <div className="ml-2">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </div>
          </div>
        </div>

        {/* Detay Bölümü - Tesisler */}
        {isExpanded && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-gray-700">Tesisler</h4>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white text-sm"
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
