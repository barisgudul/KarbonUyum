# backend/crud.py
from sqlalchemy.orm import Session
from sqlalchemy import func 
from datetime import datetime, date, timedelta 
from fastapi import HTTPException
import models, schemas, auth
import suggestion_engine 
from typing import Optional, List

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
    # 1. Şirket nesnesini oluştur
    db_company = models.Company(**company.model_dump(), owner_id=user_id)
    db.add(db_company)
    
    # 2. Veritabanına "flush" et. Bu, transaction'ı bitirmeden şirkete bir ID atanmasını sağlar.
    db.flush()

    # 3. Şimdi, ID'si belli olan şirkete, sahibini 'owner' rolüyle üye olarak ekle
    # Doğrudan ara tabloya (association table) ekleme yapıyoruz.
    insert_stmt = models.company_members_association.insert().values(
        user_id=user_id,
        company_id=db_company.id,
        role=models.CompanyMemberRole.owner  # Rolü 'owner' olarak ata
    )
    db.execute(insert_stmt)

    # 4. Tüm işlemleri veritabanına kaydet
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
    # Artık ÜYE olunan tüm şirketleri alıyor
    facility_ids = (
        db.query(models.Facility.id)
        .join(models.Company)
        .join(models.Company.members)
        .filter(models.User.id == user_id)
        .subquery()
    )
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

# -- Suggestion Parameter CRUD --

def get_suggestion_parameter_by_key(db: Session, key: str) -> Optional[models.SuggestionParameter]:
    return db.query(models.SuggestionParameter).filter(models.SuggestionParameter.key == key).first()

def create_suggestion_parameter(db: Session, param: schemas.SuggestionParameterCreate) -> models.SuggestionParameter:
    db_param = models.SuggestionParameter(**param.model_dump())
    db.add(db_param)
    db.commit()
    db.refresh(db_param)
    return db_param

def update_suggestion_parameter(db: Session, key: str, param_data: schemas.SuggestionParameterUpdate) -> Optional[models.SuggestionParameter]:
    db_param = get_suggestion_parameter_by_key(db, key)
    if db_param:
        db_param.value = param_data.value
        if param_data.description is not None:
            db_param.description = param_data.description
        db.commit()
        db.refresh(db_param)
    return db_param

def delete_suggestion_parameter(db: Session, key: str):
    db_param = get_suggestion_parameter_by_key(db, key)
    if db_param:
        db.delete(db_param)
        db.commit()
    return db_param

# -- Emission Factor CRUD --

def get_emission_factor_by_key(db: Session, key: str) -> Optional[models.EmissionFactor]:
    return db.query(models.EmissionFactor).filter(models.EmissionFactor.key == key).first()

def get_all_emission_factors(db: Session) -> dict[str, models.EmissionFactor]:
    """Veritabanındaki tüm emisyon faktörlerini bir sözlük olarak döndürür."""
    factors = db.query(models.EmissionFactor).all()
    return {f.key: f for f in factors}

def create_emission_factor(db: Session, factor: schemas.EmissionFactorCreate) -> models.EmissionFactor:
    db_factor = models.EmissionFactor(**factor.model_dump())
    db.add(db_factor)
    db.commit()
    db.refresh(db_factor)
    return db_factor

def update_emission_factor(db: Session, key: str, factor_data: schemas.EmissionFactorUpdate) -> Optional[models.EmissionFactor]:
    db_factor = get_emission_factor_by_key(db, key)
    if db_factor:
        update_data = factor_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_factor, key, value)
        db.commit()
        db.refresh(db_factor)
    return db_factor

def delete_emission_factor(db: Session, key: str):
    db_factor = get_emission_factor_by_key(db, key)
    if db_factor:
        db.delete(db_factor)
        db.commit()
    return db_factor

# -- Sustainability Target CRUD --

def create_target(db: Session, company_id: int, target: schemas.SustainabilityTargetCreate) -> models.SustainabilityTarget:
    # Burada baseline_value'yu hesaplamak için bir servis çağrısı yapılabilir.
    # Şimdilik None olarak bırakıyoruz.
    db_target = models.SustainabilityTarget(
        **target.model_dump(),
        company_id=company_id,
        baseline_value=None # TODO: Calculate baseline value
    )
    db.add(db_target)
    db.commit()
    db.refresh(db_target)
    return db_target

def get_company_targets(db: Session, company_id: int) -> List[models.SustainabilityTarget]:
    return db.query(models.SustainabilityTarget).filter(models.SustainabilityTarget.company_id == company_id).all()

def get_target(db: Session, target_id: int) -> Optional[models.SustainabilityTarget]:
    return db.query(models.SustainabilityTarget).filter(models.SustainabilityTarget.id == target_id).first()

def update_target(db: Session, target_id: int, target_data: schemas.SustainabilityTargetCreate) -> Optional[models.SustainabilityTarget]:
    db_target = get_target(db, target_id)
    if db_target:
        update_data = target_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_target, key, value)
        db.commit()
        db.refresh(db_target)
    return db_target

def delete_target(db: Session, target_id: int):
    db_target = get_target(db, target_id)
    if db_target:
        db.delete(db_target)
        db.commit()
    return db_target


