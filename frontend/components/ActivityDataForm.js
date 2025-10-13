// frontend/components/ActivityDataForm.js
'use client';
import { useState } from 'react';
import api from '../lib/api';

export default function ActivityDataForm({ facilityId, onDataAdded }) {
  const [formData, setFormData] = useState({
    activity_type: 'electricity',
    quantity: '',
    unit: 'kWh',
    start_date: '',
    end_date: '',
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/facilities/${facilityId}/activity-data/`, {
        ...formData,
        quantity: parseFloat(formData.quantity) // Miktarı sayıya çevir
      });
      onDataAdded();
      // Formu sıfırla
      setFormData({ activity_type: 'electricity', quantity: '', unit: 'kWh', start_date: '', end_date: '' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Veri oluşturulamadı. Lütfen tekrar deneyin.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 mt-2 ml-8 border-l-2 border-gray-200 bg-gray-50">
      <h5 className="font-semibold mb-2 text-gray-700">Yeni Aktivite Verisi Ekle (Örn: Fatura)</h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <select name="activity_type" value={formData.activity_type} onChange={handleChange} className="w-full px-2 py-1 border rounded">
          <option value="electricity">Elektrik</option>
          {/* Gelecekte 'natural_gas' vb. eklenebilir */}
        </select>
        <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} placeholder="Tüketim Miktarı" required className="w-full px-2 py-1 border rounded" />
        <input type="text" name="unit" value={formData.unit} onChange={handleChange} placeholder="Birim (örn: kWh)" required className="w-full px-2 py-1 border rounded" />
        <div>
          <label className="text-sm text-gray-600">Başlangıç Tarihi</label>
          <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required className="w-full px-2 py-1 border rounded" />
        </div>
        <div>
          <label className="text-sm text-gray-600">Bitiş Tarihi</label>
          <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} required className="w-full px-2 py-1 border rounded" />
        </div>
      </div>
      <button type="submit" className="mt-4 px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Veri Ekle</button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}