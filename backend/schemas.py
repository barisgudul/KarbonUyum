# backend/schemas.py

from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

# -- User Schemas --

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72)


class User(UserBase):
    id: int
    is_active: bool
    companies: List[Company] = [] # Kullanıcı bilgilerini çekerken şirketleri de getir

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[EmailStr] = None

# ... mevcut şemaların altına ...

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

    class Config:
        from_attributes = True

class CompanyBase(BaseModel):
    name: str
    tax_number: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    id: int
    owner_id: int
    facilities: List[Facility] = [] # Şirket bilgilerini çekerken tesisleri de getir

    class Config:
        from_attributes = True