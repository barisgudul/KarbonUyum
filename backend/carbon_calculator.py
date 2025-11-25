# backend/carbon_calculator.py
# DEPRECATED: Bu modül geriye dönük uyumluluk için korunmuştur.
# Yeni kodlarda services.calculation_service.CalculationService kullanılmalıdır.

import logging

from fastapi import Depends
from sqlalchemy.orm import Session

import schemas
from database import get_db
from services.calculation_service_DEPRECATED import CalculationService

logger = logging.getLogger(__name__)

class CarbonCalculator:
    """
    DEPRECATED: Geriye dönük uyumluluk için korunmuştur.
    Yeni implementasyonlarda services.calculation_service.CalculationService kullanın.
    
    Bu sınıf artık CalculationService'e bir proxy görevi görmektedir.
    """
    
    def __init__(self, db: Session):
        logger.warning(
            "CarbonCalculator kullanımı deprecated durumda. "
            "Lütfen services.calculation_service.CalculationService kullanın."
        )
        self.calculation_service = CalculationService(db)

    def calculate_co2e(self, activity_data: schemas.ActivityDataBase) -> float:
        """
        Verilen aktivite verisi için toplam karbondioksit eşdeğeri (CO2e) emisyonunu kg cinsinden hesaplar.
        
        DEPRECATED: Geriye dönük uyumluluk için korunmuştur.
        """
        return self.calculation_service.calculate_co2e(activity_data)


# FastAPI'nin dependency injection sistemini kullanarak
# her istekte güncel veritabanı session'ı ile bir calculator örneği oluşturun.
def get_calculator(db: Session = Depends(get_db)) -> CarbonCalculator:
    """
    DEPRECATED: Geriye dönük uyumluluk için korunmuştur.
    Yeni kodlarda get_calculation_service kullanın.
    """
    return CarbonCalculator(db)