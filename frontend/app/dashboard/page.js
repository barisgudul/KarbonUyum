// frontend/app/dashboard/page.js
'use client';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Bu bölüm, giriş yapmayan kullanıcıları login sayfasına atar
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Veri yüklenirken veya kullanıcı yoksa bekleme ekranı göster
  if (loading || !user) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <button onClick={logout} style={{ float: 'right', cursor: 'pointer' }}>
        Çıkış Yap
      </button>
      <h1>Dashboard</h1>
      <p>Hoşgeldin, {user.email}!</p>
      <hr />
      <h2>Şirketlerin</h2>
      {user.companies.length === 0 ? <p>Henüz şirket eklenmemiş.</p> : (
        <ul>
          {user.companies.map(company => (
            <li key={company.id}>
              <strong>{company.name}</strong> (Vergi No: {company.tax_number || 'N/A'})
              <h4>Tesisler:</h4>
              {company.facilities.length === 0 ? <p>Bu şirkete ait tesis yok.</p> : (
                <ul>
                  {company.facilities.map(facility => (
                    <li key={facility.id}>
                      <strong>{facility.name}</strong> - {facility.city}
                      <h5>Aktivite Verileri:</h5>
                      {facility.activity_data.length === 0 ? <p>Veri girişi yapılmamış.</p> : (
                        <table border="1" cellPadding="5" style={{ borderCollapse: 'collapse', width: '100%' }}>
                          <thead>
                            <tr>
                              <th>Tür</th><th>Miktar</th><th>Birim</th><th>Tarih</th><th>CO2e (kg)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {facility.activity_data.map(data => (
                              <tr key={data.id}>
                                <td>{data.activity_type}</td>
                                <td>{data.quantity}</td>
                                <td>{data.unit}</td>
                                <td>{data.start_date}</td>
                                <td>
                                  <strong>
                                    {data.calculated_co2e_kg ? data.calculated_co2e_kg.toFixed(2) : 'N/A'}
                                  </strong>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}