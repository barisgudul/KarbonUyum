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


@app.task(name='tasks.update_industry_benchmarks', bind=True, max_retries=3)
def update_industry_benchmarks(self):
    """
    Haftada bir çalışan görev: IndustryTemplate'leri gerçek verilerle güncelle
    
    Her sektör için:
    - Ortalama tüketim (kWh/çalışan)
    - En iyi %20'lik dilim (best_in_class)
    - Hesaplanacağı tarihten 30 gün geriye bakacak
    """
    db = SessionLocal()
    try:
        logger.info("🔄 Benchmark güncelleme başladı...")
        
        # Tüm sektörleri al
        industry_templates = db.query(models.IndustryTemplate).all()
        
        updated_count = 0
        for template in industry_templates:
            try:
                # Bu sektör için şirketleri bul
                companies_in_industry = db.query(models.Company).filter(
                    models.Company.industry_type == template.industry_type
                ).all()
                
                if not companies_in_industry:
                    logger.warning(f"⚠️ {template.industry_name} için şirket yok")
                    continue
                
                # Son 30 günlük elektrik tüketim verisini al (simülasyon değil)
                cutoff_date = datetime.now().date() - timedelta(days=30)
                
                # Sadece gerçek veri (is_simulation=False) ve elektrik tüketimi
                electricity_data = db.query(
                    func.sum(models.ActivityData.quantity).label('total_kwh'),
                    func.count(models.ActivityData.id).label('data_points'),
                    models.Facility.company_id
                ).filter(
                    models.ActivityData.activity_type == models.ActivityType.electricity,
                    models.ActivityData.is_simulation == False,
                    models.ActivityData.start_date >= cutoff_date,
                    models.Facility.id == models.ActivityData.facility_id,
                    models.Facility.company_id.in_([c.id for c in companies_in_industry])
                ).group_by(models.Facility.company_id).all()
                
                if not electricity_data:
                    logger.warning(f"⚠️ {template.industry_name} için son 30 günde veri yok")
                    continue
                
                # Tüketim değerlerini hesapla
                consumptions = [float(d.total_kwh) for d in electricity_data if d.total_kwh]
                
                if consumptions:
                    # Ortalama
                    avg_consumption = sum(consumptions) / len(consumptions)
                    
                    # En iyi %20 (Sıfırdan düşükleri filtrele)
                    sorted_consumptions = sorted(consumptions)
                    best_20_percent_threshold = sorted_consumptions[int(len(sorted_consumptions) * 0.2)]
                    
                    # Verileri güncelle
                    template.average_electricity_kwh = avg_consumption
                    template.best_in_class_electricity_kwh = best_20_percent_threshold
                    
                    db.commit()
                    updated_count += 1
                    
                    logger.info(
                        f"✅ {template.industry_name}: "
                        f"Ortalama={avg_consumption:.0f} kWh, "
                        f"Best %20={best_20_percent_threshold:.0f} kWh"
                    )
                    
            except Exception as e:
                logger.error(f"❌ {template.industry_name} güncellenirken hata: {e}")
                continue
        
        logger.info(f"✅ Benchmark güncelleme tamamlandı: {updated_count} sektör güncellendi")
        return {"updated": updated_count, "timestamp": datetime.now().isoformat()}
        
    except Exception as exc:
        logger.error(f"❌ Benchmark görevi hatası: {exc}")
        # Retry logic
        raise self.retry(exc=exc, countdown=300)  # 5 dakika sonra retry
        
    finally:
        db.close()


