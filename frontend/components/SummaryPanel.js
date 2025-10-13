// frontend/components/SummaryPanel.js
'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function SummaryPanel() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/dashboard/summary');
        setSummary(data);
      } catch (err) {
        setError('Özet verileri yüklenemedi. Lütfen daha sonra tekrar deneyin.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) return <div className="text-center p-8 bg-white rounded-lg shadow-md mb-8">Özet verileri yükleniyor...</div>;
  if (error) return <div className="text-center p-8 text-red-600 bg-red-50 rounded-lg shadow-md mb-8">{error}</div>;
  if (!summary || summary.monthly_trend.length === 0) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-semibold text-gray-800">Henüz Görüntülenecek Veri Yok</h3>
        <p className="text-gray-500 mt-2">Grafikleri görmek için bir aktivite verisi (fatura vb.) ekleyin.</p>
      </div>
    );
  }

  const percentageChange = summary.previous_month_total > 0
    ? ((summary.current_month_total - summary.previous_month_total) / summary.previous_month_total) * 100
    : (summary.current_month_total > 0 ? 100 : 0); // Önceki ay 0 ise, bu ay artış varsa %100 artış kabul edelim

  const changeColor = percentageChange >= 0 ? 'text-red-700' : 'text-green-700';
  const changeBg = percentageChange >= 0 ? 'bg-red-100' : 'bg-green-100';

  return (
    <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Genel Bakış</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-4 bg-blue-50 rounded-lg text-center shadow">
          <h4 className="text-sm font-semibold text-gray-500 uppercase">Bu Ayki Toplam Emisyon</h4>
          <p className="text-3xl font-bold text-blue-800 mt-2">
            {summary.current_month_total.toFixed(2)} <span className="text-lg font-medium">kg CO₂e</span>
          </p>
        </div>
        <div className="p-4 bg-gray-100 rounded-lg text-center shadow">
          <h4 className="text-sm font-semibold text-gray-500 uppercase">Önceki Ay</h4>
          <p className="text-3xl font-bold text-gray-700 mt-2">
            {summary.previous_month_total.toFixed(2)} <span className="text-lg font-medium">kg CO₂e</span>
          </p>
        </div>
        <div className={`p-4 rounded-lg text-center shadow ${changeBg}`}>
          <h4 className="text-sm font-semibold text-gray-500 uppercase">Aylık Değişim</h4>
          <p className={`text-3xl font-bold mt-2 ${changeColor}`}>
            {percentageChange >= 0 ? '↑' : '↓'} {Math.abs(percentageChange).toFixed(1)}%
          </p>
        </div>
      </div>
      <h3 className="text-xl font-semibold mb-4">Aylık Emisyon Trendi</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={summary.monthly_trend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `${value.toFixed(2)} kg`} />
            <Legend />
            <Bar dataKey="total_co2e_kg" fill="#3b82f6" name="Toplam Emisyon (kg CO₂e)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}