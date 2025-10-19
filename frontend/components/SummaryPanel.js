// frontend/components/SummaryPanel.js
'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

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
    : (summary.current_month_total > 0 ? 100 : 0);

  const changeColor = percentageChange >= 0 ? 'text-red-700' : 'text-green-700';
  const changeBg = percentageChange >= 0 ? 'bg-red-100' : 'bg-green-100';

  // Custom tooltip for stacked bar chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toFixed(2)} kg CO₂e
            </p>
          ))}
          <p className="text-sm font-bold text-gray-900 mt-2 pt-2 border-t">
            Toplam: {payload.reduce((sum, entry) => sum + entry.value, 0).toFixed(2)} kg CO₂e
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Genel Bakış</h2>
      
      {/* Scope Bazlı Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-orange-50 rounded-lg text-center shadow border border-orange-200">
          <h4 className="text-xs font-semibold text-gray-500 uppercase">Bu Ay Scope 1</h4>
          <p className="text-sm text-gray-600 mb-1">(Doğrudan Emisyonlar)</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">
            {summary.current_month_scope_1.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">kg CO₂e</p>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-lg text-center shadow border border-blue-200">
          <h4 className="text-xs font-semibold text-gray-500 uppercase">Bu Ay Scope 2</h4>
          <p className="text-sm text-gray-600 mb-1">(Satın Alınan Enerji)</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">
            {summary.current_month_scope_2.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">kg CO₂e</p>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg text-center shadow border border-purple-200">
          <h4 className="text-xs font-semibold text-gray-500 uppercase">Bu Ay Toplam</h4>
          <p className="text-sm text-gray-600 mb-1">&nbsp;</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">
            {summary.current_month_total.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">kg CO₂e</p>
        </div>
        
        <div className={`p-4 rounded-lg text-center shadow ${changeBg}`}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase">Aylık Değişim</h4>
          <p className="text-sm text-gray-600 mb-1">Önceki Aya Göre</p>
          <p className={`text-2xl font-bold mt-1 ${changeColor}`}>
            {percentageChange >= 0 ? '↑' : '↓'} {Math.abs(percentageChange).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Önceki: {summary.previous_month_total.toFixed(2)} kg
          </p>
        </div>
      </div>

      {/* Scope Bazlı Aylık Trend (Stacked Bar Chart) */}
      <h3 className="text-xl font-semibold mb-4">Aylık Emisyon Trendi (Scope Bazlı)</h3>
      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
          <BarChart data={summary.monthly_trend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="scope_1_co2e_kg" stackId="a" fill="#f97316" name="Scope 1 (Doğrudan)" />
            <Bar dataKey="scope_2_co2e_kg" stackId="a" fill="#3b82f6" name="Scope 2 (Enerji)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* GHG Protokolü Açıklaması */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600">
          <strong>GHG Protokolü Scope Açıklaması:</strong><br/>
          <span className="text-orange-600 font-semibold">Scope 1:</span> Kuruluşun sahip olduğu veya kontrol ettiği kaynaklardan kaynaklanan doğrudan emisyonlar (doğalgaz, dizel yakıt, vb.)<br/>
          <span className="text-blue-600 font-semibold">Scope 2:</span> Satın alınan elektrik, ısı veya buhar kaynaklı dolaylı emisyonlar
        </p>
      </div>
    </div>
  );
}