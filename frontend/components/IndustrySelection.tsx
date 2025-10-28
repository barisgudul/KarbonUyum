// frontend/components/IndustrySelection.tsx

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, ChevronRight, Search, TrendingUp } from 'lucide-react';
import { useOnboardingStore, INDUSTRY_TEMPLATES, IndustryTemplate } from '../stores/useOnboardingStore';

interface IndustrySelectionProps {
  onSelect?: (industry: IndustryTemplate) => void;
}

export default function IndustrySelection({ onSelect }: IndustrySelectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const { selectIndustry, nextStep, data } = useOnboardingStore();
  const selectedIndustry = data.selectedIndustry;
  
  // Kategori filtreleme ve arama
  const filteredIndustries = INDUSTRY_TEMPLATES.filter(industry => {
    const matchesSearch = industry.industry_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          industry.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || industry.industry_type === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Kategoriler
  const categories = [
    { value: null, label: 'Tümü', icon: '🏢' },
    { value: 'manufacturing', label: 'Üretim', icon: '🏭' },
    { value: 'services', label: 'Hizmet', icon: '💼' },
    { value: 'retail', label: 'Perakende', icon: '🛍️' },
    { value: 'other', label: 'Diğer', icon: '📋' }
  ];
  
  const handleIndustrySelect = (industry: IndustryTemplate) => {
    selectIndustry(industry);
    if (onSelect) {
      onSelect(industry);
    }
  };
  
  const handleContinue = () => {
    if (selectedIndustry) {
      nextStep();
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
              <div className="relative p-6 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-3xl shadow-2xl">
                <Building2 className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl font-black text-white mb-4">
            Sektörünüzü Seçin
          </h1>
          <p className="text-xl text-emerald-200 max-w-2xl mx-auto">
            Size özel karbon ayak izi analizi için işletmenizin faaliyet gösterdiği ana sektörü seçin.
            <span className="block mt-2 text-emerald-300 font-semibold">
              Hemen simülasyon verilerinizi oluşturacağız!
            </span>
          </p>
        </motion.div>
        
        {/* Search & Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-emerald-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Sektör ara..."
              className="w-full pl-12 pr-4 py-4 bg-slate-800/70 border-2 border-emerald-500/30 rounded-2xl text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-400 transition-all backdrop-blur"
            />
          </div>
          
          {/* Category Filters */}
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category.value || 'all'}
                onClick={() => setSelectedCategory(category.value)}
                className={`
                  px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105
                  ${selectedCategory === category.value
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-slate-800/50 text-emerald-300 hover:bg-slate-700/50 border border-emerald-500/30'
                  }
                `}
              >
                <span className="mr-2">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>
        </motion.div>
        
        {/* Industries Grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
        >
          {filteredIndustries.map((industry, index) => (
            <motion.button
              key={industry.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleIndustrySelect(industry)}
              className={`
                relative p-6 rounded-2xl text-left transition-all group
                ${selectedIndustry?.id === industry.id
                  ? 'bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border-2 border-emerald-400 shadow-2xl shadow-emerald-500/20'
                  : 'bg-slate-800/50 border border-emerald-500/20 hover:bg-slate-800/70 hover:border-emerald-500/40'
                }
              `}
            >
              {/* Selected Indicator */}
              {selectedIndustry?.id === industry.id && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-4 right-4"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </motion.div>
              )}
              
              {/* Icon */}
              <div className="text-4xl mb-4">{industry.icon}</div>
              
              {/* Title */}
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                {industry.industry_name}
              </h3>
              
              {/* Description */}
              <p className="text-sm text-emerald-200/70 mb-4">
                {industry.description}
              </p>
              
              {/* Metrics Preview */}
              <div className="space-y-2 pt-3 border-t border-emerald-500/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400/70">Yıllık Elektrik</span>
                  <span className="text-emerald-300 font-semibold">
                    {(industry.typical_electricity_kwh_per_employee / 1000).toFixed(1)} MWh/kişi
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400/70">Doğalgaz</span>
                  <span className="text-emerald-300 font-semibold">
                    {industry.typical_gas_m3_per_employee.toLocaleString('tr-TR')} m³/kişi
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>
        
        {/* No Results */}
        {filteredIndustries.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-emerald-300 text-lg">
              Aramanızla eşleşen sektör bulunamadı.
            </p>
            <p className="text-emerald-400/70 mt-2">
              Farklı bir arama terimi deneyin veya kategori filtrelerini değiştirin.
            </p>
          </motion.div>
        )}
        
        {/* Continue Button */}
        {selectedIndustry && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mt-12"
          >
            <button
              onClick={handleContinue}
              className="
                group relative px-12 py-5 
                bg-gradient-to-r from-emerald-500 to-cyan-500 
                hover:from-emerald-600 hover:to-cyan-600 
                text-white font-black text-xl rounded-2xl 
                shadow-2xl hover:shadow-emerald-500/50 
                transition-all duration-300 
                transform hover:scale-105 active:scale-95
              "
            >
              <span className="flex items-center gap-3">
                Devam Et
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
              
              {/* Glow Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity"></div>
            </button>
          </motion.div>
        )}
        
        {/* Info Box */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 p-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-emerald-300 font-bold text-lg mb-2">
                Neden Sektör Seçimi Önemli?
              </h4>
              <p className="text-emerald-200/70 text-sm leading-relaxed">
                Her sektörün kendine özgü enerji tüketim profili ve karbon emisyon karakteristikleri vardır. 
                Sektörünüzü seçerek, size özel benchmark değerleri ve tasarruf önerileri sunabiliriz. 
                Sistemimiz, seçtiğiniz sektöre göre gerçekçi simülasyon verileri oluşturacak ve 
                hemen karbon ayak izinizi görmenizi sağlayacak!
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
