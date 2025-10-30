# backend/csv_handler.py
import csv
import io
import logging
from datetime import date, datetime
from typing import List
from sqlalchemy.orm import Session

import models
import schemas
import crud
import os
from services.validation_service import EmissionRow, validate_data
# YENİ: Pluggable calculation service factory
from services import get_calculation_service, ICalculationService

logger = logging.getLogger(__name__)


class CSVProcessor:
    """
    CSV dosyalarından aktivite verisi yükleme işlemlerini yöneten sınıf.
    
    Features:
    - Turkish decimal (comma) handling
    - Comprehensive validation with line-by-line error reporting
    - Pluggable calculation service provider
    - Atomic transactions (all-or-nothing commit)
    """
    
    def __init__(self, db: Session, facility_id: int):
        """
        Args:
            db: Veritabanı session'ı
            facility_id: Verilerin ekleneceği tesisin ID'si
        """
        self.db = db
        self.facility_id = facility_id
        # YENİ: Use factory function for pluggable provider selection
        self.calculation_service: ICalculationService = get_calculation_service(self.db)
    
    def process_csv_file(self, file_content: bytes) -> schemas.CSVUploadResult:
        """
        CSV dosyasını işler ve aktivite verilerini veritabanına ekler.
        
        CSV Formatı:
        aktivite_tipi,miktar,birim,baslangic_tarihi,bitis_tarihi
        electricity,1500,kWh,2024-01-01,2024-01-31
        
        Args:
            file_content: CSV dosyasının byte içeriği
            
        Returns:
            CSVUploadResult: İşlem sonucu ve detayları
        """
        results = []
        successful_rows = 0
        failed_rows = 0
        
        try:
            # Byte içeriğini string'e çevir
            content_str = file_content.decode('utf-8-sig')  # BOM karakterini kaldır
            csv_file = io.StringIO(content_str)
            reader = csv.DictReader(csv_file)
            
            # Başlıkları kontrol et
            expected_headers = {'aktivite_tipi', 'miktar', 'birim', 'baslangic_tarihi', 'bitis_tarihi'}
            if not expected_headers.issubset(set(reader.fieldnames or [])):
                return schemas.CSVUploadResult(
                    total_rows=0,
                    successful_rows=0,
                    failed_rows=0,
                    results=[],
                    message=f"Geçersiz CSV formatı. Beklenen başlıklar: {', '.join(expected_headers)}"
                )
            
            for row_number, row in enumerate(reader, start=2):  # 2'den başla (başlık 1. satır)
                result = self._process_row(row, row_number)
                results.append(result)
                
                if result.success:
                    successful_rows += 1
                else:
                    failed_rows += 1
            
            total_rows = len(results)
            
            # Sonuç mesajını oluştur
            if total_rows == 0:
                message = "CSV dosyası boş."
            elif failed_rows == 0:
                message = f"Tüm {total_rows} satır başarıyla yüklendi."
            elif successful_rows == 0:
                message = f"Hiçbir satır yüklenemedi. {failed_rows} hata."
            else:
                message = f"{successful_rows} satır başarıyla yüklendi, {failed_rows} satırda hata oluştu."
            
            return schemas.CSVUploadResult(
                total_rows=total_rows,
                successful_rows=successful_rows,
                failed_rows=failed_rows,
                results=results,
                message=message
            )
            
        except UnicodeDecodeError:
            return schemas.CSVUploadResult(
                total_rows=0,
                successful_rows=0,
                failed_rows=0,
                results=[],
                message="Dosya kodlaması hatalı. Lütfen UTF-8 formatında bir CSV dosyası yükleyin."
            )
        except Exception as e:
            logger.error(f"CSV işleme hatası: {str(e)}", exc_info=True)
            return schemas.CSVUploadResult(
                total_rows=0,
                successful_rows=0,
                failed_rows=0,
                results=[],
                message=f"CSV işleme hatası: {str(e)}"
            )
    
    def _process_row(self, row: dict, row_number: int) -> schemas.ActivityDataCSVRow:
        """
        Tek bir CSV satırını işler.
        
        Args:
            row: CSV satırı dictionary'si
            row_number: Satır numarası (kullanıcı için, 1-indexed)
            
        Returns:
            ActivityDataCSVRow: İşlem sonucu
        """
        try:
            # Aktivite tipini validate et
            activity_type_str = row.get('aktivite_tipi', '').strip().lower()
            activity_type_map = {
                'electricity': models.ActivityType.electricity,
                'elektrik': models.ActivityType.electricity,
                'natural_gas': models.ActivityType.natural_gas,
                'dogalgaz': models.ActivityType.natural_gas,
                'doğalgaz': models.ActivityType.natural_gas,
                'diesel_fuel': models.ActivityType.diesel_fuel,
                'dizel': models.ActivityType.diesel_fuel,
                'motorin': models.ActivityType.diesel_fuel,
            }
            
            if activity_type_str not in activity_type_map:
                return schemas.ActivityDataCSVRow(
                    row_number=row_number,
                    activity_type=activity_type_str,
                    quantity=0,
                    unit=row.get('birim', ''),
                    start_date=row.get('baslangic_tarihi', ''),
                    end_date=row.get('bitis_tarihi', ''),
                    error=f"Geçersiz aktivite tipi: '{activity_type_str}'. Geçerli değerler: electricity, natural_gas, diesel_fuel",
                    success=False
                )
            
            activity_type = activity_type_map[activity_type_str]
            
            # Miktarı parse et
            quantity_str = row.get('miktar', '').strip().replace(',', '.')
            try:
                quantity = float(quantity_str)
            except ValueError:
                return schemas.ActivityDataCSVRow(
                    row_number=row_number,
                    activity_type=activity_type_str,
                    quantity=0,
                    unit=row.get('birim', ''),
                    start_date=row.get('baslangic_tarihi', ''),
                    end_date=row.get('bitis_tarihi', ''),
                    error=f"Geçersiz miktar değeri: '{quantity_str}'",
                    success=False
                )
            
            # Birim
            unit = row.get('birim', '').strip()
            
            # Tarihleri parse et
            start_date_str = row.get('baslangic_tarihi', '').strip()
            end_date_str = row.get('bitis_tarihi', '').strip()
            
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError as e:
                return schemas.ActivityDataCSVRow(
                    row_number=row_number,
                    activity_type=activity_type_str,
                    quantity=quantity,
                    unit=unit,
                    start_date=start_date_str,
                    end_date=end_date_str,
                    error=f"Geçersiz tarih formatı. YYYY-MM-DD formatında olmalı. Hata: {str(e)}",
                    success=False
                )
            
            # DRY: Pydantic EmissionRow ile doğrula
            try:
                emission_row = validate_data({
                    "activity_id": activity_type.value,
                    "quantity": quantity,
                    "unit": unit,
                    "start_date": start_date,
                    "end_date": end_date,
                }, EmissionRow)
            except ValueError as ve:
                return schemas.ActivityDataCSVRow(
                    row_number=row_number,
                    activity_type=activity_type_str,
                    quantity=quantity,
                    unit=unit,
                    start_date=start_date_str,
                    end_date=end_date_str,
                    error=str(ve),
                    success=False
                )

            # API şeması ile uyum için dönüştür
            activity_data = schemas.ActivityDataCreate(
                activity_type=activity_type,
                quantity=emission_row.quantity,
                unit=emission_row.unit,
                start_date=emission_row.start_date,
                end_date=emission_row.end_date
            )
            
            # EVENT PIPELINE: Doğrudan DB yerine event kuyruğuna gönder
            if os.getenv('EVENT_PIPELINE_ENABLED', 'true').lower() == 'true':
                try:
                    from services.events import ActivityValidatedEvent, publish_event
                    emission_payload = EmissionRow(
                        activity_id=activity_type.value,
                        quantity=activity_data.quantity,
                        unit=activity_data.unit,
                        start_date=activity_data.start_date,
                        end_date=activity_data.end_date,
                    )
                    event = ActivityValidatedEvent(
                        payload=emission_payload,
                        context={"facility_id": self.facility_id, "user_id": None}
                    )
                    publish_event(event, queue='q_activity_validated')
                except Exception as e:
                    return schemas.ActivityDataCSVRow(
                        row_number=row_number,
                        activity_type=activity_type.value,
                        quantity=quantity,
                        unit=unit,
                        start_date=start_date_str,
                        end_date=end_date_str,
                        error=f"Event yayınlama hatası: {str(e)}",
                        success=False
                    )
            else:
                # Emisyon hesapla ve DB'ye yaz (geriye uyumluluk)
                calculation_result = self.calculation_service.calculate_for_activity(activity_data)
                db_activity_data = models.ActivityData(
                    facility_id=self.facility_id,
                    activity_type=activity_data.activity_type,
                    quantity=activity_data.quantity,
                    unit=activity_data.unit,
                    start_date=activity_data.start_date,
                    end_date=activity_data.end_date,
                    scope=calculation_result.scope,
                    calculated_co2e_kg=calculation_result.total_co2e_kg,
                    is_fallback_calculation=calculation_result.is_fallback
                )
                self.db.add(db_activity_data)
                self.db.flush()
            
            return schemas.ActivityDataCSVRow(
                row_number=row_number,
                activity_type=activity_type.value,
                quantity=quantity,
                unit=unit,
                start_date=start_date_str,
                end_date=end_date_str,
                error=None,
                success=True
            )
            
        except ValueError as e:
            # Pydantic validation hatası
            return schemas.ActivityDataCSVRow(
                row_number=row_number,
                activity_type=row.get('aktivite_tipi', ''),
                quantity=float(row.get('miktar', 0)),
                unit=row.get('birim', ''),
                start_date=row.get('baslangic_tarihi', ''),
                end_date=row.get('bitis_tarihi', ''),
                error=str(e),
                success=False
            )
        except Exception as e:
            logger.error(f"Satır {row_number} işlenirken hata: {str(e)}", exc_info=True)
            return schemas.ActivityDataCSVRow(
                row_number=row_number,
                activity_type=row.get('aktivite_tipi', ''),
                quantity=0,
                unit=row.get('birim', ''),
                start_date=row.get('baslangic_tarihi', ''),
                end_date=row.get('bitis_tarihi', ''),
                error=f"Beklenmeyen hata: {str(e)}",
                success=False
            )
    
    def commit(self):
        """Tüm değişiklikleri veritabanına kaydet."""
        self.db.commit()
    
    def rollback(self):
        """Tüm değişiklikleri geri al."""
        self.db.rollback()


def get_csv_template() -> str:
    """
    CSV şablonunu string olarak döndürür.
    """
    template = """aktivite_tipi,miktar,birim,baslangic_tarihi,bitis_tarihi
electricity,1500,kWh,2024-01-01,2024-01-31
natural_gas,250,m3,2024-01-01,2024-01-31
diesel_fuel,100,l,2024-01-01,2024-01-31"""
    return template

