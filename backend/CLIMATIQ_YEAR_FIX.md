# Climatiq Year Parametresi Düzeltmesi

## 🎯 Sorun

İki farklı hata ile karşılaşıldı:

### 1. `401 Unauthorized`
- **Neden**: Climatiq API anahtarı eksik veya geçersiz
- **Çözüm**: `.env` dosyasında `CLIMATIQ_API_KEY` doğru şekilde ayarlanmalı

### 2. `no_emission_factors_found`
- **Neden**: 2025 yılı için Türkiye'ye ait emisyon faktörü henüz yayınlanmamış
- **Sebep**: Emisyon verileri geriye dönük olarak yayınlanır (2025 verisi 2026'da kullanılabilir)
- **Çözüm**: `year` parametresini API isteğinden kaldırmak

## ✅ Uygulanan Çözüm

### Değişiklik 1: `schemas.py` - Year Opsiyonel Yapıldı

```python
class ClimatiqSelector(BaseModel):
    activity_id: str
    region: str = "TR"
    year: Optional[int] = None  # ✓ Artık opsiyonel
    data_version: str = "^26"
```

**Sonuç**: Year parametresi None olarak gönderilebilir.

---

### Değişiklik 2: `climatiq_service.py` - Year None Olarak Gönderiliyor

```python
selector = schemas.ClimatiqSelector(
    activity_id=config.activity_id,
    region=DEFAULT_REGION,
    year=None,  # ✓ Otomatik olarak en güncel veri kullanılacak
    data_version=config.data_version
)
```

**Sonuç**: API'ye year parametresi gönderilmiyor.

---

### Değişiklik 3: `exclude_none=True` Kullanımı

```python
# Payload oluştururken None değerleri çıkar
api_payload = request_payload.model_dump(exclude_none=True)
```

**Sonuç**: JSON payload'unda `"year": null` gibi bir alan olmayacak.

---

### Değişiklik 4: API'den Dönen Year Kullanılıyor

```python
# API'nin kullandığı faktörün yılını al
actual_year = date.today().year
if response_data.emission_factor and response_data.emission_factor.year:
    actual_year = response_data.emission_factor.year

return schemas.EmissionCalculationResult(
    calculation_year=actual_year,  # ✓ API'nin kullandığı yıl
    # ...
)
```

**Sonuç**: Hangi yıla ait veri kullanıldığı veritabanına kaydediliyor.

---

## 🔧 Kurulum: API Anahtarı Ayarlama

### 1. `.env` Dosyası Oluşturun

Backend dizininde (eğer yoksa) `.env` dosyası oluşturun:

```bash
cd /Users/baris/Desktop/Dev/KarbonUyum/backend
touch .env
```

### 2. API Anahtarını Ekleyin

`.env` dosyasını açın ve şu satırı ekleyin:

```env
CLIMATIQ_API_KEY=your_actual_api_key_here
```

**ÖNEMLİ**: `your_actual_api_key_here` yerine gerçek Climatiq API anahtarınızı yazın.

### 3. API Anahtarı Almak

Eğer henüz Climatiq API anahtarınız yoksa:

1. [Climatiq](https://www.climatiq.io/) adresine gidin
2. Üye olun veya giriş yapın
3. API Keys bölümünden yeni bir anahtar oluşturun
4. Anahtarı kopyalayıp `.env` dosyasına yapıştırın

---

## 🧪 Test Etme

### 1. Backend'i Başlatın

```bash
cd backend
source venv/bin/activate  # macOS/Linux
# veya
venv\Scripts\activate  # Windows

uvicorn main:app --reload
```

### 2. Aktivite Verisi Ekleyin

```bash
curl -X POST "http://localhost:8000/facilities/1/activity-data/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activity_type": "electricity",
    "quantity": 1500,
    "unit": "kWh",
    "start_date": "2025-01-01",
    "end_date": "2025-01-31"
  }'
```

### 3. Beklenen Sonuç

✅ **Başarılı**:
```json
{
  "id": 1,
  "activity_type": "electricity",
  "quantity": 1500,
  "unit": "kWh",
  "calculated_co2e_kg": 712.5,
  "scope": "scope_2",
  "calculation_year": 2024,  // API'nin kullandığı en güncel veri yılı
  "is_fallback_calculation": false
}
```

✅ **Log'da**:
```
✓ Climatiq API başarılı. Aktivite: electricity, Sonuç: 712.50 kg CO2e. Toplam çağrı: 1
```

❌ **Hala 401 Alıyorsanız**:
- `.env` dosyasında `CLIMATIQ_API_KEY` değişkeni var mı?
- API anahtarı doğru kopyalandı mı? (başında/sonunda boşluk yok mu?)
- Backend sunucusunu yeniden başlattınız mı? (`.env` değişikliklerinden sonra gerekli)

---

## 📊 Climatiq API İsteği - Önce vs Sonra

### ❌ Önceki İstek (Hatalı)

```json
{
  "emission_factor": {
    "activity_id": "electricity-supply_grid-source_supplier_mix",
    "region": "TR",
    "year": 2025,  // ❌ Bu yıl için veri yok
    "data_version": "^26"
  },
  "parameters": {
    "energy": 1500,
    "energy_unit": "kWh"
  }
}
```

**Sonuç**: `no_emission_factors_found` hatası

---

### ✅ Yeni İstek (Doğru)

```json
{
  "emission_factor": {
    "activity_id": "electricity-supply_grid-source_supplier_mix",
    "region": "TR",
    // year parametresi yok! ✓
    "data_version": "^26"
  },
  "parameters": {
    "energy": 1500,
    "energy_unit": "kWh"
  }
}
```

**Sonuç**: Climatiq otomatik olarak en güncel mevcut veriyi kullanır (muhtemelen 2024)

---

## 🎁 Bonus: Year Parametresinin Avantajları

| Durum | Year Parametresi | Sonuç |
|-------|------------------|-------|
| Gelecekteki yıl (2025, 2026...) | ❌ Gönderilirse | `no_emission_factors_found` hatası |
| Gelecekteki yıl (2025, 2026...) | ✅ Gönderilmezse | En güncel veri (2024) kullanılır |
| Geçmiş yıl (2020, 2021...) | ✅ Gönderilirse | O yıla özel veri kullanılır |
| Geçmiş yıl (2020, 2021...) | ✅ Gönderilmezse | En güncel veri kullanılır |

**Sonuç**: Year parametresini göndermemek, uygulamayı gelecekteki yıllar için "future-proof" (geleceğe hazır) hale getirir.

---

## 🔍 Debug İpuçları

### Log'ları İnceleyin

Backend çalışırken terminal'de şu bilgileri göreceksiniz:

```bash
# API anahtarı eksikse
WARNING - CLIMATIQ_API_KEY environment variable is not set.

# Başarılı çağrılarda
INFO - ✓ Climatiq API başarılı. Aktivite: electricity, Sonuç: 712.50 kg CO2e.

# Hata durumunda
ERROR - ✗ Climatiq API Hatası
  Status: 401
  Gönderilen Payload: {...}
  Hata Detayı: Unauthorized
```

### Payload'u Kontrol Edin

Hata logunda gönderilen payload'u görebilirsiniz. `year` alanı **olmamalı**:

```python
# ✓ Doğru
Gönderilen Payload: {'emission_factor': {'activity_id': '...', 'region': 'TR', 'data_version': '^26'}, ...}

# ❌ Yanlış
Gönderilen Payload: {'emission_factor': {'activity_id': '...', 'region': 'TR', 'year': 2025, ...}, ...}
```

---

## 📝 Özet

1. ✅ `year` parametresi opsiyonel yapıldı (`schemas.py`)
2. ✅ `year=None` olarak gönderiliyor (`climatiq_service.py`)
3. ✅ `exclude_none=True` ile None değerler JSON'dan çıkarılıyor
4. ✅ API'nin kullandığı year bilgisi yanıttan alınıp kaydediliyor
5. ✅ `.env` dosyasında `CLIMATIQ_API_KEY` ayarlanmalı

---

## 🚀 Sonraki Adımlar

1. **Test Edin**: Backend'i çalıştırın ve aktivite verisi ekleyin
2. **Logları İzleyin**: Terminal çıktısında başarılı API çağrısını görün
3. **Veritabanını Kontrol Edin**: `calculation_year` alanının dolu olduğunu doğrulayın

---

**Düzenleme Tarihi**: 2025-10-27  
**Düzeltilen Sorunlar**: 401 Unauthorized, no_emission_factors_found  
**Değiştirilen Dosyalar**: `schemas.py`, `climatiq_service.py`

