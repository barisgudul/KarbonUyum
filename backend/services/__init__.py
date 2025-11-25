### backend/services/__init__.py
"""
Services package for KarbonUyum.

Contains pluggable service implementations including calculation providers,
benchmarking, data analysis, and more.
"""

import logging
import os
from datetime import datetime

from fastapi import Depends
from sqlalchemy.orm import Session

from database import get_db

from .calculation_interface import ICalculationService
from .calculation_service_DEPRECATED import CalculationService as InternalFallbackService
from .climatiq_service import ClimatiqService

logger = logging.getLogger(__name__)

# Ortam değişkenine göre hangi servisin birincil olduğunu belirle
# Bu, gelecekte kolayca servisler arası geçiş yapmanızı sağlar.
PRIMARY_PROVIDER = os.getenv("PRIMARY_CALCULATION_PROVIDER", "climatiq")


def get_calculation_service(
    db: Session = None, 
    year: int = None
) -> ICalculationService:
    """
    Dependency injection için ana servis sağlayıcı fonksiyonu.

    Yapılandırmaya göre birincil hesaplama servisini (Climatiq) dener.
    Başarısız olursa veya yapılandırılmamışsa, dahili yedek servise (fallback) geçer.
    
    Args:
        db: Database session (optional, only needed for fallback provider)
        year: Year for calculation (defaults to current year)
        
    Returns:
        ICalculationService: The configured calculation provider
    """
    if year is None:
        year = datetime.now().year
    
    if PRIMARY_PROVIDER == "climatiq":
        climatiq_service = ClimatiqService(year=year)
        # Climatiq API anahtarı ayarlanmışsa bu servisi kullan
        if climatiq_service.health_check():
            logger.debug(f"Using Climatiq calculation provider for year {year}")
            return climatiq_service
        else:
            logger.warning("Climatiq API anahtarı yapılandırılmamış. Dahili fallback servise geçiliyor.")
    
    # Climatiq kullanılamıyorsa veya başka bir provider ayarlanmışsa,
    # dahili yedek servisi kullan.
    if db is None:
        raise ValueError("Database session gereklidir fallback calculation provider için")
    
    logger.debug(f"Using internal fallback calculation provider for year {year}")
    return InternalFallbackService(db, year=year)


__all__ = [
    "ICalculationService",
    "ClimatiqService",
    "InternalFallbackService",
    "get_calculation_service",
]
