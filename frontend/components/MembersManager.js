// frontend/components/MembersManager.js
'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function MembersManager({ company, onMemberChange }) {
  // company prop'u güncellendiğinde üyeleri de güncellemek için state ve effect kullanıyoruz
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Backend'den gelen company.members verisiyle state'i doldur
    setMembers(company.members || []);
  }, [company]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    
    const promise = api.post(`/companies/${company.id}/members`, { email })
      .then(response => {
        // State'i güncellemek yerine, veriyi yeniden çekmesi için Dashboard'a haber verelim
        // Bu, en tutarlı yöntemdir.
        onMemberChange(); 
        setEmail('');
        return 'Üye başarıyla eklendi!';
      });
    
    toast.promise(promise, {
      loading: 'Üye ekleniyor...',
      success: (msg) => msg,
      error: (err) => err.response?.data?.detail || 'Üye eklenemedi.',
    });
  };
  
  return (
    <div className="p-4 mt-2 mb-4 ml-4 border-l-2 border-gray-200 bg-gray-50">
      <h4 className="font-semibold mb-2 text-gray-700">Takım Üyeleri</h4>
      {members.length > 0 ? (
        <ul className="mb-4 list-disc pl-5 text-sm">
          {members.map(member => <li key={member.email}>{member.email}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 mb-4">Bu şirkette henüz başka üye yok.</p>
      )}
      
      <form onSubmit={handleAddMember}>
        <p className="text-sm font-semibold mb-1">Yeni Üye Ekle</p>
        <div className="flex items-center space-x-2">
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="Kayıtlı kullanıcı e-postası" 
            required 
            className="flex-grow px-2 py-1 border rounded" 
          />
          <button type="submit" className="px-4 py-1 text-white bg-blue-600 rounded hover:bg-blue-700">
            Ekle
          </button>
        </div>
      </form>
    </div>
  );
}