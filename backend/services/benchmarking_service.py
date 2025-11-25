# backend/services/benchmarking_service.py
"""
Benchmarking Service - Karşılaştırmalı Analiz Servisi

Bu servis, bir şirketi (company) sektör ve şehir ortalaması ile karşılaştırır.
GHG Protocol uyumlu scope bazlı metrikler hesaplar.
Anonimleştirilmiş verilerle karşılaştırma sağlar (en az 3 firma gerekli).
"""

import logging
from datetime import date, timedelta  # YENİ: Zaman filtrelemesi için
from typing import Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

import models

logger = logging.getLogger(__name__)

# YENİ: Zamansal tutarlılığı sağlamak için benchmarking window sabitesi
BENCHMARKING_WINDOW_DAYS = 365  # Son 12 ay

class BenchmarkMetric:
    """Tek bir benchmark metriki"""
    def __init__(self, metric_name: str, company_value: float, sector_avg: float, unit: str):
        self.metric_name = metric_name
        self.company_value = company_value
        self.sector_avg = sector_avg
        self.unit = unit
        self.efficiency_ratio = (sector_avg / company_value * 100) if company_value > 0 else 0
        self.is_better = self.efficiency_ratio > 100
        self.difference_percent = self.efficiency_ratio - 100


class BenchmarkReport:
    """Benchmark raporu"""
    def __init__(self, company_id: int, company_name: str, industry_type: str, city: str):
        self.company_id = company_id
        self.company_name = company_name
        self.industry_type = industry_type
        self.city = city
        self.metrics: List[BenchmarkMetric] = []
        self.comparable_companies_count = 0
        self.data_available = False
        self.message = ""


