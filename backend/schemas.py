# backend/schemas.py 

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, computed_field

from models import ActivityType

# -- User Schemas (Önce UserBase tanımlanmalı) --
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72)

# -- ActivityData Schemas --
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
    class Config: from_attributes = True

# -- Facility Schemas --
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
    class Config: from_attributes = True

# -- Company Schemas --
class CompanyBase(BaseModel):
    name: str
    tax_number: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    id: int
    owner_id: int
    members: List[UserBase] = [] # YENİ: Üyeleri de göstereceğiz
    facilities: List[Facility] = []
    class Config: from_attributes = True

# -- User Şeması (Artık Company'yi kullanabilir) --
class User(UserBase):
    id: int
    is_active: bool
    owned_companies: List[Company] = []
    member_of_companies: List[Company] = []

    # YENİ: Bu 'computed_field', Pydantic'e 'companies' adında yeni bir alan oluşturmasını söyler.
    # Bu alanın değeri, aşağıdaki fonksiyonun sonucudur.
    @computed_field
    @property
    def companies(self) -> List[Company]:
        """Kullanıcının sahip olduğu ve üye olduğu tüm şirketleri birleştirir."""
        all_companies = {c.id: c for c in self.owned_companies}
        for c in self.member_of_companies:
            if c.id not in all_companies:
                all_companies[c.id] = c
        
        # Şirketleri ID'ye göre sıralayarak tutarlı bir liste döndür
        return sorted(list(all_companies.values()), key=lambda c: c.id)

    class Config:
        from_attributes = True

# -- Token ve Üye Ekleme Şemaları --
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[EmailStr] = None
    
# YENİ: Üye ekleme isteği için
class AddMemberRequest(BaseModel):
    email: EmailStr

# -- Dashboard Analitik Şemaları --
class MonthlyEmission(BaseModel):
    month: str
    total_co2e_kg: float

class DashboardSummary(BaseModel):
    current_month_total: float
    previous_month_total: float
    monthly_trend: List[MonthlyEmission]