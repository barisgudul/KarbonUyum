// frontend/components/FacilityForm.js
'use client';
import { useState, useEffect } from 'react'; // useEffect'i ekliyoruz
import api from '../lib/api';
import toast from 'react-hot-toast'; // react-hot-toast'u import ediyoruz

export default function FacilityForm({ companyId, onFormSubmit, initialData = null }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  // Eğer initialData varsa (düzenleme modu), formu doldur
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCity(initialData.city);
      setAddress(initialData.address || '');
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const facilityData = { name, city, address };

    // Düzenleme modunda mıyız yoksa yeni kayıt mı?
    const request = initialData
      ? api.put(`/facilities/${initialData.id}`, facilityData) // Düzenleme ise PUT
      : api.post(`/companies/${companyId}/facilities/`, facilityData); // Yeni ise POST

    toast.promise(request, {
      loading: 'Kaydediliyor...',
      success: () => {
        onFormSubmit(); // Dashboard'a haber ver
        return initialData ? 'Tesis başarıyla güncellendi!' : 'Tesis başarıyla eklendi!';
      },
      error: (err) => err.response?.data?.detail || 'Bir hata oluştu.',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 mt-2 mb-4 ml-4 border-l-2 border-gray-200 bg-gray-50">
      <h4 className="font-semibold mb-2 text-gray-700">
        {initialData ? 'Tesisi Düzenle' : 'Bu Şirkete Yeni Tesis Ekle'}
      </h4>
      <div className="space-y-2">
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Tesis Adı (örn: Gebze Depo)" 
          required 
          className="w-full px-2 py-1 border rounded" 
        />
        <input 
          type="text" 
          value={city} 
          onChange={(e) => setCity(e.target.value)} 
          placeholder="Şehir" 
          required 
          className="w-full px-2 py-1 border rounded" 
        />
        <input 
          type="text" 
          value={address} 
          onChange={(e) => setAddress(e.target.value)} 
          placeholder="Açık Adres" 
          className="w-full px-2 py-1 border rounded" 
        />
      </div>
      <button type="submit" className="mt-2 px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
        {initialData ? 'Güncelle' : 'Tesis Ekle'}
      </button>
    </form>
  );
}