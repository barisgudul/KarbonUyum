# backend/models.py

import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship

from database import Base


class ActivityType(str, enum.Enum):
    electricity = "electricity"
    natural_gas = "natural_gas"
    diesel_fuel = "diesel_fuel"

class ScopeType(str, enum.Enum):
    scope_1 = "scope_1"  # Doğrudan emisyonlar (doğalgaz, dizel yakıt)
    scope_2 = "scope_2"  # Dolaylı emisyonlar (satın alınan elektrik)
    scope_3 = "scope_3"  # Diğer dolaylı emisyonlar (tedarik zinciri)

class CompanyMemberRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    data_entry = "data_entry"
    viewer = "viewer"

class InvoiceStatus(str, enum.Enum):
    pending = "pending"  # Yüklendi, beklemede
    processing = "processing"  # OCR işleniyor
    completed = "completed"  # İşlem tamamlandı
    failed = "failed"  # İşlem başarısız
    verified = "verified"  # Kullanıcı tarafından doğrulandı


class FacilityType(str, enum.Enum):
    production = "production"
    office = "office"
    warehouse = "warehouse"
    cold_storage = "cold_storage"

class IndustryType(str, enum.Enum):
    manufacturing = "manufacturing"
    services = "services"
    retail = "retail"
    other = "other"

class TargetMetricType(str, enum.Enum):
    co2e_reduction_percentage = "co2e_reduction_percentage"
    energy_reduction_kwh = "energy_reduction_kwh"

