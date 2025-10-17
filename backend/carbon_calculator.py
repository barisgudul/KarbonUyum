# backend/carbon_calculator.py
import logging
import crud
from sqlalchemy.orm import Session
import schemas
from database import get_db # get_db'yi import et
from fastapi import Depends

logger = logging.getLogger(__name__)

class CarbonCalculator:
    def __init__(self, db: Session):
        self.emission_factors = crud.get_all_emission_factors(db)

    def calculate_co2e(self, activity_data: schemas.ActivityDataBase) -> float:
        """
        Verilen aktivite verisi için toplam karbondioksit eşdeğeri (CO2e) emisyonunu kg cinsinden hesaplar.
        """
        factor_key = None
        if activity_data.activity_type == schemas.ActivityType.electricity:
            factor_key = 'electricity_grid_TUR'
        elif activity_data.activity_type == schemas.ActivityType.natural_gas:
            factor_key = 'natural_gas_TUR'
        elif activity_data.activity_type == schemas.ActivityType.diesel_fuel:
            factor_key = 'diesel_fuel_TUR'

        if factor_key and factor_key in self.emission_factors:
            emission_factor = self.emission_factors[factor_key]
            return activity_data.quantity * emission_factor.value
        else:
            logger.warning(f"Emisyon faktörü '{factor_key}' bulunamadı veya bilinmeyen aktivite tipi '{activity_data.activity_type}'. 0.0 döndürüldü.")
            return 0.0

# FastAPI'nin dependency injection sistemini kullanarak
# her istekte güncel veritabanı session'ı ile bir calculator örneği oluşturun.
def get_calculator(db: Session = Depends(get_db)) -> CarbonCalculator:
    return CarbonCalculator(db)

# Global bir calculator örneği oluşturmak yerine, bu fonksiyonu kullanacağız.
# calculator = CarbonCalculator() # Bu satırı silin veya yorum satırı yapın