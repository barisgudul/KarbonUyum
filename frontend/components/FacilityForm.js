// frontend/components/FacilityForm.js
'use client';
import { useState } from 'react';
import api from '../lib/api';

export default function FacilityForm({ companyId, onFacilityAdded }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      // API endpoint'ine companyId'yi dahil ediyoruz
      await api.post(`/companies/${companyId}/facilities/`, { name, city, address });
      onFacilityAdded(); // Başarılı olunca Dashboard'u yenile
      // Formu temizle
      setName('');
      setCity('');
      setAddress('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Tesis oluşturulamadı. Lütfen tekrar deneyin.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 mt-2 mb-4 ml-4 border-l-2 border-gray-200 bg-gray-50">
      <h4 className="font-semibold mb-2 text-gray-700">Bu Şirkete Yeni Tesis Ekle</h4>
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
        Tesis Ekle
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}