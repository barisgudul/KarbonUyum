# backend/schemas.py 

from datetime import date
from typing import List, Optional
import enum

from pydantic import BaseModel, EmailStr, Field, computed_field
import models

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

# -- Financials Schemas --
class CompanyFinancialsBase(BaseModel):
    avg_electricity_cost_kwh: Optional[float] = None
    avg_gas_cost_m3: Optional[float] = None

class CompanyFinancialsCreate(CompanyFinancialsBase):
    pass

class CompanyFinancials(CompanyFinancialsBase):
    company_id: int
    class Config:
        from_attributes = True
# -- Company Schemas --
class CompanyBase(BaseModel):
    name: str
    tax_number: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass
class Company(CompanyBase):
    id: int
    owner_id: int
    members: List[CompanyMember] = []
    facilities: List[Facility] = []
    
    # YENİ: financials alanını ekle
    financials: Optional[CompanyFinancials] = None 
    
    class Config:
        from_attributes = True
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

# -- Suggestion Schemas --
class SuggestionBase(BaseModel):
    suggestion_type: str # Örn: "ges_investment"
    short_title: str     # Örn: "Güneş Enerjisi Yatırımı"
    description: str     # Öneri metni
    class Config:
        from_attributes = True

class GESSuggestionDetails(BaseModel):
    annual_electricity_kwh_estimated: float
    avg_electricity_cost_kwh: float
    ges_estimated_cost_per_kwp: float
    ges_kwh_generation_per_kwp_annual: float

class GESSuggestion(SuggestionBase):
    suggestion_type: str = "ges_investment"
    short_title: str = "Güneş Enerjisi Yatırımı"
    estimated_annual_savings_tl: float
    estimated_investment_tl: float
    roi_years: float
    required_kwp: float
    calculation_details: GESSuggestionDetails

class InsulationSuggestionDetails(BaseModel):
    facility_surface_area_m2: float
    avg_gas_cost_m3: float
    city_heating_factor: float
    insulation_avg_cost_per_m2: float
    insulation_gas_savings_per_m2_annual_base: float

class InsulationSuggestion(SuggestionBase):
    suggestion_type: str = "insulation_investment"
    short_title: str = "Bina Yalıtımı Yatırımı"
    estimated_annual_gas_savings_m3: float
    estimated_investment_tl: float
    roi_years: float
    calculation_details: InsulationSuggestionDetails

# "Neden öneri yok?" durumları için yeni bir şema
class InfoSuggestion(SuggestionBase):
    suggestion_type: str = "information"
    short_title: str = "Bilgilendirme"
    reason_code: str # Örn: "insufficient_data", "low_consumption"
    required_months: Optional[int] = None

# Gelecekte eklenecek diğer öneri tipleri için de benzer modeller oluşturulabilir
# class InsulationSuggestion(BaseSuggestionBase): ...

# -- Suggestion Parameter Schemas --
class SuggestionParameterBase(BaseModel):
    key: str
    value: float
    description: Optional[str] = None

class SuggestionParameterCreate(SuggestionParameterBase):
    pass

class SuggestionParameterUpdate(BaseModel):
    value: float
    description: Optional[str] = None

class SuggestionParameter(SuggestionParameterBase):
    class Config:
        from_attributes = True

class EmissionFactorBase(BaseModel):
    key: str
    value: float
    unit: str
    source: Optional[str] = None
    year: Optional[int] = None
    description: Optional[str] = None

class EmissionFactorCreate(EmissionFactorBase):
    pass

class EmissionFactorUpdate(BaseModel):
    value: Optional[float] = None
    unit: Optional[str] = None
    source: Optional[str] = None
    year: Optional[int] = None
    description: Optional[str] = None

class EmissionFactor(EmissionFactorBase):
    class Config:
        from_attributes = True

# -- Benchmarking Schemas --

class CompanyIndustry(str, enum.Enum):
    manufacturing = "manufacturing"
    services = "services"
    retail = "retail"
    other = "other"

class BenchmarkMetric(BaseModel):
    metric_name: str # Örn: "kwh_per_m2_annual"
    your_value: Optional[float]
    industry_avg: Optional[float]
    regional_avg: Optional[float]
    unit: str # Örn: "kWh/m²"
    description: Optional[str] = None

class BenchmarkReport(BaseModel):
    company_id: int
    company_name: str
    report_date: date
    metrics: List[BenchmarkMetric]
    message: Optional[str] = None

# -- Target Schemas --

class SustainabilityTargetBase(BaseModel):
    target_metric: models.TargetMetricType
    target_value: float
    target_year: int
    baseline_year: int
    description: Optional[str] = None

class SustainabilityTargetCreate(SustainabilityTargetBase):
    pass

class SustainabilityTarget(SustainabilityTargetBase):
    id: int
    company_id: int
    baseline_value: Optional[float] = None
    is_active: bool

    class Config:
        from_attributes = True