### backend/services/__init__.py
"""
Services package for KarbonUyum.

Contains pluggable service implementations including calculation providers,
benchmarking, data analysis, and more.
"""

import os
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import Depends

from .calculation_interface import ICalculationService
from .climatiq_service import ClimatiqService
from .calculation_service_DEPRECATED import CalculationService
from database import get_db

logger = logging.getLogger(__name__)


def get_calculation_service(
    db: Session = Depends(get_db), 
    year: int = None
) -> ICalculationService:
    """
    Dependency injection factory for calculation service provider.
    
    Selects the appropriate calculation provider based on environment configuration.
    Defaults to Climatiq API for accuracy and regulatory compliance.
    Falls back to internal calculation service if configured.
    
    Args:
        db: Database session
        year: Year for calculation (defaults to current year)
        
    Returns:
        ICalculationService: The configured calculation provider
        
    Raises:
        ValueError: If configured provider is unknown
    """
    provider = os.getenv("CALCULATION_PROVIDER", "climatiq").lower()
    
    if year is None:
        year = datetime.now().year
    
    if provider == "climatiq":
        logger.debug(f"Using Climatiq calculation provider for year {year}")
        return ClimatiqService(year=year)
    
    elif provider == "fallback" or provider == "internal":
        logger.debug(f"Using internal fallback calculation provider for year {year}")
        return CalculationService(db=db, year=year)
    
    else:
        error_msg = f"Unknown calculation provider: {provider}. Valid options: 'climatiq', 'fallback'"
        logger.error(error_msg)
        raise ValueError(error_msg)


__all__ = [
    "ICalculationService",
    "ClimatiqService",
    "CalculationService",
    "get_calculation_service",
]
