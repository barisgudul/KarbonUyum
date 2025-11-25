### backend/suggestion_strategies/insulation_strategy.py
from typing import List, Union

import models
import schemas
from services.data_analysis_service import DataAnalysisService
from suggestion_strategies.base import BaseSuggestionStrategy


class InsulationStrategy(BaseSuggestionStrategy):
    def is_applicable(self) -> bool:
        # Yalıtım ofisler için ve doğal gaz maliyeti girilmişse anlamlıdır
        has_office = any(f.facility_type == models.FacilityType.office and f.surface_area_m2 is not None for f in self.company.facilities)
        has_financials = self.company.financials and self.company.financials.avg_gas_cost_m3
        return has_office and has_financials

    def generate(self) -> List[Union[schemas.InsulationSuggestion, schemas.InfoSuggestion]]:
        all_suggestions = []
        # Uygun olan her bir ofis tesisi için ayrı bir döngü başlat
        office_facilities = [f for f in self.company.facilities if f.facility_type == models.FacilityType.office and f.surface_area_m2]
        params = self.params
        data_service = DataAnalysisService(self.db)

        for facility in office_facilities:
            months_with_gas_data, _ = data_service.get_monthly_activity_data_summary(
                facility_id=facility.id,
                activity_type=models.ActivityType.natural_gas,
                months_ago=12
            )

            if months_with_gas_data < 6:
                info = schemas.InfoSuggestion(
                    description=f"'{facility.name}' tesisi için Yalıtım analizi yapılamadı. Güvenilir bir tahmin için en az 6 aylık doğal gaz tüketim verisi gereklidir. Mevcut veri: {months_with_gas_data} ay.",
                    reason_code="insufficient_data",
                    required_months=6
                )
                all_suggestions.append(info)
                continue

            area = facility.surface_area_m2
            
            # Şehir için ısıtma faktörü al, bulunamazsa varsayılan 1.0 kullan
            city_key = f"city_heating_factor_{facility.city.lower()}" if facility.city else "city_heating_factor_default"
            city_heating_factor = params.get(city_key, params.get("city_heating_factor_default", 1.0))

            savings_per_m2_base = params.get('insulation_gas_savings_per_m2_annual', 8.0)
            # Tasarrufu şehir ısıtma faktörü ile ayarla
            adjusted_savings_per_m2 = savings_per_m2_base * city_heating_factor

            cost_per_m2 = params.get('insulation_avg_cost_per_m2', 1500.0)
            
            estimated_investment = area * cost_per_m2
            annual_gas_savings = area * adjusted_savings_per_m2
            annual_tl_savings = annual_gas_savings * self.company.financials.avg_gas_cost_m3
            
            roi_years = estimated_investment / annual_tl_savings if annual_tl_savings > 0 else float('inf')

            if roi_years <= params.get('insulation_max_roi_years', 12):
                city_name = facility.city if facility.city else "bölgeniz"
                
                # Isıtma faktörüne göre açıklama ekle
                if city_heating_factor > 1.2:
                    climate_note = f"{city_name}, soğuk iklime sahip olduğundan, yalıtım yatırımı özellikle yüksek tasarruf sağlayacaktır."
                elif city_heating_factor > 1.0:
                    climate_note = f"{city_name}, soğuk kış aylarına sahip olduğundan, yalıtım yatırımı iyi bir tasarruf sağlayacaktır."
                elif city_heating_factor < 0.8:
                    climate_note = f"{city_name}, ılıman iklime sahip olduğundan, yalıtım tasarrufu daha sınırlı olabilir."
                else:
                    climate_note = f"{city_name} için iklim koşulları dikkate alınarak hesaplanmıştır."
                
                description_text = (
                    f"'{facility.name}' adlı {area:,.0f} m²'lik ofisinizde yapılacak bir yalıtım yatırımı ile "
                    f"yıllık doğal gaz tüketiminizde yaklaşık {annual_gas_savings:,.0f} m³ tasarruf sağlayabilirsiniz. "
                    f"Bu, mevcut maliyetlerle yılda yaklaşık {annual_tl_savings:,.2f} TL tasarruf anlamına gelmektedir. "
                    f"{climate_note} (Bölgesel ısıtma faktörü: {city_heating_factor:.2f}x)"
                )
                details = schemas.InsulationSuggestionDetails(
                    facility_surface_area_m2=area,
                    avg_gas_cost_m3=self.company.financials.avg_gas_cost_m3,
                    city_heating_factor=city_heating_factor,
                    insulation_avg_cost_per_m2=cost_per_m2,
                    insulation_gas_savings_per_m2_annual_base=savings_per_m2_base
                )
                suggestion = schemas.InsulationSuggestion(
                    description=description_text,
                    estimated_annual_gas_savings_m3=annual_gas_savings,
                    estimated_investment_tl=estimated_investment,
                    roi_years=roi_years,
                    calculation_details=details
                )
                all_suggestions.append(suggestion)
        
        return all_suggestions
