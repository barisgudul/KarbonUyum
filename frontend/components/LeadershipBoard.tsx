// frontend/components/LeadershipBoard.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Medal, Target, TrendingUp, Filter, Loader,
  AlertCircle, Sparkles, Crown, Award
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LeaderboardEntry {
  company_id: number;
  company_name: string;
  rank: number;
  efficiency_score: number;
  emissions_per_employee_kwh: number | null;
  region: string | null;
}

interface LeaderboardData {
  industry_type: string;
  region: string | null;
  entries: LeaderboardEntry[];
  total: number;
  your_rank: number | null;
  your_score: number | null;
}

interface LeadershipBoardProps {
  industryType?: string;
}

export default function LeadershipBoard({ industryType }: LeadershipBoardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const regions = ['İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa', 'Adana'];

  // Leaderboard'u yükle
  useEffect(() => {
    loadLeaderboard();
  }, [selectedRegion, industryType]);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (industryType) params.append('industry_type', industryType);
      if (selectedRegion) params.append('region', selectedRegion);
      params.append('limit', '50');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/leaderboard?${params.toString()}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (err) {
      console.error('Leaderboard load error:', err);
      toast.error('Sıralama yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-emerald-300 font-bold">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/40';
      case 2:
        return 'from-gray-400/20 to-gray-500/10 border-gray-400/40';
      case 3:
        return 'from-amber-600/20 to-amber-700/10 border-amber-600/40';
      default:
        return 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-emerald-300/70">
        <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
        <p>Sıralama yükleniyor...</p>
      </div>
    );
  }

  if (!leaderboard || leaderboard.entries.length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed border-emerald-500/30 rounded-lg text-emerald-300/70">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>Şu anda sıralama verisi yok</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
            Sektör Sıralaması
          </h2>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-3 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg transition-all"
        >
          <Filter className="w-5 h-5 text-emerald-300" />
        </button>
      </motion.div>

      {/* Filtreler */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-slate-800/50 rounded-lg border border-emerald-500/20 space-y-3"
          >
            <p className="text-emerald-300/70 text-sm font-semibold">Bölgeye Göre Filtrele:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedRegion('')}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  selectedRegion === ''
                    ? 'bg-emerald-500/50 text-white'
                    : 'bg-slate-700/50 text-emerald-300 hover:bg-slate-700/70'
                }`}
              >
                Tümü
              </button>
              {regions.map((region) => (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedRegion === region
                      ? 'bg-emerald-500/50 text-white'
                      : 'bg-slate-700/50 text-emerald-300 hover:bg-slate-700/70'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sizin Sıralamanız */}
      {leaderboard.your_rank && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 bg-gradient-to-br ${getRankColor(leaderboard.your_rank)} rounded-lg border-2`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-cyan-400" />
              <div>
                <p className="text-emerald-300/70 text-sm font-semibold">Sizin Sıralamanız</p>
                <p className="text-white font-black text-lg">
                  #{leaderboard.your_rank} • Skor: {leaderboard.your_score?.toFixed(1)}
                </p>
              </div>
            </div>
            <TrendingUp className="w-6 h-6 text-emerald-400" />
          </div>
        </motion.div>
      )}

      {/* Sıralama Listesi */}
      <div className="space-y-2">
        <AnimatePresence>
          {leaderboard.entries.map((entry, index) => (
            <motion.div
              key={entry.company_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 bg-gradient-to-r ${getRankColor(entry.rank)} rounded-lg border-2 flex items-center justify-between`}
            >
              {/* Sol Taraf */}
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
                  {getRankIcon(entry.rank)}
                </div>

                <div className="flex-1">
                  <p className="font-bold text-white">{entry.company_name}</p>
                  <p className="text-xs text-emerald-300/60 mt-1">
                    {entry.region && `📍 ${entry.region}`}
                  </p>
                </div>
              </div>

              {/* Sağ Taraf - Metrikler */}
              <div className="text-right">
                <p className="font-black text-2xl bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                  {entry.efficiency_score.toFixed(1)}
                </p>
                <p className="text-xs text-emerald-300/60">verimlilik puanı</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* İstatistikler */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg border border-emerald-500/20"
      >
        <div className="text-center">
          <p className="text-emerald-300/70 text-xs font-semibold">Toplam</p>
          <p className="text-2xl font-black text-emerald-300 mt-1">{leaderboard.total}</p>
        </div>
        <div className="text-center">
          <p className="text-emerald-300/70 text-xs font-semibold">Top 1%</p>
          <p className="text-2xl font-black text-yellow-400 mt-1">🥇</p>
        </div>
        <div className="text-center">
          <p className="text-emerald-300/70 text-xs font-semibold">Bölge</p>
          <p className="text-lg font-bold text-cyan-300 mt-1">
            {selectedRegion || 'Tümü'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