class BenchmarkingService:
    """Benchmarking servisinin ana sınıfı"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_benchmark_metrics(self, company_id: int) -> BenchmarkReport:
        """
        Bir şirket için benchmark metriklerini hesapla
        
        Args:
            company_id: Şirket ID'si
            
        Returns:
            BenchmarkReport: Karşılaştırma raporu
        """
        # Şirket bilgilerini al
        company = self.db.query(models.Company).filter(models.Company.id == company_id).first()
        
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        # Raporun temel bilgileri
        report = BenchmarkReport(
            company_id=company_id,
            company_name=company.name,
            industry_type=company.industry_type.value if company.industry_type else "unknown",
            city=company.facilities[0].city if company.facilities else "unknown"
        )
        
        # Şirketin verilerine erişim
        company_facilities = company.facilities
        if not company_facilities:
            report.message = "Bu şirketin henüz hiçbir tesisi bulunmamaktadır."
            return report
        
        # Şirketin toplam CO2e ve m² hesapla
        company_total_co2e = 0
        company_total_area = 0
        
        for facility in company_facilities:
            company_total_area += facility.surface_area_m2 or 0
            for activity in facility.activity_data:
                if not activity.is_fallback_calculation:  # Sadece güvenilir veriler
                    company_total_co2e += activity.calculated_co2e_kg or 0
        
        if company_total_area == 0 or company_total_co2e == 0:
            report.message = "Bu şirketin henüz yeterli veri bulunmamaktadır (alan veya aktivite verisi eksik)."
            return report
        
        # Sektör ortalamasını hesapla (aynı industry_type ve şehir)
        sector_metrics = self._get_sector_average(
            company.industry_type.value if company.industry_type else None,
            report.city,
            exclude_company_id=company_id
        )
        
        if sector_metrics['comparable_count'] < 3:
            report.message = f"Bu sektör/şehir kombinasyonunda karşılaştırma için henüz yeterli veri toplanmamıştır. (Mevcut: {sector_metrics['comparable_count']} şirket, Gerekli: 3)"
            report.comparable_companies_count = sector_metrics['comparable_count']
            return report
        
        # Metrikler hesapla
        report.data_available = True
        report.comparable_companies_count = sector_metrics['comparable_count']
        
        # Metrik 1: Elektrik Verimliliği (Scope 2)
        scope2_co2e = sum(
            activity.calculated_co2e_kg or 0
            for facility in company_facilities
            for activity in facility.activity_data
            if activity.scope and activity.scope.value == 'scope_2' and not activity.is_fallback_calculation
        )
        if scope2_co2e > 0 and company_total_area > 0:
            company_scope2_intensity = scope2_co2e / company_total_area
            report.metrics.append(BenchmarkMetric(
                metric_name="Elektrik Verimliliği",
                company_value=company_scope2_intensity,
                sector_avg=sector_metrics.get('scope2_per_m2', company_scope2_intensity),
                unit="kgCO2e/m²"
            ))
        
        # Metrik 2: Doğalgaz Verimliliği (Scope 1)
        scope1_co2e = sum(
            activity.calculated_co2e_kg or 0
            for facility in company_facilities
            for activity in facility.activity_data
            if activity.scope and activity.scope.value == 'scope_1' and not activity.is_fallback_calculation
        )
        if scope1_co2e > 0 and company_total_area > 0:
            company_scope1_intensity = scope1_co2e / company_total_area
            report.metrics.append(BenchmarkMetric(
                metric_name="Doğalgaz Verimliliği",
                company_value=company_scope1_intensity,
                sector_avg=sector_metrics.get('scope1_per_m2', company_scope1_intensity),
                unit="kgCO2e/m²"
            ))
        
        # Metrik 3: Toplam Karbon Yoğunluğu
        company_total_intensity = company_total_co2e / company_total_area
        report.metrics.append(BenchmarkMetric(
            metric_name="Toplam Karbon Yoğunluğu",
            company_value=company_total_intensity,
            sector_avg=sector_metrics.get('total_per_m2', company_total_intensity),
            unit="kgCO2e/m²"
        ))
        
        return report
    
    def _get_sector_average(self, industry_type: Optional[str], city: str, exclude_company_id: int) -> Dict:
        """
        Sektör ortalamasını hesapla (anonimleştirilmiş)
        
        En az 3 şirket olması gerekmektedir (anonimlik için)
        KRITIK: Son 12 aya ait veriler kullanılır (zamansal tutarlılık)
        """
        try:
            # YENİ: Zamansal tutarlılık - Son 12 ay
            cutoff_date = date.today() - timedelta(days=BENCHMARKING_WINDOW_DAYS)
            
            # SQL sorgusu: Sektör ortalamasını hesapla
            query = text("""
                SELECT 
                    COUNT(DISTINCT c.id) as company_count,
                    AVG(CASE 
                        WHEN ad.scope = 'scope_2' THEN (ad.calculated_co2e_kg / f.surface_area_m2)
                        ELSE NULL
                    END) as scope2_per_m2,
                    AVG(CASE 
                        WHEN ad.scope = 'scope_1' THEN (ad.calculated_co2e_kg / f.surface_area_m2)
                        ELSE NULL
                    END) as scope1_per_m2,
                    AVG(ad.calculated_co2e_kg / f.surface_area_m2) as total_per_m2
                FROM activity_data ad
                JOIN facilities f ON ad.facility_id = f.id
                JOIN companies c ON f.company_id = c.id
                WHERE 
                    f.surface_area_m2 > 0
                    AND ad.calculated_co2e_kg > 0
                    AND ad.is_fallback_calculation = false
                    AND c.id != :exclude_company_id
                    AND ad.start_date >= :cutoff_date
            """)
            
            # Industry type ve şehir filtresi varsa ekle
            if industry_type:
                query = text(query.text + " AND c.industry_type = :industry_type")
            
            if city:
                query = text(query.text + " AND f.city = :city")
            
            params = {
                'exclude_company_id': exclude_company_id,
                'cutoff_date': cutoff_date
            }
            if industry_type:
                params['industry_type'] = industry_type
            if city:
                params['city'] = city
            
            result = self.db.execute(query, params).first()
            
            if not result or result[0] < 3:
                # Yeterli veri yok
                return {
                    'comparable_count': result[0] if result else 0,
                    'scope1_per_m2': None,
                    'scope2_per_m2': None,
                    'total_per_m2': None
                }
            
            return {
                'comparable_count': result[0],
                'scope1_per_m2': float(result[2]) if result[2] else 0,
                'scope2_per_m2': float(result[1]) if result[1] else 0,
                'total_per_m2': float(result[3]) if result[3] else 0
            }
            
        except Exception as e:
            logger.error(f"Error calculating sector average: {str(e)}")
            return {
                'comparable_count': 0,
                'scope1_per_m2': None,
                'scope2_per_m2': None,
                'total_per_m2': None
            }