@app.task(name='tasks.detect_anomalies', bind=True, max_retries=2)
def detect_anomalies(self):
    """
    Günlük çalışan görev: Son eklenen verilerde anomali tespiti
    
    Her şirket için:
    - Son 30 günün ortalaması
    - Yeni eklenen veri ile karşılaştır
    - İstatistiksel anormallik varsa bildir
    """
    db = SessionLocal()
    try:
        logger.info("🔍 Anomali tespiti başladı...")
        
        # Son 24 saatte eklenen ActivityData'ları bul
        cutoff_time = datetime.now() - timedelta(hours=24)
        
        new_activities = db.query(
            models.ActivityData
        ).filter(
            # Mevcut SQLAlchemy ORM yapısında created_at olmayabilir
            # Alternatif olarak, is_simulation=False ve son güncellemesi...
            models.ActivityData.is_simulation == False
        ).all()
        
        anomaly_count = 0
        
        for company in db.query(models.Company).all():
            try:
                # Bu şirketin son 30 günlük ortalamasını al
                cutoff_date = datetime.now().date() - timedelta(days=30)
                
                historical_data = db.query(
                    func.avg(models.ActivityData.quantity).label('avg_quantity')
                ).filter(
                    models.ActivityData.activity_type == models.ActivityType.electricity,
                    models.ActivityData.is_simulation == False,
                    models.ActivityData.start_date >= cutoff_date,
                    models.Facility.company_id == company.id,
                    models.Facility.id == models.ActivityData.facility_id
                ).scalar()
                
                if not historical_data:
                    continue
                
                # Son verileri kontrol et
                recent_data = db.query(models.ActivityData).filter(
                    models.ActivityData.activity_type == models.ActivityType.electricity,
                    models.ActivityData.is_simulation == False,
                    models.ActivityData.start_date >= cutoff_date,
                    models.Facility.company_id == company.id,
                    models.Facility.id == models.ActivityData.facility_id
                ).order_by(models.ActivityData.end_date.desc()).limit(1).first()
                
                if recent_data and historical_data:
                    # Anomali kontrolü: %20 üzeri artış
                    deviation = (recent_data.quantity - historical_data) / historical_data if historical_data > 0 else 0
                    
                    if deviation > 0.20:  # %20 üzeri artış
                        logger.warning(
                            f"⚠️ ANOMALI BULUNDU: {company.name} - "
                            f"Elektrik tüketimi +{deviation*100:.1f}% arttı"
                        )
                        anomaly_count += 1
                        
                        # YENİ: Bildirim oluştur
                        try:
                            from services.notification_service import get_notification_service
                            notif_service = get_notification_service()
                            
                            # Şirket sahibine bildir
                            owner_id = company.owner_id
                            if owner_id:
                                notif_service.create_notification(
                                    db=db,
                                    user_id=owner_id,
                                    notification_type='anomaly',
                                    title=f"⚠️ {company.name}: Elektrik Tüketimi Anormal!",
                                    message=f"Bu ay elektrik tüketimi geçen aya göre {deviation*100:.1f}% artmış. "
                                            f"Lütfen kontrol ederek inceleyiniz.",
                                    company_id=company.id,
                                    action_url=f"/dashboard/companies/{company.id}/anomalies",
                                    send_email=True
                                )
                        except Exception as e:
                            logger.error(f"❌ Anomali bildirimi oluşturma hatası: {e}")
                        
            except Exception as e:
                logger.error(f"❌ {company.name} anomali kontrolü hatası: {e}")
                continue
        
        logger.info(f"✅ Anomali tespiti tamamlandı: {anomaly_count} anomali bulundu")
        return {"anomalies_detected": anomaly_count, "timestamp": datetime.now().isoformat()}
        
    except Exception as exc:
        logger.error(f"❌ Anomali tespiti hatası: {exc}")
        raise self.retry(exc=exc, countdown=300)
        
    finally:
        db.close()


# Health check görevi (işletim kontrolü için)
@app.task(name='tasks.health_check', bind=True)
def health_check(self):
    """
    Her saatte çalışan görev - Celery sistemi sağlık durumunu kontrol et
    """
    logger.info(f"✅ Celery health check: {datetime.now().isoformat()}")
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


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

