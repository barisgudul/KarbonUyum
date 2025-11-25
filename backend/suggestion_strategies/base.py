### backend/suggestion_strategies/base.py
from abc import ABC, abstractmethod
from typing import List, Union

from sqlalchemy.orm import Session

import models
import schemas


class BaseSuggestionStrategy(ABC):
    def __init__(self, company: models.Company, db: Session, params: dict):
        self.company = company
        self.db = db
        self.params = params

    @abstractmethod
    def is_applicable(self) -> bool:
        """Bu stratejinin bu şirket için uygulanabilir olup olmadığını kontrol eder."""
        pass

    @abstractmethod
    def generate(self) -> List[Union[schemas.SuggestionBase]]:
        """Uygulanabilirse öneri nesnesini/nesnelerini üretir."""
        pass
