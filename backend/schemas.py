# backend/schemas.py
from pydantic import BaseModel, EmailStr, Field

# -- User Schemas --

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72)

class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True # SQLAlchemy modelleriyle uyumlu çalışmasını sağlar