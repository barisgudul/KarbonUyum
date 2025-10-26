// frontend/components/CSVUploader.js
'use client';
import { useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Download, Upload, AlertCircle, CheckCircle, File } from 'lucide-react';

export default function CSVUploader({ facilityId, facilityName, onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Sadece .csv uzantılı dosyalar yüklenebilir');
        return;
      }
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/csv-template/activity-data');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aktivite_verisi_sablonu.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Şablon indirildi');
    } catch (error) {
      toast.error('Şablon indirilemedi');
      console.error(error);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Lütfen bir dosya seçin');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await api.post(
        `/facilities/${facilityId}/upload-csv`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setUploadResult(response.data);
      setShowResults(true);

      if (response.data.successful_rows > 0) {
        toast.success(response.data.message);
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'CSV yükleme başarısız oldu';
      toast.error(errorMessage);
      console.error('CSV upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setShowResults(false);
    // Reset file input
    const fileInput = document.getElementById('csv-file-input');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Template Download Section */}
      <div className="p-5 bg-emerald-500/10 border border-emerald-400/40 rounded-lg">
        <p className="text-sm text-emerald-200 mb-3 font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> <strong>İlk Kez mi Yüklüyorsunuz?</strong> Önce şablonu indirin ve doldurun.
        </p>
        <button
          onClick={handleDownloadTemplate}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg transition font-bold shadow-lg hover:shadow-emerald-500/50 flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Şablon İndir
        </button>
      </div>

      {/* File Upload Section */}
      {!uploadResult && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-emerald-300 mb-3">
              CSV Dosyası Seçin
            </label>
            <div className="relative">
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="csv-file-input" className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-emerald-500/40 rounded-lg cursor-pointer hover:border-emerald-500/60 hover:bg-slate-700/20 transition-all">
                <div className="text-center">
                  <File className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-emerald-300 font-bold">Dosya Seçmek İçin Tıklayın</p>
                  <p className="text-emerald-200/60 text-sm mt-1">veya dosyayı sürükleyip bırakın</p>
                </div>
              </label>
            </div>
            {selectedFile && (
              <p className="mt-3 text-sm text-emerald-300 font-semibold">
                <CheckCircle className="w-4 h-4 inline mr-2 text-emerald-400" /> Seçili dosya: <span className="text-emerald-400">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition font-bold shadow-lg hover:shadow-emerald-500/50 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" /> {uploading ? 'Yükleniyor...' : 'Yükle'}
            </button>
            {selectedFile && !uploading && (
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-slate-700/50 border border-slate-600 hover:border-slate-500 text-slate-300 rounded-lg transition font-bold"
              >
                İptal
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results Section */}
      {uploadResult && (
        <div className="mt-6 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600 rounded-lg text-center">
              <div className="text-3xl font-black text-cyan-300">{uploadResult.total_rows}</div>
              <div className="text-xs text-slate-400 mt-1 font-semibold">Toplam Satır</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 border border-emerald-500/40 rounded-lg text-center">
              <div className="text-3xl font-black text-emerald-300">{uploadResult.successful_rows}</div>
              <div className="text-xs text-emerald-200 mt-1 font-semibold flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> Başarılı</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-red-600/20 to-red-700/20 border border-red-500/40 rounded-lg text-center">
              <div className="text-3xl font-black text-red-300">{uploadResult.failed_rows}</div>
              <div className="text-xs text-red-200 mt-1 font-semibold flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3" /> Hatalı</div>
            </div>
          </div>

          {/* Error Details */}
          {uploadResult.failed_rows > 0 && (
            <div>
              <button
                onClick={() => setShowResults(!showResults)}
                className="text-sm text-emerald-400 hover:text-emerald-300 font-bold transition"
              >
                {showResults ? '▼ Hata Detaylarını Gizle' : '▶ Hata Detaylarını Göster'}
              </button>

              {showResults && (
                <div className="mt-3 max-h-80 overflow-y-auto bg-slate-800/50 border border-slate-700 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800 sticky top-0 border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-emerald-400 font-bold">Satır</th>
                        <th className="px-4 py-2 text-left text-emerald-400 font-bold">Aktivite</th>
                        <th className="px-4 py-2 text-left text-emerald-400 font-bold">Miktar</th>
                        <th className="px-4 py-2 text-left text-emerald-400 font-bold">Hata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.results
                        .filter((row) => !row.success)
                        .map((row, idx) => (
                          <tr key={idx} className="border-t border-slate-700 hover:bg-slate-700/50">
                            <td className="px-4 py-2 text-slate-300">{row.row_number}</td>
                            <td className="px-4 py-2 text-slate-300">{row.activity_type}</td>
                            <td className="px-4 py-2 text-slate-300">
                              {row.quantity} {row.unit}
                            </td>
                            <td className="px-4 py-2 text-red-400 text-xs font-semibold">{row.error}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* New Upload Button */}
          <div className="pt-4 border-t border-slate-700">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg transition font-bold shadow-lg hover:shadow-emerald-500/50"
            >
              Yeni CSV Yükle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

