// frontend/app/dashboard/page.js
'use client';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import CompanyForm from '../../components/CompanyForm';
import FacilityForm from '../../components/FacilityForm';
import ActivityDataForm from '../../components/ActivityDataForm';
import CSVUploader from '../../components/CSVUploader';
import SummaryPanel from '../../components/SummaryPanel';
import CompanyList from '../../components/dashboard/CompanyList';
import { LogOut, Plus, Leaf, Building2, Factory, Upload, Settings, TrendingUp, ChevronDown } from 'lucide-react';
import { useCompanies } from '../../hooks/useCompanies';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { activeDialog, openDialog, closeDialog } = useUIStore();
  const { data: companies } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full animate-pulse blur-xl opacity-60"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full animate-pulse blur-md opacity-40"></div>
            <div className="relative inset-2 flex items-center justify-center bg-slate-950 rounded-full">
              <Leaf className="w-12 h-12 text-emerald-400 animate-bounce" />
            </div>
          </div>
          <p className="text-emerald-300 font-black text-2xl tracking-tight">Yükleniyor</p>
          <p className="text-emerald-400/60 text-sm mt-3 font-semibold">KarbonUyum Dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 overflow-hidden relative">
      {/* Animated Background - Premium blur blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-1/3 -right-40 w-[450px] h-[450px] bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 opacity-40" style={{backgroundImage: "radial-gradient(circle, #10b981 0.5px, transparent 0.5px)", backgroundSize: "50px 50px"}}></div>
      </div>

      {/* Header - Premium Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-3xl bg-gradient-to-r from-slate-950/95 via-emerald-900/30 to-slate-950/95 border-b border-emerald-500/20 shadow-2xl">
        <div className="container mx-auto px-4 sm:px-8 py-6">
          <div className="flex items-center justify-between gap-8">
            {/* Logo Section */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                <div className="relative p-3 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl shadow-2xl transform group-hover:scale-110 transition-transform">
                  <Leaf className="w-7 h-7 text-white" strokeWidth={1.5} />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent leading-tight">
                  KarbonUyum
                </h1>
                <p className="text-xs font-bold text-emerald-400/70 tracking-widest mt-0.5">SÜRDÜRÜLEBİLİRLİK PLATFORMU</p>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-8 ml-auto">
              <div className="hidden lg:flex items-center gap-8">
                <div className="text-right border-r border-emerald-500/20 pr-8">
                  <p className="text-sm font-bold text-white">{user.email}</p>
                  <p className="text-xs text-emerald-400/70 mt-1 font-semibold">Hoş Geldiniz</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2.5 px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-600/50 hover:shadow-2xl transform hover:scale-105 active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Çıkış</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-8 py-14 relative z-10">
        
        {/* Welcome Banner - Premium Hero */}
        <div className="mb-16 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border border-emerald-400/40 rounded-3xl p-12 backdrop-blur-xl">
            <div className="flex items-start gap-8">
              <div className="p-5 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-3xl shadow-2xl flex-shrink-0 transform hover:scale-110 transition-transform">
                <TrendingUp className="w-9 h-9 text-white" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h2 className="text-5xl font-black text-white mb-2 leading-tight">
                  Hoş Geldiniz, <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">{user.email.split('@')[0]}</span>
                </h2>
                <p className="text-lg text-emerald-200/90 font-semibold">Karbon ayak izinizi azaltın, sürdürülebilirliği artırın</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Panel */}
        <section className="mb-16">
          <SummaryPanel />
        </section>

        {/* Quick Actions - Premium Grid */}
        <section className="mb-16">
          <div className="mb-10">
            <h3 className="text-3xl font-black text-white mb-3">Hızlı İşlemler</h3>
            <div className="w-24 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-full shadow-lg"></div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 - New Company */}
            <button
              onClick={() => openDialog('newCompany')}
              className="group relative overflow-hidden rounded-2xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-700 group-hover:from-emerald-500 group-hover:to-teal-600 transition-all duration-500"></div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-emerald-400 to-teal-500 blur-xl"></div>
              <div className="relative px-8 py-10 text-left flex flex-col justify-between h-full min-h-[220px]">
                <div>
                  <div className="p-3.5 bg-white/20 rounded-2xl w-fit mb-5 group-hover:bg-white/30 transition-all backdrop-blur">
                    <Building2 className="w-7 h-7 text-white" strokeWidth={1.5} />
                  </div>
                  <h4 className="text-2xl font-black text-white leading-tight">Yeni Şirket</h4>
                </div>
                <p className="text-emerald-100/80 text-sm font-bold">Ekle ve yönet</p>
              </div>
              <div className="absolute inset-0 border-2 border-white/30 rounded-2xl group-hover:border-white/50 transition-all pointer-events-none"></div>
            </button>

            {/* Card 2 - New Facility */}
            <button
              onClick={() => {
                setSelectedCompanyId(null);
                openDialog('selectCompanyForFacility');
              }}
              className="group relative overflow-hidden rounded-2xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-600 to-cyan-700 group-hover:from-teal-500 group-hover:to-cyan-600 transition-all duration-500"></div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-teal-400 to-cyan-500 blur-xl"></div>
              <div className="relative px-8 py-10 text-left flex flex-col justify-between h-full min-h-[220px]">
                <div>
                  <div className="p-3.5 bg-white/20 rounded-2xl w-fit mb-5 group-hover:bg-white/30 transition-all backdrop-blur">
                    <Factory className="w-7 h-7 text-white" strokeWidth={1.5} />
                  </div>
                  <h4 className="text-2xl font-black text-white leading-tight">Yeni Tesis</h4>
                </div>
                <p className="text-emerald-100/80 text-sm font-bold">Oluştur ve kaydet</p>
              </div>
              <div className="absolute inset-0 border-2 border-white/30 rounded-2xl group-hover:border-white/50 transition-all pointer-events-none"></div>
            </button>

            {/* Card 3 - CSV Upload */}
            <button
              onClick={() => {
                setSelectedCompanyId(null);
                setSelectedFacilityId(null);
                openDialog('selectCompanyForCSV');
              }}
              className="group relative overflow-hidden rounded-2xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 to-emerald-700 group-hover:from-cyan-500 group-hover:to-emerald-600 transition-all duration-500"></div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-cyan-400 to-emerald-500 blur-xl"></div>
              <div className="relative px-8 py-10 text-left flex flex-col justify-between h-full min-h-[220px]">
                <div>
                  <div className="p-3.5 bg-white/20 rounded-2xl w-fit mb-5 group-hover:bg-white/30 transition-all backdrop-blur">
                    <Upload className="w-7 h-7 text-white" strokeWidth={1.5} />
                  </div>
                  <h4 className="text-2xl font-black text-white leading-tight">CSV Yükle</h4>
                </div>
                <p className="text-emerald-100/80 text-sm font-bold">Toplu veri yönetimi</p>
              </div>
              <div className="absolute inset-0 border-2 border-white/30 rounded-2xl group-hover:border-white/50 transition-all pointer-events-none"></div>
            </button>

            {/* Card 4 - Settings */}
            <button
              onClick={() => openDialog('settings')}
              className="group relative overflow-hidden rounded-2xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 to-teal-600 group-hover:from-emerald-600 group-hover:to-teal-500 transition-all duration-500"></div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-emerald-500 to-teal-400 blur-xl"></div>
              <div className="relative px-8 py-10 text-left flex flex-col justify-between h-full min-h-[220px]">
                <div>
                  <div className="p-3.5 bg-white/20 rounded-2xl w-fit mb-5 group-hover:bg-white/30 transition-all backdrop-blur">
                    <Settings className="w-7 h-7 text-white" strokeWidth={1.5} />
                  </div>
                  <h4 className="text-2xl font-black text-white leading-tight">Ayarlar</h4>
                </div>
                <p className="text-emerald-100/80 text-sm font-bold">Profil ve tercihler</p>
              </div>
              <div className="absolute inset-0 border-2 border-white/30 rounded-2xl group-hover:border-white/50 transition-all pointer-events-none"></div>
            </button>
          </div>
        </section>

        {/* Companies Section - Premium */}
        <section className="relative">
          <div className="mb-10">
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-5 mb-4">
                  <div className="p-4 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl shadow-2xl">
                    <Building2 className="w-8 h-8 text-white" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-4xl font-black text-white leading-tight">Şirketlerim</h2>
                </div>
                <p className="text-lg text-emerald-300/80 font-semibold ml-20">Tüm veri ve operasyonlarını merkezi panelden yönetin</p>
              </div>

              <Button 
                className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white flex items-center gap-3 px-10 py-3 rounded-2xl font-black text-lg shadow-2xl hover:shadow-emerald-500/50 hover:shadow-3xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex-shrink-0"
                onClick={() => openDialog('newCompany')}
              >
                <Plus className="w-6 h-6" />
                Ekle
              </Button>
            </div>
          </div>

          {/* Companies List Container */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border-2 border-emerald-500/40 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl hover:border-emerald-500/60 transition-all duration-300">
            <CompanyList />
          </div>
        </section>
      </main>

      {/* Premium Dialogs */}
      <Dialog open={activeDialog?.name === 'newCompany'} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">Yeni Şirket</DialogTitle>
            <DialogDescription>Yeni bir şirket ekleyin ve veri yönetimini başlatın.</DialogDescription>
          </DialogHeader>
          <div className="bg-slate-700/30 rounded-xl p-1">
            <CompanyForm onFormSubmit={closeDialog} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog?.name === 'editCompany'} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">Şirketi Düzenle</DialogTitle>
            <DialogDescription>Mevcut şirketinizin bilgilerini düzenleyin.</DialogDescription>
          </DialogHeader>
          <div className="bg-slate-700/30 rounded-xl p-1">
            <CompanyForm initialData={activeDialog?.data?.companyData} onFormSubmit={closeDialog} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog?.name === 'newFacility'} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">Yeni Tesis</DialogTitle>
            <DialogDescription>Yeni bir tesis ekleyin ve veri kaydını başlatın.</DialogDescription>
          </DialogHeader>
          {activeDialog?.data?.companyId && (
            <div className="bg-slate-700/30 rounded-xl p-1">
              <FacilityForm companyId={activeDialog.data.companyId} onFormSubmit={closeDialog} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog?.name === 'addActivity'} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">Aktivite Kaydı</DialogTitle>
            <DialogDescription>Yeni bir aktivite kaydı ekleyin.</DialogDescription>
          </DialogHeader>
          {activeDialog?.data?.facilityId && (
            <div className="bg-slate-700/30 rounded-xl p-1">
              <ActivityDataForm facilityId={activeDialog.data.facilityId} onFormSubmit={closeDialog} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog?.name === 'uploadCSV'} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[700px] bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">CSV Yükle</DialogTitle>
            <DialogDescription>Toplu veri yüklemek için CSV dosyanızı seçin.</DialogDescription>
          </DialogHeader>
          {activeDialog?.data?.facilityId && (
            <div className="bg-slate-700/30 rounded-xl p-1">
              <CSVUploader facilityId={activeDialog.data.facilityId} onUploadSuccess={closeDialog} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Company Selector Dialog for Facility */}
      <Dialog open={activeDialog?.name === 'selectCompanyForFacility'} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">Şirket Seç</DialogTitle>
            <DialogDescription>Tesis eklemek istediğiniz şirketi seçin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {companies && companies.length > 0 ? (
              companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => {
                    setSelectedCompanyId(company.id);
                    closeDialog();
                    openDialog('newFacility', { companyId: company.id });
                  }}
                  className="w-full p-4 bg-slate-700/40 hover:bg-slate-700/60 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl transition-all text-left group"
                >
                  <p className="font-bold text-emerald-300 group-hover:text-emerald-200">{company.name}</p>
                  <p className="text-xs text-emerald-400/60 mt-1">{company.facilities?.length || 0} tesis</p>
                </button>
              ))
            ) : (
              <p className="text-center text-emerald-300/70 py-8">Şirket bulunamadı</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Company Selector Dialog for CSV */}
      <Dialog open={activeDialog?.name === 'selectCompanyForCSV'} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">Şirket Seç</DialogTitle>
            <DialogDescription>CSV yüklemek istediğiniz şirketi seçin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {companies && companies.length > 0 ? (
              companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => {
                    setSelectedCompanyId(company.id);
                    setSelectedCompany(company);
                    closeDialog();
                    openDialog('selectFacilityForCSV', { companyId: company.id, facilities: company.facilities });
                  }}
                  className="w-full p-4 bg-slate-700/40 hover:bg-slate-700/60 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl transition-all text-left group"
                >
                  <p className="font-bold text-emerald-300 group-hover:text-emerald-200">{company.name}</p>
                  <p className="text-xs text-emerald-400/60 mt-1">{company.facilities?.length || 0} tesis</p>
                </button>
              ))
            ) : (
              <p className="text-center text-emerald-300/70 py-8">Şirket bulunamadı</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Facility Selector Dialog for CSV */}
      <Dialog open={activeDialog?.name === 'selectFacilityForCSV'} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">Tesis Seç</DialogTitle>
            <DialogDescription>CSV yüklemek istediğiniz tesisi seçin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {activeDialog?.data?.facilities && activeDialog.data.facilities.length > 0 ? (
              activeDialog.data.facilities.map((facility) => (
                <button
                  key={facility.id}
                  onClick={() => {
                    setSelectedFacilityId(facility.id);
                    closeDialog();
                    openDialog('uploadCSV', { facilityId: facility.id });
                  }}
                  className="w-full p-4 bg-slate-700/40 hover:bg-slate-700/60 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl transition-all text-left group"
                >
                  <p className="font-bold text-emerald-300 group-hover:text-emerald-200">{facility.name}</p>
                  <p className="text-xs text-emerald-400/60 mt-1">{facility.city}</p>
                </button>
              ))
            ) : (
              <p className="text-center text-emerald-300/70 py-8">Tesis bulunamadı</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings / Profile Management Dialog */}
      <Dialog open={activeDialog?.name === 'settings'} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[700px] bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/40 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">Profil Yönetimi</DialogTitle>
            <DialogDescription>Hesabınız, tercihler ve güvenlik ayarlarını yönetin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {/* Account Information Section */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/40 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-emerald-500/20 rounded-lg">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                </div>
                <h4 className="text-lg font-black text-emerald-300">Hesap Bilgileri</h4>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-700/30 rounded-lg p-4 border border-emerald-500/20">
                  <p className="text-xs font-bold text-emerald-400/70 uppercase tracking-wider mb-2">E-posta Adresi</p>
                  <p className="text-white font-semibold break-all">{user?.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-700/30 rounded-lg p-4 border border-emerald-500/20">
                    <p className="text-xs font-bold text-emerald-400/70 uppercase tracking-wider mb-2">Üye Olma</p>
                    <p className="text-white font-semibold">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
                    </p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-4 border border-emerald-500/20">
                    <p className="text-xs font-bold text-emerald-400/70 uppercase tracking-wider mb-2">Durum</p>
                    <p className="text-white font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                      Aktif
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Statistics Section */}
            <div className="bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border border-cyan-500/40 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-cyan-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
                <h4 className="text-lg font-black text-cyan-300">Kullanım İstatistikleri</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-700/30 rounded-lg p-4 border border-cyan-500/20">
                  <p className="text-xs font-bold text-cyan-400/70 uppercase tracking-wider mb-3">Şirketler</p>
                  <p className="text-3xl font-black text-cyan-300">{companies?.length || 0}</p>
                  <p className="text-xs text-cyan-400/50 mt-2">toplam</p>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-4 border border-cyan-500/20">
                  <p className="text-xs font-bold text-cyan-400/70 uppercase tracking-wider mb-3">Tesisler</p>
                  <p className="text-3xl font-black text-cyan-300">
                    {companies?.reduce((sum, c) => sum + (c.facilities?.length || 0), 0) || 0}
                  </p>
                  <p className="text-xs text-cyan-400/50 mt-2">toplam</p>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-4 border border-cyan-500/20">
                  <p className="text-xs font-bold text-cyan-400/70 uppercase tracking-wider mb-3">Veri Kaydı</p>
                  <p className="text-3xl font-black text-cyan-300">
                    {companies?.reduce((sum, c) => sum + (c.facilities?.reduce((fSum, f) => fSum + (f.activity_data?.length || 0), 0) || 0), 0) || 0}
                  </p>
                  <p className="text-xs text-cyan-400/50 mt-2">toplam</p>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-4 border border-cyan-500/20">
                  <p className="text-xs font-bold text-cyan-400/70 uppercase tracking-wider mb-3">Ortalama</p>
                  <p className="text-3xl font-black text-cyan-300">
                    {companies && companies.length > 0 
                      ? (companies.reduce((sum, c) => sum + (c.facilities?.length || 0), 0) / companies.length).toFixed(1)
                      : 0}
                  </p>
                  <p className="text-xs text-cyan-400/50 mt-2">tesis/şirket</p>
                </div>
              </div>
            </div>

            {/* Preferences Section */}
            <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/40 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-teal-500/20 rounded-lg">
                  <Settings className="w-5 h-5 text-teal-400" />
                </div>
                <h4 className="text-lg font-black text-teal-300">Tercihler</h4>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-700/30 rounded-lg p-4 border border-teal-500/20 flex items-center justify-between hover:bg-slate-700/50 transition-all">
                  <div>
                    <p className="font-semibold text-white">E-posta Bildirimleri</p>
                    <p className="text-xs text-teal-400/70 mt-1">Önemli güncellemeler hakkında bilgilendirme al</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-emerald-500" />
                </div>
                <div className="bg-slate-700/30 rounded-lg p-4 border border-teal-500/20 flex items-center justify-between hover:bg-slate-700/50 transition-all">
                  <div>
                    <p className="font-semibold text-white">Haftalık Özet</p>
                    <p className="text-xs text-teal-400/70 mt-1">Her pazartesi günü aktivite özetini gönder</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-emerald-500" />
                </div>
                <div className="bg-slate-700/30 rounded-lg p-4 border border-teal-500/20 flex items-center justify-between hover:bg-slate-700/50 transition-all">
                  <div>
                    <p className="font-semibold text-white">Koyu Tema</p>
                    <p className="text-xs text-teal-400/70 mt-1">Uygulamada koyu tema kullan</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded accent-emerald-500" />
                </div>
              </div>
            </div>

            {/* Data & Privacy Section */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/40 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-purple-500/20 rounded-lg">
                  <Leaf className="w-5 h-5 text-purple-400" />
                </div>
                <h4 className="text-lg font-black text-purple-300">Veri & Gizlilik</h4>
              </div>
              <div className="space-y-3">
                <button className="w-full bg-slate-700/30 hover:bg-slate-700/50 border border-purple-500/20 rounded-lg p-4 text-left transition-all group">
                  <p className="font-semibold text-white group-hover:text-purple-300 transition-colors">Verilerim</p>
                  <p className="text-xs text-purple-400/70 mt-1">Kişisel verilerinizi görüntüle ve yönetin</p>
                </button>
                <button className="w-full bg-slate-700/30 hover:bg-slate-700/50 border border-purple-500/20 rounded-lg p-4 text-left transition-all group">
                  <p className="font-semibold text-white group-hover:text-purple-300 transition-colors">Gizlilik Politikası</p>
                  <p className="text-xs text-purple-400/70 mt-1">Verilerinizin nasıl kullanıldığını öğrenin</p>
                </button>
                <button className="w-full bg-slate-700/30 hover:bg-slate-700/50 border border-purple-500/20 rounded-lg p-4 text-left transition-all group">
                  <p className="font-semibold text-white group-hover:text-purple-300 transition-colors">Hizmet Şartları</p>
                  <p className="text-xs text-purple-400/70 mt-1">Hizmet şartlarını ve koşullarını inceleyin</p>
                </button>
              </div>
            </div>

            {/* Security Section */}
            <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/40 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-orange-500/20 rounded-lg">
                  <Settings className="w-5 h-5 text-orange-400" />
                </div>
                <h4 className="text-lg font-black text-orange-300">Güvenlik</h4>
              </div>
              <div className="space-y-3">
                <button className="w-full bg-slate-700/30 hover:bg-slate-700/50 border border-orange-500/20 rounded-lg p-4 text-left transition-all group">
                  <p className="font-semibold text-white group-hover:text-orange-300 transition-colors">Şifre Değiştir</p>
                  <p className="text-xs text-orange-400/70 mt-1">Hesabınızın şifresini güncelleyin</p>
                </button>
                <button className="w-full bg-slate-700/30 hover:bg-slate-700/50 border border-orange-500/20 rounded-lg p-4 text-left transition-all group">
                  <p className="font-semibold text-white group-hover:text-orange-300 transition-colors">İki Faktörlü Kimlik Doğrulama</p>
                  <p className="text-xs text-orange-400/70 mt-1">Hesabınıza ek güvenlik katmanı ekleyin</p>
                </button>
                <button className="w-full bg-slate-700/30 hover:bg-slate-700/50 border border-orange-500/20 rounded-lg p-4 text-left transition-all group">
                  <p className="font-semibold text-white group-hover:text-orange-300 transition-colors">Aktif Oturumlar</p>
                  <p className="text-xs text-orange-400/70 mt-1">Diğer cihazlarınızdaki oturumları yönetin</p>
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-2 border-red-500/40 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-red-500/20 rounded-lg">
                  <LogOut className="w-5 h-5 text-red-400" />
                </div>
                <h4 className="text-lg font-black text-red-300">Tehlikeli İşlemler</h4>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={logout}
                  className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-600/50 transform hover:scale-105 active:scale-95"
                >
                  <span className="flex items-center justify-center gap-2">
                    <LogOut className="w-5 h-5" />
                    Çıkış Yap
                  </span>
                </button>
                <button className="w-full bg-slate-700/30 hover:bg-slate-700/50 border border-red-500/20 rounded-lg p-4 text-left transition-all group">
                  <p className="font-semibold text-red-300 group-hover:text-red-200 transition-colors">Hesabı Sil</p>
                  <p className="text-xs text-red-400/70 mt-1">Hesabınızı ve tüm verilerinizi kalıcı olarak silin</p>
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Premium Styles */}
      <style jsx global>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 9s infinite cubic-bezier(0.4, 0.0, 0.6, 1.0);
        }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}