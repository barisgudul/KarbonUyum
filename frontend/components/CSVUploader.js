// frontend/components/CSVUploader.js
'use client';
import { useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

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
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        CSV ile Toplu Veri Yükleme - {facilityName}
      </h3>

      {/* Şablon İndirme */}
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-700 mb-2">
          <strong>İlk kez mi yüklüyorsunuz?</strong> Önce şablonu indirin ve doldurun.
        </p>
        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium"
        >
          📥 Şablon İndir
        </button>
      </div>

      {/* Dosya Seçme ve Yükleme */}
      {!uploadResult && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV Dosyası Seçin
            </label>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                Seçili dosya: <span className="font-medium">{selectedFile.name}</span> (
                {(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
            >
              {uploading ? '⏳ Yükleniyor...' : '📤 Yükle'}
            </button>
            {selectedFile && !uploading && (
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
              >
                İptal
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sonuçlar */}
      {uploadResult && (
        <div className="mt-6 space-y-4">
          {/* Özet Bilgiler */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-gray-100 rounded text-center">
              <div className="text-2xl font-bold text-gray-700">{uploadResult.total_rows}</div>
              <div className="text-xs text-gray-600 mt-1">Toplam Satır</div>
            </div>
            <div className="p-3 bg-green-100 rounded text-center">
              <div className="text-2xl font-bold text-green-700">{uploadResult.successful_rows}</div>
              <div className="text-xs text-gray-600 mt-1">Başarılı</div>
            </div>
            <div className="p-3 bg-red-100 rounded text-center">
              <div className="text-2xl font-bold text-red-700">{uploadResult.failed_rows}</div>
              <div className="text-xs text-gray-600 mt-1">Hatalı</div>
            </div>
          </div>

          {/* Detaylı Sonuçlar (Sadece Hatalı Satırlar) */}
          {uploadResult.failed_rows > 0 && (
            <div>
              <button
                onClick={() => setShowResults(!showResults)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {showResults ? '▼ Hata Detaylarını Gizle' : '▶ Hata Detaylarını Göster'}
              </button>

              {showResults && (
                <div className="mt-3 max-h-80 overflow-y-auto border border-gray-200 rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Satır</th>
                        <th className="px-3 py-2 text-left">Aktivite</th>
                        <th className="px-3 py-2 text-left">Miktar</th>
                        <th className="px-3 py-2 text-left">Hata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.results
                        .filter((row) => !row.success)
                        .map((row, idx) => (
                          <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                            <td className="px-3 py-2">{row.row_number}</td>
                            <td className="px-3 py-2">{row.activity_type}</td>
                            <td className="px-3 py-2">
                              {row.quantity} {row.unit}
                            </td>
                            <td className="px-3 py-2 text-red-600 text-xs">{row.error}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Yeni Yükleme Butonu */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
            >
              Yeni CSV Yükle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

