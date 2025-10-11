# backend/models.py

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    # Bir kullanıcının sahip olduğu şirketler
    companies = relationship("Company", back_populates="owner")

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    tax_number = Column(String, unique=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))

    # Bir şirketin sahibi olan kullanıcı
    owner = relationship("User", back_populates="companies")
    
    # Bir şirkete ait olan tesisler
    facilities = relationship("Facility", back_populates="company")

class Facility(Base):
    __tablename__ = "facilities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    city = Column(String)
    address = Column(String)
    company_id = Column(Integer, ForeignKey("companies.id"))

    # Bir tesisin ait olduğu şirket
    company = relationship("Company", back_populates="facilities")