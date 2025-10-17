### backend/suggestion_strategies/ges_strategy.py
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
import schemas
from datetime import date, timedelta
from typing import List, Union
from .base import BaseSuggestionStrategy
from backend.services.data_analysis_service import DataAnalysisService

class GESSuggestionStrategy(BaseSuggestionStrategy):
    def is_applicable(self) -> bool:
        # GES önerisi sadece üretim ve depo tesisleri için anlamlıdır.
        has_relevant_facility = any(
            f.facility_type in [models.FacilityType.production, models.FacilityType.warehouse]
            for f in self.company.facilities
        )
        has_financials = self.company.financials and self.company.financials.avg_electricity_cost_kwh
        return has_relevant_facility and has_financials

    def generate(self) -> List[Union[schemas.GESSuggestion, schemas.InfoSuggestion]]:
        all_suggestions = []
        financials = self.company.financials
        ges_config = self.params
        data_service = DataAnalysisService(self.db)

        # İlgili tesisleri döngüye al
        relevant_facilities = [
            f for f in self.company.facilities 
            if f.facility_type in [models.FacilityType.production, models.FacilityType.warehouse]
        ]

        for facility in relevant_facilities:
            months_with_data, avg_monthly_kwh = data_service.get_monthly_activity_data_summary(
                facility_id=facility.id,
                activity_type=models.ActivityType.electricity
            )

            if months_with_data < 9:
                info = schemas.InfoSuggestion(
                    description=f"'{facility.name}' tesisi için GES analizi yapılamadı. Güvenilir bir tahmin için en az 9 aylık elektrik tüketim verisi gereklidir. Mevcut veri: {months_with_data} ay.",
                    reason_code="insufficient_data"
                )
                all_suggestions.append(info)
                continue # Bu tesis için yeterli veri yok, sonrakine geç

            annual_electricity_kwh_estimated = avg_monthly_kwh * 12

            if annual_electricity_kwh_estimated < 10000:
                info = schemas.InfoSuggestion(
                    description=f"'{facility.name}' tesisi için mevcut elektrik tüketimi (~{annual_electricity_kwh_estimated:,.0f} kWh/yıl), GES yatırımı için finansal olarak verimli bir seviyede görünmüyor.",
                    reason_code="low_consumption"
                )
                all_suggestions.append(info)
                continue # Bu tesis için tüketim düşük, sonrakine geç

            # ROI hesaplamaları (tesis bazında)
            required_kwp = (annual_electricity_kwh_estimated * ges_config.get("ges_annual_savings_factor", 0.9)) / ges_config.get("ges_kwh_generation_per_kwp_annual", 1350)
            estimated_ges_cost = required_kwp * ges_config.get("ges_estimated_cost_per_kwp", 25000.0)
            annual_cost_before = annual_electricity_kwh_estimated * financials.avg_electricity_cost_kwh
            annual_savings = annual_cost_before * ges_config.get("ges_annual_savings_factor", 0.9)
            roi_years = estimated_ges_cost / annual_savings if annual_savings > 0 else float('inf')

            if roi_years <= ges_config.get("ges_max_roi_years", 10):
                savings_percentage = ges_config.get('ges_annual_savings_factor', 0.9) * 100
                description_text = (
                    f"'{facility.name}' adlı tesisiniz için tahmin edilen yıllık ~{annual_electricity_kwh_estimated:,.0f} kWh elektrik tüketiminize uygun, "
                    f"yaklaşık {required_kwp:.1f} kWp gücünde bir GES yatırımı ile maliyetlerinizi ~%{savings_percentage:.0f} oranında düşürebilirsiniz."
                )
                
                details = schemas.GESSuggestionDetails(
                    annual_electricity_kwh_estimated=annual_electricity_kwh_estimated,
                    avg_electricity_cost_kwh=financials.avg_electricity_cost_kwh,
                    ges_estimated_cost_per_kwp=ges_config.get("ges_estimated_cost_per_kwp", 25000.0),
                    ges_kwh_generation_per_kwp_annual=ges_config.get("ges_kwh_generation_per_kwp_annual", 1350)
                )

                suggestion_object = schemas.GESSuggestion(
                    description=description_text,
                    estimated_annual_savings_tl=annual_savings,
                    estimated_investment_tl=estimated_ges_cost,
                    roi_years=roi_years,
                    required_kwp=required_kwp,
                    calculation_details=details
                )
                all_suggestions.append(suggestion_object)
        
        return all_suggestions
