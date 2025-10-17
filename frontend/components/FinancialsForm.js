// frontend/components/FinancialsForm.js
'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function FinancialsForm({ company, onFormSubmit }) {
  const [formData, setFormData] = useState({
    avg_electricity_cost_kwh: '',
    avg_gas_cost_m3: '',
  });

  // Bileşen yüklendiğinde mevcut finansal verileri forma doldur
  useEffect(() => {
    if (company.financials) {
      setFormData({
        avg_electricity_cost_kwh: company.financials.avg_electricity_cost_kwh || '',
        avg_gas_cost_m3: company.financials.avg_gas_cost_m3 || '',
      });
    }
  }, [company]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Sadece sayısal ve ondalık değerlere izin ver
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Boş stringleri null'a çevirerek API'ye gönder
    const payload = {
      avg_electricity_cost_kwh: formData.avg_electricity_cost_kwh ? parseFloat(formData.avg_electricity_cost_kwh) : null,
      avg_gas_cost_m3: formData.avg_gas_cost_m3 ? parseFloat(formData.avg_gas_cost_m3) : null,
    };

    const request = api.put(`/companies/${company.id}/financials`, payload);

    toast.promise(request, {
      loading: 'Finansal veriler kaydediliyor...',
      success: () => {
        onFormSubmit(); // Veriyi tazelemek için Dashboard'a haber ver
        return 'Başarıyla kaydedildi!';
      },
      error: (err) => err.response?.data?.detail || 'Bir hata oluştu.',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 mt-2 mb-4 ml-4 border-l-2 border-gray-200 bg-gray-50">
      <h4 className="font-semibold mb-2 text-gray-700">Finansal Parametreler</h4>
      <p className="text-xs text-gray-500 mb-3">Bu veriler, size özel maliyet tasarrufu önerileri sunmak için kullanılacaktır.</p>
      <div className="space-y-3">
        <div>
          <label htmlFor="avg_electricity_cost_kwh" className="block text-sm font-medium text-gray-700">
            Ortalama Elektrik Maliyeti (TL / kWh)
          </label>
          <input
            type="text"
            id="avg_electricity_cost_kwh"
            name="avg_electricity_cost_kwh"
            value={formData.avg_electricity_cost_kwh}
            onChange={handleChange}
            placeholder="Örn: 3.25"
            className="w-full mt-1 px-2 py-1 border rounded"
          />
        </div>
        <div>
          <label htmlFor="avg_gas_cost_m3" className="block text-sm font-medium text-gray-700">
            Ortalama Doğal Gaz Maliyeti (TL / m³)
          </label>
          <input
            type="text"
            id="avg_gas_cost_m3"
            name="avg_gas_cost_m3"
            value={formData.avg_gas_cost_m3}
            onChange={handleChange}
            placeholder="Örn: 24.5"
            className="w-full mt-1 px-2 py-1 border rounded"
          />
        </div>
      </div>
      <button type="submit" className="mt-4 px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
        Kaydet
      </button>
    </form>
  );
}