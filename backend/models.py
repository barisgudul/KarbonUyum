# backend/models.py

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Date, Enum, Float, Table 
from sqlalchemy.orm import relationship
import enum
from database import Base

class ActivityType(str, enum.Enum):
    electricity = "electricity"
    natural_gas = "natural_gas"
    diesel_fuel = "diesel_fuel"

class CompanyMemberRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    data_entry = "data_entry"
    viewer = "viewer"


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
    industry_type = Column(Enum(IndustryType), nullable=True)
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
    city = Column(String)
    address = Column(String)
    facility_type = Column(Enum(FacilityType), default=FacilityType.production)
    surface_area_m2 = Column(Float, nullable=True) # Isıtılan/Soğutulan alan metrekare
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
    
    # Hesaplama sonucu burada saklanacak
    calculated_co2e_kg = Column(Float)

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

class EmissionFactor(Base):
    __tablename__ = "emission_factors"
    key = Column(String, primary_key=True, index=True) # Örn: "electricity_grid_TUR", "natural_gas_residential_TUR"
    value = Column(Float, nullable=False) # kg CO2e / birim (kWh, m3, litre)
    unit = Column(String, nullable=False) # Örn: "kWh", "m3", "litre"
    source = Column(String, nullable=True) # Örn: "TÜİK", "IEA"
    year = Column(Integer, nullable=True) # Verinin ait olduğu yıl (isteğe bağlı)
    description = Column(String, nullable=True)