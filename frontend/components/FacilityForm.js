// frontend/components/FacilityForm.js
'use client';

import { useState, useEffect } from 'react';
import { useCreateFacility } from '../hooks/useCompanies';
import toast from 'react-hot-toast';

const FacilityForm = ({ companyId, onFacilityAdded, facilityToEdit }) => {
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [facilityType, setFacilityType] = useState('production');
    const [surfaceArea, setSurfaceArea] = useState('');

    const { mutate: createFacility, isPending: isLoading } = useCreateFacility();

    useEffect(() => {
        if (facilityToEdit) {
            setName(facilityToEdit.name || '');
            setCity(facilityToEdit.city || '');
            setAddress(facilityToEdit.address || '');
            setFacilityType(facilityToEdit.facility_type || 'production');
            setSurfaceArea(facilityToEdit.surface_area_m2 || '');
        } else {
            // Reset form when not editing
            setName('');
            setCity('');
            setAddress('');
            setFacilityType('production');
            setSurfaceArea('');
        }
    }, [facilityToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name) {
            toast.error('Tesis adı zorunludur.');
            return;
        }

        // surface_area_m2 zorunlu (Benchmark için kritik)
        if (!surfaceArea || parseFloat(surfaceArea) <= 0) {
            toast.error('Tesis alanı zorunludur ve pozitif bir sayı olmalıdır (Benchmarking için gerekli).');
            return;
        }

        const facilityData = {
            name,
            city,
            address,
            facility_type: facilityType,
            surface_area_m2: surfaceArea ? parseFloat(surfaceArea) : null,
        };

        createFacility(
            { companyId, data: facilityData },
            {
                onSuccess: (response) => {
                    onFacilityAdded(response.data);
                    // Reset form fields
                    setName('');
                    setCity('');
                    setAddress('');
                    setFacilityType('production');
                    setSurfaceArea('');
                },
            }
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-emerald-500/30 rounded-2xl shadow-lg backdrop-blur-xl">
            <h3 className="text-lg font-black text-emerald-200 border-b border-emerald-500/20 pb-3">{facilityToEdit ? 'Tesisi Düzenle' : 'Yeni Tesis Ekle'}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-bold text-emerald-300 mb-2">Tesis Adı *</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-4 py-2.5 bg-white/5 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                        placeholder="Örn: Merkez Üretim Tesisi"
                        required
                    />
                </div>
                 <div>
                    <label htmlFor="facilityType" className="block text-sm font-bold text-emerald-300 mb-2">Tesis Tipi *</label>
                    <select
                        id="facilityType"
                        value={facilityType}
                        onChange={(e) => setFacilityType(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-4 py-2.5 bg-white/5 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer disabled:opacity-50"
                    >
                        <option value="production" className="bg-slate-800">Üretim</option>
                        <option value="office" className="bg-slate-800">Ofis</option>
                        <option value="warehouse" className="bg-slate-800">Depo</option>
                        <option value="cold_storage" className="bg-slate-800">Soğuk Hava Deposu</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="city" className="block text-sm font-bold text-emerald-300 mb-2">Şehir *</label>
                    <input
                        type="text"
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-4 py-2.5 bg-white/5 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                        placeholder="Örn: İstanbul"
                    />
                </div>
                <div>
                    <label htmlFor="surfaceArea" className="block text-sm font-bold text-emerald-300 mb-2">
                        Isıtılan / Soğutulan Toplam Zemin Alanı (m²) 
                        <span className="text-emerald-400 font-black">*</span>
                    </label>
                    <input
                        type="number"
                        id="surfaceArea"
                        value={surfaceArea}
                        onChange={(e) => setSurfaceArea(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-4 py-2.5 bg-white/5 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                        placeholder="Örn: 1500"
                        required 
                        min="0.1" 
                        step="0.01"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="address" className="block text-sm font-bold text-emerald-300 mb-2">Adres</label>
                <textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={isLoading}
                    rows="2"
                    className="w-full px-4 py-2.5 bg-white/5 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                    placeholder="Tesisin tam adresi"
                ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-black rounded-lg transition-all duration-300 shadow-lg hover:shadow-emerald-500/50 transform hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Kaydediliyor...' : (facilityToEdit ? 'Tesisi Güncelle' : 'Tesisi Kaydet')}
                </button>
            </div>
        </form>
    );
};

export default FacilityForm;