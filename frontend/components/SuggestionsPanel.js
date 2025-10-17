// frontend/components/SuggestionsPanel.js
'use client';
import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function SuggestionsPanel({ company }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // company.id değiştiğinde önerileri yeniden çek
    if (!company?.id) return;

    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await api.get(`/companies/${company.id}/suggestions`);
        setSuggestions(data);
      } catch (err) {
        setError("Öneriler yüklenirken bir hata oluştu.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [company.id]); // company.id'ye bağımlı

  const renderContent = () => {
    if (loading) {
      return <p className="text-sm text-gray-500">Öneriler analiz ediliyor...</p>;
    }
    if (error) {
      return <p className="text-sm text-red-600">{error}</p>;
    }
    if (suggestions.length > 0) {
      return (
        <ul className="space-y-3 list-disc pl-5">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="text-sm text-gray-800">
              {suggestion}
            </li>
          ))}
        </ul>
      );
    }
    return <p className="text-sm text-gray-500">Görüntülenecek öneri bulunamadı.</p>;
  };

  return (
    <div className="p-4 mt-4 bg-yellow-50 border-l-4 border-yellow-400">
      <h4 className="font-semibold mb-2 text-yellow-800">💡 Akıllı Öneriler</h4>
      {renderContent()}
    </div>
  );
}