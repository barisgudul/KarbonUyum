# backend/main.py
import logging
from datetime import timedelta
from typing import List, Union
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, HTTPException, status, Response, UploadFile, File, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.responses import PlainTextResponse

# YENİ: Rate Limiting (API maliyet kontrolü için)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Gerekli Kütüphaneler

# Diğer Proje Dosyaları
import auth
import crud
import models
import schemas
from database import get_db
import auth_utils 
from carbon_calculator import get_calculator, CarbonCalculator
# DEPRECATED: Eski dahili hesaplama servisi arşivlendi
# from services.calculation_service import CalculationService, get_calculation_service
# YENİ: Climatiq API tabanlı hesaplama servisi
from services.climatiq_service import ClimatiqService, get_climatiq_service
from services.benchmarking_service import BenchmarkingService
from csv_handler import CSVProcessor, get_csv_template
from fastapi import APIRouter # import APIRouter
from sqladmin import Admin, ModelView
from database import engine

# --- Loglama Yapılandırması ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
# -----------------------------


app = FastAPI(title="KarbonUyum API", version="0.5.0") # Sürüm güncellendi: Rate limiting ve Climatiq

# YENİ: Rate limiter yapılandırması
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

admin = Admin(app, engine)

# Yönetim panelinde görmek istediğiniz modelleri tanımlayın
class UserAdmin(ModelView, model=models.User):
    column_list = [models.User.id, models.User.email, models.User.is_superuser]

class SuggestionParameterAdmin(ModelView, model=models.SuggestionParameter):
    column_list = [models.SuggestionParameter.key, models.SuggestionParameter.value, models.SuggestionParameter.description]

# ESKI: EmissionFactorAdmin - SILINDI (Climatiq API kullanılıyor)
# class EmissionFactorAdmin(ModelView, model=models.EmissionFactor):
#     column_list = [...]

