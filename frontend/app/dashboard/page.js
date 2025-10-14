// frontend/app/dashboard/page.js
'use client';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import CompanyForm from '../../components/CompanyForm';
import FacilityForm from '../../components/FacilityForm';
import ActivityDataForm from '../../components/ActivityDataForm';
import SummaryPanel from '../../components/SummaryPanel';

export default function DashboardPage() {
  const { user, loading, logout, fetchUser } = useAuth();
  const router = useRouter();
  const [activeForm, setActiveForm] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleDataAdded = () => {
    fetchUser();
    setActiveForm(null);
  };
  
  const toggleForm = (type, id) => {
    if (activeForm && activeForm.type === type && activeForm.id === id) {
      setActiveForm(null);
    } else {
      setActiveForm({ type, id });
    }
  };

  const handleDelete = async (type, id) => {
    const typeMap = { 'companies': 'Şirketi', 'facilities': 'Tesisi', 'activity-data': 'Veri kaydını' };
    const confirmationMessage = `${typeMap[type] || 'Öğeyi'} silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`;
    
    if (window.confirm(confirmationMessage)) {
        try {
            await api.delete(`/${type}/${id}`);
            fetchUser();
        } catch (err) {
            alert(`Hata: ${err.response?.data?.detail || 'Öğe silinemedi.'}`);
        }
    }
  };

  if (loading || !user) {
    return <div className="p-8 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      <div className="container mx-auto p-4 sm:p-8">
        <div className="relative mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <button onClick={logout} className="absolute top-0 right-0 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Çıkış Yap
          </button>
        </div>
        <p className="mb-8 text-gray-600">Hoşgeldin, <span className="font-semibold">{user.email}</span>!</p>
        
        <SummaryPanel key={JSON.stringify(user)} />

        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Veri Girişi ve Detaylar</h2>
            <button 
              onClick={() => toggleForm('company', 'new')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {activeForm?.type === 'company' ? 'Formu Kapat' : '+ Yeni Şirket'}
            </button>
          </div>
          {activeForm?.type === 'company' && <CompanyForm onCompanyAdded={handleDataAdded} />}
        </div>

        <div className="space-y-6 mt-4">
          {user.companies.map(company => (
            <div key={company.id} className="p-6 bg-white border rounded-lg shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{company.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">Vergi No: {company.tax_number || 'N/A'}</p>
                </div>
                {/* ŞİRKET BUTONLARI ARTIK BİR ARADA */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button onClick={() => toggleForm('facility', company.id)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                    {activeForm?.type === 'facility' && activeForm?.id === company.id ? 'Kapat' : '+ Tesis'}
                  </button>
                  <button onClick={() => handleDelete('companies', company.id)} className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                    Sil
                  </button>
                </div>
              </div>

              {activeForm?.type === 'facility' && activeForm?.id === company.id && (
                <FacilityForm companyId={company.id} onFacilityAdded={handleDataAdded} />
              )}
              
              <div className="mt-4 pl-4 border-l-2 space-y-4">
                {company.facilities.map(facility => (
                  <div key={facility.id}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{facility.name}</h4>
                        <p className="text-sm text-gray-500">{facility.city}</p>
                      </div>
                      {/* TESİS BUTONLARI ARTIK BİR ARADA */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button onClick={() => toggleForm('activity', facility.id)} className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600">
                          {activeForm?.type === 'activity' && activeForm?.id === facility.id ? 'Kapat' : '+ Veri'}
                        </button>
                        <button onClick={() => handleDelete('facilities', facility.id)} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                          Sil
                        </button>
                      </div>
                    </div>

                    {activeForm?.type === 'activity' && activeForm?.id === facility.id && (
                      <ActivityDataForm facilityId={facility.id} onDataAdded={handleDataAdded} />
                    )}

                    {facility.activity_data.length > 0 && (
                      <table className="w-full text-sm mt-2 border-collapse">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border p-2 text-left">Tür</th>
                            <th className="border p-2 text-right">Miktar</th>
                            <th className="border p-2 text-left">Birim</th>
                            <th className="border p-2 text-left">Dönem</th>
                            <th className="border p-2 text-right font-bold">CO2e (kg)</th>
                            <th className="border p-2">İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {facility.activity_data.map(data => (
                            <tr key={data.id} className="bg-white hover:bg-gray-50">
                              <td className="border p-2">{data.activity_type}</td>
                              <td className="border p-2 text-right">{data.quantity}</td>
                              <td className="border p-2">{data.unit}</td>
                              <td className="border p-2">{data.start_date}</td>
                              <td className="border p-2 text-right font-bold">{data.calculated_co2e_kg ? data.calculated_co2e_kg.toFixed(2) : 'N/A'}</td>
                              <td className="border p-2 text-center">
                                <button onClick={() => handleDelete('activity-data', data.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold">
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