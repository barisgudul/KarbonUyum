// frontend/components/ActivityDataForm.js
'use client';
import { useState, useEffect } from 'react'; // useEffect'i ekliyoruz
import api from '../lib/api';
import toast from 'react-hot-toast'; // react-hot-toast'u import ediyoruz

export default function ActivityDataForm({ facilityId, onFormSubmit, initialData = null }) {
  const [formData, setFormData] = useState({
    activity_type: 'electricity',
    quantity: '',
    unit: 'kWh',
    start_date: '',
    end_date: '',
  });

  // Eğer initialData varsa (düzenleme modu), formu doldur
  useEffect(() => {
    if (initialData) {
      setFormData({
        activity_type: initialData.activity_type,
        quantity: initialData.quantity,
        unit: initialData.unit,
        // API'den gelen tarih formatını (YYYY-MM-DD) input'un beklediği formata uygun hale getir
        start_date: initialData.start_date.split('T')[0],
        end_date: initialData.end_date.split('T')[0],
      });
    }
  }, [initialData]);

  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const dataPayload = {
        ...formData,
        quantity: parseFloat(formData.quantity)
    };

    // Düzenleme modunda mıyız yoksa yeni kayıt mı?
    const request = initialData
      ? api.put(`/activity-data/${initialData.id}`, dataPayload) // Düzenleme ise PUT
      : api.post(`/facilities/${facilityId}/activity-data/`, dataPayload); // Yeni ise POST

    toast.promise(request, {
      loading: 'Kaydediliyor...',
      success: () => {
        onFormSubmit(); // Dashboard'a haber ver
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
      <button type="submit" className="mt-4 px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
        {initialData ? 'Güncelle' : 'Veri Ekle'}
      </button>
      {/* toast kullandığımız için bu eski hata gösterimine artık gerek yok */}
    </form>
  );
}