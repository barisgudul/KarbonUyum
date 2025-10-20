# backend/services/climatiq_service.py
"""
Climatiq API entegrasyonu için servis.
Bu servis, emisyon faktörlerini ve hesaplamaları Climatiq'ten alır.
Yasal uyumluluk ve güncel faktörler için harici API kullanır.
"""

import logging
import os
from typing import Optional
import httpx
from datetime import date

import models
import schemas
from .calculation_interface import ICalculationService

logger = logging.getLogger(__name__)

# Climatiq API Yapılandırması
CLIMATIQ_API_KEY = os.getenv("CLIMATIQ_API_KEY")
CLIMATIQ_API_BASE_URL = "https://api.climatiq.io/data/v1"


class ClimatiqService(ICalculationService):
    """
    Climatiq API ile emisyon hesaplamaları yapan servis.
    
    Bu servis, güvenilir ve uluslararası standartlara uygun
    emisyon faktörleri sağlar.
    
    Implements ICalculationService interface for pluggable provider architecture.
    """
    
    def __init__(self, year: int = None):
        """
        Args:
            year: Hesaplama için kullanılacak yıl. None ise mevcut yıl.
        """
        self.year = year if year is not None else date.today().year
        self.api_calls_count = 0
        self.api_failures_count = 0
        
        if not CLIMATIQ_API_KEY:
            logger.warning(
                "CLIMATIQ_API_KEY environment variable is not set. "
                "Service will fail on API calls."
            )
    
    def get_provider_name(self) -> str:
        """Get the name of this provider."""
        return "climatiq"
    
    def health_check(self) -> bool:
        """
        Check if Climatiq API is available.
        
        Returns True if API key is configured, False otherwise.
        Note: This does not make an actual API call to avoid costs.
        """
        return bool(CLIMATIQ_API_KEY)
    
    def _get_scope(self, activity_type: models.ActivityType) -> models.ScopeType:
        """
        Aktivite tipine göre GHG Protokolü Scope belirler.
        """
        if activity_type == models.ActivityType.electricity:
            return models.ScopeType.scope_2
        elif activity_type in [models.ActivityType.natural_gas, models.ActivityType.diesel_fuel]:
            return models.ScopeType.scope_1
        else:
            logger.warning(f"Bilinmeyen aktivite tipi: {activity_type}. Scope 1 varsayıldı.")
            return models.ScopeType.scope_1
    
    def _map_activity_to_climatiq_id(self, activity_type: models.ActivityType) -> str:
        """
        ActivityType'ı Climatiq'in beklediği activity_id'ye map eder.
        
        Climatiq activity_id formatı: "category-subcategory-region"
        Örnek: "electricity-supply_grid-tr"
        """
        activity_mapping = {
            models.ActivityType.electricity: "electricity-supply_grid",
            models.ActivityType.natural_gas: "gas-natural_gas_combustion",
            models.ActivityType.diesel_fuel: "fuel-diesel_combustion"
        }
        
        return activity_mapping.get(activity_type, "unknown")
    
    def _map_unit_to_climatiq(self, unit: str, activity_type: models.ActivityType) -> str:
        """
        Kullanıcı birimini Climatiq'in beklediği birime çevirir.
        """
        unit_lower = unit.lower()
        
        # Elektrik birimleri
        if activity_type == models.ActivityType.electricity:
            unit_mapping = {
                'kwh': 'kWh',
                'mwh': 'MWh',
                'gj': 'GJ'
            }
            return unit_mapping.get(unit_lower, 'kWh')
        
        # Doğalgaz birimleri
        elif activity_type == models.ActivityType.natural_gas:
            unit_mapping = {
                'm3': 'm3',
                'l': 'l',
                'litre': 'l'
            }
            return unit_mapping.get(unit_lower, 'm3')
        
        # Dizel yakıt birimleri
        elif activity_type == models.ActivityType.diesel_fuel:
            unit_mapping = {
                'l': 'l',
                'litre': 'l',
                'm3': 'm3'
            }
            return unit_mapping.get(unit_lower, 'l')
        
        return unit
    
    def calculate_for_activity(
        self, 
        activity_data: schemas.ActivityDataBase
    ) -> schemas.EmissionCalculationResult:
        """
        Climatiq API kullanarak aktivite için emisyon hesaplar.
        
        Args:
            activity_data: Hesaplanacak aktivite verisi
            
        Returns:
            EmissionCalculationResult: Detaylı hesaplama sonucu
            
        Raises:
            HTTPError: API iletişim hatası
            ValueError: Geçersiz veri
        """
        scope = self._get_scope(activity_data.activity_type)
        activity_id = self._map_activity_to_climatiq_id(activity_data.activity_type)
        climatiq_unit = self._map_unit_to_climatiq(
            activity_data.unit, 
            activity_data.activity_type
        )
        
        # Climatiq API endpoint'i
        url = f"{CLIMATIQ_API_BASE_URL}/estimate"
        
        # API isteği için payload
        payload = {
            "emission_factor": {
                "activity_id": f"{activity_id}-tr",  # Türkiye için
                "region": "TR",
                "year": str(self.year)
            },
            "parameters": {
                "energy": activity_data.quantity,
                "energy_unit": climatiq_unit
            }
        }
        
        headers = {
            "Authorization": f"Bearer {CLIMATIQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()
            
            self.api_calls_count += 1
            data = response.json()
            
            # Climatiq'ten gelen CO2e değeri (kg cinsinden)
            total_co2e_kg = data.get("co2e", 0.0)
            
            # Kullanılan emisyon faktörü bilgisi
            emission_factor_info = data.get("emission_factor", {})
            emission_factor_used = emission_factor_info.get("id", "unknown")
            emission_factor_value = emission_factor_info.get("factor", 0.0)
            
            logger.info(
                f"Climatiq API call successful. Activity: {activity_data.activity_type}, "
                f"Result: {total_co2e_kg:.2f} kg CO2e. Total calls: {self.api_calls_count}"
            )
            
            return schemas.EmissionCalculationResult(
                total_co2e_kg=total_co2e_kg,
                scope=scope,
                emission_factor_used=emission_factor_used,
                emission_factor_value=emission_factor_value,
                calculation_year=self.year,
                is_fallback=False  # Başarılı API çağrısı
            )
            
        except httpx.HTTPStatusError as e:
            self.api_failures_count += 1
            error_detail = e.response.text
            logger.error(
                f"Climatiq API error (status {e.response.status_code}): {error_detail}. "
                f"Failures so far: {self.api_failures_count}"
            )
            
            # API hatası durumunda fallback: basit hesaplama
            logger.warning("Falling back to simplified calculation")
            return self._fallback_calculation(activity_data, scope)
            
        except httpx.RequestError as e:
            self.api_failures_count += 1
            logger.error(f"Climatiq API request error: {str(e)}. Failures so far: {self.api_failures_count}")
            return self._fallback_calculation(activity_data, scope)
        
        except Exception as e:
            self.api_failures_count += 1
            logger.error(f"Unexpected error in Climatiq service: {str(e)}", exc_info=True)
            return self._fallback_calculation(activity_data, scope)
    
    def _fallback_calculation(
        self, 
        activity_data: schemas.ActivityDataBase,
        scope: models.ScopeType
    ) -> schemas.EmissionCalculationResult:
        """
        API erişilemediğinde basit fallback hesaplama.
        Varsayılan faktörler kullanır (DEFRA 2023 verileri).
        """
        # Basit fallback faktörleri (kg CO2e per unit)
        fallback_factors = {
            models.ActivityType.electricity: 0.475,  # kg CO2e/kWh (Türkiye şebeke ortalaması)
            models.ActivityType.natural_gas: 2.016,  # kg CO2e/m3
            models.ActivityType.diesel_fuel: 2.687   # kg CO2e/litre
        }
        
        factor = fallback_factors.get(activity_data.activity_type, 0.0)
        total_co2e_kg = activity_data.quantity * factor
        
        logger.warning(
            f"Using fallback factor {factor} for {activity_data.activity_type}. "
            "This may not reflect current standards."
        )
        
        return schemas.EmissionCalculationResult(
            total_co2e_kg=total_co2e_kg,
            scope=scope,
            emission_factor_used="fallback_defra_2023",
            emission_factor_value=factor,
            calculation_year=self.year,
            is_fallback=True  # ⚠️ API erişilemedi, tahmini hesaplama
        )
    
    def calculate_co2e(self, activity_data: schemas.ActivityDataBase) -> float:
        """
        Basit CO2e hesaplama (geriye dönük uyumluluk için).
        """
        result = self.calculate_for_activity(activity_data)
        return result.total_co2e_kg


def get_climatiq_service(year: int = None) -> ClimatiqService:
    """Dependency injection için yardımcı fonksiyon."""
    return ClimatiqService(year)

