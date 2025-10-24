// frontend/app/dashboard/page.js
'use client';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import CompanyForm from '../../components/CompanyForm';
import FacilityForm from '../../components/FacilityForm';
import ActivityDataForm from '../../components/ActivityDataForm';
import CSVUploader from '../../components/CSVUploader';
import SummaryPanel from '../../components/SummaryPanel';
import CompanyList from '../../components/dashboard/CompanyList';
import { LogOut, Plus } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { activeDialog, openDialog, closeDialog } = useUIStore();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Hoşgeldin, <span className="font-semibold">{user.email}</span></p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
            >
              <LogOut className="w-5 h-5" /> Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-8 py-8">
        {/* Summary Panel */}
        <section className="mb-8">
          <SummaryPanel />
        </section>

        {/* Companies Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Şirketler ve Tesisler</h2>
              <p className="text-sm text-gray-600 mt-1">Veri girişi ve detayları yönetin</p>
            </div>

            <Button 
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              onClick={() => openDialog('newCompany')}
            >
              <Plus className="w-5 h-5" /> Yeni Şirket
            </Button>
          </div>

          {/* Companies List */}
          <CompanyList />
        </section>
      </main>

      {/* Global Dialogs - Merkezi Dialog Yönetimi */}
      
      {/* New Company Dialog */}
      <Dialog 
        open={activeDialog?.name === 'newCompany'} 
        onOpenChange={closeDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yeni Şirket Oluştur</DialogTitle>
          </DialogHeader>
          <CompanyForm onFormSubmit={closeDialog} />
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog 
        open={activeDialog?.name === 'editCompany'} 
        onOpenChange={closeDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Şirketi Düzenle</DialogTitle>
          </DialogHeader>
          <CompanyForm 
            initialData={activeDialog?.data?.companyData} 
            onFormSubmit={closeDialog} 
          />
        </DialogContent>
      </Dialog>

      {/* New Facility Dialog */}
      <Dialog 
        open={activeDialog?.name === 'newFacility'} 
        onOpenChange={closeDialog}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Yeni Tesis Oluştur</DialogTitle>
          </DialogHeader>
          {activeDialog?.data?.companyId && (
            <FacilityForm 
              companyId={activeDialog.data.companyId} 
              onFormSubmit={closeDialog} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog 
        open={activeDialog?.name === 'addActivity'} 
        onOpenChange={closeDialog}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Yeni Aktivite Kaydı</DialogTitle>
          </DialogHeader>
          {activeDialog?.data?.facilityId && (
            <ActivityDataForm 
              facilityId={activeDialog.data.facilityId}
              onFormSubmit={closeDialog} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* CSV Upload Dialog */}
      <Dialog 
        open={activeDialog?.name === 'uploadCSV'} 
        onOpenChange={closeDialog}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>CSV ile Toplu Veri Yükleme</DialogTitle>
          </DialogHeader>
          {activeDialog?.data?.facilityId && (
            <CSVUploader 
              facilityId={activeDialog.data.facilityId}
              onUploadSuccess={closeDialog} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}