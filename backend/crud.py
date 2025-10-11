# backend/crud.py
from sqlalchemy.orm import Session
import models, schemas, auth # auth'u import et

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    # auth.py'deki pwd_context'i kullan
    hashed_password = auth.pwd_context.hash(user.password) 
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_company_by_id(db: Session, company_id: int):
    return db.query(models.Company).filter(models.Company.id == company_id).first()

def get_companies_by_owner(db: Session, owner_id: int):
    return db.query(models.Company).filter(models.Company.owner_id == owner_id).all()

def create_user_company(db: Session, company: schemas.CompanyCreate, user_id: int):
    db_company = models.Company(**company.model_dump(), owner_id=user_id)
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

def create_company_facility(db: Session, facility: schemas.FacilityCreate, company_id: int):
    db_facility = models.Facility(**facility.model_dump(), company_id=company_id)
    db.add(db_facility)
    db.commit()
    db.refresh(db_facility)
    return db_facility