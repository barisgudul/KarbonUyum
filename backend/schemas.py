# backend/schemas.py 

from datetime import date, datetime
from typing import List, Optional
import enum

from pydantic import BaseModel, EmailStr, Field, computed_field, ConfigDict, field_validator
import models

# Rol Enum'ını modellerden import ediyoruz
from models import ActivityType, CompanyMemberRole, ScopeType, IndustryType
from typing import Literal

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
    cost_tl: Optional[float] = Field(None, description="Fatura tutarı (TL)")  # YENİ: Birim maliyet hesaplama için
    
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
    calculated_co2e_kg: Optional[float] = Field(None, alias="co2e_emissions", serialization_alias="co2e_emissions")
    is_fallback_calculation: bool = False  # Yasal şeffaflık için
    is_simulation: bool = False  # Onboarding simülasyon verisi
    
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )

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


# -- Climatiq API Schemas (Proaktif Şema Doğrulaması) --
class ClimatiqSelector(BaseModel):
    """
    Climatiq API emission_factor selector şeması.
    API'ye gönderilecek faktör seçici bilgilerini doğrular.
    
    Bu model, Climatiq dokümantasyonuna göre oluşturulmuştur:
    https://www.climatiq.io/docs/api-reference/estimate
    
    NOT: year parametresi opsiyonel bırakıldı. Year verilmezse,
    Climatiq otomatik olarak en güncel mevcut veriyi kullanır.
    """
    activity_id: str = Field(..., description="Climatiq aktivite ID'si (örn: electricity-supply_grid-source_supplier_mix)")
    region: str = Field(default="TR", description="ISO 3166-1 alpha-2 bölge kodu")
    year: Optional[int] = Field(default=None, description="Hesaplama yılı (opsiyonel - belirtilmezse en güncel veri kullanılır)")
    data_version: str = Field(default="^26", description="Veri sürümü (örn: ^26)")
    
    model_config = ConfigDict(extra="forbid")


class ClimatiqEnergyParameters(BaseModel):
    """
    Climatiq API için enerji tüketimi parametreleri (elektrik için).
    """
    energy: float = Field(..., gt=0, description="Enerji miktarı")
    energy_unit: Literal["kWh", "MWh", "GJ"] = Field(default="kWh", description="Enerji birimi")
    
    model_config = ConfigDict(extra="forbid")


class ClimatiqVolumeParameters(BaseModel):
    """
    Climatiq API için hacim parametreleri (yakıtlar için).
    """
    volume: float = Field(..., gt=0, description="Hacim miktarı")
    volume_unit: Literal["l", "m3", "gal"] = Field(..., description="Hacim birimi")
    
    model_config = ConfigDict(extra="forbid")


class ClimatiqEstimateRequest(BaseModel):
    """
    Climatiq API /estimate endpoint'ine gönderilecek tam istek yapısı.
    """
    emission_factor: ClimatiqSelector
    parameters: dict  # ClimatiqEnergyParameters veya ClimatiqVolumeParameters olabilir
    
    model_config = ConfigDict(extra="forbid")


class ClimatiqEmissionFactor(BaseModel):
    """
    Climatiq API'den dönen emisyon faktörü bilgisi.
    """
    id: Optional[str] = None
    factor: Optional[float] = None
    factor_unit: Optional[str] = None
    year: Optional[int] = None  # API'nin kullandığı faktörün yılı
    
    model_config = ConfigDict(extra="allow")  # API ekstra alanlar dönebilir


class ClimatiqEstimateResponse(BaseModel):
    """
    Climatiq API /estimate endpoint'inden dönen yanıt yapısı.
    """
    co2e: float = Field(..., description="Toplam CO2 eşdeğeri (kg)")
    co2e_unit: Optional[str] = "kg"
    emission_factor: Optional[ClimatiqEmissionFactor] = None
    
    model_config = ConfigDict(extra="allow")  # API ekstra alanlar dönebilir


