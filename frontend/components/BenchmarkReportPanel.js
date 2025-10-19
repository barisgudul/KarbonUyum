// frontend/components/BenchmarkReportPanel.js
'use client';

import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function BenchmarkReportPanel({ company }) {
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBenchmarkReport();
  }, [company?.id]);

  const fetchBenchmarkReport = async () => {
    if (!company?.id) return;

    try {
      setLoading(true);
      const response = await api.get(`/companies/${company.id}/benchmark-report`);
      setBenchmarkData(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Benchmark raporu yüklenemedi');
      console.error('Benchmark fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // YENİ: Eksik veri kontrolü
  const checkMissingData = () => {
    const missingReasons = [];

    if (!company?.industry_type) {
      missingReasons.push('Şirketinizin sektör tipi');
    }

    if (!company?.facilities?.length) {
      missingReasons.push('Tesis bilgisi');
    } else {
      const missingAreas = company.facilities.filter(f => !f.surface_area_m2 || f.surface_area_m2 <= 0);
      if (missingAreas.length > 0) {
        missingReasons.push(`${missingAreas.length} tesinin yüzölçümü bilgisi`);
      }
    }

    return missingReasons;
  };

  if (loading) {
    return (
      <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="text-center text-gray-500">Benchmark raporu yükleniyor...</div>
      </div>
    );
  }

  // YENİ: Eksik veri kontrolü
  const missingData = checkMissingData();
  if (missingData.length > 0) {
    return (
      <div className="mt-6 p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border-l-4 border-red-500">
        <h3 className="text-lg font-semibold mb-2 text-red-800">⚠️ Benchmark Raporu Hazırlanamıyor</h3>
        <p className="text-red-700 mb-2">
          Karşılaştırmalı analiz oluşturmak için lütfen aşağıdaki bilgileri tamamlayın:
        </p>
        <ul className="list-disc list-inside text-red-700 space-y-1">
          {missingData.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
        <p className="text-sm text-red-600 mt-3">
          💡 Bu bilgileri güncellediğinizde, benchmark raporu otomatik olarak hazırlanacaktır.
        </p>
      </div>
    );
  }

  // Veri yoksa mesaj göster
  if (!benchmarkData?.data_available) {
    return (
      <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-l-4 border-yellow-400">
        <h3 className="text-lg font-semibold mb-2 text-yellow-800">📊 Karşılaştırmalı Analiz</h3>
        <p className="text-yellow-700">
          {benchmarkData?.message || 'Karşılaştırma analizi için henüz yeterli veri bulunmamaktadır.'}
        </p>
        {benchmarkData?.comparable_companies_count && (
          <p className="text-sm text-yellow-600 mt-2">
            ℹ️ Mevcut: {benchmarkData.comparable_companies_count} şirket | Gerekli: 3 şirket
          </p>
        )}
      </div>
    );
  }

  // Başarılı durum - metrikler göster
  return (
    <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-blue-400">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-blue-900">📊 Karşılaştırmalı Analiz</h3>
          <p className="text-sm text-blue-700">
            {benchmarkData.comparable_companies_count} {benchmarkData.industry_type} şirketi ile karşılaştırıldı
          </p>
        </div>
        <button
          onClick={fetchBenchmarkReport}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          title="Raporu yenile"
        >
          ↻ Yenile
        </button>
      </div>

      {/* Metrik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {benchmarkData.metrics.map((metric, idx) => {
          const performanceColor = metric.is_better
            ? 'from-green-100 to-green-50 border-green-300' // Daha verimli (yeşil)
            : 'from-orange-100 to-orange-50 border-orange-300'; // Daha az verimli (turuncu)

          const performanceIcon = metric.is_better ? '✅' : '⚠️';
          const performanceText = metric.is_better
            ? `%${Math.abs(metric.difference_percent).toFixed(0)} daha verimli`
            : `%${Math.abs(metric.difference_percent).toFixed(0)} daha az verimli`;

          return (
            <div
              key={idx}
              className={`p-4 bg-gradient-to-br ${performanceColor} rounded-lg border`}
            >
              <h4 className="font-semibold text-gray-800">{metric.metric_name}</h4>

              {/* Şirketin Değeri */}
              <div className="mt-2">
                <p className="text-xs text-gray-600">Sizin: {metric.company_value.toFixed(2)} {metric.unit}</p>
                <div className="w-full bg-white rounded h-4 mt-1 border border-gray-300">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded"
                    style={{ width: `${Math.min((metric.company_value / metric.sector_avg) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Sektör Ortalaması */}
              <div className="mt-2">
                <p className="text-xs text-gray-600">Sektör Ort.: {metric.sector_avg.toFixed(2)} {metric.unit}</p>
              </div>

              {/* Performans Göstergesi */}
              <div className={`mt-3 p-2 rounded ${metric.is_better ? 'bg-green-200' : 'bg-orange-200'}`}>
                <p className="text-sm font-semibold">
                  {performanceIcon} {performanceText}
                </p>
              </div>

              {/* Verimlilik Oranı */}
              <p className="text-xs text-gray-700 mt-2">
                Verimlilik: {metric.efficiency_ratio.toFixed(0)}%
                {metric.efficiency_ratio < 100 && (
                  <span className="text-orange-600"> (sektör ortalamasından daha fazla tüketim)</span>
                )}
                {metric.efficiency_ratio >= 100 && (
                  <span className="text-green-600"> (sektör ortalamasından daha az tüketim)</span>
                )}
              </p>

              {/* YENİ: Eyleme Geçirme Butonu */}
              {!metric.is_better && (
                <div className="mt-3 p-3 bg-orange-100 rounded-lg border border-orange-300">
                  <p className="text-xs text-orange-800 mb-2">
                    💡 <strong>İpucu:</strong> Verimliliğinizi artırmak için önerileri kontrol edin
                  </p>
                  <a
                    href="#suggestions"
                    className="inline-block px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition"
                    title={`${metric.metric_name} iyileştirme önerileri`}
                  >
                    📈 Öneriler Gör
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Özet Mesajı */}
      <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-300">
        <p className="text-sm text-blue-800">
          <strong>📌 Not:</strong> Verimlilik oranı 100% olması sektör ortalaması ile eşit olduğunuzu gösterir.
          100% üstünde olduğunuzda daha verimli, altında olduğunuzda ise iyileştirme fırsatı var demektir.
        </p>
      </div>
    </div>
  );
}
