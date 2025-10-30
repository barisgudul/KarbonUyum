# backend/tasks.py

"""
Celery görevleri - Asenkron, periyodik işlemler
"""

import logging
from datetime import datetime, timedelta
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from celery_config import app
from database import SessionLocal
import models

logger = logging.getLogger(__name__)


"""Raporlama ve analitik görevleri tasks/analytics_tasks.py ve tasks/reporting_tasks.py dosyalarına taşınmıştır."""


"""Raporlama ve analitik görevleri tasks/analytics_tasks.py ve tasks/reporting_tasks.py dosyalarına taşınmıştır."""


# Health check görevi (işletim kontrolü için)
@app.task(name='tasks.health_check', bind=True)
def health_check(self):
    """
    Her saatte çalışan görev - Celery sistemi sağlık durumunu kontrol et
    """
    logger.info(f"✅ Celery health check: {datetime.now().isoformat()}")
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# Ingestion event görevleri tasks/ingestion_tasks.py içine taşındı.


# YENİ: OCR İşleme Görevi (Modül 2.2)
@app.task(name='tasks.process_invoice_ocr', bind=True, max_retries=3)
def process_invoice_ocr(self, invoice_id: int):
    """
    Fatura dosyasını Google Cloud Vision ile OCR işleme
    
    Adımlar:
    1. Fatura dosyasını diskten oku
    2. Google Cloud Vision API ile metin çıkar
    3. Okunan metni parse et (tüketim, maliyet, tarih)
    4. Invoice kaydını güncelle
    5. Kullanıcıya bildirim gönder
    6. Hata durumunda retry yap (max 3)
    """
    db = SessionLocal()
    try:
        logger.info(f"🔍 Fatura OCR işlemi başladı: Invoice #{invoice_id}")
        
        # Fatura kaydını bul
        invoice = db.query(models.Invoice).filter(
            models.Invoice.id == invoice_id
        ).first()
        
        if not invoice:
            logger.error(f"❌ Fatura bulunamadı: #{invoice_id}")
            return {"status": "failed", "reason": "invoice_not_found"}
        
        # Durumu güncelle
        invoice.status = models.InvoiceStatus.processing
        db.commit()
        
        # OCR İşlemi - Google Cloud Vision kullanarak
        try:
            from services.invoice_ocr_service import get_ocr_service
            
            ocr_service = get_ocr_service()
            extracted_data = ocr_service.process_invoice(invoice.file_path)
            
            if not extracted_data:
                raise Exception("OCR başarısız - veri çıkarılamadı")
            
            # Okunan verileri kaydet
            invoice.extracted_activity_type = extracted_data.get('activity_type')
            invoice.extracted_quantity = extracted_data.get('quantity')
            invoice.extracted_cost_tl = extracted_data.get('cost_tl')
            invoice.extracted_start_date = extracted_data.get('start_date')
            invoice.extracted_end_date = extracted_data.get('end_date')
            invoice.extracted_text = extracted_data.get('extracted_text')
            invoice.status = models.InvoiceStatus.completed
            invoice.processed_at = datetime.now().date()
            
            db.commit()
            
            logger.info(
                f"✅ Fatura OCR başarılı: "
                f"Type={invoice.extracted_activity_type}, "
                f"Qty={invoice.extracted_quantity}, "
                f"Cost={invoice.extracted_cost_tl} TL, "
                f"Güven: {extracted_data.get('confidence', 0):.0%}"
            )
            
            # Kullanıcıya bildirim gönder
            try:
                from services.notification_service import get_notification_service
                notif_service = get_notification_service()
                
                facility = db.query(models.Facility).filter(
                    models.Facility.id == invoice.facility_id
                ).first()
                
                if facility and facility.company:
                    # Güven skoru düşükse uyarı ekle
                    confidence = extracted_data.get('confidence', 0)
                    confidence_warning = " ⚠️ (Düşük güven skoru - lütfen kontrol edin)" if confidence < 0.6 else ""
                    
                    notif_service.create_notification(
                        db=db,
                        user_id=invoice.user_id,
                        notification_type='invoice_processed',
                        title="📄 Faturanız İşlendi!",
                        message=f"{invoice.filename}: {invoice.extracted_quantity} {invoice.extracted_activity_type}, "
                                f"{invoice.extracted_cost_tl:.0f} TL{confidence_warning}. Lütfen doğrulayın.",
                        company_id=facility.company_id,
                        facility_id=facility.id,
                        action_url=f"/dashboard/invoices/{invoice_id}/verify",
                        send_email=True
                    )
            except Exception as e:
                logger.error(f"⚠️ OCR sonuç bildirimi gönderilirken hata: {e}")
            
            return {
                "status": "success",
                "invoice_id": invoice_id,
                "extracted_data": extracted_data
            }
            
        except Exception as ocr_error:
            logger.error(f"❌ OCR işleme hatası: {ocr_error}")
            
            # Retry mekanizması
            if self.request.retries < self.max_retries:
                logger.warning(f"🔄 Retry {self.request.retries + 1}/{self.max_retries} başladı...")
                raise self.retry(exc=ocr_error, countdown=60)  # 60 saniye sonra retry
            else:
                # Final attempt başarısız
                invoice.status = models.InvoiceStatus.failed
                invoice.processed_at = datetime.now().date()
                db.commit()
                
                logger.error(f"❌ OCR işlemi nihayet başarısız (3 retry sonrası): {ocr_error}")
                
                return {
                    "status": "failed",
                    "reason": str(ocr_error),
                    "invoice_id": invoice_id
                }
    
    except Exception as e:
        logger.error(f"❌ Fatura işleme görevi hatası: {e}")
        invoice.status = models.InvoiceStatus.failed
        db.commit()
        return {"status": "error", "reason": str(e)}