company_members_association = Table(
    'company_members',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('company_id', Integer, ForeignKey('companies.id'), primary_key=True),
    # YENİ: Üyenin rolünü tutacak olan sütun
    Column('role', Enum(CompanyMemberRole), default=CompanyMemberRole.data_entry, nullable=False)
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # 'companies' ilişkisini 'owner' ile karıştırmamak için 'owned_companies' olarak yeniden adlandırdık
    owned_companies = relationship("Company", back_populates="owner")

    # YENİ: Kullanıcının üye olduğu şirketler
    member_of_companies = relationship(
        "Company", secondary=company_members_association, back_populates="members"
    )

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    tax_number = Column(String, unique=True, index=True)
    industry_type = Column(Enum(IndustryType), nullable=True, index=True)  # YENİ: index=True (Benchmark sorgusu filtrelemesi)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="owned_companies")
    facilities = relationship("Facility", back_populates="company")

    # YENİ: Şirketin üyesi olan kullanıcılar
    members = relationship(
        "User", secondary=company_members_association, back_populates="member_of_companies"
    )
    financials = relationship("CompanyFinancials", back_populates="company", uselist=False, cascade="all, delete-orphan")

class Facility(Base):
    __tablename__ = "facilities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    city = Column(String, index=True)  # YENİ: index=True (Benchmark sorgusu şehir filtresi)
    address = Column(String)
    facility_type = Column(Enum(FacilityType), default=FacilityType.production)
    surface_area_m2 = Column(Float, nullable=True, index=True)  # YENİ: index=True (Benchmark hesaplaması divide operasyonu)
    company_id = Column(Integer, ForeignKey("companies.id"))
    company = relationship("Company", back_populates="facilities")
    
    # YENİ: Bir tesise ait aktivite verileri
    activity_data = relationship("ActivityData", back_populates="facility")

# YENİ: Dosyanın en sonuna yeni ActivityData modelini ekle
class ActivityData(Base):
    __tablename__ = "activity_data"

    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"))
    
    activity_type = Column(Enum(ActivityType), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False) # örn: "kWh", "m3", "litre"
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # GHG Protokolü uyumlu scope alanı
    scope = Column(Enum(ScopeType), nullable=False)
    
    # Hesaplama sonucu burada saklanacak
    calculated_co2e_kg = Column(Float)
    
    # YENİ: Fallback hesaplama işaretleyicisi (yasal şeffaflık için)
    is_fallback_calculation = Column(Boolean, default=False, nullable=False, index=True)  # YENİ: index=True (Benchmark: sadece güvenilir veriler)
    
    # YENİ: Simülasyon verisi işaretleyicisi (onboarding için)
    is_simulation = Column(Boolean, default=False, nullable=False, index=True)

    facility = relationship("Facility", back_populates="activity_data")

class CompanyFinancials(Base):
    __tablename__ = "company_financials"
    
    company_id = Column(Integer, ForeignKey("companies.id"), primary_key=True)
    
    # nullable=True, çünkü kullanıcı bu verileri girmeyebilir
    avg_electricity_cost_kwh = Column(Float, nullable=True) # 1 kWh elektriğin ortalama maliyeti (TL)
    avg_gas_cost_m3 = Column(Float, nullable=True)          # 1 m3 doğal gazın ortalama maliyeti (TL)
    
    company = relationship("Company", back_populates="financials")

class SuggestionParameter(Base):
    __tablename__ = "suggestion_parameters"

    key = Column(String, primary_key=True) # Örn: "ges_cost_per_kwp"
    value = Column(Float, nullable=False)
    description = Column(String, nullable=True)

class SustainabilityTarget(Base):
    __tablename__ = "sustainability_targets"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    target_metric = Column(Enum(TargetMetricType), nullable=False)
    target_value = Column(Float, nullable=False) # Örn: %30 azaltım için 0.30, 10000 kWh azaltım için 10000
    target_year = Column(Integer, nullable=False)
    baseline_year = Column(Integer, nullable=False)
    baseline_value = Column(Float, nullable=True) # Hedef belirlendiğindeki başlangıç değeri
    is_active = Column(Boolean, default=True)
    description = Column(String, nullable=True)

    company = relationship("Company", backref="sustainability_targets")

# YENİ: Sektör şablonları - onboarding sırasında simülasyon verisi için kullanılacak
class IndustryTemplate(Base):
    __tablename__ = "industry_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    industry_name = Column(String, unique=True, nullable=False, index=True)
    industry_type = Column(Enum(IndustryType), nullable=False, index=True)
    
    # Tipik tüketim değerleri (çalışan başına)
    typical_electricity_kwh_per_employee = Column(Float, nullable=False)  # Yıllık kWh/çalışan
    typical_gas_m3_per_employee = Column(Float, nullable=False)          # Yıllık m³/çalışan
    typical_fuel_liters_per_vehicle = Column(Float, nullable=False)      # Yıllık litre/araç
    
    # Tipik maliyet oranları
    typical_electricity_cost_ratio = Column(Float, default=0.03)  # Cirodaki elektrik maliyet oranı
    typical_gas_cost_ratio = Column(Float, default=0.02)          # Cirodaki doğalgaz maliyet oranı
    
    # Benchmark değerleri
    best_in_class_electricity_kwh = Column(Float, nullable=True)  # En iyi %20'lik dilim
    average_electricity_kwh = Column(Float, nullable=True)        # Sektör ortalaması
    
    description = Column(String, nullable=True)
    created_at = Column(Date, default=date.today)

# ESKI: EmissionFactor MODEL - SILINDI (Climatiq API kullanılıyor)
# Bu model, dahili emisyon faktörü yönetimini sağlamak için kullanılıyordu.
# Climatiq API'ye geçişle beraber, artık gerekli değildir.
# Arşiv: backend/archive/models_EmissionFactor_v1.py
#
# class EmissionFactor(Base):
#     __tablename__ = "emission_factors"
#     key = Column(String, primary_key=True, index=True)
#     value = Column(Float, nullable=False)
#     unit = Column(String, nullable=False)
#     source = Column(String, nullable=True)
#     year = Column(Integer, nullable=True)
#     description = Column(String, nullable=True)

# YENİ: Bildirim Modeli (Modül 2.1)
class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Bildirim tipi
    notification_type = Column(String, index=True)  # 'anomaly', 'suggestion', 'update'
    
    # İçerik
    title = Column(String, nullable=False)  # "Elektrik Tüketimi Anormal!"
    message = Column(String, nullable=False)  # Detaylı mesaj
    
    # Bağlantılar
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)  # İlgili şirket
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=True)  # İlgili tesis
    
    # Durum
    is_read = Column(Boolean, default=False, index=True)
    action_url = Column(String, nullable=True)  # Tıklandığında gidilecek URL
    
    # Zaman
    created_at = Column(Date, default=date.today)
    
    # İlişkiler
    user = relationship("User", backref="notifications")
    company = relationship("Company")
    facility = relationship("Facility")

