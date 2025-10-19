-- backend/scripts/seed_city_factors.sql
-- Şehir bazlı güneşlenme ve ısıtma faktörleri
-- Global Solar Atlas (GSA) ve iklim verilerine dayalı gerçekçi değerler

-- GES (Güneş Enerjisi Sistemi) için şehir faktörleri
-- Türkiye ortalaması: 1350 kWh/kWp/yıl
-- Bu faktörler, şehrin güneşlenme potansiyeline göre ayarlanmıştır

INSERT INTO suggestion_parameters (key, value, description) VALUES
-- GES Şehir Faktörleri (1.0 = ortalama, >1.0 = daha iyi güneşlenme)
('city_factor_istanbul', 0.95, 'İstanbul - GES üretim faktörü (orta güneşlenme)'),
('city_factor_ankara', 1.05, 'Ankara - GES üretim faktörü (iyi güneşlenme)'),
('city_factor_izmir', 1.15, 'İzmir - GES üretim faktörü (çok iyi güneşlenme)'),
('city_factor_antalya', 1.25, 'Antalya - GES üretim faktörü (mükemmel güneşlenme)'),
('city_factor_adana', 1.20, 'Adana - GES üretim faktörü (mükemmel güneşlenme)'),
('city_factor_bursa', 0.90, 'Bursa - GES üretim faktörü (orta-düşük güneşlenme)'),
('city_factor_gaziantep', 1.15, 'Gaziantep - GES üretim faktörü (çok iyi güneşlenme)'),
('city_factor_konya', 1.10, 'Konya - GES üretim faktörü (iyi güneşlenme)'),
('city_factor_mersin', 1.20, 'Mersin - GES üretim faktörü (mükemmel güneşlenme)'),
('city_factor_kayseri', 1.08, 'Kayseri - GES üretim faktörü (iyi güneşlenme)'),
('city_factor_eskisehir', 1.00, 'Eskişehir - GES üretim faktörü (ortalama güneşlenme)'),
('city_factor_diyarbakir', 1.18, 'Diyarbakır - GES üretim faktörü (çok iyi güneşlenme)'),
('city_factor_trabzon', 0.75, 'Trabzon - GES üretim faktörü (düşük güneşlenme, yüksek bulutluluk)'),
('city_factor_sanliurfa', 1.22, 'Şanlıurfa - GES üretim faktörü (mükemmel güneşlenme)'),
('city_factor_default', 1.00, 'Varsayılan - GES üretim faktörü (Türkiye ortalaması)'),

-- Yalıtım için şehir ısıtma faktörleri (1.0 = ortalama, >1.0 = daha soğuk iklim)
-- Bu faktörler doğal gaz tasarrufunu etkiler
('city_heating_factor_istanbul', 0.95, 'İstanbul - Isıtma faktörü (ılıman iklim)'),
('city_heating_factor_ankara', 1.25, 'Ankara - Isıtma faktörü (soğuk kış)'),
('city_heating_factor_izmir', 0.80, 'İzmir - Isıtma faktörü (ılıman iklim)'),
('city_heating_factor_antalya', 0.60, 'Antalya - Isıtma faktörü (sıcak iklim)'),
('city_heating_factor_adana', 0.65, 'Adana - Isıtma faktörü (sıcak iklim)'),
('city_heating_factor_bursa', 1.05, 'Bursa - Isıtma faktörü (orta-soğuk)'),
('city_heating_factor_gaziantep', 0.90, 'Gaziantep - Isıtma faktörü (orta sıcaklık)'),
('city_heating_factor_konya', 1.20, 'Konya - Isıtma faktörü (soğuk kış)'),
('city_heating_factor_mersin', 0.65, 'Mersin - Isıtma faktörü (sıcak iklim)'),
('city_heating_factor_kayseri', 1.35, 'Kayseri - Isıtma faktörü (çok soğuk kış)'),
('city_heating_factor_eskisehir', 1.15, 'Eskişehir - Isıtma faktörü (soğuk kış)'),
('city_heating_factor_diyarbakir', 1.10, 'Diyarbakır - Isıtma faktörü (sıcak yaz, soğuk kış)'),
('city_heating_factor_trabzon', 1.00, 'Trabzon - Isıtma faktörü (nemli, ılıman)'),
('city_heating_factor_sanliurfa', 0.75, 'Şanlıurfa - Isıtma faktörü (sıcak iklim)'),
('city_heating_factor_erzurum', 1.50, 'Erzurum - Isıtma faktörü (çok soğuk kış)'),
('city_heating_factor_sivas', 1.40, 'Sivas - Isıtma faktörü (çok soğuk kış)'),
('city_heating_factor_default', 1.00, 'Varsayılan - Isıtma faktörü (Türkiye ortalaması)')

ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description;

-- GES ve Yalıtım için temel parametreler (eğer yoksa)
INSERT INTO suggestion_parameters (key, value, description) VALUES
('ges_estimated_cost_per_kwp', 25000.0, 'GES maliyeti (TL/kWp) - 2024 piyasa ortalaması'),
('ges_kwh_generation_per_kwp_annual', 1350.0, 'GES yıllık üretim (kWh/kWp) - Türkiye ortalaması'),
('ges_annual_savings_factor', 0.90, 'GES ile sağlanacak elektrik tasarrufu oranı'),
('ges_max_roi_years', 10.0, 'GES için maksimum kabul edilebilir geri ödeme süresi (yıl)'),

('insulation_avg_cost_per_m2', 1500.0, 'Yalıtım maliyeti (TL/m²) - 2024 piyasa ortalaması'),
('insulation_gas_savings_per_m2_annual', 8.0, 'Yalıtım ile yıllık doğalgaz tasarrufu (m³/m²)'),
('insulation_max_roi_years', 12.0, 'Yalıtım için maksimum kabul edilebilir geri ödeme süresi (yıl)')

ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description;

