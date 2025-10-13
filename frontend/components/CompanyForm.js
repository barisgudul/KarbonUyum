// frontend/components/CompanyForm.js
'use client';
import { useState } from 'react';
import api from '../lib/api';

export default function CompanyForm({ onCompanyAdded }) {
  const [name, setName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/companies/', { name, tax_number: taxNumber });
      onCompanyAdded(); // Başarılı olunca Dashboard'a haber ver
      // Formu temizle
      setName('');
      setTaxNumber('');
    } catch (err) {
      // Backend'den gelen hata mesajını göster
      setError(err.response?.data?.detail || 'Şirket oluşturulamadı. Lütfen tekrar deneyin.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 mb-6 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Yeni Şirket Ekle</h3>
      <div className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Şirket Adı"
          required
          className="w-full px-2 py-1 border rounded"
        />
        <input
          type="text"
          value={taxNumber}
          onChange={(e) => setTaxNumber(e.target.value)}
          placeholder="Vergi Numarası"
          required
          className="w-full px-2 py-1 border rounded"
        />
      </div>
      <button type="submit" className="mt-2 px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
        Ekle
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}