// frontend/components/ActivityDataForm.js
'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

// Desteklenen birim seçeneklerini tanımla
const UNIT_OPTIONS = {
  electricity: ['kWh', 'MWh', 'GJ'],
  natural_gas: ['m3', 'l'],
  diesel_fuel: ['l', 'm3'],
};

export default function ActivityDataForm({ facilityId, onFormSubmit, initialData = null }) {
  const [formData, setFormData] = useState({
    activity_type: 'electricity',
    quantity: '',
    unit: UNIT_OPTIONS['electricity'][0], // İlk aktivite türünün ilk birimini varsayılan yap
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        activity_type: initialData.activity_type,
        quantity: initialData.quantity,
        unit: initialData.unit,
        start_date: initialData.start_date.split('T')[0],
        end_date: initialData.end_date.split('T')[0],
      });
    }
  }, [initialData]);

  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };

    // Eğer aktivite türü değişiyorsa, birim listesini güncelle ve varsayılan birimi ayarla
    if (name === 'activity_type') {
      newFormData.unit = UNIT_OPTIONS[value][0]; // Yeni türün ilk birimini seç
    }
    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const dataPayload = { ...formData, quantity: parseFloat(formData.quantity) };

    const request = initialData
      ? api.put(`/activity-data/${initialData.id}`, dataPayload)
      : api.post(`/facilities/${facilityId}/activity-data/`, dataPayload);

    toast.promise(request, {
      loading: 'Kaydediliyor...',
      success: () => {
        onFormSubmit();
        return initialData ? 'Veri başarıyla güncellendi!' : 'Veri başarıyla eklendi!';
      },
      error: (err) => err.response?.data?.detail || 'Bir hata oluştu.',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 mt-2 ml-8 border-l-2 border-gray-200 bg-gray-50">
      <h5 className="font-semibold mb-2 text-gray-700">
        {initialData ? 'Aktivite Verisini Düzenle' : 'Yeni Aktivite Verisi Ekle'}
      </h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <select name="activity_type" value={formData.activity_type} onChange={handleChange} className="w-full px-2 py-1 border rounded">
          <option value="electricity">Elektrik</option>
          <option value="natural_gas">Doğal Gaz</option>
          <option value="diesel_fuel">Dizel Yakıt</option>
        </select>
        <input type="number" step="any" name="quantity" value={formData.quantity} onChange={handleChange} placeholder="Tüketim Miktarı" required className="w-full px-2 py-1 border rounded" />
        
        {/* YENİ: Serbest metin alanı yerine dinamik select kutusu */}
        <select name="unit" value={formData.unit} onChange={handleChange} required className="w-full px-2 py-1 border rounded">
          {UNIT_OPTIONS[formData.activity_type].map(unitOption => (
            <option key={unitOption} value={unitOption}>{unitOption}</option>
          ))}
        </select>
        
        <div>
          <label className="text-sm text-gray-600">Başlangıç Tarihi</label>
          <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required className="w-full px-2 py-1 border rounded" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Bitiş Tarihi</label>
          <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} required className="w-full px-2 py-1 border rounded" />
        </div>
      </div>
      <button type="submit" className="mt-4 px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
        {initialData ? 'Güncelle' : 'Veri Ekle'}
      </button>
    </form>
  );
}