def extract_invoice_data_with_ocr(file_path: str) -> dict:
    """
    Google Cloud Vision API ile fatura'dan veri çıkar
    
    Mock versiyonu - gerçek OCR entegrasyonu yapılacak
    """
    try:
        import os
        from google.cloud import vision
        
        client = vision.ImageAnnotatorClient()
        
        # Dosyayı oku
        with open(file_path, 'rb') as image_file:
            content = image_file.read()
        
        image = vision.Image(content=content)
        
        # OCR yap
        response = client.document_text_detection(image=image)
        text = response.full_text_annotation.text
        
        # Metin analizi - Türkçe fatura örüntüleri
        extracted = {
            'raw_text': text,
            'activity_type': extract_activity_type(text),
            'quantity': extract_quantity(text),
            'cost_tl': extract_cost(text),
            'start_date': extract_date(text, 'start'),
            'end_date': extract_date(text, 'end')
        }
        
        return extracted
        
    except ImportError:
        logger.warning("⚠️ Google Cloud Vision SDK yüklü değil, mock OCR kullanılıyor")
        return extract_invoice_data_mock()
    except Exception as e:
        logger.error(f"❌ OCR hatası: {e}")
        raise


def extract_invoice_data_mock() -> dict:
    """
    Mock OCR sonucu - geliştirme için
    """
    from datetime import date, timedelta
    return {
        'raw_text': '[Mock OCR Output]',
        'activity_type': 'electricity',
        'quantity': 5000.0,
        'cost_tl': 15000.0,
        'start_date': date.today() - timedelta(days=30),
        'end_date': date.today()
    }


def extract_activity_type(text: str) -> str:
    """Metinden enerji tipi çıkar"""
    text_lower = text.lower()
    if 'elektrik' in text_lower or 'kwh' in text_lower:
        return 'electricity'
    elif 'doğalgaz' in text_lower or 'gaz' in text_lower or 'm³' in text_lower:
        return 'natural_gas'
    elif 'yakıt' in text_lower or 'diesel' in text_lower or 'benzin' in text_lower:
        return 'diesel_fuel'
    return 'electricity'


def extract_quantity(text: str) -> float:
    """Metinden tüketim miktarını çıkar"""
    import re
    # Türkçe fatura yapısından örnek: "Tüketim: 5.234 kWh"
    pattern = r'[tT]üketim\s*[:：]\s*([\d\.,]+)'
    match = re.search(pattern, text)
    if match:
        qty_str = match.group(1).replace(',', '.')
        try:
            return float(qty_str)
        except:
            pass
    return 0.0


def extract_cost(text: str) -> float:
    """Metinden fatura tutarını çıkar"""
    import re
    # Türkçe fatura yapısından: "Toplam: 15.250,50 TL"
    pattern = r'[tT]oplam\s*[:：]\s*([\d\.,]+)'
    match = re.search(pattern, text)
    if match:
        cost_str = match.group(1).replace('.', '').replace(',', '.')
        try:
            return float(cost_str)
        except:
            pass
    return 0.0


def extract_date(text: str, date_type: str = 'start') -> None:
    """Metinden tarihi çıkar"""
    import re
    from datetime import datetime
    
    # Türkçe tarih desenleri: "01.01.2024", "01/01/2024"
    pattern = r'(\d{1,2})[./](\d{1,2})[./](\d{4})'
    matches = re.findall(pattern, text)
    
    if matches:
        try:
            if date_type == 'start':
                day, month, year = matches[0]
            else:
                day, month, year = matches[-1] if len(matches) > 1 else matches[0]
            
            return datetime(int(year), int(month), int(day)).date()
        except:
            pass
    
    return None


# YENİ: Asenkron Rapor Üretimi (Modül 2.1)

"""Raporlama ve analitik görevleri tasks/analytics_tasks.py ve tasks/reporting_tasks.py dosyalarına taşınmıştır."""


"""Raporlama ve analitik görevleri tasks/analytics_tasks.py ve tasks/reporting_tasks.py dosyalarına taşınmıştır."""


"""Raporlama ve analitik görevleri tasks/analytics_tasks.py ve tasks/reporting_tasks.py dosyalarına taşınmıştır."""


"""Raporlama ve analitik görevleri tasks/analytics_tasks.py ve tasks/reporting_tasks.py dosyalarına taşınmıştır."""

# Yeni görev modüllerini kaydetmek için import et
import tasks.analytics_tasks  # noqa: E402,F401
import tasks.reporting_tasks  # noqa: E402,F401
