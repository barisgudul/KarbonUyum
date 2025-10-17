# backend/main.py
import logging
from datetime import timedelta
from typing import List, Union
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

# Gerekli Kütüphaneler

# Diğer Proje Dosyaları
import auth
import crud
import models
import schemas
from database import get_db
import auth_utils 
from carbon_calculator import get_calculator, CarbonCalculator
from fastapi import APIRouter # import APIRouter
from sqladmin import Admin, ModelView
from database import engine
from backend.services.benchmarking_service import BenchmarkingService

# --- Loglama Yapılandırması ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
# -----------------------------


app = FastAPI(title="KarbonUyum API", version="0.4.0") # Sürüm güncellendi

admin = Admin(app, engine)

# Yönetim panelinde görmek istediğiniz modelleri tanımlayın
class UserAdmin(ModelView, model=models.User):
    column_list = [models.User.id, models.User.email, models.User.is_superuser]

class SuggestionParameterAdmin(ModelView, model=models.SuggestionParameter):
    column_list = [models.SuggestionParameter.key, models.SuggestionParameter.value, models.SuggestionParameter.description]

class EmissionFactorAdmin(ModelView, model=models.EmissionFactor):
    column_list = [models.EmissionFactor.key, models.EmissionFactor.value, models.EmissionFactor.unit, models.EmissionFactor.source, models.EmissionFactor.year]

# Modelleri admin paneline ekleyin
admin.add_view(UserAdmin)
admin.add_view(SuggestionParameterAdmin)
admin.add_view(EmissionFactorAdmin)

# Yeni bir router oluşturun, böylece yönetici endpoint'leri ayrı tutulabilir
admin_router = APIRouter(prefix="/admin", tags=["Admin"])


@admin_router.post("/suggestion-parameters/", response_model=schemas.SuggestionParameter, status_code=status.HTTP_201_CREATED)
def create_param(
    param: schemas.SuggestionParameterCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_superuser)
):
    db_param = crud.get_suggestion_parameter_by_key(db, key=param.key)
    if db_param:
        raise HTTPException(status_code=400, detail="Parameter with this key already exists")
    return crud.create_suggestion_parameter(db=db, param=param)

@admin_router.get("/suggestion-parameters/", response_model=List[schemas.SuggestionParameter])
def read_params(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_superuser)
):
    return db.query(models.SuggestionParameter).all()

@admin_router.put("/suggestion-parameters/{key}", response_model=schemas.SuggestionParameter)
def update_param(
    key: str,
    param: schemas.SuggestionParameterUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_superuser)
):
    db_param = crud.update_suggestion_parameter(db=db, key=key, param_data=param)
    if not db_param:
        raise HTTPException(status_code=404, detail="Parameter not found")
    return db_param

@admin_router.delete("/suggestion-parameters/{key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_param(
    key: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_superuser)
):
    db_param = crud.delete_suggestion_parameter(db=db, key=key)
    if not db_param:
        raise HTTPException(status_code=404, detail="Parameter not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@admin_router.post("/emission-factors/", response_model=schemas.EmissionFactor, status_code=status.HTTP_201_CREATED)
def create_emission_factor_api(
    factor: schemas.EmissionFactorCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_superuser)
):
    db_factor = crud.get_emission_factor_by_key(db, key=factor.key)
    if db_factor:
        raise HTTPException(status_code=400, detail="Emission factor with this key already exists")
    return crud.create_emission_factor(db=db, factor=factor)

@admin_router.get("/emission-factors/", response_model=List[schemas.EmissionFactor])
def read_emission_factors_api(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_superuser)
):
    return db.query(models.EmissionFactor).all()

@admin_router.put("/emission-factors/{key}", response_model=schemas.EmissionFactor)
def update_emission_factor_api(
    key: str,
    factor: schemas.EmissionFactorUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_superuser)
):
    db_factor = crud.update_emission_factor(db=db, key=key, factor_data=factor)
    if not db_factor:
        raise HTTPException(status_code=404, detail="Emission factor not found")
    return db_factor

