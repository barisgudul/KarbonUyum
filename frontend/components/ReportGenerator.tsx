// frontend/components/ReportGenerator.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, Loader, CheckCircle, AlertCircle, X, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Report {
  id: number;
  report_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  created_at: string;
  completed_at?: string;
  file_size_bytes?: number;
  download_count: number;
  error_message?: string;
  total_emissions_tco2e?: number;
  total_savings_tl?: number;
}

interface ReportGeneratorProps {
  companyId: number;
  onReportGenerated?: () => void;
}

const statusColors = {
  pending: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
  processing: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
  completed: 'bg-green-500/10 border-green-500/30 text-green-300',
  failed: 'bg-red-500/10 border-red-500/30 text-red-300',
  expired: 'bg-gray-500/10 border-gray-500/30 text-gray-300',
};

const reportTypeLabels = {
  cbam_xml: '📊 CBAM XML Raporu',
  roi_analysis: '💰 ROI Analiz Raporu',
  combined: '📋 Birleşik Rapor',
};

export default function ReportGenerator({ companyId, onReportGenerated }: ReportGeneratorProps) {
  const [selectedType, setSelectedType] = useState<'cbam_xml' | 'roi_analysis' | 'combined'>('cbam_xml');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodName, setPeriodName] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Raporları yükle
  const loadReports = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/reports`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
      }
    } catch (err) {
      console.error('Report load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // 5 saniyede bir raporları kontrol et
    const interval = setInterval(loadReports, 5000);
    return () => clearInterval(interval);
  }, [companyId]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/reports/request`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            report_type: selectedType,
            start_date: startDate,
            end_date: endDate,
            period_name: periodName || `${startDate} - ${endDate}`,
            notify_user: true,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`Raporunuz oluşturulmaya başlandı! (~${data.estimated_time_seconds} saniye)`);
        loadReports(); // Raporları yenile
        if (onReportGenerated) onReportGenerated();
      } else {
        throw new Error('Rapor oluşturulamadı');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Rapor oluşturma hatası';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async (report: Report) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/reports/${report.id}/download`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${report.id}.${report.report_type === 'cbam_xml' ? 'xml' : 'json'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Rapor indirildi!');
      }
    } catch (err) {
      toast.error('İndirme başarısız');
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    if (!confirm('Bu raporu silmek istediğinize emin misiniz?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/reports/${reportId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast.success('Rapor silindi');
        loadReports();
      }
    } catch (err) {
      toast.error('Silme işlemi başarısız');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-5 h-5" />;
      case 'processing':
        return <Loader className="w-5 h-5 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'failed':
        return <X className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Request Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-emerald-500/20 space-y-4"
      >
        <h3 className="text-emerald-300 font-bold text-lg flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Rapor Oluştur
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Report Type Selection */}
          <div>
            <label className="block text-emerald-300/70 text-sm font-semibold mb-2">Rapor Türü</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              disabled={isGenerating}
              className="w-full px-4 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
            >
              <option value="cbam_xml">{reportTypeLabels.cbam_xml}</option>
              <option value="roi_analysis">{reportTypeLabels.roi_analysis}</option>
              <option value="combined">{reportTypeLabels.combined}</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-emerald-300/70 text-sm font-semibold mb-2">Başlangıç Tarihi</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isGenerating}
              className="w-full px-4 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-emerald-300/70 text-sm font-semibold mb-2">Bitiş Tarihi</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isGenerating}
              className="w-full px-4 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        {/* Period Name (Optional) */}
        <div>
          <label className="block text-emerald-300/70 text-sm font-semibold mb-2">Dönem Adı (Opsiyonel)</label>
          <input
            type="text"
            placeholder="Örn: Q1 2024, Ocak-Mart 2024"
            value={periodName}
            onChange={(e) => setPeriodName(e.target.value)}
            disabled={isGenerating}
            className="w-full px-4 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold rounded-lg shadow-lg hover:shadow-emerald-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Oluşturuluyor...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Rapor Oluştur
            </>
          )}
        </button>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-300 text-sm"
          >
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </motion.div>

      {/* Reports List */}
      {!isLoading && reports.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="text-emerald-300 font-bold text-lg">Raporlar ({reports.length})</h3>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {reports.map((report, idx) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 rounded-lg border-2 flex items-center justify-between ${
                    statusColors[report.status]
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div>{getStatusIcon(report.status)}</div>
                    <div className="flex-1">
                      <p className="font-semibold">{reportTypeLabels[report.report_type as keyof typeof reportTypeLabels]}</p>
                      <p className="text-xs opacity-75">
                        {new Date(report.created_at).toLocaleDateString('tr-TR')} •{' '}
                        {report.status === 'completed' && report.download_count > 0
                          ? `${report.download_count}x indirildi`
                          : report.status}
                      </p>
                      {report.total_emissions_tco2e && (
                        <p className="text-xs mt-1">
                          📊 Toplam Emisyon: {report.total_emissions_tco2e.toFixed(2)} tCO2e
                        </p>
                      )}
                      {report.total_savings_tl && (
                        <p className="text-xs mt-1">
                          💰 Tasarruf Potansiyeli: {report.total_savings_tl.toLocaleString('tr-TR')} TL
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {report.status === 'completed' && (
                      <button
                        onClick={() => handleDownloadReport(report)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-all"
                        title="İndir"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-all"
                      title="Sil"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {isLoading && (
        <div className="p-6 text-center text-emerald-300/70">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
          Raporlar yükleniyor...
        </div>
      )}
    </div>
  );
}