@app.task(name='tasks.generate_cbam_report_async', bind=True, max_retries=3)
def generate_cbam_report_async(self, report_id: int):
    """
    CBAM XML raporunu asenkron olarak üret
    
    Adımlar:
    1. Report kaydını bul
    2. Şirketin verilerini topla
    3. XML'i oluştur
    4. Dosyayı kaydet (S3 veya local)
    5. Report status'ü güncelle
    6. Bildirim gönder
    """
    db = SessionLocal()
    try:
        logger.info(f"📊 CBAM raporu oluşturuluyor: Report #{report_id}")
        
        # Report kaydını bul
        report = db.query(models.Report).filter(
            models.Report.id == report_id
        ).first()
        
        if not report:
            logger.error(f"❌ Rapor bulunamadı: #{report_id}")
            return {"status": "failed", "reason": "report_not_found"}
        
        # Status'ü güncelle
        report.status = models.ReportStatus.processing
        report.requested_at = datetime.utcnow()
        db.commit()
        
        # CBAM servisi ile rapor oluştur
        try:
            from services.cbam_service import CBAMReportService
            cbam_service = CBAMReportService()
            
            xml_content = cbam_service.generate_cbam_report(
                company_id=report.company_id,
                start_date=report.start_date,
                end_date=report.end_date,
                reporting_period=report.period_name
            )
            
            # Dosyayı kaydet
            import os
            import uuid
            
            report_dir = "/tmp/reports"
            os.makedirs(report_dir, exist_ok=True)
            
            filename = f"cbam_{report.company_id}_{uuid.uuid4()}.xml"
            file_path = os.path.join(report_dir, filename)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(xml_content)
            
            file_size = os.path.getsize(file_path)
            
            # Report kaydını güncelle
            report.status = models.ReportStatus.completed
            report.file_path = file_path
            report.file_size_bytes = file_size
            report.completed_at = datetime.utcnow()
            report.expires_at = datetime.utcnow() + timedelta(days=7)  # 7 günlük TTL
            
            db.commit()
            
            logger.info(
                f"✅ CBAM raporu oluşturuldu: {filename} ({file_size} bytes)"
            )
            
            # Bildirim gönder
            if report.notify_user_when_ready:
                try:
                    from services.notification_service import get_notification_service
                    notif_service = get_notification_service()
                    
                    company = db.query(models.Company).filter(
                        models.Company.id == report.company_id
                    ).first()
                    
                    if company:
                        notif_service.create_notification(
                            db=db,
                            user_id=report.user_id,
                            notification_type='report_ready',
                            title="📊 CBAM Raporunuz Hazır!",
                            message=f"{company.name} için {report.period_name or 'belirtilen dönem'} CBAM XML raporu hazırlanmıştır. İndirmek için tıklayın.",
                            company_id=report.company_id,
                            action_url=f"/dashboard/reports/{report_id}/download",
                            send_email=True
                        )
                except Exception as e:
                    logger.error(f"⚠️ Rapor hazır bildirimi gönderilemedi: {e}")
            
            return {
                "status": "success",
                "report_id": report_id,
                "file_path": file_path,
                "file_size": file_size
            }
            
        except Exception as cbam_error:
            logger.error(f"❌ CBAM üretimi hatası: {cbam_error}")
            report.status = models.ReportStatus.failed
            report.error_message = str(cbam_error)
            report.error_trace = str(cbam_error.__traceback__)
            db.commit()
            
            # Retry
            raise self.retry(exc=cbam_error, countdown=300)
        
    except Exception as exc:
        logger.error(f"❌ CBAM rapor görev hatası: {exc}")
        if report:
            report.status = models.ReportStatus.failed
            report.error_message = str(exc)
            db.commit()
        raise self.retry(exc=exc, countdown=600)
        
    finally:
        db.close()


