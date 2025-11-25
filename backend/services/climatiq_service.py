# backend/services/climatiq_service.py

import logging
import os
from datetime import date

import httpx
from fastapi import HTTPException, status

import models
import schemas

from .calculation_interface import ICalculationService

logger = logging.getLogger(__name__)

class ClimatiqService(ICalculationService):
    """
    Climatiq API ile emisyon hesaplamaları yapan servis.
    Bu servis, güvenilir ve uluslararası standartlara uygun emisyon faktörleri sağlar.
    """
    
    API_BASE_URL = "https://api.climatiq.io/data/v1/estimate"

    def __init__(self, year: int = None):
        # Yıl parametresi artık doğrudan kullanılmıyor, ancak arayüz uyumluluğu için tutuluyor.
        self.api_key = os.getenv("CLIMATIQ_API_KEY")
        self.api_calls_count = 0
        self.api_failures_count = 0
        
        if not self.api_key:
            logger.warning(
                "CLIMATIQ_API_KEY environment variable is not set. "
                "Service will fail on API calls."
            )
    
    def get_provider_name(self) -> str:
        return "climatiq"
    
    def health_check(self) -> bool:
        return bool(self.api_key)
    
    def calculate_for_activity(
        self, 
        activity_data: schemas.ActivityDataBase
    ) -> schemas.EmissionCalculationResult:
        if not self.health_check():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                detail="Climatiq hesaplama servisi yapılandırılmamış (API anahtarı eksik)."
            )

        headers = {"Authorization": f"Bearer {self.api_key}"}
        
        emission_factor_payload = {}
        params_payload = {}
        scope = models.ScopeType.scope_1

        activity_type = activity_data.activity_type

        if activity_type == models.ActivityType.electricity:
            scope = models.ScopeType.scope_2
            emission_factor_payload = {
                "activity_id": "electricity-supply_grid-source_supplier_mix",
                "region": "TR",
                # DÜZELTME: 'year' parametresi kaldırıldı. 
                # Bu, Climatiq'in bu bölge için mevcut en güncel veriyi otomatik olarak seçmesini sağlar.
                "data_version": "^26"
            }
            params_payload = {
                "energy": activity_data.quantity, 
                "energy_unit": activity_data.unit
            }

        elif activity_type == models.ActivityType.natural_gas:
            scope = models.ScopeType.scope_1
            emission_factor_payload = {
                "activity_id": "fuel-type_natural_gas-fuel_use_stationary",
                # DÜZELTME: 'year' kaldırıldı.
                "data_version": "^1"
            }
            params_payload = {
                "volume": activity_data.quantity, 
                "volume_unit": activity_data.unit
            }

        elif activity_type == models.ActivityType.diesel_fuel:
            scope = models.ScopeType.scope_1
            emission_factor_payload = {
                "activity_id": "fuel-type_diesel_oil-fuel_use_stationary_combustion",
                # DÜZELTME: 'year' kaldırıldı.
                "data_version": "^14"
            }
            params_payload = {
                "volume": activity_data.quantity, 
                "volume_unit": activity_data.unit
            }
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Aktivite tipi '{activity_type}' için hesaplama desteklenmiyor."
            )

        api_payload = {
            "emission_factor": emission_factor_payload, 
            "parameters": params_payload
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(self.API_BASE_URL, json=api_payload, headers=headers)
                response.raise_for_status()
            
            self.api_calls_count += 1
            data = response.json()
            total_co2e_kg = data.get("co2e")
            
            if total_co2e_kg is None:
                raise ValueError("Climatiq yanıtında 'co2e' değeri bulunamadı.")

            ef_used = data.get("emission_factor", {})
            
            logger.info(
                f"Climatiq API call successful. Activity: {activity_data.activity_type}, "
                f"Result: {total_co2e_kg:.2f} kg CO2e. Total calls: {self.api_calls_count}"
            )
            
            return schemas.EmissionCalculationResult(
                total_co2e_kg=total_co2e_kg,
                scope=scope,
                emission_factor_used=ef_used.get("id", "unknown"),
                emission_factor_value=ef_used.get("factor", 0.0),
                calculation_year=ef_used.get("year", date.today().year), # API'nin kullandığı yılı yanıttan al
                is_fallback=False
            )
            
        except httpx.HTTPStatusError as e:
            self.api_failures_count += 1
            error_detail = e.response.text
            logger.error(
                f"Climatiq API Hatası (status {e.response.status_code}): {error_detail}. "
                f"Gönderilen Payload: {api_payload}. Failures so far: {self.api_failures_count}"
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, 
                detail=f"Hesaplama Sağlayıcısı Hatası: {error_detail}"
            )
            
        except httpx.RequestError as e:
            self.api_failures_count += 1
            logger.error(f"Climatiq API bağlantı hatası: {str(e)}. Failures so far: {self.api_failures_count}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                detail="Hesaplama sağlayıcısına bağlanılamadı."
            )
        
        except Exception as e:
            self.api_failures_count += 1
            logger.error(f"Climatiq servisinde beklenmedik hata: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Hesaplama sırasında beklenmedik bir sunucu hatası oluştu."
            )
    
    def calculate_co2e(self, activity_data: schemas.ActivityDataBase) -> float:
        result = self.calculate_for_activity(activity_data)
        return result.total_co2e_kg


def get_climatiq_service(year: int = None) -> ClimatiqService:
    """Dependency injection için yardımcı fonksiyon."""
    return ClimatiqService(year)
