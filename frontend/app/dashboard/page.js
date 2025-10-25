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
import { LogOut, Plus, Leaf, Building2, Factory, Upload, Settings, TrendingUp } from 'lucide-react';

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
              onClick={() => openDialog('newFacility')}
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
              onClick={() => openDialog('uploadCSV')}
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
          </DialogHeader>
          {activeDialog?.data?.facilityId && (
            <div className="bg-slate-700/30 rounded-xl p-1">
              <CSVUploader facilityId={activeDialog.data.facilityId} onUploadSuccess={closeDialog} />
            </div>
          )}
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