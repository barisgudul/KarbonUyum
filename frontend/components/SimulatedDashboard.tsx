// frontend/components/SimulatedDashboard.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { 
  TrendingUp, TrendingDown, Zap, Flame, Droplet, 
  Building2, Users, Truck, ArrowRight, Sparkles,
  Award, Target, Leaf
} from 'lucide-react';
import { useOnboardingStore } from '../stores/useOnboardingStore';

interface SimulationData {
  totalEmissions: number;
  electricityUsage: number;
  gasUsage: number;
  fuelUsage: number;
  monthlyData: {
    month: string;
    emissions: number;
    electricity: number;
    gas: number;
  }[];
  savingsPotential: {
    amount: number;
    percentage: number;
  };
  industryComparison: {
    yourEmissions: number;
    industryAverage: number;
    bestInClass: number;
  };
}

export default function SimulatedDashboard() {
  const { data, nextStep } = useOnboardingStore();
  const [showConfetti, setShowConfetti] = useState(true);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  
  useEffect(() => {
    // Confetti'yi 5 saniye sonra kapat
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    
    // Simülasyon verisini hesapla
    if (data.selectedIndustry) {
      const industry = data.selectedIndustry;
      const monthlyElectricity = (industry.typical_electricity_kwh_per_employee * data.employeeCount) / 12;
      const monthlyGas = (industry.typical_gas_m3_per_employee * data.employeeCount) / 12;
      const monthlyFuel = (industry.typical_fuel_liters_per_vehicle * data.vehicleCount) / 12;
      
      // Emisyon faktörleri (kg CO2e)
      const electricityEmissions = monthlyElectricity * 0.42;
      const gasEmissions = monthlyGas * 2.03;
      const fuelEmissions = monthlyFuel * 2.68;
      
      const totalMonthlyEmissions = electricityEmissions + gasEmissions + fuelEmissions;
      
      // 3 aylık veri oluştur
      const months = ['Ekim 2024', 'Kasım 2024', 'Aralık 2024'];
      const monthlyData = months.map((month, index) => ({
        month,
        emissions: totalMonthlyEmissions * (1 + (Math.random() - 0.5) * 0.2), // ±10% varyasyon
        electricity: monthlyElectricity * (1 + (Math.random() - 0.5) * 0.15),
        gas: monthlyGas * (1 + (Math.random() - 0.5) * 0.25)
      }));
      
      setSimulationData({
        totalEmissions: totalMonthlyEmissions * 3 / 1000, // ton CO2e
        electricityUsage: monthlyElectricity * 3,
        gasUsage: monthlyGas * 3,
        fuelUsage: monthlyFuel * 3,
        monthlyData,
        savingsPotential: {
          amount: totalMonthlyEmissions * 3 * 0.25 / 1000, // %25 tasarruf potansiyeli
          percentage: 25
        },
        industryComparison: {
          yourEmissions: totalMonthlyEmissions * 12 / 1000,
          industryAverage: (totalMonthlyEmissions * 12 / 1000) * 1.15,
          bestInClass: (totalMonthlyEmissions * 12 / 1000) * 0.75
        }
      });
    }
    
    return () => clearTimeout(timer);
  }, [data]);
  
  const handleStartWizard = () => {
    nextStep();
  };
  
  if (!simulationData) return null;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-8 relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          colors={['#10b981', '#06b6d4', '#a855f7', '#f59e0b']}
          numberOfPieces={200}
          recycle={false}
        />
      )}
      
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          {/* Success Badge */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-2 border-emerald-400 rounded-full mb-6"
          >
            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span className="text-emerald-300 font-bold">Simülasyon Hazır!</span>
            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
          </motion.div>
          
          <h1 className="text-5xl font-black text-white mb-4">
            Dashboard&apos;unuz <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Hazır!</span>
          </h1>
          <p className="text-xl text-emerald-200 max-w-3xl mx-auto">
            <strong>{data.selectedIndustry?.industry_name}</strong> sektörü için örnek verilerle doldurulmuş dashboard&apos;unuzu görüyorsunuz.
            Şimdi kendi verilerinizle değiştirme zamanı!
          </p>
        </motion.div>
        
        {/* Simulation Watermark */}
        <div className="fixed top-8 right-8 z-50">
          <div className="px-4 py-2 bg-amber-500/20 border border-amber-500/50 rounded-lg backdrop-blur">
            <p className="text-amber-300 font-semibold text-sm">📊 Örnek Veri</p>
          </div>
        </div>
        
        {/* Company Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-slate-800/50 border border-emerald-500/30 rounded-2xl p-6 backdrop-blur">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-300/70 text-sm">Sektör</span>
            </div>
            <p className="text-white font-bold text-lg">{data.selectedIndustry?.industry_name}</p>
          </div>
          
          <div className="bg-slate-800/50 border border-emerald-500/30 rounded-2xl p-6 backdrop-blur">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-300/70 text-sm">Çalışan</span>
            </div>
            <p className="text-white font-bold text-lg">{data.employeeCount} Kişi</p>
          </div>
          
          <div className="bg-slate-800/50 border border-emerald-500/30 rounded-2xl p-6 backdrop-blur">
            <div className="flex items-center gap-3 mb-3">
              <Truck className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-300/70 text-sm">Araç</span>
            </div>
            <p className="text-white font-bold text-lg">{data.vehicleCount} Adet</p>
          </div>
          
          <div className="bg-slate-800/50 border border-emerald-500/30 rounded-2xl p-6 backdrop-blur">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-300/70 text-sm">Tesis</span>
            </div>
            <p className="text-white font-bold text-lg">{data.facilityCity}</p>
          </div>
        </motion.div>
        
        {/* Main Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Emissions Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-2 border-emerald-400/50 rounded-3xl p-8 backdrop-blur"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <Leaf className="w-8 h-8 text-emerald-400" />
              </div>
              <span className="text-emerald-300 font-semibold">Son 3 Ay</span>
            </div>
            <h3 className="text-emerald-300 font-semibold mb-2">Toplam Emisyon</h3>
            <p className="text-4xl font-black text-white mb-2">
              {simulationData.totalEmissions.toFixed(1)} 
              <span className="text-xl font-semibold text-emerald-300 ml-2">ton CO2e</span>
            </p>
            <div className="flex items-center gap-2 text-emerald-400">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm">Sektör ortalamasının altında</span>
            </div>
          </motion.div>
          
          {/* Electricity Usage */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-800/50 border border-yellow-500/30 rounded-3xl p-8 backdrop-blur"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <Zap className="w-8 h-8 text-yellow-400" />
              </div>
              <span className="text-yellow-300/70 font-semibold">Scope 2</span>
            </div>
            <h3 className="text-yellow-300/70 font-semibold mb-2">Elektrik Tüketimi</h3>
            <p className="text-4xl font-black text-white mb-2">
              {(simulationData.electricityUsage / 1000).toFixed(1)}
              <span className="text-xl font-semibold text-yellow-300 ml-2">MWh</span>
            </p>
            <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-400" style={{ width: '65%' }}></div>
            </div>
          </motion.div>
          
          {/* Natural Gas Usage */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-800/50 border border-blue-500/30 rounded-3xl p-8 backdrop-blur"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Flame className="w-8 h-8 text-blue-400" />
              </div>
              <span className="text-blue-300/70 font-semibold">Scope 1</span>
            </div>
            <h3 className="text-blue-300/70 font-semibold mb-2">Doğalgaz Tüketimi</h3>
            <p className="text-4xl font-black text-white mb-2">
              {simulationData.gasUsage.toLocaleString('tr-TR')}
              <span className="text-xl font-semibold text-blue-300 ml-2">m³</span>
            </p>
            <div className="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400" style={{ width: '45%' }}></div>
            </div>
          </motion.div>
        </div>
        
        {/* Savings Potential & Industry Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Savings Potential */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-400/50 rounded-3xl p-8 backdrop-blur"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-purple-500/20 rounded-2xl">
                <Target className="w-10 h-10 text-purple-400" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">Tasarruf Potansiyeli</h3>
                <p className="text-purple-300/70">Enerji verimliliği ile kazanç</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-purple-900/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-purple-300">Potansiyel Azaltım</span>
                  <span className="text-3xl font-black text-white">
                    {simulationData.savingsPotential.percentage}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-300">CO2e Tasarruf</span>
                  <span className="text-2xl font-bold text-purple-200">
                    {simulationData.savingsPotential.amount.toFixed(1)} ton/yıl
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-purple-300">
                <Award className="w-5 h-5" />
                <span className="text-sm font-semibold">
                  LED dönüşümü ve yalıtım ile hemen tasarruf başlatabilirsiniz!
                </span>
              </div>
            </div>
          </motion.div>
          
          {/* Industry Comparison */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border-2 border-teal-400/50 rounded-3xl p-8 backdrop-blur"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-teal-500/20 rounded-2xl">
                <TrendingUp className="w-10 h-10 text-teal-400" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">Sektör Karşılaştırması</h3>
                <p className="text-teal-300/70">Yıllık emisyon (ton CO2e)</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Your Emissions */}
              <div className="flex items-center justify-between p-4 bg-teal-900/30 rounded-xl">
                <span className="text-teal-300 font-semibold">Sizin</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-400" style={{ width: '75%' }}></div>
                  </div>
                  <span className="text-white font-bold">
                    {simulationData.industryComparison.yourEmissions.toFixed(1)}
                  </span>
                </div>
              </div>
              
              {/* Industry Average */}
              <div className="flex items-center justify-between p-4 bg-teal-900/20 rounded-xl">
                <span className="text-teal-300/70">Sektör Ort.</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400" style={{ width: '85%' }}></div>
                  </div>
                  <span className="text-amber-300 font-bold">
                    {simulationData.industryComparison.industryAverage.toFixed(1)}
                  </span>
                </div>
              </div>
              
              {/* Best in Class */}
              <div className="flex items-center justify-between p-4 bg-teal-900/20 rounded-xl">
                <span className="text-teal-300/70">En İyiler</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-green-400" style={{ width: '55%' }}></div>
                  </div>
                  <span className="text-emerald-300 font-bold">
                    {simulationData.industryComparison.bestInClass.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Call to Action */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="text-center"
        >
          <div className="inline-block">
            <div className="p-8 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-2 border-emerald-400/50 rounded-3xl backdrop-blur">
              <h2 className="text-3xl font-black text-white mb-4">
                Şimdi Gerçek Verilerinizle Değiştirelim!
              </h2>
              <p className="text-emerald-200 mb-8 max-w-2xl">
                Fatura bilgilerinizi girerek kendi karbon ayak izinizi hesaplayın ve 
                size özel tasarruf önerilerini keşfedin. Sadece 3 adımda tamamlayacaksınız!
              </p>
              
              <button
                onClick={handleStartWizard}
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
                  Veri Girişine Başla
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </span>
                
                {/* Animated Glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-30 blur-xl transition-opacity animate-pulse"></div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