@app.task(name='tasks.calculate_roi_analysis_async', bind=True, max_retries=3)
def calculate_roi_analysis_async(self, report_id: int):
    """
    ROI analiz raporunu asenkron olarak hesapla ve PDF'e dönüştür
    
    Adımlar:
    1. Report kaydını bul
    2. ROI hesaplamasını yap
    3. Sonuçları JSON olarak kaydet
    4. PDF'e dönüştür (opsiyonel - şimdi JSON)
    5. Bildirim gönder
    """
    db = SessionLocal()
    try:
        logger.info(f"💰 ROI analiz raporu oluşturuluyor: Report #{report_id}")
        
        # Report kaydını bul
        report = db.query(models.Report).filter(
            models.Report.id == report_id
        ).first()
        
        if not report:
            logger.error(f"❌ Rapor bulunamadı: #{report_id}")
            return {"status": "failed", "reason": "report_not_found"}
        
        # Status'ü güncelle
        report.status = models.ReportStatus.processing
        report.requested_at = datetime.utcnow()
        db.commit()
        
        # ROI hesapla
        try:
            from services.roi_calculator_service import ROICalculatorService
            roi_service = ROICalculatorService(db)
            
            # Analiz süresini hesapla (döneme göre)
            period_months = 12
            roi_analysis = roi_service.calculate_roi_potential(
                company_id=report.company_id,
                period_months=period_months
            )
            
            # Sonuçları JSON olarak kaydet
            import json
            import os
            import uuid
            
            report_dir = "/tmp/reports"
            os.makedirs(report_dir, exist_ok=True)
            
            filename = f"roi_{report.company_id}_{uuid.uuid4()}.json"
            file_path = os.path.join(report_dir, filename)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(roi_analysis.dict(), f, ensure_ascii=False, indent=2, default=str)
            
            file_size = os.path.getsize(file_path)
            
            # Report kaydını güncelle
            report.status = models.ReportStatus.completed
            report.file_path = file_path
            report.file_size_bytes = file_size
            report.total_savings_tl = roi_analysis.potential_annual_savings_tl
            report.completed_at = datetime.utcnow()
            report.expires_at = datetime.utcnow() + timedelta(days=7)
            
            db.commit()
            
            logger.info(
                f"✅ ROI raporu oluşturuldu: {filename} "
                f"(Tasarruf: {roi_analysis.potential_annual_savings_tl:.0f} TL)"
            )
            
            # Bildirim gönder
            if report.notify_user_when_ready:
                try:
                    from services.notification_service import get_notification_service
                    notif_service = get_notification_service()
                    
                    company = db.query(models.Company).filter(
                        models.Company.id == report.company_id
                    ).first()
                    
                    if company:
                        notif_service.create_notification(
                            db=db,
                            user_id=report.user_id,
                            notification_type='report_ready',
                            title="💰 ROI Analiz Raporunuz Hazır!",
                            message=f"{company.name} için yıllık {roi_analysis.potential_annual_savings_tl:.0f} TL tasarruf potansiyeli tespit edildi! Detaylı analiz için tıklayın.",
                            company_id=report.company_id,
                            action_url=f"/dashboard/reports/{report_id}/view",
                            send_email=True
                        )
                except Exception as e:
                    logger.error(f"⚠️ ROI rapor bildirim gönderilemedi: {e}")
            
            return {
                "status": "success",
                "report_id": report_id,
                "file_path": file_path,
                "file_size": file_size,
                "total_savings_tl": roi_analysis.potential_annual_savings_tl
            }
            
        except Exception as roi_error:
            logger.error(f"❌ ROI hesaplama hatası: {roi_error}")
            report.status = models.ReportStatus.failed
            report.error_message = str(roi_error)
            db.commit()
            
            raise self.retry(exc=roi_error, countdown=300)
        
    except Exception as exc:
        logger.error(f"❌ ROI rapor görev hatası: {exc}")
        if report:
            report.status = models.ReportStatus.failed
            report.error_message = str(exc)
            db.commit()
        raise self.retry(exc=exc, countdown=600)
        
    finally:
        db.close()


