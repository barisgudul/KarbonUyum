# backend/services/calculation_service.py
import logging
from sqlalchemy.orm import Session
from datetime import date
import models
import schemas
import crud

logger = logging.getLogger(__name__)


class CalculationService:
    """
    GHG Protokolü uyumlu emisyon hesaplama servisi.
    Yıl bazlı emisyon faktörleri kullanır ve Scope bilgisi ile hesaplama yapar.
    """
    
    def __init__(self, db: Session, year: int = None):
        """
        Args:
            db: Veritabanı session'ı
            year: Hesaplama için kullanılacak yıl. None ise mevcut yıl kullanılır.
        """
        self.db = db
        self.year = year if year is not None else date.today().year
        self.emission_factors = self._load_factors()
    
    def _load_factors(self) -> dict[str, models.EmissionFactor]:
        """Belirtilen yıla ait emisyon faktörlerini yükler."""
        return crud.get_emission_factors_by_year(self.db, self.year)
    
    def _get_scope(self, activity_type: models.ActivityType) -> models.ScopeType:
        """
        Aktivite tipine göre GHG Protokolü'ne uygun Scope belirler.
        
        Scope 1: Doğrudan emisyonlar (organizasyonun sahip olduğu veya kontrol ettiği kaynaklar)
        Scope 2: Dolaylı emisyonlar (satın alınan elektrik, ısı, buhar)
        Scope 3: Diğer dolaylı emisyonlar (tedarik zinciri, vb.)
        """
        if activity_type == models.ActivityType.electricity:
            return models.ScopeType.scope_2
        elif activity_type in [models.ActivityType.natural_gas, models.ActivityType.diesel_fuel]:
            return models.ScopeType.scope_1
        else:
            # Varsayılan olarak Scope 1 döndür
            logger.warning(f"Bilinmeyen aktivite tipi: {activity_type}. Scope 1 varsayıldı.")
            return models.ScopeType.scope_1
    
    def _get_factor_key(self, activity_type: models.ActivityType) -> str:
        """Aktivite tipine göre emisyon faktörü anahtarını döndürür."""
        factor_keys = {
            models.ActivityType.electricity: 'electricity_grid_TUR',
            models.ActivityType.natural_gas: 'natural_gas_TUR',
            models.ActivityType.diesel_fuel: 'diesel_fuel_TUR'
        }
        return factor_keys.get(activity_type)
    
    def calculate_for_activity(self, activity_data: schemas.ActivityDataBase) -> schemas.EmissionCalculationResult:
        """
        Verilen aktivite verisi için detaylı emisyon hesaplaması yapar.
        
        Returns:
            EmissionCalculationResult: Hesaplama sonuçları ve metadata
        """
        # Scope belirle
        scope = self._get_scope(activity_data.activity_type)
        
        # Emisyon faktörünü bul
        factor_key = self._get_factor_key(activity_data.activity_type)
        
        if not factor_key or factor_key not in self.emission_factors:
            logger.warning(
                f"Emisyon faktörü '{factor_key}' bulunamadı. "
                f"Aktivite tipi: {activity_data.activity_type}, Yıl: {self.year}"
            )
            # Sıfır emisyon döndür ama hesaplama bilgilerini koru
            return schemas.EmissionCalculationResult(
                total_co2e_kg=0.0,
                scope=scope,
                emission_factor_used=factor_key or "unknown",
                emission_factor_value=0.0,
                calculation_year=self.year
            )
        
        emission_factor = self.emission_factors[factor_key]
        
        # CO2e hesaplama
        total_co2e_kg = activity_data.quantity * emission_factor.value
        
        return schemas.EmissionCalculationResult(
            total_co2e_kg=total_co2e_kg,
            scope=scope,
            emission_factor_used=factor_key,
            emission_factor_value=emission_factor.value,
            calculation_year=self.year
        )
    
    def calculate_co2e(self, activity_data: schemas.ActivityDataBase) -> float:
        """
        Basit CO2e hesaplama (geriye dönük uyumluluk için).
        Sadece toplam CO2e değerini döndürür.
        """
        result = self.calculate_for_activity(activity_data)
        return result.total_co2e_kg


def get_calculation_service(db: Session, year: int = None) -> CalculationService:
    """Dependency injection için yardımcı fonksiyon."""
    return CalculationService(db, year)

