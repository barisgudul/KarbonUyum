# backend/crud.py
from sqlalchemy.orm import Session
from sqlalchemy import func # <-- YENİ
from datetime import datetime, date, timedelta # <-- datetime, date ve timedelta eklendi
import models, schemas, auth 

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


def create_facility_activity_data(db: Session, activity_data: schemas.ActivityDataCreate, facility_id: int, co2e_kg: float):
    db_activity_data = models.ActivityData(
        **activity_data.model_dump(), 
        facility_id=facility_id,
        calculated_co2e_kg=co2e_kg
    )
    db.add(db_activity_data)
    db.commit()
    db.refresh(db_activity_data)
    return db_activity_data

def get_facility_by_id(db: Session, facility_id: int):
    return db.query(models.Facility).filter(models.Facility.id == facility_id).first()


def get_dashboard_summary(db: Session, user_id: int):
    # NOT: SQLite/PostgreSQL uyumluluğu için `strftime` yerine `to_char` veya `EXTRACT` kullanmak gerekebilir.
    # Python 3.14/SQLite uyumluluğu için basit strftime kullandık.

    # Kullanıcının sahip olduğu tüm tesis ID'lerini al
    facility_ids = db.query(models.Facility.id).join(models.Company).filter(models.Company.owner_id == user_id).subquery()

    # Aylık emisyonları gruplayarak hesapla
    # PostgreSQL için: func.to_char(models.ActivityData.start_date, 'YYYY-MM')
    # SQLite/Genel için: func.strftime("%Y-%m", models.ActivityData.start_date)
    
    # Platform bağımsızlığı için denenen basit bir aylık gruplama (eğer hata verirse PostgreSQL'e özgü `to_char` kullanırız)
    monthly_trend_query = (
        db.query(
            func.to_char(models.ActivityData.start_date, 'YYYY-MM').label("month"),
            func.sum(models.ActivityData.calculated_co2e_kg).label("total_co2e_kg"),
        )
        .filter(models.ActivityData.facility_id.in_(facility_ids))
        .group_by("month")
        .order_by("month")
        .all()
    )
    
    # Sorgu sonucunu Pydantic modeline uygun hale getir
    monthly_trend = [{"month": row.month, "total_co2e_kg": row.total_co2e_kg} for row in monthly_trend_query]

    # Mevcut ve önceki ay toplamlarını bul
    today = date.today()
    current_month_str = today.strftime("%Y-%m")
    
    # Önceki ayı hesapla
    first_day_of_current_month = today.replace(day=1)
    last_day_of_previous_month = first_day_of_current_month - timedelta(days=1)
    previous_month_str = last_day_of_previous_month.strftime("%Y-%m")

    # Listeden aylık toplamları çıkar (Eğer veri yoksa 0.0 olarak ayarla)
    current_month_total = next((item['total_co2e_kg'] for item in monthly_trend if item['month'] == current_month_str), 0.0)
    previous_month_total = next((item['total_co2e_kg'] for item in monthly_trend if item['month'] == previous_month_str), 0.0)

    return {
        "current_month_total": current_month_total,
        "previous_month_total": previous_month_total,
        "monthly_trend": monthly_trend
    }