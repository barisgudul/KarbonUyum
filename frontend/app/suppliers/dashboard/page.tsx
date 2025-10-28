// frontend/app/suppliers/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Loader, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  product_name: string;
  product_category: string;
  unit: string;
  co2e_per_unit_kg: number;
  is_verified: boolean;
}

export default function SupplierDashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    product_name: '',
    product_category: '',
    unit: 'kg',
    co2e_per_unit_kg: 0,
  });

  const categories = [
    'İplik',
    'Kumaş',
    'Kimyasal',
    'Enerji',
    'Lojistik',
    'Paketleme',
    'Diğer',
  ];

  const units = ['kg', 'ton', 'litre', 'm³', 'kWh', 'adet'];

  // Ürünleri yükle
  const loadProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/suppliers/my-products`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Product load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleAddProduct = async () => {
    if (!formData.product_name || !formData.product_category || !formData.co2e_per_unit_kg) {
      toast.error('Tüm alanları doldurunuz');
      return;
    }

    setIsAdding(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/suppliers/my-products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProducts([...products, data]);
        setFormData({
          product_name: '',
          product_category: '',
          unit: 'kg',
          co2e_per_unit_kg: 0,
        });
        setShowForm(false);
        toast.success('Ürün başarıyla eklendi!');
      } else {
        throw new Error('Ürün eklenemedi');
      }
    } catch (err) {
      toast.error('Ürün ekleme başarısız');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Ürünü silmek istediğinize emin misiniz?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/suppliers/products/${productId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setProducts(products.filter((p) => p.id !== productId));
        toast.success('Ürün silindi');
      }
    } catch (err) {
      toast.error('Silme işlemi başarısız');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Başlık */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 mb-8"
        >
          <div className="flex items-center justify-center gap-3">
            <Package className="w-8 h-8 text-emerald-400" />
            <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              Ürünlerim
            </h1>
          </div>
          <p className="text-emerald-300/70">
            Karbonuyum platformunun karbon ayak izi verilerinizi yönetiniz
          </p>
        </motion.div>

        {/* Ürün Ekleme Butonu */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(!showForm)}
          className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold rounded-lg shadow-lg hover:shadow-emerald-500/50 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Yeni Ürün Ekle
        </motion.button>

        {/* Ürün Ekleme Formu */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-emerald-500/20 space-y-4"
            >
              <h3 className="text-emerald-300 font-bold text-lg">Ürün Bilgileri</h3>

              {/* Ürün Adı */}
              <div>
                <label className="block text-emerald-300/70 text-sm font-semibold mb-2">
                  Ürün Adı
                </label>
                <input
                  type="text"
                  placeholder="Örn: Pamuk İpliği"
                  value={formData.product_name}
                  onChange={(e) =>
                    setFormData({ ...formData, product_name: e.target.value })
                  }
                  disabled={isAdding}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm placeholder-emerald-300/50 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-emerald-300/70 text-sm font-semibold mb-2">
                  Kategori
                </label>
                <select
                  value={formData.product_category}
                  onChange={(e) =>
                    setFormData({ ...formData, product_category: e.target.value })
                  }
                  disabled={isAdding}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
                >
                  <option value="">Kategori Seçin</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Birim ve CO2e */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-emerald-300/70 text-sm font-semibold mb-2">
                    Birim
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    disabled={isAdding}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
                  >
                    {units.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-300/70 text-sm font-semibold mb-2">
                    CO2e (kg)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.co2e_per_unit_kg}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        co2e_per_unit_kg: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={isAdding}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm placeholder-emerald-300/50 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddProduct}
                  disabled={isAdding}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAdding ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Kaydet
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  disabled={isAdding}
                  className="flex-1 px-4 py-2 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  İptal
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ürünler Listesi */}
        {!isLoading && products.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <h3 className="text-emerald-300 font-bold text-lg">
              Kayıtlı Ürünler ({products.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <AnimatePresence>
                {products.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-emerald-300">
                          {product.product_name}
                        </p>
                        <p className="text-xs text-emerald-300/60 mt-1">
                          {product.product_category}
                        </p>
                      </div>
                      {product.is_verified && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded font-semibold">
                          Doğrulandı
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-emerald-300/70">
                        <strong>{product.co2e_per_unit_kg.toFixed(2)}</strong> kg CO2e / {product.unit}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="w-full px-3 py-1 border border-red-500/30 text-red-300 hover:bg-red-500/10 text-sm rounded transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Sil
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {isLoading && (
          <div className="p-12 text-center text-emerald-300/70">
            <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
            <p className="text-lg font-semibold">Ürünler yükleniyor...</p>
          </div>
        )}

        {!isLoading && products.length === 0 && !showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-12 text-center border-2 border-dashed border-emerald-500/30 rounded-lg space-y-4"
          >
            <Package className="w-16 h-16 text-emerald-300/50 mx-auto" />
            <p className="text-emerald-300/70 text-lg font-semibold">
              Henüz ürün eklemediniz
            </p>
            <p className="text-emerald-300/50 text-sm">
              Karbonuyum platformunda müşterilerinizle paylaşmak istediğiniz
              ürünleri ekleyerek başlayın.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
