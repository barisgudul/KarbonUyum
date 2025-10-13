# backend/schemas.py

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from models import ActivityType

# -- ActivityData Schemas (En alttaki yapı, önce bu tanımlanmalı) --
class ActivityDataBase(BaseModel):
    activity_type: ActivityType
    quantity: float
    unit: str
    start_date: date
    end_date: date

class ActivityDataCreate(ActivityDataBase):
    pass

class ActivityData(ActivityDataBase):
    id: int
    facility_id: int
    calculated_co2e_kg: Optional[float] = None

    class Config:
        from_attributes = True


# -- Facility Schemas (ActivityData'yı kullanır, ikinci bu olmalı) --
class FacilityBase(BaseModel):
    name: str
    city: Optional[str] = None
    address: Optional[str] = None

class FacilityCreate(FacilityBase):
    pass

class Facility(FacilityBase):
    id: int
    company_id: int
    activity_data: List[ActivityData] = []

    class Config:
        from_attributes = True


# -- Company Schemas (Facility'yi kullanır, üçüncü bu olmalı) --
class CompanyBase(BaseModel):
    name: str
    tax_number: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    id: int
    owner_id: int
    facilities: List[Facility] = []

    class Config:
        from_attributes = True


# -- User Schemas (Company'yi kullanır, dördüncü bu olmalı) --
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72)

class User(UserBase):
    id: int
    is_active: bool
    companies: List[Company] = []

    class Config:
        from_attributes = True


# -- Token Schemas (Bağımsızdır, sonda olabilir) --
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[EmailStr] = None

class MonthlyEmission(BaseModel):
    month: str  # Örn: "2024-04"
    total_co2e_kg: float

class DashboardSummary(BaseModel):
    current_month_total: float
    previous_month_total: float
    monthly_trend: List[MonthlyEmission]