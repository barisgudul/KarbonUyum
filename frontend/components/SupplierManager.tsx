// frontend/components/SupplierManager.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Send, Package, AlertCircle, Loader, CheckCircle, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Supplier {
  id: number;
  company_name: string;
  email: string;
  is_active: boolean;
  verified: boolean;
  created_at: string;
}

interface Product {
  id: number;
  product_name: string;
  unit: string;
  co2e_per_unit_kg: number;
  is_verified: boolean;
}

interface SupplierManagerProps {
  companyId: number;
}

export default function SupplierManager({ companyId }: SupplierManagerProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCompanyName, setInviteCompanyName] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tedarikçileri yükle
  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/suppliers`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.suppliers);
      }
    } catch (err) {
      console.error('Supplier load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Ürünleri yükle
  const loadProducts = async (supplierId: number) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/suppliers/${supplierId}/products`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Product load error:', err);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [companyId]);

  useEffect(() => {
    if (selectedSupplier) {
      loadProducts(selectedSupplier.id);
    }
  }, [selectedSupplier]);

  const handleInviteSupplier = async () => {
    if (!inviteEmail || !inviteCompanyName) {
      toast.error('Tüm alanları doldurunuz');
      return;
    }

    setIsInviting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/suppliers/invite?company_id=${companyId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            supplier_email: inviteEmail,
            supplier_company_name: inviteCompanyName,
            relationship_type: 'supplier',
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`Davet ${inviteEmail}'e gönderildi!`);
        setInviteEmail('');
        setInviteCompanyName('');
        loadSuppliers();
      } else {
        throw new Error('Davet gönderilemedi');
      }
    } catch (err) {
      toast.error('Davet gönderme başarısız');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Davet Formu */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-emerald-500/20 space-y-4"
      >
        <h3 className="text-emerald-300 font-bold text-lg flex items-center gap-2">
          <Users className="w-6 h-6" />
          Tedarikçi Davet Et
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="email"
            placeholder="Tedarikçi Email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            disabled={isInviting}
            className="px-4 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm placeholder-emerald-300/50 focus:outline-none focus:border-emerald-400"
          />
          <input
            type="text"
            placeholder="Şirket Adı"
            value={inviteCompanyName}
            onChange={(e) => setInviteCompanyName(e.target.value)}
            disabled={isInviting}
            className="px-4 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm placeholder-emerald-300/50 focus:outline-none focus:border-emerald-400"
          />
        </div>

        <button
          onClick={handleInviteSupplier}
          disabled={isInviting}
          className="w-full px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isInviting ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Gönderiliyor...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Davet Gönder
            </>
          )}
        </button>
      </motion.div>

      {/* Tedarikçi Listesi */}
      {!isLoading && suppliers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="text-emerald-300 font-bold text-lg">
            Tedarikçiler ({suppliers.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AnimatePresence>
              {suppliers.map((supplier) => (
                <motion.div
                  key={supplier.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setSelectedSupplier(supplier)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedSupplier?.id === supplier.id
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-600 hover:border-emerald-500/50 bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-emerald-300">{supplier.company_name}</p>
                      <p className="text-xs text-emerald-300/60 mt-1">{supplier.email}</p>
                    </div>
                    <div className="flex gap-1">
                      {supplier.verified && (
                        <div title="Doğrulandı" className="p-1 bg-green-500/20 rounded">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                      )}
                      {supplier.is_active && (
                        <div title="Aktif" className="p-1 bg-emerald-500/20 rounded">
                          <Link2 className="w-4 h-4 text-emerald-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Seçili Tedarikçinin Ürünleri */}
      {selectedSupplier && products.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 rounded-2xl border border-emerald-500/30 space-y-4"
        >
          <h3 className="text-emerald-300 font-bold text-lg flex items-center gap-2">
            <Package className="w-6 h-6" />
            {selectedSupplier.company_name} Ürünleri
          </h3>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {products.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 bg-slate-800/50 rounded-lg border border-emerald-500/20"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-white">{product.product_name}</p>
                    <p className="text-xs text-emerald-300/70 mt-1">
                      {product.co2e_per_unit_kg.toFixed(2)} kg CO2e / {product.unit}
                    </p>
                  </div>
                  {product.is_verified && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded font-semibold">
                      Doğrulandı
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {isLoading && (
        <div className="p-6 text-center text-emerald-300/70">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
          Tedarikçiler yükleniyor...
        </div>
      )}

      {!isLoading && suppliers.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-6 text-center text-emerald-300/70 border-2 border-dashed border-emerald-500/30 rounded-lg"
        >
          Henüz tedarikçi eklenmedi. Bir tedarikçi davet ederek başlayın!
        </motion.div>
      )}
    </div>
  );
}