# Modelleri admin paneline ekleyin
admin.add_view(UserAdmin)
admin.add_view(SuggestionParameterAdmin)
# ESKI: admin.add_view(EmissionFactorAdmin) - SILINDU

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
@limiter.limit("30/minute")  # Climatiq API maliyet koruması
def create_activity_data_for_facility(
    request: Request,
    facility_id: int,
    activity_data: schemas.ActivityDataCreate,
    calculation_year: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Bir tesise yeni aktivite verisi ekler.
    
    Args:
        facility_id: Tesisin ID'si
        activity_data: Aktivite verisi
        calculation_year: Hesaplama için kullanılacak yıl (opsiyonel, varsayılan: mevcut yıl)
    """
    db_facility = crud.get_facility_by_id(db, facility_id=facility_id)
    if not db_facility:
        raise HTTPException(status_code=404, detail="Tesis bulunamadı")

    auth_utils.check_user_role(db_facility.company.id, db, current_user, allowed_roles=[
        models.CompanyMemberRole.admin, models.CompanyMemberRole.data_entry, models.CompanyMemberRole.owner
    ])

    # YENİ: Climatiq API ile hesaplama
    calc_service = ClimatiqService(year=calculation_year)
    calculation_result = calc_service.calculate_for_activity(activity_data)

    # Veritabanına kaydet (scope ve fallback bilgisi ile)
    db_activity_data = models.ActivityData(
        facility_id=facility_id,
        activity_type=activity_data.activity_type,
        quantity=activity_data.quantity,
        unit=activity_data.unit,
        start_date=activity_data.start_date,
        end_date=activity_data.end_date,
        scope=calculation_result.scope,
        calculated_co2e_kg=calculation_result.total_co2e_kg,
        is_fallback_calculation=calculation_result.is_fallback  # Yasal şeffaflık
    )
    
    db.add(db_activity_data)
    db.commit()
    db.refresh(db_activity_data)
    
    return db_activity_data

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
@limiter.limit("30/minute")  # Climatiq API maliyet koruması
def update_activity_data(
    request: Request,
    data_id: int,
    activity_data: schemas.ActivityDataCreate,
    calculation_year: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Mevcut bir aktivite verisini günceller.
    
    Args:
        data_id: Aktivite verisinin ID'si
        activity_data: Yeni aktivite verisi
        calculation_year: Hesaplama için kullanılacak yıl (opsiyonel, varsayılan: mevcut yıl)
    """
    db_data = crud.get_activity_data_by_id(db, data_id=data_id)
    if not db_data:
        raise HTTPException(status_code=404, detail="Aktivite verisi bulunamadı")

    auth_utils.check_user_role(db_data.facility.company.id, db, current_user, allowed_roles=[
        models.CompanyMemberRole.admin, models.CompanyMemberRole.data_entry, models.CompanyMemberRole.owner
    ])

    # YENİ: Climatiq API ile hesaplama
    calc_service = ClimatiqService(year=calculation_year)
    calculation_result = calc_service.calculate_for_activity(activity_data)

    # Verileri güncelle
    db_data.activity_type = activity_data.activity_type
    db_data.quantity = activity_data.quantity
    db_data.unit = activity_data.unit
    db_data.start_date = activity_data.start_date
    db_data.end_date = activity_data.end_date
    db_data.scope = calculation_result.scope
    db_data.calculated_co2e_kg = calculation_result.total_co2e_kg
    db_data.is_fallback_calculation = calculation_result.is_fallback  # Yasal şeffaflık
    
    db.commit()
    db.refresh(db_data)
    
    return db_data

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

@app.get("/companies/{company_id}/benchmark-report", response_model=schemas.BenchmarkReportResponse)
def get_benchmark_report(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Bir şirket için benchmark raporu döndürür.
    
    Şirketin aynı sektör ve şehirdeki diğer şirketlerle karşılaştırmasını yapır.
    - En az 3 karşılaştırılabilir şirket gereklidir (anonimlik için)
    - Yeterli veri yoksa açıklayıcı mesaj döndürür
    - Fallback hesaplamaları hariç tutar (güvenilir veriler kullanır)
    """
    # Kullanıcının bu şirkete erişimi olup olmadığını kontrol et
    company = auth_utils.get_company_if_member(company_id, db, current_user)
    
    # Benchmarking servisi kullanarak raporu hesapla
    benchmarking_service = BenchmarkingService(db)
    report = benchmarking_service.calculate_benchmark_metrics(company_id)
    
    # Raporu response şemasına dönüştür
    metrics_response = [
        schemas.BenchmarkMetricResponse(
            metric_name=metric.metric_name,
            company_value=round(metric.company_value, 2),
            sector_avg=round(metric.sector_avg, 2),
            unit=metric.unit,
            efficiency_ratio=round(metric.efficiency_ratio, 1),
            is_better=metric.is_better,
            difference_percent=round(metric.difference_percent, 1)
        )
        for metric in report.metrics
    ]
    
    return schemas.BenchmarkReportResponse(
        company_id=report.company_id,
        company_name=report.company_name,
        industry_type=report.industry_type,
        city=report.city,
        metrics=metrics_response,
        comparable_companies_count=report.comparable_companies_count,
        data_available=report.data_available,
        message=report.message
    )

# --- CSV Upload Endpoints ---

@app.get("/csv-template/activity-data", response_class=PlainTextResponse)
def download_csv_template():
    """
    Aktivite verisi yüklemek için CSV şablonunu indirir.
    """
    return get_csv_template()

@app.post("/facilities/{facility_id}/upload-csv", response_model=schemas.CSVUploadResult)
@limiter.limit("10/hour")  # CSV yükleme için daha sıkı limit (çok satır = çok API call)
async def upload_activity_data_csv(
    request: Request,
    facility_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Bir tesise ait aktivite verilerini CSV dosyasından toplu olarak yükler.
    
    CSV Formatı:
    aktivite_tipi,miktar,birim,baslangic_tarihi,bitis_tarihi
    electricity,1500,kWh,2024-01-01,2024-01-31
    
    İzin verilen aktivite tipleri: electricity, natural_gas, diesel_fuel
    Tarih formatı: YYYY-MM-DD
    """
    # Tesis kontrolü ve yetki kontrolü
    db_facility = crud.get_facility_by_id(db, facility_id=facility_id)
    if not db_facility:
        raise HTTPException(status_code=404, detail="Tesis bulunamadı")
    
    # Kullanıcının bu tesise veri ekleme yetkisi var mı?
    auth_utils.check_user_role(
        db_facility.company.id,
        db,
        current_user,
        allowed_roles=[models.CompanyMemberRole.admin, models.CompanyMemberRole.data_entry, models.CompanyMemberRole.owner]
    )
    
    # Dosya uzantısı kontrolü
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Sadece .csv uzantılı dosyalar yüklenebilir"
        )
    
    # Dosya boyutu kontrolü (5MB limit)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(
            status_code=400,
            detail="Dosya boyutu 5MB'dan büyük olamaz"
        )
    
    # CSV işleme
    processor = CSVProcessor(db, facility_id)
    try:
        result = processor.process_csv_file(content)
        
        # Eğer en az bir satır başarılıysa commit et
        if result.successful_rows > 0:
            processor.commit()
        else:
            processor.rollback()
        
        return result
        
    except Exception as e:
        processor.rollback()
        logger.error(f"CSV yükleme hatası: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"CSV işleme sırasında bir hata oluştu: {str(e)}"
        )