// frontend/components/ROISimulator.tsx

'use client';

import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { Zap, Sun, Lightbulb, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { useROISimulator } from '../stores/useROISimulator';

interface ROISimulatorProps {
  companyId: number;
}

export default function ROISimulator({ companyId }: ROISimulatorProps) {
  const {
    solarKwp,
    setSolarKwp,
    electricityPriceIncrease,
    setElectricityPriceIncrease,
    ledSavingsRate,
    setLedSavingsRate,
    fetchROISimulation,
    baseAnalysis,
    simulations,
    paybackTimeline,
    charts,
    sliderRanges,
    isLoading,
    error,
  } = useROISimulator();

  // Set company ID for window object (for store auto-fetch)
  useEffect(() => {
    (window as any).__companyId = companyId;
    fetchROISimulation(companyId);
  }, [companyId, fetchROISimulation]);

  const sliderVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1 },
    }),
  };

  if (isLoading && !baseAnalysis) {
    return (
      <div className="space-y-4">
        <div className="h-40 bg-gradient-to-r from-slate-700 to-slate-800 rounded-lg animate-pulse" />
        <div className="h-64 bg-gradient-to-r from-slate-700 to-slate-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent mb-2">
          📊 İnteraktif ROI Simülatörü
        </h2>
        <p className="text-emerald-300/70">
          Parametreleri değiştirerek tasarruf potansiyelinizi hesaplayın
        </p>
      </motion.div>

      {/* Sliders */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-emerald-500/20"
        initial="hidden"
        animate="visible"
      >
        {/* Solar Panel Slider */}
        <motion.div custom={0} variants={sliderVariants} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-5 h-5 text-yellow-400" />
            <label className="text-emerald-300 font-semibold">Güneş Paneli Kapasitesi</label>
          </div>
          <input
            type="range"
            min={sliderRanges.solar_kwp?.min || 10}
            max={sliderRanges.solar_kwp?.max || 500}
            step={sliderRanges.solar_kwp?.step || 10}
            value={solarKwp}
            onChange={(e) => setSolarKwp(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between items-center">
            <span className="text-emerald-400 font-bold text-2xl">{solarKwp.toFixed(0)} kWp</span>
            <span className="text-emerald-300/70 text-sm">
              ~{(solarKwp * 1400 * 4.5).toLocaleString('tr-TR')} TL/yıl
            </span>
          </div>
        </motion.div>

        {/* Electricity Price Increase Slider */}
        <motion.div custom={1} variants={sliderVariants} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <label className="text-emerald-300 font-semibold">Elektrik Fiyat Artışı</label>
          </div>
          <input
            type="range"
            min={sliderRanges.electricity_price_increase?.min || 0.05}
            max={sliderRanges.electricity_price_increase?.max || 0.25}
            step={sliderRanges.electricity_price_increase?.step || 0.01}
            value={electricityPriceIncrease}
            onChange={(e) => setElectricityPriceIncrease(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between items-center">
            <span className="text-blue-400 font-bold text-2xl">%{(electricityPriceIncrease * 100).toFixed(0)}</span>
            <span className="text-emerald-300/70 text-sm">Yıllık artış</span>
          </div>
        </motion.div>

        {/* LED Savings Rate Slider */}
        <motion.div custom={2} variants={sliderVariants} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-green-400" />
            <label className="text-emerald-300 font-semibold">LED Tasarruf Oranı</label>
          </div>
          <input
            type="range"
            min={sliderRanges.led_savings_rate?.min || 0.4}
            max={sliderRanges.led_savings_rate?.max || 0.8}
            step={sliderRanges.led_savings_rate?.step || 0.05}
            value={ledSavingsRate}
            onChange={(e) => setLedSavingsRate(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
          <div className="flex justify-between items-center">
            <span className="text-green-400 font-bold text-2xl">%{(ledSavingsRate * 100).toFixed(0)}</span>
            <span className="text-emerald-300/70 text-sm">Tasarruf</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROI Timeline Chart */}
        {paybackTimeline && paybackTimeline.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-emerald-500/20"
          >
            <h3 className="text-emerald-300 font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              10 Yıllık Birikmiş Tasarruf
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={paybackTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="year" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #10b981' }}
                  formatter={(value: any) => `${typeof value === 'number' ? value.toLocaleString('tr-TR') : value}`}
                />
                <Legend />
                <Bar dataKey="cumulative_savings" fill="#10b981" name="Kümülatif Tasarruf" />
                <Line
                  type="monotone"
                  dataKey="annual_roi_percentage"
                  stroke="#3b82f6"
                  name="ROI %"
                  yAxisId="right"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Simulations Summary */}
        {simulations && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            {Object.entries(simulations).map(([key, sim]: [string, any], idx: number) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                className="p-4 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl border border-emerald-500/30 hover:border-emerald-400/60 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-emerald-300 mb-1">{sim.measure_name}</h4>
                    <p className="text-sm text-emerald-300/70">
                      Yıllık Tasarruf: <span className="font-semibold text-emerald-400">
                        {(sim.annual_savings_tl || 0).toLocaleString('tr-TR')} TL
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-cyan-400">
                      {(sim.payback_months || 999).toFixed(1)}
                    </div>
                    <div className="text-xs text-emerald-300/50">ay</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-emerald-500/20">
                  <p className="text-xs text-emerald-300/70">
                    Yatırım: {(sim.investment_tl || 0).toLocaleString('tr-TR')} TL
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Key Metrics */}
      {baseAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded-lg border border-emerald-500/30">
            <div className="text-emerald-300/70 text-sm font-semibold mb-1">Mevcut Yıllık Maliyet</div>
            <div className="text-2xl font-black text-emerald-300">
              {(baseAnalysis.current_annual_cost_tl || 0).toLocaleString('tr-TR')} TL
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 rounded-lg border border-cyan-500/30">
            <div className="text-cyan-300/70 text-sm font-semibold mb-1">Tasarruf Potansiyeli</div>
            <div className="text-2xl font-black text-cyan-300">
              {(baseAnalysis.potential_annual_savings_tl || 0).toLocaleString('tr-TR')} TL
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg border border-blue-500/30">
            <div className="text-blue-300/70 text-sm font-semibold mb-1">Tasarruf %</div>
            <div className="text-2xl font-black text-blue-300">
              {(baseAnalysis.savings_percentage || 0).toFixed(1)}%
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-lg border border-yellow-500/30">
            <div className="text-yellow-300/70 text-sm font-semibold mb-1">Geri Ödeme Süresi</div>
            <div className="text-2xl font-black text-yellow-300">
              {(baseAnalysis.payback_period_months || 0).toFixed(1)} ay
            </div>
          </div>
        </motion.div>
      )}

      {/* Message */}
      {baseAnalysis?.message && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-4 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 rounded-lg border border-emerald-500/30 text-emerald-300 italic"
        >
          💡 {baseAnalysis.message}
        </motion.div>
      )}
    </div>
  );
}