@app.task(name='tasks.cleanup_expired_reports', bind=True)
def cleanup_expired_reports(self):
    """
    Süresi dolmuş raporları sil (günde bir çalışan)
    """
    db = SessionLocal()
    try:
        logger.info("🧹 Süresi dolmuş raporlar temizleniyor...")
        
        expired_reports = db.query(models.Report).filter(
            models.Report.expires_at <= datetime.utcnow(),
            models.Report.status != models.ReportStatus.expired
        ).all()
        
        deleted_count = 0
        for report in expired_reports:
            try:
                # Dosyayı sil
                if report.file_path and os.path.exists(report.file_path):
                    os.remove(report.file_path)
                    logger.debug(f"📁 Dosya silindi: {report.file_path}")
                
                # Report kaydını sil veya işaretle
                report.status = models.ReportStatus.expired
                deleted_count += 1
                
            except Exception as e:
                logger.error(f"⚠️ Rapor temizleme hatası: {e}")
        
        db.commit()
        logger.info(f"✅ {deleted_count} süresi dolmuş rapor temizlendi")
        
        return {"cleaned_count": deleted_count}
        
    except Exception as exc:
        logger.error(f"❌ Temizlik görev hatası: {exc}")
    finally:
        db.close()


@app.task(name='tasks.calculate_supplier_benchmarks', bind=True, max_retries=3)
def calculate_supplier_benchmarks(self):
    """
    Tedarikçi ürünleri için sektörel benchmark'ları hesapla
    
    Her product_category için:
    - Ortalama co2e_per_unit_kg
    - Medyan değer
    - En iyi %25'lik dilim (best_in_class)
    - Toplam ürün sayısı
    
    Bu veriler tedarikçilere kendi performanslarını 
    sektör ortalamasıyla karşılaştırma imkanı sağlar.
    """
    db = SessionLocal()
    try:
        logger.info("🔄 Tedarikçi benchmark hesaplama başladı...")
        
        # Tüm unique product_category'leri al
        categories = db.query(models.ProductFootprint.product_category).distinct().all()
        
        benchmark_results = {}
        
        for (category,) in categories:
            if not category:
                continue
            
            # Bu kategorideki tüm ürünleri al
            products = db.query(models.ProductFootprint).filter(
                models.ProductFootprint.product_category == category,
                models.ProductFootprint.co2e_per_unit_kg > 0  # Sadece geçerli değerler
            ).all()
            
            if not products:
                continue
            
            # CO2e değerlerini topla
            co2e_values = [p.co2e_per_unit_kg for p in products]
            
            if not co2e_values:
                continue
            
            # İstatistikleri hesapla
            avg_co2e = sum(co2e_values) / len(co2e_values)
            
            # Medyan hesaplama
            sorted_values = sorted(co2e_values)
            mid = len(sorted_values) // 2
            median_co2e = (sorted_values[mid] + sorted_values[~mid]) / 2 if len(sorted_values) > 0 else 0
            
            # En iyi %25'lik dilim (best_in_class) - en düşük emisyonlar
            percentile_25_index = int(len(sorted_values) * 0.25)
            best_in_class = sorted_values[percentile_25_index] if percentile_25_index < len(sorted_values) else sorted_values[0]
            
            benchmark_results[category] = {
                "category": category,
                "avg_co2e_per_unit": round(avg_co2e, 3),
                "median_co2e_per_unit": round(median_co2e, 3),
                "best_in_class": round(best_in_class, 3),
                "product_count": len(products),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            logger.info(
                f"📊 {category}: Ort={avg_co2e:.2f}, Medyan={median_co2e:.2f}, "
                f"Best={best_in_class:.2f} kg CO2e ({len(products)} ürün)"
            )
        
        # Sonuçları cache'e kaydet (Redis veya DB'ye kaydedilebilir)
        # Şu an için sadece log'layalım, gelecekte Redis'e kaydedilecek
        
        logger.info(f"✅ {len(benchmark_results)} kategori için benchmark hesaplandı")
        
        return {
            "success": True,
            "categories_processed": len(benchmark_results),
            "benchmarks": benchmark_results
        }
        
    except Exception as exc:
        logger.error(f"❌ Benchmark hesaplama hatası: {exc}")
        raise self.retry(exc=exc, countdown=60)  # 1 dakika sonra tekrar dene
    finally:
        db.close()
