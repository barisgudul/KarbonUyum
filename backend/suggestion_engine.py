# backend/suggestion_engine.py
from typing import List, Union

from sqlalchemy.orm import Session

import crud
import models
import schemas
from suggestion_strategies.ges_strategy import GESSuggestionStrategy

# Gelecekte eklenecek stratejiler buraya import edilecek
from suggestion_strategies.insulation_strategy import InsulationStrategy

# Tüm strateji sınıflarını bir listede topla
ALL_STRATEGIES = [
    GESSuggestionStrategy,
    InsulationStrategy,
]

def generate_suggestions(company: models.Company, db: Session) -> List[Union[schemas.SuggestionBase]]:
    all_suggestions = []
    # Parametreleri başta tek seferde çek
    params = crud.get_all_suggestion_parameters(db)

    # Tüm stratejileri sırayla çalıştır
    for StrategyClass in ALL_STRATEGIES:
        strategy_instance = StrategyClass(company, db, params)
        if strategy_instance.is_applicable():
            suggestions = strategy_instance.generate()
            all_suggestions.extend(suggestions)
    
    return all_suggestions