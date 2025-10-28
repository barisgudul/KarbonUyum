// frontend/components/InvoiceUploader.tsx

'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, Check, AlertCircle, Loader, X } from 'lucide-react';

interface Invoice {
  id: number;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'verified';
  extracted_quantity?: number;
  extracted_cost_tl?: number;
  extracted_activity_type?: string;
  created_at: string;
}

interface InvoiceUploaderProps {
  facilityId: number;
  onSuccess?: () => void;
  onInvoiceUploaded?: (invoice: Invoice) => void;
}

const statusColors = {
  pending: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
  processing: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
  completed: 'bg-green-500/10 border-green-500/30 text-green-300',
  failed: 'bg-red-500/10 border-red-500/30 text-red-300',
  verified: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
};

const statusLabels = {
  pending: '⏳ Beklemede',
  processing: '🔄 İşleniyor',
  completed: '✅ Tamamlandı',
  failed: '❌ Başarısız',
  verified: '✔️ Doğrulandı',
};

export default function InvoiceUploader({
  facilityId,
  onSuccess,
  onInvoiceUploaded
}: InvoiceUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    setIsUploading(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', files[0]); // Tek bir dosya

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/facilities/${facilityId}/invoices/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Fatura yükleme başarısız');
      }

      const invoice = await response.json();
      setInvoices([invoice, ...invoices]);
      
      if (onInvoiceUploaded) {
        onInvoiceUploaded(invoice);
      }

      // Polling: OCR tamamlanana kadar kontrol et
      pollInvoiceStatus(invoice.id);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yükleme hatası');
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  };

  const pollInvoiceStatus = (invoiceId: number) => {
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/facilities/${facilityId}/invoices`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          const updatedInvoice = data.invoices.find((i: Invoice) => i.id === invoiceId);
          
          if (updatedInvoice) {
            setInvoices(prev => 
              prev.map(inv => inv.id === invoiceId ? updatedInvoice : inv)
            );

            if (updatedInvoice.status !== 'processing' && updatedInvoice.status !== 'pending') {
              clearInterval(interval);
            }
          }
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 2000);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-5 h-5" />;
      case 'processing':
        return <Loader className="w-5 h-5 animate-spin" />;
      case 'completed':
      case 'verified':
        return <Check className="w-5 h-5" />;
      case 'failed':
        return <X className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Area */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        animate={isDragging ? { scale: 1.02 } : { scale: 1 }}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${isDragging
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
          }
        `}
      >
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={isDragging ? { y: -5 } : { y: 0 }}
            className="p-4 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg"
          >
            <Upload className="w-8 h-8 text-white" />
          </motion.div>

          <div>
            <h3 className="text-lg font-semibold text-emerald-300 mb-1">
              Faturaları Sürükleyin
            </h3>
            <p className="text-sm text-emerald-300/70">
              veya <label className="underline cursor-pointer hover:text-emerald-300">
                dosya seçin
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </p>
            <p className="text-xs text-emerald-300/50 mt-2">
              PDF, JPEG, PNG (max 10MB)
            </p>
          </div>

          {isUploading && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mt-2"
            >
              <Loader className="w-6 h-6 text-emerald-400" />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice List */}
      {invoices.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-emerald-300">Yüklenen Faturalar</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {invoices.map((invoice) => (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`
                    p-3 rounded-lg border-2 flex items-start gap-3
                    ${statusColors[invoice.status as keyof typeof statusColors]}
                  `}
                >
                  <div className="mt-0.5">
                    {getStatusIcon(invoice.status)}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm truncate">
                      {invoice.filename}
                    </p>
                    <p className="text-xs mt-1">
                      {statusLabels[invoice.status as keyof typeof statusLabels]}
                    </p>
                    
                    {invoice.status === 'completed' && (
                      <p className="text-xs mt-1 opacity-75">
                        {invoice.extracted_activity_type} • {invoice.extracted_quantity} • {invoice.extracted_cost_tl?.toFixed(0)} TL
                      </p>
                    )}
                  </div>

                  {invoice.status === 'completed' && (
                    <button
                      onClick={() => {
                        // Doğrulama modalını aç
                        alert(`Invoice ${invoice.id} doğrulanıyor...`);
                      }}
                      className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded font-semibold"
                    >
                      Doğrula
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
