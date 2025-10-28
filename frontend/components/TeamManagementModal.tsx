// frontend/components/TeamManagementModal.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Trash2, Edit2, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface TeamMember {
  id: number;
  user_id: number;
  user_email: string;
  role: 'owner' | 'admin' | 'data_entry' | 'viewer';
  facility_id: number | null;
  facility_name: string | null;
  created_at: string;
}

interface Facility {
  id: number;
  name: string;
}

interface TeamManagementModalProps {
  companyId: number;
  facilities: Facility[];
  onClose?: () => void;
}

export default function TeamManagementModal({ companyId, facilities, onClose }: TeamManagementModalProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    user_id: '',
    role: 'data_entry' as const,
    facility_id: '' as string | number,
  });

  const roleLabels = {
    owner: '👑 Sahibi',
    admin: '🔑 Yönetici',
    data_entry: '📝 Veri Giriş',
    viewer: '👁️ Görüntüleyici',
  };

  // Üyeleri yükle
  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/members`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
      }
    } catch (err) {
      console.error('Members load error:', err);
      toast.error('Üyeler yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [companyId]);

  const handleAddMember = async () => {
    if (!formData.user_id || !formData.role) {
      toast.error('Tüm alanları doldurunuz');
      return;
    }

    setIsAdding(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/members`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: parseInt(String(formData.user_id)),
            role: formData.role,
            facility_id: formData.facility_id ? parseInt(String(formData.facility_id)) : null,
          }),
        }
      );

      if (response.ok) {
        toast.success('Üye başarıyla eklendi');
        setFormData({ user_id: '', role: 'data_entry', facility_id: '' });
        setShowForm(false);
        loadMembers();
      } else {
        throw new Error('Üye eklenemedi');
      }
    } catch (err) {
      toast.error('Üye ekleme başarısız');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMember = async (memberId: number) => {
    if (!confirm('Bu üyeyi silmek istediğinize emin misiniz?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/members/${memberId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        toast.success('Üye silindi');
        loadMembers();
      }
    } catch (err) {
      toast.error('Silme işlemi başarısız');
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <h3 className="text-emerald-300 font-bold text-lg flex items-center gap-2">
          <Users className="w-6 h-6" />
          Takım Yönetimi ({members.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          Üye Ekle
        </button>
      </div>

      {/* Üye Ekleme Formu */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-slate-800/50 rounded-lg border border-emerald-500/30 space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Kullanıcı ID */}
              <div>
                <label className="block text-emerald-300/70 text-sm font-semibold mb-1">
                  Kullanıcı ID
                </label>
                <input
                  type="number"
                  placeholder="ID girin"
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  disabled={isAdding}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm placeholder-emerald-300/50 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-emerald-300/70 text-sm font-semibold mb-1">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  disabled={isAdding}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
                >
                  <option value="data_entry">Veri Giriş</option>
                  <option value="viewer">Görüntüleyici</option>
                  <option value="admin">Yönetici</option>
                </select>
              </div>

              {/* Tesis (Opsiyonel) */}
              <div>
                <label className="block text-emerald-300/70 text-sm font-semibold mb-1">
                  Tesis (Opsiyonel)
                </label>
                <select
                  value={formData.facility_id}
                  onChange={(e) => setFormData({ ...formData, facility_id: e.target.value })}
                  disabled={isAdding}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-emerald-500/30 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-400"
                >
                  <option value="">Tüm Tesisler</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddMember}
                disabled={isAdding}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAdding ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Ekleniyor...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Ekle
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

      {/* Üyeler Listesi */}
      {!isLoading && members.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          <div className="max-h-96 overflow-y-auto space-y-2">
            <AnimatePresence>
              {members.map((member) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="p-3 bg-slate-800/50 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-all flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-white font-semibold">{member.user_email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">
                        {roleLabels[member.role]}
                      </span>
                      {member.facility_name && (
                        <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">
                          📍 {member.facility_name}
                        </span>
                      )}
                      {!member.facility_name && member.role !== 'viewer' && (
                        <span className="text-xs bg-slate-600/50 text-slate-300 px-2 py-1 rounded">
                          Tüm Tesisler
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-all"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {isLoading && (
        <div className="p-8 text-center text-emerald-300/70">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
          Üyeler yükleniyor...
        </div>
      )}

      {!isLoading && members.length === 0 && (
        <div className="p-8 text-center border-2 border-dashed border-emerald-500/30 rounded-lg text-emerald-300/70">
          Henüz takım üyesi eklenmedi
        </div>
      )}
    </div>
  );
}