def delete_company(db: Session, company_id: int):
    db_company = get_company_by_id(db, company_id=company_id)
    if not db_company:
        return None
    # Güvenlik: Şirketin altında tesis varsa silmeyi engelle
    if db_company.facilities:
        raise HTTPException(status_code=400, detail="Cannot delete company with associated facilities. Please delete facilities first.")
    db.delete(db_company)
    db.commit()
    return db_company

def delete_facility(db: Session, facility_id: int):
    db_facility = get_facility_by_id(db, facility_id=facility_id)
    if not db_facility:
        return None
    # Güvenlik: Tesisin altında aktivite verisi varsa silmeyi engelle
    if db_facility.activity_data:
        raise HTTPException(status_code=400, detail="Cannot delete facility with associated activity data. Please delete data first.")
    db.delete(db_facility)
    db.commit()
    return db_facility

def get_activity_data_by_id(db: Session, data_id: int):
    return db.query(models.ActivityData).filter(models.ActivityData.id == data_id).first()

def delete_activity_data(db: Session, data_id: int):
    db_activity_data = get_activity_data_by_id(db, data_id=data_id)
    if not db_activity_data:
        return None
    db.delete(db_activity_data)
    db.commit()
    return db_activity_data


def update_company(db: Session, company_id: int, company_data: schemas.CompanyCreate):
    db_company = get_company_by_id(db, company_id=company_id)
    if not db_company:
        return None
    
    # Gelen verilerle mevcut kaydı güncelle
    db_company.name = company_data.name
    db_company.tax_number = company_data.tax_number
    
    db.commit()
    db.refresh(db_company)
    return db_company

def update_facility(db: Session, facility_id: int, facility_data: schemas.FacilityCreate):
    db_facility = get_facility_by_id(db, facility_id=facility_id)
    if not db_facility:
        return None
        
    db_facility.name = facility_data.name
    db_facility.city = facility_data.city
    db_facility.address = facility_data.address
    
    db.commit()
    db.refresh(db_facility)
    return db_facility

def update_activity_data(db: Session, data_id: int, activity_data: schemas.ActivityDataCreate, new_co2e_kg: float):
    db_activity_data = get_activity_data_by_id(db, data_id=data_id)
    if not db_activity_data:
        return None

    db_activity_data.activity_type = activity_data.activity_type
    db_activity_data.quantity = activity_data.quantity
    db_activity_data.unit = activity_data.unit
    db_activity_data.start_date = activity_data.start_date
    db_activity_data.end_date = activity_data.end_date

    # ÖNEMLİ: Miktar değiştiği için karbon emisyonunu da yeniden hesaplanmış haliyle güncelliyoruz.
    db_activity_data.calculated_co2e_kg = new_co2e_kg

    db.commit()
    db.refresh(db_activity_data)
    return db_activity_data


def get_company_members_with_roles(db: Session, company_id: int):
    members = db.query(
        models.User,
        models.company_members_association.c.role
    ).join(
        models.company_members_association,
        models.User.id == models.company_members_association.c.user_id
    ).filter(
        models.company_members_association.c.company_id == company_id
    ).all()
    
    # Sorgu sonucunu Pydantic modeline uygun hale getir
    return [{"email": user.email, "role": role} for user, role in members]

def add_member_to_company(db: Session, user: models.User, company: models.Company, role: models.CompanyMemberRole):
    insert_stmt = models.company_members_association.insert().values(
        user_id=user.id,
        company_id=company.id,
        role=role
    )
    db.execute(insert_stmt)
    db.commit()

def upsert_company_financials(db: Session, company_id: int, financials_data: schemas.CompanyFinancialsCreate) -> models.CompanyFinancials:
    """
    Bir şirket için finansal verileri oluşturur veya günceller (Upsert).
    """
    # Mevcut bir kayıt var mı diye kontrol et
    db_financials = db.query(models.CompanyFinancials).filter(models.CompanyFinancials.company_id == company_id).first()
    
    if db_financials:
        # Varsa, güncelle
        db_financials.avg_electricity_cost_kwh = financials_data.avg_electricity_cost_kwh
        db_financials.avg_gas_cost_m3 = financials_data.avg_gas_cost_m3
    else:
        # Yoksa, yeni oluştur
        db_financials = models.CompanyFinancials(
            company_id=company_id,
            **financials_data.model_dump()
        )
        db.add(db_financials)
        
    db.commit()
    db.refresh(db_financials)
    return db_financials


def get_suggestions_for_company(db: Session, company_id: int) -> list[str]:
    """
    Bir şirket için kişiselleştirilmiş öneriler oluşturur.
    """
    # Şirketi, finansal bilgileriyle birlikte tek bir sorguda çek (eager loading)
    from sqlalchemy.orm import joinedload

    db_company = db.query(models.Company).options(
        joinedload(models.Company.financials)
    ).filter(models.Company.id == company_id).first()

    if not db_company:
        return ["Şirket bulunamadı."] # Hata durumu için bir mesaj

    return suggestion_engine.generate_suggestions(company=db_company, db=db)


def get_all_suggestion_parameters(db: Session) -> dict:
    """Veritabanındaki tüm öneri parametrelerini bir sözlük olarak döndürür."""
    params = db.query(models.SuggestionParameter).all()
    return {p.key: p.value for p in params}