@admin_router.delete("/emission-factors/{key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_emission_factor_api(
    key: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.require_superuser)
):
    db_factor = crud.delete_emission_factor(db=db, key=key)
    if not db_factor:
        raise HTTPException(status_code=404, detail="Emission factor not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# --- Sustainability Target Endpoints ---

@app.post("/companies/{company_id}/targets/", response_model=schemas.SustainabilityTarget, status_code=status.HTTP_201_CREATED)
def create_sustainability_target(
    company_id: int,
    target: schemas.SustainabilityTargetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    auth_utils.check_user_role(
        company_id, db, current_user, allowed_roles=[models.CompanyMemberRole.admin, models.CompanyMemberRole.owner]
    )
    return crud.create_target(db=db, company_id=company_id, target=target)

@app.get("/companies/{company_id}/targets/", response_model=List[schemas.SustainabilityTarget])
def read_sustainability_targets(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    auth_utils.check_user_role(
        company_id, db, current_user, allowed_roles=[
            models.CompanyMemberRole.admin, models.CompanyMemberRole.owner, 
            models.CompanyMemberRole.data_entry, models.CompanyMemberRole.viewer
        ]
    )
    return crud.get_company_targets(db=db, company_id=company_id)

@app.put("/targets/{target_id}", response_model=schemas.SustainabilityTarget)
def update_sustainability_target(
    target_id: int,
    target: schemas.SustainabilityTargetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_target = crud.get_target(db, target_id)
    if not db_target:
        raise HTTPException(status_code=404, detail="Target not found")
    auth_utils.check_user_role(
        db_target.company_id, db, current_user, allowed_roles=[models.CompanyMemberRole.admin, models.CompanyMemberRole.owner]
    )
    return crud.update_target(db=db, target_id=target_id, target_data=target)

@app.delete("/targets/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sustainability_target(
    target_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_target = crud.get_target(db, target_id)
    if not db_target:
        raise HTTPException(status_code=404, detail="Target not found")
    auth_utils.check_user_role(
        db_target.company_id, db, current_user, allowed_roles=[models.CompanyMemberRole.admin, models.CompanyMemberRole.owner]
    )
    crud.delete_target(db=db, target_id=target_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ... (CORS ayarları aynı) ...
origins = ["http://localhost", "http://localhost:3000", "http://localhost:3001"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Uygulamaya router'ı eklemeyi unutmayın
app.include_router(admin_router)

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

# backend/main.py içerisindeki fonksiyon

@app.post("/facilities/{facility_id}/activity-data/", response_model=schemas.ActivityData, status_code=status.HTTP_201_CREATED)
def create_activity_data_for_facility(
    facility_id: int,
    activity_data: schemas.ActivityDataCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
    calculator: CarbonCalculator = Depends(get_calculator)
):
    db_facility = crud.get_facility_by_id(db, facility_id=facility_id)
    if not db_facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    auth_utils.check_user_role(db_facility.company.id, db, current_user, allowed_roles=[
        models.CompanyMemberRole.admin, models.CompanyMemberRole.data_entry
    ])

    # Tüm karmaşık mantık artık bu tek satırda!
    calculated_co2e_kg = calculator.calculate_co2e(activity_data)

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
def update_activity_data(
    data_id: int,
    activity_data: schemas.ActivityDataCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
    calculator: CarbonCalculator = Depends(get_calculator)
):
    db_data = crud.get_activity_data_by_id(db, data_id=data_id)
    if not db_data:
        raise HTTPException(status_code=404, detail="Activity data not found")

    auth_utils.check_user_role(db_data.facility.company.id, db, current_user, allowed_roles=[
        models.CompanyMemberRole.admin, models.CompanyMemberRole.data_entry
    ])

    # Tüm karmaşık mantık artık bu tek satırda!
    calculated_co2e_kg = calculator.calculate_co2e(activity_data)

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

    # DÜZELTME: "owner" rolü eklendi.
    # Artık şirket sahibi de kendi tesisini silebilir.
    auth_utils.check_user_role(
        db_facility.company.id,
        db,
        current_user,
        allowed_roles=[models.CompanyMemberRole.admin, models.CompanyMemberRole.owner]
    )

    crud.delete_facility(db=db, facility_id=facility_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@app.put("/companies/{company_id}/financials", response_model=schemas.CompanyFinancials)
def update_company_financials(
    company_id: int,
    financials_data: schemas.CompanyFinancialsCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Bir şirketin finansal parametrelerini (enerji maliyetleri vb.) günceller.
    Sadece admin ve owner rollerindeki kullanıcılar bu işlemi yapabilir.
    """
    # Kullanıcının bu şirkette işlem yapma yetkisi var mı kontrol et
    auth_utils.check_user_role(
        company_id,
        db,
        current_user,
        allowed_roles=[models.CompanyMemberRole.admin, models.CompanyMemberRole.owner]
    )

    return crud.upsert_company_financials(db=db, company_id=company_id, financials_data=financials_data)


@app.get("/companies/{company_id}/suggestions", response_model=List[Union[schemas.GESSuggestion, schemas.InsulationSuggestion, schemas.InfoSuggestion, schemas.SuggestionBase]])
def get_company_suggestions(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Bir şirket için analizlere dayalı finansal ve çevresel öneriler listesi döndürür.
    """
    # Kullanıcının bu şirketin bir üyesi olduğundan emin ol
    auth_utils.get_company_if_member(company_id, db, current_user)

    return crud.get_suggestions_for_company(db=db, company_id=company_id)

@app.get("/companies/{company_id}/benchmark-report", response_model=schemas.BenchmarkReport)
def get_benchmark_report(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    company = auth_utils.get_company_if_member(company_id, db, current_user)
    benchmarking_service = BenchmarkingService(db)
    return benchmarking_service.generate_benchmark_report(company)