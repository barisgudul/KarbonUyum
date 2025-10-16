# backend/main.py

from datetime import timedelta
from typing import List

from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, HTTPException, status, Response
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
from database import get_db
import auth_utils # <-- YENİ GÜVENLİK GÖREVLİMİZİ IMPORT EDİYORUZ

app = FastAPI(title="KarbonUyum API", version="0.4.0") # Sürüm güncellendi

# ... (CORS ayarları aynı) ...
origins = ["http://localhost", "http://localhost:3000", "http://localhost:3001"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ... (read_root, login, create_user, create_company fonksiyonları aynı) ...
@app.get("/")
def read_root(): return {"status": "ok", "message": "KarbonUyum API v0.4.0 çalışıyor."}

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user: raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/companies/", response_model=schemas.Company, status_code=status.HTTP_201_CREATED)
def create_company_for_user(
    company: schemas.CompanyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return crud.create_user_company(db=db, company=company, user_id=current_user.id)

@app.post("/companies/{company_id}/facilities/", response_model=schemas.Facility, status_code=status.HTTP_201_CREATED)
def create_facility_for_company(
    facility: schemas.FacilityCreate,
    db: Session = Depends(get_db),
    # Dependency: Bu fonksiyon çalışmadan önce, güvenlik görevlisi kullanıcıyı kontrol eder.
    db_company: models.Company = Depends(auth_utils.get_company_if_member)
):
    # Artık 'if owner_id ...' kontrolüne gerek yok!
    return crud.create_company_facility(db=db, facility=facility, company_id=db_company.id)


@app.get("/companies/{company_id}/members", response_model=List[schemas.CompanyMember])
def get_company_members(
    db_company: models.Company = Depends(auth_utils.get_company_if_member)
):
    return db_company.members

@app.post("/companies/{company_id}/members", response_model=schemas.CompanyMember)
def add_company_member(
    company_id: int,
    request: schemas.AddMemberRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Güvenlik Kontrolü 1: İşlemi yapan kişi şirketin üyesi mi?
    db_company = auth_utils.get_company_if_member(company_id, db, current_user)

    # Güvenlik Kontrolü 2: Sadece şirket sahibi yeni üye ekleyebilir.
    if db_company.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the company owner can add new members")

    new_member = crud.get_user_by_email(db, email=request.email)
    if not new_member:
        raise HTTPException(status_code=404, detail="User with this email not found")

    if any(m.id == new_member.id for m in db_company.members):
        raise HTTPException(status_code=400, detail="User is already a member")

    # Üyeyi yeni rolüyle ekle
    crud.add_member_to_company(db, new_member, db_company, request.role)

    # Eklenen üyenin rol bilgisini de içeren cevabı döndür
    return {"email": new_member.email, "role": request.role}

@app.post("/facilities/{facility_id}/activity-data/", response_model=schemas.ActivityData, status_code=status.HTTP_201_CREATED)
def create_activity_data_for_facility(
    facility_id: int,
    activity_data: schemas.ActivityDataCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_facility = crud.get_facility_by_id(db, facility_id=facility_id)
    if not db_facility: raise HTTPException(status_code=404, detail="Facility not found")

    # Güvenlik Kontrolü: Kullanıcı, tesisin ait olduğu şirketin üyesi mi?
    auth_utils.check_user_role(db_facility.company.id, db, current_user, allowed_roles=[
        models.CompanyMemberRole.admin, models.CompanyMemberRole.data_entry
    ])

    # Climatiq API çağrısı
    try:
        CLIMATIQ_API_KEY = os.getenv("CLIMATIQ_API_KEY")
        if not CLIMATIQ_API_KEY:
            raise ValueError("Climatiq API key not set in.env file")

        headers = {"Authorization": f"Bearer {CLIMATIQ_API_KEY}"}

        if activity_data.activity_type == models.ActivityType.electricity:
            emission_factor_payload = {
                "activity_id": "electricity-supply_grid-source_supplier_mix",
                "region": "TR",
                "data_version": "^26"
            }
            params_payload = {"energy": activity_data.quantity, "energy_unit": activity_data.unit}

        elif activity_data.activity_type == models.ActivityType.natural_gas:
            emission_factor_payload = {
                # DÜZELTME: 'fuel_usage' ve 'stationary_combustion' hatalıydı.
                # Climatiq normalizasyonuna göre doğru ID 'fuel_use_stationary' olmalıdır.
                "activity_id": "fuel-type_natural_gas-fuel_use_stationary",
                "data_version": "^1"
            }
            params_payload = {"volume": activity_data.quantity, "volume_unit": activity_data.unit}

        elif activity_data.activity_type == models.ActivityType.diesel_fuel:
            emission_factor_payload = {
                # DÜZELTME: 'diesel' yerine 'diesel_oil' kullanılmalıdır.
                "activity_id": "fuel-type_diesel_oil-fuel_use_stationary_combustion",
                "data_version": "^14"
            }
            params_payload = {"volume": activity_data.quantity, "volume_unit": activity_data.unit}
        else:
            raise HTTPException(status_code=400, detail=f"Activity type '{activity_data.activity_type}' not supported yet.")

        api_payload = { "emission_factor": emission_factor_payload, "parameters": params_payload }

        response = requests.post("https://api.climatiq.io/data/v1/estimate", headers=headers, json=api_payload)
        response.raise_for_status()

        result_data = response.json()
        
        calculated_co2e_kg = result_data.get("co2e")
        if calculated_co2e_kg is None:
            raise ValueError("CO2e value not found in Climatiq response")

    except requests.exceptions.RequestException as e:
        if e.response is not None:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Climatiq API Error: {e.response.text}")
        else:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Could not connect to Climatiq API: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during CO2e calculation: {e}")

    return crud.create_facility_activity_data(
        db=db,
        activity_data=activity_data,
        facility_id=facility_id,
        co2e_kg=calculated_co2e_kg
    )

@app.put("/companies/{company_id}", response_model=schemas.Company)
def update_company(company_id: int, company: schemas.CompanyCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_company = crud.get_company_by_id(db, company_id=company_id)
    if not db_company: raise HTTPException(status_code=404, detail="Company not found")
    # Güvenlik Kontrolü: Kullanıcı şirketin üyesi mi?
    auth_utils.check_user_role(company_id, db, current_user, allowed_roles=[
        models.CompanyMemberRole.admin, models.CompanyMemberRole.owner
    ])
    return crud.update_company(db=db, company_id=company_id, company_data=company)


@app.put("/facilities/{facility_id}", response_model=schemas.Facility)
def update_facility(facility_id: int, facility: schemas.FacilityCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_facility = crud.get_facility_by_id(db, facility_id=facility_id)
    if not db_facility: raise HTTPException(status_code=404, detail="Facility not found")
    # Güvenlik Kontrolü: Kullanıcı tesisin ait olduğu şirketin üyesi mi?
    auth_utils.check_user_role(db_facility.company.id, db, current_user, allowed_roles=[
        models.CompanyMemberRole.admin, models.CompanyMemberRole.owner
    ])
    return crud.update_facility(db=db, facility_id=facility_id, facility_data=facility)


@app.put("/activity-data/{data_id}", response_model=schemas.ActivityData)
def update_activity_data(data_id: int, activity_data: schemas.ActivityDataCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_data = crud.get_activity_data_by_id(db, data_id=data_id)
    if not db_data: raise HTTPException(status_code=404, detail="Activity data not found")
    # Güvenlik Kontrolü: Kullanıcı verinin ait olduğu tesisin şirketinin üyesi mi?
    auth_utils.check_user_role(db_data.facility.company.id, db, current_user, allowed_roles=[
        models.CompanyMemberRole.admin, models.CompanyMemberRole.data_entry
    ])

    # CO2e yeniden hesaplama
    try:
        CLIMATIQ_API_KEY = os.getenv("CLIMATIQ_API_KEY")
        if not CLIMATIQ_API_KEY:
            raise ValueError("Climatiq API key not set in.env file")

        headers = {"Authorization": f"Bearer {CLIMATIQ_API_KEY}"}

        if activity_data.activity_type == models.ActivityType.electricity:
            emission_factor_payload = {
                "activity_id": "electricity-supply_grid-source_supplier_mix",
                "region": "TR",
                "data_version": "^26"
            }
            params_payload = {"energy": activity_data.quantity, "energy_unit": activity_data.unit}

        elif activity_data.activity_type == models.ActivityType.natural_gas:
            emission_factor_payload = {
                # DÜZELTME: 'fuel_usage' ve 'stationary_combustion' hatalıydı.
                # Climatiq normalizasyonuna göre doğru ID 'fuel_use_stationary' olmalıdır.
                "activity_id": "fuel-type_natural_gas-fuel_use_stationary",
                "data_version": "^1"
            }
            params_payload = {"volume": activity_data.quantity, "volume_unit": activity_data.unit}

        elif activity_data.activity_type == models.ActivityType.diesel_fuel:
            emission_factor_payload = {
                # DÜZELTME: 'diesel' yerine 'diesel_oil' kullanılmalıdır.
                "activity_id": "fuel-type_diesel_oil-fuel_use_stationary_combustion",
                "data_version": "^14"
            }
            params_payload = {"volume": activity_data.quantity, "volume_unit": activity_data.unit}
        else:
            raise HTTPException(status_code=400, detail=f"Activity type '{activity_data.activity_type}' not supported yet.")

        api_payload = {"emission_factor": emission_factor_payload, "parameters": params_payload}
        response = requests.post("https://api.climatiq.io/data/v1/estimate", headers=headers, json=api_payload)
        response.raise_for_status()
        result_data = response.json()

        calculated_co2e_kg = result_data.get("co2e")
        if calculated_co2e_kg is None:
            raise ValueError("CO2e value not found in Climatiq response")

    except requests.exceptions.RequestException as e:
        if e.response is not None: raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Climatiq API Error: {e.response.text}")
        else: raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Could not connect to Climatiq API: {e}")
    except Exception as e: raise HTTPException(status_code=500, detail=f"An unexpected error occurred during CO2e recalculation: {e}")

    return crud.update_activity_data(db=db, data_id=data_id, activity_data=activity_data, new_co2e_kg=calculated_co2e_kg)

@app.get("/dashboard/summary", response_model=schemas.DashboardSummary)
def get_summary_for_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Giriş yapmış kullanıcının tüm verilerini özetleyerek
    dashboard için analitik veriler sunar.
    """
    return crud.get_dashboard_summary(db=db, user_id=current_user.id)


@app.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(company_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_company = crud.get_company_by_id(db, company_id=company_id)
    if not db_company: raise HTTPException(status_code=404, detail="Company not found")
    # Güvenlik Kontrolü: Sadece şirket sahibi şirketi silebilir
    if db_company.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the company owner can delete the company")
    crud.delete_company(db=db, company_id=company_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.delete("/facilities/{facility_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_facility(facility_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_facility = crud.get_facility_by_id(db, facility_id=facility_id)
    if not db_facility: raise HTTPException(status_code=404, detail="Facility not found")
    # Güvenlik Kontrolü: Sadece şirket sahibi tesisleri silebilir
    if db_facility.company.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the company owner can delete facilities")
    crud.delete_facility(db=db, facility_id=facility_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.delete("/activity-data/{data_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity_data(data_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_data = crud.get_activity_data_by_id(db, data_id=data_id)
    if not db_data: raise HTTPException(status_code=404, detail="Activity data not found")
    # Güvenlik Kontrolü: Sadece admin ve data_entry kullanıcıları veri silebilir
    auth_utils.check_user_role(db_data.facility.company.id, db, current_user, allowed_roles=[
        models.CompanyMemberRole.admin, models.CompanyMemberRole.data_entry
    ])
    crud.delete_activity_data(db=db, data_id=data_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@app.get("/users/me/", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# --- DEĞİŞİKLİKLER BURADAN BAŞLIYOR ---

# ... (Diğer tüm endpoint'leri (POST, PUT, DELETE) bu yeni dependency yapısına göre refactor et) ...
# Örnek: Tesis Silme için yeni yapı
@app.delete("/facilities/{facility_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_facility(
    facility_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_facility = crud.get_facility_by_id(db, facility_id=facility_id)
    if not db_facility: raise HTTPException(status_code=404, detail="Facility not found")

    # Güvenlik Kontrolü: Kullanıcı, tesisin ait olduğu şirketin üyesi mi?
    auth_utils.check_user_role(db_facility.company.id, db, current_user, allowed_roles=[
        models.CompanyMemberRole.admin
    ])

    crud.delete_facility(db=db, facility_id=facility_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)