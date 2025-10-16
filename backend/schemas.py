# backend/schemas.py (Tamamen Güncellenmiş Hali)

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, computed_field

# Rol Enum'ını modellerden import ediyoruz
from models import ActivityType, CompanyMemberRole

# -- User Schemas --
class UserBase(BaseModel):
    email: EmailStr
    class Config:
        from_attributes = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72)

# Üyeleri ve rollerini bir arada göstermek için yeni bir şema
class CompanyMember(UserBase):
    role: CompanyMemberRole

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
    # GÜNCELLEME: Artık üyeleri rolleriyle birlikte göstereceğiz
    members: List[CompanyMember] = []
    facilities: List[Facility] = []
    class Config: from_attributes = True

# -- User Ana Şeması --
class User(UserBase):
    id: int
    is_active: bool
    owned_companies: List[Company] = []
    member_of_companies: List[Company] = []

    @computed_field
    @property
    def companies(self) -> List[Company]:
        all_companies = {c.id: c for c in self.owned_companies}
        for c in self.member_of_companies:
            if c.id not in all_companies:
                all_companies[c.id] = c
        return sorted(list(all_companies.values()), key=lambda c: c.id)
    class Config: from_attributes = True

# -- Token ve Üye Ekleme Şemaları --
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[EmailStr] = None
    
# GÜNCELLEME: Üye ekleme isteği artık rol de içeriyor
class AddMemberRequest(BaseModel):
    email: EmailStr
    role: CompanyMemberRole = CompanyMemberRole.data_entry

# -- Dashboard Analitik Şemaları --
class MonthlyEmission(BaseModel):
    month: str
    total_co2e_kg: float

class DashboardSummary(BaseModel):
    current_month_total: float
    previous_month_total: float
    monthly_trend: List[MonthlyEmission]