# YENİ: IndustryTemplate Schemas (Onboarding için)
class IndustryTemplateBase(BaseModel):
    industry_name: str
    industry_type: IndustryType
    typical_electricity_kwh_per_employee: float
    typical_gas_m3_per_employee: float
    typical_fuel_liters_per_vehicle: float
    typical_electricity_cost_ratio: float = 0.03
    typical_gas_cost_ratio: float = 0.02
    best_in_class_electricity_kwh: Optional[float] = None
    average_electricity_kwh: Optional[float] = None
    description: Optional[str] = None

class IndustryTemplateCreate(IndustryTemplateBase):
    pass

class IndustryTemplate(IndustryTemplateBase):
    id: int
    created_at: date
    
    class Config:
        from_attributes = True

# YENİ: Onboarding Request/Response Schemas
class OnboardingRequest(StrictBaseModel):
    industry_name: str
    employee_count: int = Field(..., gt=0, le=10000, description="Çalışan sayısı")
    vehicle_count: int = Field(default=1, ge=0, le=1000, description="Araç sayısı")
    facility_name: Optional[str] = Field(default="Ana Tesis", max_length=100)
    facility_city: Optional[str] = Field(default="İstanbul", max_length=50)

class OnboardingResponse(BaseModel):
    message: str
    company_id: int
    facility_id: int
    simulated_data_count: int
    dashboard_ready: bool = True

# YENİ: Wizard Submit Schemas
class WizardDataItem(StrictBaseModel):
    activity_type: ActivityType
    quantity: float = Field(..., gt=0)
    cost: float = Field(..., gt=0, description="Fatura tutarı (TL)")
    start_date: date
    end_date: date
    
    @field_validator('end_date')
    @classmethod
    def validate_dates(cls, v, info):
        if 'start_date' in info.data and v < info.data['start_date']:
            raise ValueError('Bitiş tarihi başlangıç tarihinden önce olamaz')
        return v

class WizardSubmitRequest(StrictBaseModel):
    company_id: int
    facility_id: int
    data_items: List[WizardDataItem]
    clear_simulation: bool = True  # Simülasyon verisini temizle

class WizardSubmitResponse(BaseModel):
    message: str
    created_count: int
    deleted_simulation_count: int
    financials_updated: bool
    roi_potential_tl: Optional[float] = None

# YENİ: ROI Analysis Schemas
class ROIOpportunity(BaseModel):
    measure: str
    name: str
    description: str
    annual_savings_tl: float
    annual_savings_kwh: Optional[float] = 0
    investment_tl: float
    payback_months: float
    difficulty: str
    co2_reduction_tons: float

class QuickWin(BaseModel):
    name: str
    savings_tl: float
    investment_tl: float
    payback_months: float
    priority: str

class BenchmarkComparison(BaseModel):
    industry_average_gap: float
    best_in_class_gap: float
    efficiency_score: float
    message: str

class ROIAnalysisResponse(BaseModel):
    company_id: int
    analysis_period_months: int
    current_annual_cost_tl: float
    potential_annual_savings_tl: float
    savings_percentage: float
    total_investment_required_tl: float
    payback_period_months: float
    top_opportunities: List[ROIOpportunity]
    benchmark_comparison: BenchmarkComparison
    quick_wins: List[QuickWin]
    message: str

# YENİ: CBAM Report Schemas
class CBAMReportRequest(StrictBaseModel):
    start_date: date
    end_date: date
    reporting_period: Optional[str] = None
    
    @field_validator('end_date')
    @classmethod
    def validate_dates(cls, v, info):
        if 'start_date' in info.data and v < info.data['start_date']:
            raise ValueError('Bitiş tarihi başlangıç tarihinden önce olamaz')
        return v

class CBAMReportResponse(BaseModel):
    report_id: str
    company_name: str
    reporting_period: str
    total_emissions_tco2e: float
    xml_content: str
    generation_date: str
    status: str = "SUCCESS"

# YENİ: Notification Schemas (Modül 2.1)
class NotificationCreate(StrictBaseModel):
    notification_type: str  # 'anomaly', 'suggestion', 'update'
    title: str
    message: str
    company_id: Optional[int] = None
    facility_id: Optional[int] = None
    action_url: Optional[str] = None

