// frontend/components/SummaryPanel.js
'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

export default function SummaryPanel() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/dashboard/summary');
        setSummary(data);
      } catch (err) {
        setError('Özet verileri yüklenemedi. Lütfen daha sonra tekrar deneyin.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) return (
    <div className="text-center p-12 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-emerald-500/30 rounded-3xl backdrop-blur-xl">
      <Activity className="w-8 h-8 text-emerald-400 mx-auto mb-3 animate-spin" />
      <p className="text-emerald-300 font-semibold">Veriler yükleniyor...</p>
    </div>
  );

  if (error) return (
    <div className="text-center p-8 text-red-400 bg-red-950/30 border border-red-500/30 rounded-3xl backdrop-blur-xl">
      {error}
    </div>
  );

  if (!summary || summary.monthly_trend.length === 0) {
    return (
      <div className="text-center p-12 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-dashed border-emerald-500/30 rounded-3xl backdrop-blur-xl">
        <Activity className="w-12 h-12 text-emerald-400/50 mx-auto mb-4" />
        <h3 className="text-xl font-black text-white">Henüz Veri Yok</h3>
        <p className="text-emerald-300/70 mt-2 font-semibold">Grafikleri görmek için aktivite verisi ekleyin</p>
      </div>
    );
  }

  const percentageChange = summary.previous_month_total > 0
    ? ((summary.current_month_total - summary.previous_month_total) / summary.previous_month_total) * 100
    : (summary.current_month_total > 0 ? 100 : 0);

  const isIncreasing = percentageChange >= 0;

  // Pie chart data for scope distribution
  const scopeDistribution = [
    { name: 'Scope 1', value: summary.current_month_scope_1 },
    { name: 'Scope 2', value: summary.current_month_scope_2 }
  ];

  const COLORS = ['#10b981', '#06b6d4'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-emerald-500/50 p-3 rounded-lg shadow-xl backdrop-blur">
          <p className="font-bold text-emerald-300 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-semibold">
              {entry.name}: {entry.value.toFixed(2)} kg
            </p>
          ))}
          <p className="text-sm font-black text-cyan-300 mt-2 pt-2 border-t border-emerald-500/30">
            Toplam: {payload.reduce((sum, entry) => sum + entry.value, 0).toFixed(2)} kg CO₂e
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1 - Scope 1 */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-400/40 p-6 backdrop-blur-xl hover:border-emerald-400/60 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
          <div className="relative">
            <p className="text-xs font-bold text-emerald-300/70 uppercase tracking-widest mb-2">Bu Ay Scope 1</p>
            <p className="text-xs text-emerald-200/60 mb-3">Doğrudan Emisyonlar</p>
            <p className="text-4xl font-black text-emerald-300 mb-2">
              {summary.current_month_scope_1.toFixed(0)}
            </p>
            <p className="text-xs font-bold text-emerald-400/70">kg CO₂e</p>
          </div>
        </div>

        {/* Card 2 - Scope 2 */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600/20 to-cyan-600/20 border border-teal-400/40 p-6 backdrop-blur-xl hover:border-teal-400/60 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
          <div className="relative">
            <p className="text-xs font-bold text-teal-300/70 uppercase tracking-widest mb-2">Bu Ay Scope 2</p>
            <p className="text-xs text-teal-200/60 mb-3">Satın Alınan Enerji</p>
            <p className="text-4xl font-black text-teal-300 mb-2">
              {summary.current_month_scope_2.toFixed(0)}
            </p>
            <p className="text-xs font-bold text-teal-400/70">kg CO₂e</p>
          </div>
        </div>

        {/* Card 3 - Total */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600/20 to-emerald-600/20 border border-cyan-400/40 p-6 backdrop-blur-xl hover:border-cyan-400/60 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-emerald-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
          <div className="relative">
            <p className="text-xs font-bold text-cyan-300/70 uppercase tracking-widest mb-2">Bu Ay Toplam</p>
            <p className="text-xs text-cyan-200/60 mb-3">Tüm Scoplar</p>
            <p className="text-4xl font-black text-cyan-300 mb-2">
              {summary.current_month_total.toFixed(0)}
            </p>
            <p className="text-xs font-bold text-cyan-400/70">kg CO₂e</p>
          </div>
        </div>

        {/* Card 4 - Change */}
        <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${isIncreasing ? 'from-red-600/20 to-orange-600/20 border-red-400/40' : 'from-emerald-600/20 to-teal-600/20 border-emerald-400/40'} border p-6 backdrop-blur-xl ${isIncreasing ? 'hover:border-red-400/60' : 'hover:border-emerald-400/60'} transition-all duration-300`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${isIncreasing ? 'from-red-500 to-orange-500' : 'from-emerald-500 to-teal-500'} opacity-0 group-hover:opacity-5 transition-opacity`}></div>
          <div className="relative flex items-start justify-between">
            <div>
              <p className={`text-xs font-bold ${isIncreasing ? 'text-red-300/70' : 'text-emerald-300/70'} uppercase tracking-widest mb-2`}>Aylık Değişim</p>
              <p className={`text-xs ${isIncreasing ? 'text-red-200/60' : 'text-emerald-200/60'} mb-3`}>Önceki Aya Göre</p>
              <p className={`text-4xl font-black mb-2 flex items-center gap-2 ${isIncreasing ? 'text-red-300' : 'text-emerald-300'}`}>
                {isIncreasing ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                {Math.abs(percentageChange).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart - Stacked Bar */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-emerald-500/30 rounded-3xl p-8 backdrop-blur-xl">
          <h3 className="text-2xl font-black text-white mb-1">Aylık Emisyon Trendi</h3>
          <p className="text-emerald-300/70 text-sm font-semibold mb-6">Scope Bazlı Dağılım</p>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={summary.monthly_trend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" stroke="#10b981" />
                <YAxis stroke="#10b981" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="scope_1_co2e_kg" stackId="a" fill="#10b981" name="Scope 1 (Doğrudan)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="scope_2_co2e_kg" stackId="a" fill="#06b6d4" name="Scope 2 (Enerji)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Scope Distribution */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-emerald-500/30 rounded-3xl p-8 backdrop-blur-xl flex flex-col">
          <h3 className="text-2xl font-black text-white mb-1">Emisyon Dağılımı</h3>
          <p className="text-emerald-300/70 text-sm font-semibold mb-6">Bu Ay</p>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={scopeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {scopeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #10b981', borderRadius: '8px' }}
                  formatter={(value) => `${value.toFixed(2)} kg CO₂e`}
                  labelStyle={{ color: '#10b981' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trend Chart - Line Chart */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-emerald-500/30 rounded-3xl p-8 backdrop-blur-xl">
        <h3 className="text-2xl font-black text-white mb-1">Toplam Emisyon Trendi</h3>
        <p className="text-emerald-300/70 text-sm font-semibold mb-6">Aylık Gelişim</p>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={summary.monthly_trend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" stroke="#10b981" />
              <YAxis stroke="#10b981" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #10b981', borderRadius: '8px' }}
                labelStyle={{ color: '#10b981' }}
              />
              <Area
                type="monotone"
                dataKey={(data) => data.scope_1_co2e_kg + data.scope_2_co2e_kg}
                stroke="#10b981"
                fill="url(#colorTotal)"
                name="Toplam CO₂e"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Info Box - GHG Protocol */}
      <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 border-2 border-emerald-400/30 rounded-2xl p-6 backdrop-blur-xl">
        <h4 className="font-black text-emerald-300 mb-3 text-lg">GHG Protokolü - Scope Açıklaması</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg h-fit">
              <Activity className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <p className="font-bold text-emerald-300">Scope 1 - Doğrudan Emisyonlar</p>
              <p className="text-sm text-emerald-200/70 mt-1">Kuruluşun sahip olduğu veya kontrol ettiği kaynaklardan (doğalgaz, dizel yakıt, vb.)</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="p-2 bg-teal-500/20 rounded-lg h-fit">
              <Activity className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <p className="font-bold text-teal-300">Scope 2 - Dolaylı Emisyonlar</p>
              <p className="text-sm text-teal-200/70 mt-1">Satın alınan elektrik, ısı veya buhar kaynaklı emisyonlar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}