# backend/climatiq_config.py
"""
Climatiq API entegrasyonu için yapılandırma sabitleri.

Bu dosya, activity_id'ler, data_version'lar ve diğer API-specific
sabitleri merkezi bir konumda tutar. 12-Factor App metodolojisine
uygun olarak, kod mantığını yapılandırmadan ayırır.

Referans:
- Climatiq Data Explorer: https://www.climatiq.io/explorer
- API Dokümantasyonu: https://www.climatiq.io/docs/api-reference/estimate
"""

from typing import Dict
from dataclasses import dataclass


@dataclass
class ClimatiqActivityConfig:
    """
    Bir aktivite tipi için Climatiq API yapılandırması.
    """
    activity_id: str
    data_version: str
    parameter_type: str  # "energy" veya "volume"
    description: str


# Türkiye için doğrulanmış Climatiq aktivite yapılandırmaları
# NOT: Bu ID'ler Climatiq Data Explorer kullanılarak doğrulanmalıdır
CLIMATIQ_ACTIVITIES: Dict[str, ClimatiqActivityConfig] = {
    "electricity": ClimatiqActivityConfig(
        activity_id="electricity-supply_grid-source_supplier_mix",
        data_version="^26",
        parameter_type="energy",
        description="Türkiye elektrik şebekesi karışımı (tedarikçi karışımı)"
    ),
    "natural_gas": ClimatiqActivityConfig(
        activity_id="fuel-type_natural_gas-fuel_use_stationary",
        data_version="^1",
        parameter_type="volume",
        description="Doğalgaz sabit yanma"
    ),
    "diesel_fuel": ClimatiqActivityConfig(
        activity_id="fuel-type_diesel_oil-fuel_use_stationary_combustion",
        data_version="^14",
        parameter_type="volume",
        description="Dizel yakıt sabit yanma"
    ),
}

# Varsayılan bölge kodu
DEFAULT_REGION = "TR"

# API Endpoint
CLIMATIQ_API_BASE_URL = "https://api.climatiq.io/data/v1/estimate"

# Timeout ayarları (saniye)
CLIMATIQ_REQUEST_TIMEOUT = 10.0

# Geçerli enerji birimleri (Climatiq tarafından desteklenen)
VALID_ENERGY_UNITS = ["kWh", "MWh", "GJ", "Wh"]

# Geçerli hacim birimleri (Climatiq tarafından desteklenen)
VALID_VOLUME_UNITS = ["l", "m3", "gal", "bbl"]


def get_activity_config(activity_type: str) -> ClimatiqActivityConfig:
    """
    Aktivite tipi için yapılandırma döndürür.
    
    Args:
        activity_type: models.ActivityType enum değeri (str)
        
    Returns:
        ClimatiqActivityConfig: İlgili yapılandırma
        
    Raises:
        KeyError: Desteklenmeyen aktivite tipi için
    """
    if activity_type not in CLIMATIQ_ACTIVITIES:
        raise KeyError(
            f"Aktivite tipi '{activity_type}' için Climatiq yapılandırması bulunamadı. "
            f"Desteklenen tipler: {list(CLIMATIQ_ACTIVITIES.keys())}"
        )
    return CLIMATIQ_ACTIVITIES[activity_type]