class Notification(BaseModel):
    id: int
    user_id: int
    notification_type: str
    title: str
    message: str
    company_id: Optional[int] = None
    facility_id: Optional[int] = None
    is_read: bool = False
    action_url: Optional[str] = None
    created_at: date
    
    class Config:
        from_attributes = True

class NotificationList(BaseModel):
    notifications: List[Notification]
    unread_count: int
    total_count: int

# YENİ: Invoice Schemas (Modül 2.2 - OCR Sistemi)
class InvoiceExtractedData(StrictBaseModel):
    """OCR'dan okunan fatura verisi"""
    activity_type: Optional[str] = None  # "electricity", "natural_gas", "diesel_fuel"
    quantity: Optional[float] = None
    cost_tl: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    extracted_text: Optional[str] = None  # Ham OCR çıktısı (debug)

class InvoiceCreate(StrictBaseModel):
    """Fatura yükleme isteği"""
    facility_id: int
    # Dosya multipart/form-data ile gönderilir, schema'da tutmuyoruz

class InvoiceVerify(StrictBaseModel):
    """Kullanıcının OCR sonuçlarını doğrulaması"""
    extracted_data: InvoiceExtractedData
    verification_notes: Optional[str] = None

class Invoice(BaseModel):
    """Fatura detayları"""
    id: int
    facility_id: int
    filename: str
    status: str  # "pending", "processing", "completed", "failed", "verified"
    extracted_quantity: Optional[float] = None
    extracted_cost_tl: Optional[float] = None
    extracted_start_date: Optional[date] = None
    extracted_end_date: Optional[date] = None
    extracted_activity_type: Optional[str] = None
    is_verified: bool = False
    activity_data_id: Optional[int] = None
    created_at: date
    processed_at: Optional[date] = None
    
    class Config:
        from_attributes = True

class InvoiceList(BaseModel):
    """Fatura listesi"""
    invoices: List[Invoice]
    total: int
    pending_count: int
    processing_count: int

# YENİ: Report Schemas (Modül 2.1 - Asenkron Raporlama)
class ReportCreate(StrictBaseModel):
    """Rapor oluşturma isteği"""
    report_type: str  # "cbam_xml", "roi_analysis", "combined"
    start_date: date
    end_date: date
    period_name: Optional[str] = None
    notify_user: bool = True

class ReportStatus(BaseModel):
    """Rapor durumu"""
    id: int
    company_id: int
    report_type: str
    status: str  # "pending", "processing", "completed", "failed"
    celery_task_id: Optional[str] = None
    file_path: Optional[str] = None
    download_count: int = 0
    total_emissions_tco2e: Optional[float] = None
    total_savings_tl: Optional[float] = None
    error_message: Optional[str] = None
    created_at: date
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ReportList(BaseModel):
    """Rapor listesi"""
    reports: List[ReportStatus]
    total: int
    pending_count: int
    processing_count: int
    completed_count: int

class ReportGenerationResponse(BaseModel):
    """Rapor oluşturma başlatma yanıtı"""
    report_id: int
    celery_task_id: str
    status: str
    message: str
    estimated_time_seconds: int  # Tahmin edilen işlem süresi

# YENİ: Tedarikçi Ağı Schemas (Modül 3.1)

class SupplierBase(StrictBaseModel):
    """Tedarikçi temel bilgileri"""
    company_name: str
    email: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    industry_type: Optional[str] = None
    product_category: Optional[str] = None

class SupplierCreate(SupplierBase):
    """Tedarikçi oluşturma"""
    pass

class Supplier(SupplierBase):
    """Tedarikçi detayları"""
    id: int
    is_active: bool
    verified: bool
    created_at: date
    
    class Config:
        from_attributes = True

class ProductFootprintBase(StrictBaseModel):
    """Ürün ayak izi temel bilgileri"""
    product_name: str
    product_category: str
    unit: str  # "ton", "kg", "metre" vs
    co2e_per_unit_kg: float
    product_code: Optional[str] = None
    data_source: Optional[str] = None
    external_id: Optional[str] = None

