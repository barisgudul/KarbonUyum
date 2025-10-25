# backend/schemas.py 

from datetime import date
from typing import List, Optional
import enum

from pydantic import BaseModel, EmailStr, Field, computed_field, ConfigDict, field_validator
import models

# Rol Enum'ını modellerden import ediyoruz
from models import ActivityType, CompanyMemberRole, ScopeType

# -- Strict Validation Base Config --
class StrictBaseModel(BaseModel):
    """
    Base model with strict validation to prevent injection attacks.
    Disallows extra fields not defined in the schema.
    """
    model_config = ConfigDict(extra="forbid")

# -- User Schemas --
class UserBase(StrictBaseModel):
    email: EmailStr
    class Config:
        from_attributes = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72)

# Üyeleri ve rollerini bir arada göstermek için yeni bir şema
class CompanyMember(UserBase):
    role: Optional[CompanyMemberRole] = CompanyMemberRole.data_entry

# -- ActivityData Schemas --
class ActivityDataBase(BaseModel):
    activity_type: ActivityType
    quantity: float
    unit: str
    start_date: date
    end_date: date

class ActivityDataCreate(ActivityDataBase):
    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError('Miktar pozitif olmalıdır')
        return v
    
    @field_validator('end_date')
    @classmethod
    def validate_dates(cls, v, info):
        if 'start_date' in info.data and v < info.data['start_date']:
            raise ValueError('Bitiş tarihi başlangıç tarihinden önce olamaz')
        return v
    
    @field_validator('end_date')
    @classmethod
    def validate_date_not_future(cls, v):
        if v > date.today():
            raise ValueError('Gelecek tarihli veri girilemez')
        return v

class ActivityData(ActivityDataBase):
    id: int
    facility_id: int
    scope: ScopeType
    calculated_co2e_kg: Optional[float] = None
    is_fallback_calculation: bool = False  # Yasal şeffaflık için
    class Config: from_attributes = True

# -- Facility Schemas --
class FacilityBase(BaseModel):
    name: str
    city: Optional[str] = None
    address: Optional[str] = None
    surface_area_m2: Optional[float] = None

class FacilityCreate(FacilityBase):
    @field_validator('surface_area_m2')
    @classmethod
    def validate_surface_area(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Yüzey alanı pozitif olmalıdır')
        return v

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
    @field_validator('avg_electricity_cost_kwh', 'avg_gas_cost_m3')
    @classmethod
    def validate_costs(cls, v):
        if v is not None and v < 0:
            raise ValueError('Maliyet negatif olamaz')
        return v

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

class MonthlyEmissionByScope(BaseModel):
    month: str
    scope_1_co2e_kg: float
    scope_2_co2e_kg: float
    total_co2e_kg: float

class DashboardSummary(BaseModel):
    current_month_scope_1: float
    current_month_scope_2: float
    current_month_total: float
    previous_month_total: float
    monthly_trend: List[MonthlyEmissionByScope]

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

# ESKI: EmissionFactor SCHEMAS - SILINDI (Climatiq API kullanılıyor)
# Dahili emisyon faktörü yönetimi için kullanılan Pydantic modelleri
# Climatiq API'ye geçişle beraber artık gerekli değildir.
#
# class EmissionFactorBase(BaseModel):
#     key: str
#     value: float
#     unit: str
#     source: Optional[str] = None
#     year: Optional[int] = None
#     description: Optional[str] = None
#
# class EmissionFactorCreate(EmissionFactorBase):
#     pass
#
# class EmissionFactorUpdate(BaseModel):
#     ...
#
# class EmissionFactor(EmissionFactorBase):
#     class Config:
#         from_attributes = True

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

# -- Emission Calculation Result Schema --
class EmissionCalculationResult(BaseModel):
    total_co2e_kg: float
    scope: ScopeType
    emission_factor_used: str
    emission_factor_value: float
    calculation_year: int
    is_fallback: bool = False  # API erişilemediğinde true

# -- CSV Upload Schemas --
class ActivityDataCSVRow(BaseModel):
    row_number: int
    activity_type: str
    quantity: float
    unit: str
    start_date: str
    end_date: str
    error: Optional[str] = None
    success: bool = True

class CSVUploadResult(BaseModel):
    total_rows: int
    successful_rows: int
    failed_rows: int
    results: List[ActivityDataCSVRow]
    message: str


# YENİ: Benchmarking Şemaları
class BenchmarkMetricResponse(BaseModel):
    """Benchmark metriki - API response"""
    metric_name: str
    company_value: float
    sector_avg: float
    unit: str
    efficiency_ratio: float  # sector_avg / company_value * 100
    is_better: bool  # Şirket sektörden daha iyi mi?
    difference_percent: float  # %18 daha verimli vs %10 daha az verimli


class BenchmarkReportResponse(BaseModel):
    """Benchmark raporu - API response"""
    company_id: int
    company_name: str
    industry_type: str
    city: str
    metrics: List[BenchmarkMetricResponse] = []
    comparable_companies_count: int
    data_available: bool  # Yeterli veri var mı?
    message: str  # "Yeterli veri yok", "3 firma ile karşılaştırıldı", vb.

# -- Health Check Schemas --
class HealthCheckResponse(BaseModel):
    status: str
    message: str