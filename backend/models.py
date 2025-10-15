# backend/models.py

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Date, Enum, Float, Table 
from sqlalchemy.orm import relationship
import enum
from database import Base

class ActivityType(str, enum.Enum):
    electricity = "electricity"
    natural_gas = "natural_gas"
    diesel_fuel = "diesel_fuel"

company_members_association = Table(
    'company_members',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('company_id', Integer, ForeignKey('companies.id'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

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
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="owned_companies")
    facilities = relationship("Facility", back_populates="company")

    # YENİ: Şirketin üyesi olan kullanıcılar
    members = relationship(
        "User", secondary=company_members_association, back_populates="member_of_companies"
    )

class Facility(Base):
    __tablename__ = "facilities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    city = Column(String)
    address = Column(String)
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