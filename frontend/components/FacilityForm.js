// frontend/components/FacilityForm.js
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const FacilityForm = ({ companyId, onFacilityAdded, facilityToEdit }) => {
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [facilityType, setFacilityType] = useState('production');
    const [surfaceArea, setSurfaceArea] = useState('');
    const [error, setError] = useState('');
    const { token } = useAuth();

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
        setError('');

        if (!name) {
            setError('Tesis adı zorunludur.');
            return;
        }

        const facilityData = {
            name,
            city,
            address,
            facility_type: facilityType,
            surface_area_m2: surfaceArea ? parseFloat(surfaceArea) : null,
        };

        try {
            let response;
            if (facilityToEdit) {
                // Update existing facility
                response = await api.put(`/facilities/${facilityToEdit.id}`, facilityData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } else {
                // Create new facility
                response = await api.post(`/companies/${companyId}/facilities/`, facilityData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            if (response.status === 201 || response.status === 200) {
                onFacilityAdded(response.data);
                // Reset form fields
                setName('');
                setCity('');
                setAddress('');
                setFacilityType('production');
                setSurfaceArea('');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Bir hata oluştu.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-gray-50 rounded-lg shadow-md mb-8">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">{facilityToEdit ? 'Tesisi Düzenle' : 'Yeni Tesis Ekle'}</h3>
            {error && <p className="text-red-500 bg-red-100 p-2 rounded">{error}</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Tesis Adı</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Örn: Merkez Üretim Tesisi"
                        required
                    />
                </div>
                 <div>
                    <label htmlFor="facilityType" className="block text-sm font-medium text-gray-700">Tesis Tipi</label>
                    <select
                        id="facilityType"
                        value={facilityType}
                        onChange={(e) => setFacilityType(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        <option value="production">Üretim</option>
                        <option value="office">Ofis</option>
                        <option value="warehouse">Depo</option>
                        <option value="cold_storage">Soğuk Hava Deposu</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">Şehir</label>
                    <input
                        type="text"
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Örn: İstanbul"
                    />
                </div>
                <div>
                    <label htmlFor="surfaceArea" className="block text-sm font-medium text-gray-700">Isıtılan / Soğutulan Toplam Zemin Alanı (m²)</label>
                    <input
                        type="number"
                        id="surfaceArea"
                        value={surfaceArea}
                        onChange={(e) => setSurfaceArea(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Örn: 1500"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Adres</label>
                <textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows="2"
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Tesisin tam adresi"
                ></textarea>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    {facilityToEdit ? 'Tesisi Güncelle' : 'Tesisi Kaydet'}
                </button>
            </div>
        </form>
    );
};

export default FacilityForm;