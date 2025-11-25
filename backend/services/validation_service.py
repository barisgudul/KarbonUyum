# backend/services/validation_service.py
"""
This module contains the validation service for the backend.
"""
from datetime import date
from typing import Optional, Type, TypeVar

from pydantic import BaseModel, Field, ValidationError, field_validator


class ValidationIssue(BaseModel):
    code: str
    field: str
    message: str
    severity: str = Field(default="error")


class EmissionRow(BaseModel):
    activity_id: str
    quantity: float
    unit: str
    start_date: date
    end_date: date

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Miktar pozitif olmalıdır")
        return v

    @field_validator("end_date")
    @classmethod
    def dates_valid(cls, v: date, info):
        if "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("Bitiş tarihi başlangıç tarihinden önce olamaz")
        if v > date.today():
            raise ValueError("Gelecek tarihli veri girilemez")
        return v


class ManualActivityInput(EmissionRow):
    cost_tl: Optional[float] = None


class OCRActivityInput(EmissionRow):
    extracted_text: Optional[str] = None


class SupplierProductInput(BaseModel):
    product_name: str
    product_category: str
    unit: str
    co2e_per_unit_kg: float

    @field_validator("co2e_per_unit_kg")
    @classmethod
    def co2e_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("co2e_per_unit_kg pozitif olmalıdır")
        return v


class Scope3PurchaseInput(BaseModel):
    product_footprint_id: int
    quantity_purchased: float
    purchase_date: date

    @field_validator("quantity_purchased")
    @classmethod
    def qty_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("quantity_purchased pozitif olmalıdır")
        return v


T = TypeVar("T", bound=BaseModel)


def validate_data(raw: dict, model: Type[T]) -> T:
    try:
        return model(**raw)
    except ValidationError as ve:
        first = ve.errors()[0]
        field = ".".join(str(p) for p in first.get("loc", [])) or "__root__"
        msg = first.get("msg", "Validation error")
        raise ValueError(f"{field}: {msg}")


