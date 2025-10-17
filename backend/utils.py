# backend/utils.py

# Farklı birimlerin standart birime (enerji için kWh, hacim için m3) dönüşüm oranları
UNIT_CONVERSION_RATES = {
    "energy": {
        "kWh": 1.0,
        "MWh": 1000.0,
        "GJ": 277.778,
    },
    "volume": {
        "m3": 1.0,
        "l": 0.001,
        "litre": 0.001,
    }
}

# Aktivite tiplerinin hangi kategoriye girdiğini belirten harita
ACTIVITY_CATEGORY_MAP = {
    "electricity": "energy",
    "natural_gas": "volume",
    "diesel_fuel": "volume",
}

def convert_to_standard_unit(quantity: float, unit: str, activity_type: str) -> tuple[float, str]:
    """
    Verilen miktarı ve birimi, aktivite tipine göre standart birime çevirir.
    Örn: 10 MWh elektriği, (10000.0, "kWh") olarak döndürür.

    Returns:
        A tuple containing the converted quantity and the standard unit.
    """
    category = ACTIVITY_CATEGORY_MAP.get(activity_type)
    if not category:
        raise ValueError(f"Unsupported activity type: {activity_type}")

    standard_unit = "kWh" if category == "energy" else "m3"
    
    conversion_map = UNIT_CONVERSION_RATES.get(category)
    if unit in conversion_map:
        conversion_factor = conversion_map[unit]
        converted_quantity = quantity * conversion_factor
        return converted_quantity, standard_unit
    else:
        # Eğer birim desteklenmiyorsa, hata fırlat
        raise ValueError(f"Unsupported unit '{unit}' for category '{category}'")