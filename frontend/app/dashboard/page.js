// frontend/app/dashboard/page.js
'use client';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import CompanyForm from '../../components/CompanyForm';
import FacilityForm from '../../components/FacilityForm';
import ActivityDataForm from '../../components/ActivityDataForm';
import SummaryPanel from '../../components/SummaryPanel';
import MembersManager from '../../components/MembersManager';
import FinancialsForm from '../../components/FinancialsForm';
import SuggestionsPanel from '../../components/SuggestionsPanel';
import CSVUploader from '../../components/CSVUploader';
import BenchmarkReportPanel from '../../components/BenchmarkReportPanel'; // YENİ: Benchmark raporu
// YENİ: shadcn/ui Dialog bileşenleri
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';

export default function DashboardPage() {
  const { user, loading, logout, fetchUser } = useAuth();
  const router = useRouter();
  
  // shadcn/ui Dialog state'leri - Modüler ve ölçeklenebilir yapı
  const [isNewCompanyDialogOpen, setNewCompanyDialogOpen] = useState(false);
  const [editCompanyDialogs, setEditCompanyDialogs] = useState({});  // company.id -> boolean
  const [newFacilityDialogs, setNewFacilityDialogs] = useState({});  // company.id -> boolean
  const [editFacilityDialogs, setEditFacilityDialogs] = useState({});  // facility.id -> boolean
  const [newActivityDialogs, setNewActivityDialogs] = useState({});  // facility.id -> boolean
  const [editActivityDialogs, setEditActivityDialogs] = useState({});  // data.id -> boolean
  const [financialsDialogs, setFinancialsDialogs] = useState({});  // company.id -> boolean
  const [membersDialogs, setMembersDialogs] = useState({});  // company.id -> boolean
  const [csvUploaderDialogs, setCsvUploaderDialogs] = useState({});  // facility.id -> boolean

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleDelete = (type, id) => {
    const typeMap = { 'companies': 'Şirketi', 'facilities': 'Tesisi', 'activity-data': 'Veri kaydını' };
    toast((t) => (
      <span className="flex flex-col items-center gap-4">
        <p className="font-semibold">{`${typeMap[type] || 'Öğeyi'} silmek istediğinizden emin misiniz?`}</p>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
            onClick={() => {
              const request = api.delete(`/${type}/${id}`);
              toast.promise(request, {
                loading: 'Siliniyor...',
                success: () => { fetchUser(); return 'Başarıyla silindi!'; },
                error: (err) => err.response?.data?.detail || 'Öğe silinemedi.',
              }, { id: t.id });
            }}
          >
            Evet, Sil
          </button>
          <button className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300" onClick={() => toast.dismiss(t.id)}>İptal</button>
        </div>
      </span>
    ), { duration: 6000 });
  };

  if (loading || !user) { return <div className="p-8 text-center">Yükleniyor...</div>; }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <div className="container mx-auto p-4 sm:p-8">
        <div className="relative mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <button onClick={logout} className="absolute top-0 right-0 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Çıkış Yap</button>
        </div>
        <p className="mb-8 text-gray-600">Hoşgeldin, <span className="font-semibold">{user.email}</span>!</p>
        
        <SummaryPanel key={JSON.stringify(user)} />

        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Veri Girişi ve Detaylar</h2>
            
            {/* YENİ: shadcn/ui Dialog ile modernize edilmiş buton */}
            <Dialog open={isNewCompanyDialogOpen} onOpenChange={setNewCompanyDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  + Yeni Şirket
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Yeni Şirket Oluştur</DialogTitle>
                </DialogHeader>
                <CompanyForm 
                  onFormSubmit={() => {
                    fetchUser(); // Veriyi yenile
                    setNewCompanyDialogOpen(false); // Modalı kapat
                  }} 
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-6 mt-4">
          {user.companies && user.companies.map(company => (
            <div key={company.id} className="p-6 bg-white border rounded-lg shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{company.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">Vergi No: {company.tax_number || 'N/A'}</p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {/* Finansallar Dialog */}
                  <Dialog open={financialsDialogs[company.id]} onOpenChange={(open) => setFinancialsDialogs({...financialsDialogs, [company.id]: open})}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-teal-600 text-white hover:bg-teal-700">
                        Finansallar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Finansal Bilgiler - {company.name}</DialogTitle>
                      </DialogHeader>
                      <FinancialsForm company={company} onFormSubmit={() => { fetchUser(); setFinancialsDialogs({...financialsDialogs, [company.id]: false}); }} />
                    </DialogContent>
                  </Dialog>

                  {/* Üyeler Dialog */}
                  <Dialog open={membersDialogs[company.id]} onOpenChange={(open) => setMembersDialogs({...membersDialogs, [company.id]: open})}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-gray-500 text-white hover:bg-gray-600">
                        Üyeler
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Üye Yönetimi - {company.name}</DialogTitle>
                      </DialogHeader>
                      <MembersManager company={company} onMemberChange={() => { fetchUser(); setMembersDialogs({...membersDialogs, [company.id]: false}); }} />
                    </DialogContent>
                  </Dialog>

                  {/* Şirket Düzenle Dialog */}
                  <Dialog open={editCompanyDialogs[company.id]} onOpenChange={(open) => setEditCompanyDialogs({...editCompanyDialogs, [company.id]: open})}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-yellow-500 text-white hover:bg-yellow-600">
                        Düzenle
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Şirketi Düzenle</DialogTitle>
                      </DialogHeader>
                      <CompanyForm initialData={company} onFormSubmit={() => { fetchUser(); setEditCompanyDialogs({...editCompanyDialogs, [company.id]: false}); }} />
                    </DialogContent>
                  </Dialog>

                  {/* Yeni Tesis Dialog */}
                  <Dialog open={newFacilityDialogs[company.id]} onOpenChange={(open) => setNewFacilityDialogs({...newFacilityDialogs, [company.id]: open})}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-blue-500 text-white hover:bg-blue-600">
                        + Tesis
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Yeni Tesis Ekle - {company.name}</DialogTitle>
                      </DialogHeader>
                      <FacilityForm companyId={company.id} onFormSubmit={() => { fetchUser(); setNewFacilityDialogs({...newFacilityDialogs, [company.id]: false}); }} />
                    </DialogContent>
                  </Dialog>

                  {/* Şirket Sil */}
                  <button onClick={() => handleDelete('companies', company.id)} className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">Sil</button>
                </div>
              </div>

              {/* Öneri panelini göster */}
              <SuggestionsPanel company={company} />

              {/* YENİ: Benchmark rapor paneli */}
              <BenchmarkReportPanel company={company} />

              <div className="mt-4 pl-4 border-l-2 space-y-4">
                {company.facilities.map(facility => (
                  <div key={facility.id}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{facility.name}</h4>
                        <p className="text-sm text-gray-500">{facility.city}</p>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {/* Tesis Düzenle Dialog */}
                        <Dialog open={editFacilityDialogs[facility.id]} onOpenChange={(open) => setEditFacilityDialogs({...editFacilityDialogs, [facility.id]: open})}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="bg-yellow-500 text-white hover:bg-yellow-600 text-xs">
                              Düzenle
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>Tesisi Düzenle - {facility.name}</DialogTitle>
                            </DialogHeader>
                            <FacilityForm companyId={company.id} initialData={facility} onFormSubmit={() => { fetchUser(); setEditFacilityDialogs({...editFacilityDialogs, [facility.id]: false}); }} />
                          </DialogContent>
                        </Dialog>

                        {/* Yeni Aktivite Dialog */}
                        <Dialog open={newActivityDialogs[facility.id]} onOpenChange={(open) => setNewActivityDialogs({...newActivityDialogs, [facility.id]: open})}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="bg-purple-500 text-white hover:bg-purple-600 text-xs">
                              + Veri
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>Yeni Aktivite Verisi Ekle - {facility.name}</DialogTitle>
                            </DialogHeader>
                            <ActivityDataForm facilityId={facility.id} onFormSubmit={() => { fetchUser(); setNewActivityDialogs({...newActivityDialogs, [facility.id]: false}); }} />
                          </DialogContent>
                        </Dialog>

                        {/* CSV Yükle Dialog */}
                        <Dialog open={csvUploaderDialogs[facility.id]} onOpenChange={(open) => setCsvUploaderDialogs({...csvUploaderDialogs, [facility.id]: open})}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="bg-green-600 text-white hover:bg-green-700 text-xs">
                              📁 CSV Yükle
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[700px]">
                            <DialogHeader>
                              <DialogTitle>CSV İle Toplu Veri Yükleme - {facility.name}</DialogTitle>
                            </DialogHeader>
                            <CSVUploader facilityId={facility.id} facilityName={facility.name} onUploadSuccess={() => { fetchUser(); setCsvUploaderDialogs({...csvUploaderDialogs, [facility.id]: false}); }} />
                          </DialogContent>
                        </Dialog>

                        {/* Tesis Sil */}
                        <button onClick={() => handleDelete('facilities', facility.id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                          Sil
                        </button>
                      </div>
                    </div>
                    
                    {/* Aktivite Veri Tablosu */}
                    {facility.activity_data.length > 0 && (
                      <table className="w-full text-sm mt-2 border-collapse">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border p-2 text-left">Tür</th>
                            <th className="border p-2 text-right">Miktar</th>
                            <th className="border p-2 text-left">Birim</th>
                            <th className="border p-2 text-left">Dönem</th>
                            <th className="border p-2 text-right font-bold">CO2e (kg)</th>
                            <th className="border p-2" colSpan={2}>İşlemler</th>
                          </tr>
                        </thead>
                        <tbody>
                          {facility.activity_data.map(data => (
                            <tr key={data.id} className="bg-white hover:bg-gray-50">
                              <td className="border p-2">{data.activity_type}</td>
                              <td className="border p-2 text-right">{data.quantity}</td>
                              <td className="border p-2">{data.unit}</td>
                              <td className="border p-2">{data.start_date}</td>
                              <td className="border p-2 text-right font-bold">
                                <div className="flex items-center justify-end">
                                  <span>{data.calculated_co2e_kg ? data.calculated_co2e_kg.toFixed(2) : 'N/A'}</span>
                                  {data.is_fallback_calculation && (
                                    <span 
                                      title="⚠️ Bu değer geçici bir API sorunu nedeniyle tahmini faktörlerle hesaplanmıştır. Lütfen veriyi yeniden hesaplayın."
                                      className="ml-2 text-yellow-600 cursor-help font-bold text-base"
                                    >
                                      ⚠️
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="border p-2 text-center">
                                {/* Aktivite Düzenle Dialog */}
                                <Dialog open={editActivityDialogs[data.id]} onOpenChange={(open) => setEditActivityDialogs({...editActivityDialogs, [data.id]: open})}>
                                  <DialogTrigger asChild>
                                    <button className="text-yellow-600 hover:text-yellow-800 text-xs font-semibold">
                                      Düzenle
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[600px]">
                                    <DialogHeader>
                                      <DialogTitle>Aktivite Verisini Düzenle</DialogTitle>
                                    </DialogHeader>
                                    <ActivityDataForm facilityId={facility.id} initialData={data} onFormSubmit={() => { fetchUser(); setEditActivityDialogs({...editActivityDialogs, [data.id]: false}); }} />
                                  </DialogContent>
                                </Dialog>
                              </td>
                              <td className="border p-2 text-center">
                                <button 
                                  onClick={() => handleDelete('activity-data', data.id)} 
                                  className="text-red-600 hover:text-red-800 text-xs font-semibold"
                                >
                                  Sil
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}