# YENİ: Fatura OCR Sistemi (Modül 2.2)
class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Dosya bilgileri
    filename = Column(String, nullable=False)  # Örn: "elektrik_ocak2024.pdf"
    file_path = Column(String, nullable=False)  # S3 veya local path
    file_type = Column(String)  # "pdf", "jpeg", "png"
    
    # OCR Sonuçları
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.pending, index=True)
    
    # Okunan veriler (OCR'dan çıkan)
    extracted_activity_type = Column(String, nullable=True)  # "electricity", "natural_gas"
    extracted_quantity = Column(Float, nullable=True)
    extracted_cost_tl = Column(Float, nullable=True)
    extracted_start_date = Column(Date, nullable=True)
    extracted_end_date = Column(Date, nullable=True)
    extracted_text = Column(String, nullable=True)  # Ham OCR çıktısı (debug için)
    
    # Doğrulama (Kullanıcı onayı)
    is_verified = Column(Boolean, default=False)
    verification_notes = Column(String, nullable=True)
    
    # Oluşturulan ActivityData
    activity_data_id = Column(Integer, ForeignKey("activity_data.id"), nullable=True)
    
    # Zaman
    created_at = Column(Date, default=date.today)
    processed_at = Column(Date, nullable=True)
    
    # İlişkiler
    facility = relationship("Facility")
    user = relationship("User")
    activity_data = relationship("ActivityData")

# YENİ: Report Generation Tracking (Modül 2.1 - Asenkron)
class ReportStatus(str, enum.Enum):
    pending = "pending"  # Sıraya koyuldu
    processing = "processing"  # İşleniyor
    completed = "completed"  # Tamamlandı
    failed = "failed"  # Başarısız
    expired = "expired"  # Süresi doldu (24 saatlik TTL)

class ReportType(str, enum.Enum):
    cbam_xml = "cbam_xml"  # CBAM XML raporu
    roi_analysis = "roi_analysis"  # ROI analiz raporu
    combined = "combined"  # Birleşik rapor

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Rapor türü ve parametreleri
    report_type = Column(Enum(ReportType), nullable=False, index=True)  # CBAM, ROI, Combined
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Celery task tracking
    celery_task_id = Column(String, unique=True, nullable=True)  # Celery task ID
    status = Column(Enum(ReportStatus), default=ReportStatus.pending, index=True)
    
    # İşlem sonuçları
    file_path = Column(String, nullable=True)  # S3 veya local path
    file_size_bytes = Column(Integer, nullable=True)
    download_count = Column(Integer, default=0)
    
    # Raporlama detayları
    period_name = Column(String, nullable=True)  # "Q1 2024" gibi
    total_emissions_tco2e = Column(Float, nullable=True)  # CBAM için
    total_savings_tl = Column(Float, nullable=True)  # ROI için
    
    # Hata tracking
    error_message = Column(String, nullable=True)
    error_trace = Column(String, nullable=True)  # Debug için tam stacktrace
    
    # Bildirim
    notify_user_when_ready = Column(Boolean, default=True)
    
    # Zaman
    created_at = Column(Date, default=date.today)
    requested_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)  # TTL için (24 saat sonra sil)
    
    # İlişkiler
    company = relationship("Company")
    user = relationship("User")

# YENİ: Tedarikçi Ağı Sistemi (Modül 3.1)

class SupplierInvitationStatus(str, enum.Enum):
    pending = "pending"  # Davet gönderildi, beklemede
    accepted = "accepted"  # Tedarikçi kabul etti, üyelik aktif
    rejected = "rejected"  # Tedarikçi reddetme
    expired = "expired"  # 30 gün sonra süresi doldı

