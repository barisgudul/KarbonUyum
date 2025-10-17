# backend/services/benchmarking_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
import schemas
from .data_analysis_service import DataAnalysisService
from datetime import date
from typing import List, Optional

class BenchmarkingService:
    def __init__(self, db: Session):
        self.db = db
        self.data_analysis_service = DataAnalysisService(db)

    def generate_benchmark_report(self, company: models.Company) -> schemas.BenchmarkReport:
        # Bu fonksiyon şimdilik sadece konsepti göstermek için temel bir iskelet sunar.
        # Gerçek bir implementasyonda, diğer şirketlerin verilerini anonim olarak sorgulamak,
        # sektör ve bölgeye göre filtrelemek ve ortalamaları hesaplamak gerekir.
        # Bu, daha karmaşık ve optimize edilmiş sorgular gerektirecektir.

        your_metrics = self._calculate_metrics_for_company(company)
        
        # Örnek olarak, endüstri ve bölge ortalamalarını sabit değerler olarak varsayalım.
        # Gerçekte bu değerler de veritabanından hesaplanmalıdır.
        industry_avg_kwh_per_m2 = 150.0 
        regional_avg_kwh_per_m2 = 160.0

        metrics = []
        
        your_kwh_per_m2 = your_metrics.get("kwh_per_m2_annual")
        metrics.append(schemas.BenchmarkMetric(
            metric_name="kwh_per_m2_annual",
            your_value=your_kwh_per_m2,
            industry_avg=industry_avg_kwh_per_m2,
            regional_avg=regional_avg_kwh_per_m2,
            unit="kWh/m²/yıl",
            description="Metrekare Başına Yıllık Elektrik Tüketimi"
        ))
        
        message = "Karşılaştırma raporu, sektör ve bölge ortalamalarına göre performansınızı gösterir."
        if your_kwh_per_m2 and your_kwh_per_m2 > industry_avg_kwh_per_m2:
            message += f" Yıllık metrekare başına elektrik tüketiminiz, sektör ortalamasının üzerinde."


        return schemas.BenchmarkReport(
            company_id=company.id,
            company_name=company.name,
            report_date=date.today(),
            metrics=metrics,
            message=message
        )

    def _calculate_metrics_for_company(self, company: models.Company) -> dict:
        total_kwh = 0
        total_area = 0
        
        for facility in company.facilities:
            if facility.surface_area_m2 and facility.surface_area_m2 > 0:
                _, avg_monthly_kwh = self.data_analysis_service.get_monthly_activity_data_summary(
                    facility_id=facility.id,
                    activity_type=models.ActivityType.electricity
                )
                total_kwh += avg_monthly_kwh * 12
                total_area += facility.surface_area_m2
        
        kwh_per_m2_annual = total_kwh / total_area if total_area > 0 else 0
        
        return {
            "kwh_per_m2_annual": kwh_per_m2_annual
        }
