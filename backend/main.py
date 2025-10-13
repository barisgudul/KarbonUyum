# backend/main.py

from datetime import timedelta
from typing import List

from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

# Gerekli Kütüphaneler
import requests
import os
import logging # Detaylı loglama için eklendi

# Diğer Proje Dosyaları
import auth
import crud
import models
import schemas
from database import SessionLocal, engine


models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KarbonUyum API",
    version="0.2.1" # Sürüm güncellendi
)

origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Dependency: Her request için bir veritabanı session'ı oluşturur
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "KarbonUyum API v0.2.1 çalışıyor."}

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/companies/", response_model=schemas.Company, status_code=status.HTTP_201_CREATED)
def create_company_for_user(
    company: schemas.CompanyCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    return crud.create_user_company(db=db, company=company, user_id=current_user.id)

@app.post("/companies/{company_id}/facilities/", response_model=schemas.Facility, status_code=status.HTTP_201_CREATED)
def create_facility_for_company(
    company_id: int,
    facility: schemas.FacilityCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    db_company = crud.get_company_by_id(db, company_id=company_id)
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    if db_company.owner_id!= current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add facility to this company")
    
    return crud.create_company_facility(db=db, facility=facility, company_id=company_id)

@app.post("/facilities/{facility_id}/activity-data/", response_model=schemas.ActivityData, status_code=status.HTTP_201_CREATED)
def create_activity_data_for_facility(
    facility_id: int,
    activity_data: schemas.ActivityDataCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    # 1. Tesisin varlığını ve sahipliğini kontrol et
    db_facility = crud.get_facility_by_id(db, facility_id=facility_id)
    if not db_facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    
    db_company = crud.get_company_by_id(db, company_id=db_facility.company_id)
    if db_company.owner_id!= current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add data to this facility")

    # 2. Climatiq API ile emisyonu hesapla (requests kullanarak)
    try:
        CLIMATIQ_API_KEY = os.getenv("CLIMATIQ_API_KEY")
        if not CLIMATIQ_API_KEY:
            raise ValueError("Climatiq API key not set in.env file")

        headers = {
            "Authorization": f"Bearer {CLIMATIQ_API_KEY}"
        }

        if activity_data.activity_type == "electricity":
            emission_factor_payload = {
                # DÜZELTME: 'electricity-energy_source_grid_mix' eski ve geçersiz bir ID'dir.
                # Climatiq veri seti değişikliklerine göre güncellenmiş ve geçerli ID kullanıldı.
                "activity_id": "electricity-supply_grid-source_supplier_mix",
                "region": "TR",
                # EKLEME: API çağrılarında tutarlılığı sağlamak için veri sürümü belirtmek en iyi pratiktir.
                "data_version": "^26" 
            }
            params_payload = {
                "energy": activity_data.quantity,
                "energy_unit": activity_data.unit
            }
        else:
            raise HTTPException(status_code=400, detail=f"Activity type '{activity_data.activity_type}' not supported yet.")
        
        # Climatiq API için doğru JSON formatı
        api_payload = {
            "emission_factor": emission_factor_payload,
            "parameters": params_payload
        }
        
        response = requests.post(
            "https://api.climatiq.io/data/v1/estimate",
            headers=headers,
            json=api_payload
        )
        response.raise_for_status()
        
        result_data = response.json()
        co2e_kg = result_data.get("co2e")
        if co2e_kg is None:
            raise ValueError("CO2e value not found in Climatiq response")

    except requests.exceptions.RequestException as e:
        # DÜZELTME: Hata yönetimini iyileştir. Climatiq'ten gelen hatayı doğrudan yansıt.
        # Bu, "503 Service Unavailable" yerine gerçek "400 Bad Request" hatasını görmemizi sağlar.
        if e.response is not None:
            # Climatiq'ten gelen hatanın detayını logla ve kullanıcıya yansıt
            detail_message = f"Climatiq API Error: {e.response.status_code} - {e.response.text}"
            logging.error(f"Climatiq API request failed. Payload: {api_payload}. Response: {detail_message}")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail_message)
        else:
            # Ağ hatası gibi durumlarda genel hata mesajı
            detail_message = f"Could not connect to Climatiq API: {e}"
            logging.error(detail_message)
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail_message)

    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

    # 3. Hesaplanan sonuçla birlikte veriyi veritabanına kaydet
    return crud.create_facility_activity_data(
        db=db, 
        activity_data=activity_data, 
        facility_id=facility_id, 
        co2e_kg=co2e_kg
    )

@app.get("/dashboard/summary", response_model=schemas.DashboardSummary)
def get_summary_for_dashboard(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """
    Giriş yapmış kullanıcının tüm verilerini özetleyerek
    dashboard için analitik veriler sunar.
    """
    return crud.get_dashboard_summary(db=db, user_id=current_user.id)

@app.get("/users/me/", response_model=schemas.User)
def read_users_me(current_user: schemas.User = Depends(auth.get_current_user)):
    return current_user