class VerificationLevel(str, enum.Enum):
    self_declared = "self_declared"  # Tedarikçi beyanı (düşük güven)
    document_backed = "document_backed"  # Belge destekli (EPD, fatura vb.) (orta güven)
    audited = "audited"  # Denetim onaylı (yüksek güven - premium özellik)

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Tedarikçi bilgileri
    company_name = Column(String, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    contact_person = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    # İş kategorisi
    industry_type = Column(Enum(IndustryType), nullable=True, index=True)
    product_category = Column(String, nullable=True)  # "İplik", "Tasım", "Kimyasal" vs
    
    # Onboarding
    is_active = Column(Boolean, default=True, index=True)
    verified = Column(Boolean, default=False)  # Admin doğrulaması
    
    # Zaman
    created_at = Column(Date, default=date.today)
    last_updated = Column(DateTime, nullable=True)
    
    # İlişkiler
    invitations = relationship("SupplierInvitation", back_populates="supplier", cascade="all, delete-orphan")
    products = relationship("ProductFootprint", back_populates="supplier", cascade="all, delete-orphan")


class SupplierInvitation(Base):
    __tablename__ = "supplier_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    invited_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Davet bilgileri
    invite_token = Column(String, unique=True, nullable=False, index=True)  # Güvenli token
    status = Column(Enum(SupplierInvitationStatus), default=SupplierInvitationStatus.pending, index=True)
    
    # İlişki türü (hangı amaca için davet)
    relationship_type = Column(String, default="supplier")  # "supplier", "manufacturer", "logistics" vs
    
    # Zaman
    invited_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)  # 30 gün sonra expiry
    
    # İlişkiler
    supplier = relationship("Supplier", back_populates="invitations")
    company = relationship("Company")
    invited_by = relationship("User")


class ProductFootprint(Base):
    __tablename__ = "product_footprints"
    
    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    
    # Ürün bilgileri
    product_code = Column(String, nullable=True)  # "IPP-001" gibi
    product_name = Column(String, nullable=False, index=True)  # "100% Pamuk İplik"
    product_category = Column(String, nullable=False)  # "İplik", "Tasım", "Kimya" vs
    unit = Column(String, nullable=False)  # "ton", "kg", "metre", "litre" vs
    
    # Footprint verisi (Scope 1, 2, 3)
    co2e_per_unit_kg = Column(Float, nullable=False)  # 1 birim başına kg CO2e
    
    # Doğrulama (Gelişmiş)
    is_verified = Column(Boolean, default=False)  # Admin/Customer doğrulaması (geriye uyumluluk)
    verification_level = Column(Enum(VerificationLevel), default=VerificationLevel.self_declared, nullable=False)  # Doğrulama seviyesi
    verification_notes = Column(String, nullable=True)  # Doğrulama notları
    verification_document_url = Column(String, nullable=True)  # EPD belgesi, sertifika vb. URL
    verified_at = Column(DateTime, nullable=True)  # Doğrulama tarihi
    verified_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Doğrulayan kullanıcı
    
    # Data kaynağı
    data_source = Column(String, nullable=True)  # "EPD", "Manual", "Scientific" vs
    external_id = Column(String, nullable=True)  # EPD numarası veya benzeri
    
    # Zaman
    created_at = Column(Date, default=date.today)
    updated_at = Column(DateTime, nullable=True)
    
    # İlişkiler
    supplier = relationship("Supplier", back_populates="products")
    
    # Müşteriler bu ürünü kullandığında referans
    scope3_emissions = relationship("Scope3Emission", back_populates="product_footprint", cascade="all, delete-orphan")


# Müşteri tarafından tedarikçi ürünü satın aldığında Scope 3 hesaplama
class Scope3Emission(Base):
    __tablename__ = "scope3_emissions"
    
    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=False, index=True)
    product_footprint_id = Column(Integer, ForeignKey("product_footprints.id"), nullable=False, index=True)
    
    # Satın alma bilgileri
    quantity_purchased = Column(Float, nullable=False)  # Kaç birim satın alındı
    purchase_date = Column(Date, nullable=False)
    
    # Hesaplanan emisyon
    calculated_co2e_kg = Column(Float, nullable=False)  # quantity × co2e_per_unit
    
    # Zaman
    created_at = Column(Date, default=date.today)
    
    # İlişkiler
    facility = relationship("Facility")
    product_footprint = relationship("ProductFootprint", back_populates="scope3_emissions")


# ===== GRANULAR FACILITY-LEVEL ACCESS CONTROL =====