class ProductFootprintCreate(ProductFootprintBase):
    """Ürün ayak izi oluşturma"""
    pass

class ProductFootprint(ProductFootprintBase):
    """Ürün ayak izi detayları"""
    id: int
    supplier_id: int
    is_verified: bool
    created_at: date
    
    class Config:
        from_attributes = True

class SupplierInviteRequest(StrictBaseModel):
    """Tedarikçi davet isteği"""
    supplier_email: str
    supplier_company_name: str
    relationship_type: str = "supplier"

class SupplierOnboardRequest(StrictBaseModel):
    """Tedarikçi onboarding isteği (şifre belirleme)"""
    token: str
    password: str

class SupplierInviteResponse(BaseModel):
    """Tedarikçi davet yanıtı"""
    id: int
    status: str
    invite_token: str
    invited_at: datetime
    expires_at: datetime
    message: str

class SupplierInvitation(BaseModel):
    """Tedarikçi davet detayları"""
    id: int
    supplier_id: int
    company_id: int
    status: str
    relationship_type: str
    invited_at: datetime
    accepted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Scope3EmissionCreate(StrictBaseModel):
    """Scope 3 emisyon oluşturma"""
    product_footprint_id: int
    quantity_purchased: float
    purchase_date: date

class Scope3Emission(Scope3EmissionCreate):
    """Scope 3 emisyon detayları"""
    id: int
    facility_id: int
    calculated_co2e_kg: float
    created_at: date
    
    class Config:
        from_attributes = True

class SupplierList(BaseModel):
    """Tedarikçi listesi"""
    suppliers: List[Supplier]
    total: int
    active_count: int
    verified_count: int

class ProductFootprintList(BaseModel):
    """Ürün footprint listesi"""
    products: List[ProductFootprint]
    total: int
    verified_count: int


# ===== GRANULAR ACCESS CONTROL - MEMBER SCHEMAS =====

class MemberCreate(StrictBaseModel):
    """Yeni üye ekleme"""
    user_id: int
    role: CompanyMemberRole = CompanyMemberRole.data_entry
    facility_id: Optional[int] = None  # NULL = tüm tesisler


class MemberUpdate(StrictBaseModel):
    """Üye güncelleme"""
    role: Optional[CompanyMemberRole] = None
    facility_id: Optional[int] = None


class Member(BaseModel):
    """Üye detayları"""
    id: int
    user_id: int
    company_id: int
    role: CompanyMemberRole
    facility_id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True


class MemberDetail(Member):
    """Üye detayları + ilişkili veriler"""
    user_email: Optional[str] = None
    facility_name: Optional[str] = None


class MemberList(BaseModel):
    """Üye listesi"""
    members: List[MemberDetail]
    total: int
    by_role: dict = {}  # {"owner": 1, "admin": 2, ...}


# ===== GAMIFICATION - BADGE SCHEMAS =====

class Badge(BaseModel):
    """Rozet detayları"""
    id: int
    badge_name: str
    description: Optional[str] = None
    icon_emoji: Optional[str] = None
    unlock_condition: Optional[str] = None
    category: Optional[str] = None
    is_active: bool = True
    
    class Config:
        from_attributes = True


class UserBadgeDetail(BaseModel):
    """Kullanıcının kazandığı rozet"""
    id: int
    badge_id: int
    earned_at: str
    badge: Badge
    
    class Config:
        from_attributes = True


class UserBadgeList(BaseModel):
    """Kullanıcının tüm rozetleri"""
    badges: List[UserBadgeDetail]
    total: int
    earned_count: int


class LeaderboardEntry(BaseModel):
    """Sıralama girdisi"""
    company_id: int
    company_name: Optional[str] = None
    rank: int
    efficiency_score: float
    emissions_per_employee_kwh: Optional[float] = None
    region: Optional[str] = None


class Leaderboard(BaseModel):
    """Sektör sıralaması"""
    industry_type: str
    region: Optional[str] = None
    entries: List[LeaderboardEntry]
    total: int
    your_rank: Optional[int] = None
    your_score: Optional[float] = None