// frontend/components/CompanyForm.js
'use client';
import { useState, useEffect } from 'react'; // useEffect'i ekliyoruz
import api from '../lib/api';
import toast from 'react-hot-toast'; // react-hot-toast'u import ediyoruz

// Prop adını onFormSubmit olarak daha genel hale getirdik
export default function CompanyForm({ onFormSubmit, initialData = null }) {
  const [name, setName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');

  // Eğer initialData varsa (yani düzenleme modundaysak), formu doldur
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setTaxNumber(initialData.tax_number);
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const companyData = { name, tax_number: taxNumber };

    // Düzenleme modunda mıyız yoksa yeni kayıt mı?
    const request = initialData
      ? api.put(`/companies/${initialData.id}`, companyData) // Düzenleme ise PUT isteği
      : api.post('/companies/', companyData); // Yeni ise POST isteği

    // react-hot-toast ile şık bir bildirim gösteriyoruz
    toast.promise(request, {
      loading: 'Kaydediliyor...',
      success: () => {
        onFormSubmit(); // Parent component'e (Dashboard) haber ver
        return initialData ? 'Başarıyla güncellendi!' : 'Başarıyla eklendi!';
      },
      error: (err) => err.response?.data?.detail || 'Bir hata oluştu.',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 mb-6 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">
        {initialData ? 'Şirketi Düzenle' : 'Yeni Şirket Ekle'}
      </h3>
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
        {initialData ? 'Güncelle' : 'Ekle'}
      </button>
    </form>
  );
}