class Member(Base):
    """
    Şirket üyelerinin detaylı yetkilendirmesini yönetir.
    
    Özellikler:
    - Genel rol (owner, admin, data_entry, viewer)
    - İsteğe bağlı tesis bazlı kısıtlama
    - Eğer facility_id NULL ise → tüm tesisler erişim var
    - Eğer facility_id varsa → sadece o tesis erişim var
    
    Örnek:
    - user_id=5, company_id=10, facility_id=NULL, role=admin → Şirketin tümüne admin
    - user_id=6, company_id=10, facility_id=15, role=data_entry → Sadece tesis 15'e data entry
    """
    
    __tablename__ = "members"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Yetkilendirme
    role = Column(Enum(CompanyMemberRole), default=CompanyMemberRole.data_entry, nullable=False, index=True)
    
    # Tesis bazlı kısıtlama (NULL = tüm tesisler)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=True, index=True)
    
    # Zaman
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # İlişkiler
    user = relationship("User")
    company = relationship("Company")
    facility = relationship("Facility")


# ===== GAMIFICATION - BADGE SYSTEM =====

class Badge(Base):
    """
    Başarı rozetleri - Belirli kilometre taşlarını tamamlayan kullanıcılar
    
    Örnekler:
    - "İlk Rapor" - Kullanıcı ilk raporunu ürettiğinde
    - "Verimlilik Şampiyonu" - Sektörde en iyi %10'da olduğunda
    - "3 Ay Tutarlılığı" - 3 ay üst üste veri girmişse
    - "Tedarikçi Mavisi" - 5+ tedarikçi invite etmişse
    """
    
    __tablename__ = "badges"
    
    id = Column(Integer, primary_key=True, index=True)
    badge_name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)
    icon_emoji = Column(String, nullable=True)  # 🏆, 🌟, ⚡, etc.
    
    # Rozetin unlock şartı
    unlock_condition = Column(String, nullable=True)  # "first_report", "efficiency_top10", etc.
    category = Column(String, nullable=True, index=True)  # "achievement", "efficiency", "engagement"
    
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # İlişkiler
    user_badges = relationship("UserBadge", back_populates="badge", cascade="all, delete-orphan")


class UserBadge(Base):
    """
    Kullanıcıların kazandığı rozetler
    
    Örneğin:
    - user_id=5, badge_id=1 (İlk Rapor)
    - earned_at=2024-01-15
    """
    
    __tablename__ = "user_badges"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    badge_id = Column(Integer, ForeignKey("badges.id"), nullable=False, index=True)
    
    # Rozetin kazanılıp kazanılmadığı + tarih
    earned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    displayed = Column(Boolean, default=True)  # Kullanıcı profilde göstermek istiyor mu?
    
    # İlişkiler
    user = relationship("User")
    badge = relationship("Badge", back_populates="user_badges")


class LeaderboardEntry(Base):
    """
    Sektör sıralaması cache'i (performans için)
    
    Günde bir kez güncellenir. Sorgulamalar buradaki ön-hesaplanmış verileri kullanır.
    
    Sıralamanın kriteri:
    - Sektör+Bölge bazında
    - Metrik: kWh/çalışan, CO2e/çalışan, vb.
    - Top 100 tutulur
    """
    
    __tablename__ = "leaderboard_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # Sıralama kriterleri
    industry_type = Column(Enum(IndustryType), nullable=False, index=True)
    region = Column(String, nullable=True, index=True)  # İstanbul, Ankara, etc.
    
    # Sıralama metrikleri
    rank = Column(Integer, nullable=False)  # 1, 2, 3, ...
    efficiency_score = Column(Float, nullable=False)  # 0-100
    emissions_per_employee_kwh = Column(Float, nullable=True)
    
    # Cache süresi
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # İlişkiler
    company = relationship("Company")


# ===== Data Quality & Event Log =====
class DataQualityIssue(Base):
    __tablename__ = "data_quality_issues"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=True, index=True)
    field = Column(String, nullable=True)
    code = Column(String, nullable=False)
    message = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class EventLog(Base):
    __tablename__ = "event_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, unique=True, index=True)
    event_type = Column(String, index=True)
    status = Column(String, default="received", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)