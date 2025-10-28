# backend/main.py
import logging
import os
from datetime import timedelta
from typing import List, Union, Dict, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, HTTPException, status, Response, UploadFile, File, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.responses import PlainTextResponse, FileResponse

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
from services import get_calculation_service, ICalculationService
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

# YENİ: Security Headers Middleware (MVP Security Hardening)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """
    Add security headers to all responses to prevent common vulnerabilities.
    Part of MVP security hardening (Phase 3).
    """
    response = await call_next(request)
    
    # Prevent clickjacking attacks
    response.headers["X-Frame-Options"] = "DENY"
    
    # Prevent MIME-sniffing attacks
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Enable cross-site scripting (XSS) protection
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Enforce HTTPS in production
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # Prevent referrer leakage
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Content Security Policy
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'"
    
    logger.debug(f"Security headers added to {request.url.path}")
    
    return response

admin = Admin(app, engine)

# Yönetim panelinde görmek istediğiniz modelleri tanımlayın
class UserAdmin(ModelView, model=models.User):
    column_list = [models.User.id, models.User.email, models.User.is_superuser]

class SuggestionParameterAdmin(ModelView, model=models.SuggestionParameter):
    column_list = [models.SuggestionParameter.key, models.SuggestionParameter.value, models.SuggestionParameter.description]

# YENİ: IndustryTemplate Admin Panel
class IndustryTemplateAdmin(ModelView, model=models.IndustryTemplate):
    column_list = [
        models.IndustryTemplate.id,
        models.IndustryTemplate.industry_name,
        models.IndustryTemplate.industry_type,
        models.IndustryTemplate.typical_electricity_kwh_per_employee,
        models.IndustryTemplate.average_electricity_kwh
    ]
    column_sortable_list = [
        models.IndustryTemplate.industry_name,
        models.IndustryTemplate.average_electricity_kwh
    ]
    # YENİ: Düzenleme sırasında editable alanlar
    column_editable_list = [
        'average_electricity_kwh',
        'best_in_class_electricity_kwh',
        'description'
    ]
    name = "Sektör Şablonları"
    icon = "fa-industry"

# ESKI: EmissionFactorAdmin - SILINDI (Climatiq API kullanılıyor)
# class EmissionFactorAdmin(ModelView, model=models.EmissionFactor):
#     column_list = [...]

# Modelleri admin paneline ekleyin
admin.add_view(UserAdmin)
admin.add_view(SuggestionParameterAdmin)
admin.add_view(IndustryTemplateAdmin)  # YENİ: Sektör şablonları yönetimi
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

@app.post("/users/onboard", response_model=schemas.OnboardingResponse)
def onboard_user(
    onboarding_data: schemas.OnboardingRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Kullanıcı onboarding - sektör seçimi ile otomatik simülasyon verisi oluşturma.
    30 dakika içinde değer göstermeyi hedefler.
    """
    from datetime import datetime, timedelta
    
    # 1. Sektör template'ini bul
    industry_template = db.query(models.IndustryTemplate).filter(
        models.IndustryTemplate.industry_name == onboarding_data.industry_name
    ).first()
    
    if not industry_template:
        raise HTTPException(
            status_code=404, 
            detail=f"'{onboarding_data.industry_name}' sektörü için şablon bulunamadı"
        )
    
    # 2. Kullanıcının ilk şirketini oluştur (veya mevcut ilk şirketi al)
    companies = crud.get_companies_by_user(db, user_id=current_user.id)
    if companies:
        company = companies[0]  # İlk şirketi kullan
    else:
        # Yeni şirket oluştur
        company_data = schemas.CompanyCreate(
            name=f"{current_user.email.split('@')[0]} Şirketi",
            tax_number=f"SIM{current_user.id:06d}",  # Simülasyon için geçici vergi no
            industry_type=industry_template.industry_type
        )
        company = crud.create_company(db, company_data, current_user.id)
    
    # 3. Tesis oluştur
    facility_data = schemas.FacilityCreate(
        name=onboarding_data.facility_name,
        city=onboarding_data.facility_city,
        address=f"{onboarding_data.facility_city}, Türkiye",
        surface_area_m2=onboarding_data.employee_count * 20  # Çalışan başına ~20m²
    )
    facility = crud.create_facility(db, facility_data, company.id)
    
    # 4. Simülasyon verisi oluştur (son 3 ay için)
    end_date = datetime.now().date()
    simulated_data_count = 0
    
    for month_offset in range(3):
        month_end = end_date - timedelta(days=30 * month_offset)
        month_start = month_end - timedelta(days=29)
        
        # Elektrik verisi
        electricity_data = models.ActivityData(
            facility_id=facility.id,
            activity_type=models.ActivityType.electricity,
            quantity=industry_template.typical_electricity_kwh_per_employee * onboarding_data.employee_count / 12,  # Aylık
            unit="kWh",
            start_date=month_start,
            end_date=month_end,
            scope=models.ScopeType.scope_2,
            is_simulation=True,  # ÖNEMLİ: Simülasyon işareti
            is_fallback_calculation=False
        )
        db.add(electricity_data)
        simulated_data_count += 1
        
        # Doğalgaz verisi
        gas_data = models.ActivityData(
            facility_id=facility.id,
            activity_type=models.ActivityType.natural_gas,
            quantity=industry_template.typical_gas_m3_per_employee * onboarding_data.employee_count / 12,  # Aylık
            unit="m3",
            start_date=month_start,
            end_date=month_end,
            scope=models.ScopeType.scope_1,
            is_simulation=True,  # ÖNEMLİ: Simülasyon işareti
            is_fallback_calculation=False
        )
        db.add(gas_data)
        simulated_data_count += 1
        
        # Yakıt verisi (araç varsa)
        if onboarding_data.vehicle_count > 0:
            fuel_data = models.ActivityData(
                facility_id=facility.id,
                activity_type=models.ActivityType.diesel_fuel,
                quantity=industry_template.typical_fuel_liters_per_vehicle * onboarding_data.vehicle_count / 12,  # Aylık
                unit="litre",
                start_date=month_start,
                end_date=month_end,
                scope=models.ScopeType.scope_1,
                is_simulation=True,  # ÖNEMLİ: Simülasyon işareti
                is_fallback_calculation=False
            )
            db.add(fuel_data)
            simulated_data_count += 1
    
    # 5. Finansal veri oluştur (tipik maliyetler)
    avg_electricity_cost = 4.5  # TL/kWh (2024 Türkiye ortalaması)
    avg_gas_cost = 15.0  # TL/m³ (2024 Türkiye ortalaması)
    
    financials = models.CompanyFinancials(
        company_id=company.id,
        avg_electricity_cost_kwh=avg_electricity_cost,
        avg_gas_cost_m3=avg_gas_cost
    )
    db.add(financials)
    
    db.commit()
    
    logger.info(f"Onboarding tamamlandı: User={current_user.id}, Company={company.id}, Facility={facility.id}, SimData={simulated_data_count}")
    
    return schemas.OnboardingResponse(
        message=f"{onboarding_data.industry_name} sektörü için örnek veriler oluşturuldu. Dashboard'unuz hazır!",
        company_id=company.id,
        facility_id=facility.id,
        simulated_data_count=simulated_data_count,
        dashboard_ready=True
    )

@app.post("/wizard/submit", response_model=schemas.WizardSubmitResponse)
@limiter.limit("10/minute")  # Wizard spam koruması
def submit_wizard_data(
    request: Request,
    wizard_data: schemas.WizardSubmitRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
    calc_service: ICalculationService = Depends(get_calculation_service)
):
    """
    Faturadan Rapora Sihirbazı - Tek seferde tüm veri girişi.
    30 dakika içinde rapor üretmeyi hedefler.
    """
    # Yetki kontrolü
    auth_utils.check_user_role(
        wizard_data.company_id, db, current_user, 
        allowed_roles=[models.CompanyMemberRole.owner, models.CompanyMemberRole.admin, models.CompanyMemberRole.data_entry]
    )
    
    # 1. Simülasyon verilerini temizle (istenirse)
    deleted_simulation_count = 0
    if wizard_data.clear_simulation:
        simulation_data = db.query(models.ActivityData).filter(
            models.ActivityData.facility_id == wizard_data.facility_id,
            models.ActivityData.is_simulation == True
        ).all()
        
        for sim_data in simulation_data:
            db.delete(sim_data)
            deleted_simulation_count += 1
        
        logger.info(f"Wizard: {deleted_simulation_count} simülasyon verisi silindi")
    
    # 2. Yeni verileri ekle ve emisyon hesapla
    created_count = 0
    total_electricity_cost = 0
    total_electricity_kwh = 0
    total_gas_cost = 0
    total_gas_m3 = 0
    
    for item in wizard_data.data_items:
        # Scope belirleme
        if item.activity_type == models.ActivityType.electricity:
            scope = models.ScopeType.scope_2
            unit = "kWh"
            total_electricity_cost += item.cost
            total_electricity_kwh += item.quantity
        elif item.activity_type == models.ActivityType.natural_gas:
            scope = models.ScopeType.scope_1
            unit = "m3"
            total_gas_cost += item.cost
            total_gas_m3 += item.quantity
        else:  # diesel_fuel
            scope = models.ScopeType.scope_1
            unit = "litre"
        
        # ActivityData oluştur
        activity_data = models.ActivityData(
            facility_id=wizard_data.facility_id,
            activity_type=item.activity_type,
            quantity=item.quantity,
            unit=unit,
            start_date=item.start_date,
            end_date=item.end_date,
            scope=scope,
            is_simulation=False,  # Gerçek veri
            is_fallback_calculation=False
        )
        
        # Emisyon hesapla
        try:
            co2e_kg = calc_service.calculate_emissions(
                activity_type=item.activity_type,
                quantity=item.quantity,
                unit=unit
            )
            activity_data.calculated_co2e_kg = co2e_kg
            activity_data.is_fallback_calculation = False
        except Exception as e:
            logger.warning(f"Wizard: Climatiq hesaplama hatası, fallback kullanılıyor: {e}")
            # Fallback hesaplama
            if item.activity_type == models.ActivityType.electricity:
                activity_data.calculated_co2e_kg = item.quantity * 0.42  # kg CO2e/kWh
            elif item.activity_type == models.ActivityType.natural_gas:
                activity_data.calculated_co2e_kg = item.quantity * 2.03  # kg CO2e/m³
            else:  # diesel_fuel
                activity_data.calculated_co2e_kg = item.quantity * 2.68  # kg CO2e/litre
            activity_data.is_fallback_calculation = True
        
        db.add(activity_data)
        created_count += 1
    
    # 3. Finansal verileri güncelle (birim maliyetler)
    company_financials = db.query(models.CompanyFinancials).filter(
        models.CompanyFinancials.company_id == wizard_data.company_id
    ).first()
    
    if not company_financials:
        company_financials = models.CompanyFinancials(company_id=wizard_data.company_id)
        db.add(company_financials)
    
    # Birim maliyetleri hesapla ve güncelle
    if total_electricity_kwh > 0:
        company_financials.avg_electricity_cost_kwh = total_electricity_cost / total_electricity_kwh
    
    if total_gas_m3 > 0:
        company_financials.avg_gas_cost_m3 = total_gas_cost / total_gas_m3
    
    # 4. ROI potansiyeli hesapla (basit benchmark)
    roi_potential_tl = None
    if total_electricity_cost > 0:
        # Sektör en iyi uygulamaları ile karşılaştır
        company = db.query(models.Company).filter(models.Company.id == wizard_data.company_id).first()
        if company and company.industry_type:
            industry_template = db.query(models.IndustryTemplate).filter(
                models.IndustryTemplate.industry_type == company.industry_type
            ).first()
            
            if industry_template and industry_template.best_in_class_electricity_kwh:
                # Basit ROI hesaplama: %20 tasarruf potansiyeli varsayımı
                roi_potential_tl = total_electricity_cost * 0.20
    
    db.commit()
    
    logger.info(f"Wizard tamamlandı: User={current_user.id}, Company={wizard_data.company_id}, Created={created_count}")
    
    return schemas.WizardSubmitResponse(
        message="Verileriniz başarıyla kaydedildi ve raporunuz hazır!",
        created_count=created_count,
        deleted_simulation_count=deleted_simulation_count,
        financials_updated=True,
        roi_potential_tl=roi_potential_tl
    )

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
    calc_service = get_calculation_service(db=db)
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
    
    # YENİ: Eğer cost_tl verilmişse, otomatik birim maliyet hesapla
    if activity_data.cost_tl and activity_data.cost_tl > 0 and activity_data.quantity > 0:
        unit_cost = activity_data.cost_tl / activity_data.quantity  # TL/birim
        
        # Şirketin finansal verisini güncelle
        financials = db.query(models.CompanyFinancials).filter(
            models.CompanyFinancials.company_id == db_facility.company.id
        ).first()
        
        if not financials:
            financials = models.CompanyFinancials(company_id=db_facility.company.id)
            db.add(financials)
        
        # Birim maliyeti tiplerine göre güncelle
        if activity_data.activity_type == models.ActivityType.electricity:
            financials.avg_electricity_cost_kwh = unit_cost
        elif activity_data.activity_type == models.ActivityType.natural_gas:
            financials.avg_gas_cost_m3 = unit_cost
        
        db.commit()
        logger.info(f"Birim maliyet güncellendi: {activity_data.activity_type}={unit_cost:.2f} TL")
    
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
    calc_service = get_calculation_service(db=db)
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

@app.get("/companies/{company_id}/reports/cbam", response_model=schemas.CBAMReportResponse)
def generate_cbam_report(
    company_id: int,
    report_request: schemas.CBAMReportRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
    calc_service: ICalculationService = Depends(get_calculation_service)
):
    """
    AB CBAM düzenlemelerine uygun XML rapor üretir.
    KOBİ'lerin AB'ye ihracatında gerekli karbon raporlaması.
    """
    # Yetki kontrolü
    auth_utils.check_user_role(
        company_id, db, current_user,
        allowed_roles=[models.CompanyMemberRole.owner, models.CompanyMemberRole.admin, models.CompanyMemberRole.viewer]
    )
    
    # CBAM servisi
    from services.cbam_service import CBAMReportService
    cbam_service = CBAMReportService(db, calc_service)
    
    # XML rapor üret
    try:
        xml_content = cbam_service.generate_cbam_report(
            company_id=company_id,
            start_date=report_request.start_date,
            end_date=report_request.end_date,
            reporting_period=report_request.reporting_period
        )
        
        # Raporu doğrula
        is_valid = cbam_service.validate_cbam_report(xml_content)
        
        # Toplam emisyonları hesapla
        totals = cbam_service._calculate_total_emissions(
            db.query(models.Company).filter(models.Company.id == company_id).first(),
            report_request.start_date,
            report_request.end_date
        )
        
        # Company bilgisi
        company = db.query(models.Company).filter(models.Company.id == company_id).first()
        
        return schemas.CBAMReportResponse(
            report_id=f"CBAM-TR-{company_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            company_name=company.name,
            reporting_period=report_request.reporting_period or f"{report_request.start_date.year}-Q{(report_request.start_date.month-1)//3+1}",
            total_emissions_tco2e=totals["total"],
            xml_content=xml_content,
            generation_date=datetime.now().isoformat(),
            status="VALIDATED" if is_valid else "GENERATED"
        )
    except Exception as e:
        logger.error(f"CBAM rapor üretim hatası: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"CBAM raporu üretilemedi: {str(e)}"
        )

@app.get("/companies/{company_id}/roi-analysis", response_model=schemas.ROIAnalysisResponse)
def analyze_roi_potential(
    company_id: int,
    period_months: int = 12,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Şirket için ROI ve tasarruf potansiyeli analizi.
    Somut TL değerleri ve geri ödeme süreleri ile.
    """
    # Yetki kontrolü
    auth_utils.check_user_role(
        company_id, db, current_user,
        allowed_roles=[models.CompanyMemberRole.owner, models.CompanyMemberRole.admin, models.CompanyMemberRole.viewer]
    )
    
    # ROI servisi
    from services.roi_calculator_service import ROICalculatorService
    roi_service = ROICalculatorService(db)
    
    try:
        # ROI analizi yap
        roi_analysis = roi_service.calculate_roi_potential(
            company_id=company_id,
            period_months=period_months
        )
        
        return roi_analysis
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"ROI analiz hatası: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"ROI analizi yapılamadı: {str(e)}"
        )

@app.get("/health/calculation-service", response_model=schemas.HealthCheckResponse)
def health_check_calculation_service(
    db: Session = Depends(get_db)
):
    """
    Hesaplama servisinin sağlık durumunu kontrol eder.
    Konfigüre edilen provider'ın kullanılabilir olup olmadığını doğrular.
    """
    try:
        calc_service: ICalculationService = get_calculation_service(db)
        provider_name = calc_service.get_provider_name()
        is_healthy = calc_service.health_check()
        
        if is_healthy:
            return schemas.HealthCheckResponse(
                status="ok", 
                message=f"Calculation service '{provider_name}' is healthy"
            )
        else:
            return schemas.HealthCheckResponse(
                status="warning", 
                message=f"Calculation service '{provider_name}' is not responding"
            )
    except Exception as e:
        logger.error(f"Calculation service health check failed: {str(e)}", exc_info=True)
        return schemas.HealthCheckResponse(
            status="error", 
            message=f"Calculation service health check failed: {str(e)}"
        )

# YENİ: Notification API Endpoints (Modül 2.1)
@app.get("/notifications", response_model=schemas.NotificationList)
def get_notifications(
    limit: int = 20,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Kullanıcının bildirimlerini getir
    """
    from services.notification_service import get_notification_service
    
    notif_service = get_notification_service()
    
    if unread_only:
        notifications = notif_service.get_unread_notifications(db, current_user.id, limit)
    else:
        notifications = notif_service.get_all_notifications(db, current_user.id, limit)
    
    unread_count = len([n for n in notifications if not n.is_read])
    total_count = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).count()
    
    return schemas.NotificationList(
        notifications=notifications,
        unread_count=unread_count,
        total_count=total_count
    )

@app.put("/notifications/{notification_id}/mark-read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Bildirimi oku olarak işaretle
    """
    from services.notification_service import get_notification_service
    
    notif_service = get_notification_service()
    success = notif_service.mark_as_read(db, notification_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    
    return {"message": "Bildirim okundu olarak işaretlendi"}

@app.delete("/notifications/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Bildirimi sil
    """
    from services.notification_service import get_notification_service
    
    notif_service = get_notification_service()
    success = notif_service.delete_notification(db, notification_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    
    return {"message": "Bildirim silindi"}

# YENİ: Fatura Yükleme ve OCR Endpoints (Modül 2.2)

@app.post("/facilities/{facility_id}/invoices/upload", response_model=schemas.Invoice)
@limiter.limit("20/minute")
def upload_invoice(
    facility_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Fatura dosyasını yükle (PDF, JPEG, PNG)
    
    Adımlar:
    1. Dosya doğrulaması
    2. Geçici/kalıcı depolama
    3. Celery task'ine gönder (OCR)
    4. İnvoice kaydı oluştur
    """
    # Erişim kontrolü
    facility = auth_utils.check_facility_access(db, facility_id, current_user.id)
    if not facility:
        raise HTTPException(status_code=403, detail="Bu tesise erişim yetkiniz yok")
    
    # Dosya türü doğrulaması
    allowed_types = {'application/pdf', 'image/jpeg', 'image/png'}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Sadece PDF, JPEG, PNG destekleniyor")
    
    # Dosya boyutu kontrolü (max 10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Dosya 10MB'den büyük olamaz")
    
    try:
        # Dosyayı kaydet
        import os
        import uuid
        
        upload_dir = "/tmp/invoices"  # Geliştirmede - production'da S3 kullan
        os.makedirs(upload_dir, exist_ok=True)
        
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Dosya yazma
        with open(file_path, 'wb') as f:
            content = file.file.read()
            f.write(content)
        
        # İnvoice kaydı oluştur
        invoice = models.Invoice(
            facility_id=facility_id,
            user_id=current_user.id,
            filename=file.filename,
            file_path=file_path,
            file_type=file_ext,
            status=models.InvoiceStatus.pending
        )
        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        
        # Celery task'ine gönder
        from tasks import process_invoice_ocr
        process_invoice_ocr.delay(invoice.id)
        
        logger.info(f"✅ Fatura yüklendi: {file.filename} → Invoice #{invoice.id}")
        
        return invoice
        
    except Exception as e:
        logger.error(f"❌ Fatura yükleme hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Fatura yükleme hatası: {str(e)}")


@app.get("/facilities/{facility_id}/invoices", response_model=schemas.InvoiceList)
def list_invoices(
    facility_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Tesisin faturalarını listele
    """
    facility = auth_utils.check_facility_access(db, facility_id, current_user.id)
    if not facility:
        raise HTTPException(status_code=403, detail="Bu tesise erişim yetkiniz yok")
    
    invoices = db.query(models.Invoice).filter(
        models.Invoice.facility_id == facility_id
    ).order_by(models.Invoice.created_at.desc()).all()
    
    pending = len([i for i in invoices if i.status == models.InvoiceStatus.pending])
    processing = len([i for i in invoices if i.status == models.InvoiceStatus.processing])
    
    return schemas.InvoiceList(
        invoices=invoices,
        total=len(invoices),
        pending_count=pending,
        processing_count=processing
    )


@app.post("/invoices/{invoice_id}/verify")
def verify_invoice(
    invoice_id: int,
    verification: schemas.InvoiceVerify,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Kullanıcı, OCR sonuçlarını doğruladıktan sonra ActivityData oluştur
    """
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.user_id == current_user.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Fatura bulunamadı")
    
    if invoice.status != models.InvoiceStatus.completed:
        raise HTTPException(status_code=400, detail="Fatura henüz işlenmedi")
    
    try:
        # Doğrulanan verileri kaydet
        activity_data = models.ActivityData(
            facility_id=invoice.facility_id,
            activity_type=verification.extracted_data.activity_type or invoice.extracted_activity_type,
            quantity=verification.extracted_data.quantity or invoice.extracted_quantity,
            unit=get_unit_for_activity_type(
                verification.extracted_data.activity_type or invoice.extracted_activity_type
            ),
            start_date=verification.extracted_data.start_date or invoice.extracted_start_date,
            end_date=verification.extracted_data.end_date or invoice.extracted_end_date,
            scope=models.ScopeType.scope_2,  # Elektrik = Scope 2
            calculated_co2e_kg=None,
            is_simulation=False
        )
        
        db.add(activity_data)
        db.flush()
        
        # İnvoice'ı güncelle
        invoice.is_verified = True
        invoice.verification_notes = verification.verification_notes
        invoice.activity_data_id = activity_data.id
        invoice.status = models.InvoiceStatus.verified
        
        db.commit()
        db.refresh(activity_data)
        
        # Cost bilgisini güncelle (Finansal tahminler)
        if verification.extracted_data.cost_tl and verification.extracted_data.cost_tl > 0:
            if verification.extracted_data.quantity and verification.extracted_data.quantity > 0:
                unit_cost = verification.extracted_data.cost_tl / verification.extracted_data.quantity
                
                financials = db.query(models.CompanyFinancials).filter(
                    models.CompanyFinancials.company_id == activity_data.facility.company_id
                ).first()
                
                if not financials:
                    financials = models.CompanyFinancials(
                        company_id=activity_data.facility.company_id
                    )
                    db.add(financials)
                
                activity_type_str = verification.extracted_data.activity_type or invoice.extracted_activity_type
                if activity_type_str == 'electricity':
                    financials.avg_electricity_cost_kwh = unit_cost
                elif activity_type_str == 'natural_gas':
                    financials.avg_gas_cost_m3 = unit_cost
                
                db.commit()
        
        logger.info(f"✅ Fatura doğrulandı: Invoice #{invoice_id} → ActivityData #{activity_data.id}")
        
        return {
            "status": "verified",
            "activity_data_id": activity_data.id,
            "message": "Fatura başarıyla doğrulandı ve veriler kaydedildi"
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Fatura doğrulama hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Fatura doğrulama hatası: {str(e)}")


def get_unit_for_activity_type(activity_type: str) -> str:
    """Enerji tipine göre birim döndür"""
    units = {
        'electricity': 'kWh',
        'natural_gas': 'm³',
        'diesel_fuel': 'litre'
    }
    return units.get(activity_type, 'kWh')

# YENİ: Parametrik ROI Simülatörü (Modül 2.3 - Interactive)

@app.get("/companies/{company_id}/roi-simulator")
@limiter.limit("30/minute")
def get_roi_simulator(
    company_id: int,
    solar_kwp: float = 100,
    electricity_price_increase: float = 0.10,
    led_savings_rate: float = 0.60,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    İnteraktif ROI Simülatörü - Kullanıcı parametrelerini değiştirdikçe ROI hesapla
    
    Query Parameters:
    - solar_kwp: Güneş paneli kapasitesi (kWp) - default 100
    - electricity_price_increase: Yıllık elektrik fiyat artışı (%) - default 10%
    - led_savings_rate: LED tasarruf oranı (%) - default 60%
    
    Real-time hesaplama - Frontend slider'ları bu endpoint'i çağırıyor
    """
    
    # Erişim kontrolü
    company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.owner_id == current_user.id
    ).first()
    
    if not company:
        raise HTTPException(status_code=403, detail="Bu şirkete erişim yetkiniz yok")
    
    try:
        from services.roi_calculator_service import ROICalculatorService
        roi_service = ROICalculatorService(db)
        
        # Standart ROI analizi al
        base_roi = roi_service.calculate_roi_potential(company_id, period_months=12)
        
        # Parametrik hesaplamalar (Slider değişiklikleri)
        simulations = {
            "solar_simulation": roi_service.calculate_specific_measure_roi(
                company_id=company_id,
                measure_type="solar_panel",
                custom_parameters={
                    "capacity_kwp": solar_kwp,
                    "cost_per_kwp": 8000  # Sabit - kullanıcı değiştiremez şimdilik
                }
            ),
            "led_simulation": roi_service.calculate_specific_measure_roi(
                company_id=company_id,
                measure_type="lighting_upgrade",
                custom_parameters={
                    "savings_rate": led_savings_rate,
                    "cost_per_fixture": 500
                }
            ),
            "insulation_simulation": roi_service.calculate_specific_measure_roi(
                company_id=company_id,
                measure_type="insulation_improvement",
                custom_parameters={
                    "savings_rate": 0.22,
                    "cost_per_m2": 150
                }
            )
        }
        
        # Timeline: Payback yılını tablo halinde hesapla
        payback_timeline = _calculate_payback_timeline(
            base_roi.top_opportunities,
            years=10,
            price_increase_rate=electricity_price_increase
        )
        
        return {
            "company_id": company_id,
            "base_analysis": base_roi.dict(),
            "simulations": simulations,
            "payback_timeline": payback_timeline,
            "slider_ranges": {
                "solar_kwp": {"min": 10, "max": 500, "step": 10, "current": solar_kwp},
                "electricity_price_increase": {"min": 0.05, "max": 0.25, "step": 0.01, "current": electricity_price_increase},
                "led_savings_rate": {"min": 0.40, "max": 0.80, "step": 0.05, "current": led_savings_rate}
            },
            "charts": {
                "roi_vs_investment": _generate_roi_chart(base_roi, simulations),
                "payback_comparison": _generate_payback_chart(simulations)
            }
        }
        
    except Exception as e:
        logger.error(f"❌ ROI simülasyon hatası: {e}")
        raise HTTPException(status_code=500, detail=f"ROI hesaplama hatası: {str(e)}")


def _calculate_payback_timeline(
    opportunities: List[Dict],
    years: int = 10,
    price_increase_rate: float = 0.10
) -> List[Dict]:
    """
    Yıllar içinde birikmiş tasarrufu hesapla
    """
    timeline = []
    
    for year in range(0, years + 1):
        year_savings = 0
        year_investments = 0
        
        for opp in opportunities:
            annual_savings = opp.get("annual_savings_tl", 0)
            investment = opp.get("investment_tl", 0)
            
            # Elektrik fiyat artışı simülasyonu
            yearly_amount = annual_savings * ((1 + price_increase_rate) ** year)
            
            if year == 0:
                year_investments += investment
            
            year_savings += yearly_amount
        
        # Kümülatif tasarruf
        cumulative_savings = sum(y["cumulative_savings"] for y in timeline) + year_savings
        roi_percentage = ((cumulative_savings - year_investments) / year_investments * 100) if year_investments > 0 else 0
        
        timeline.append({
            "year": year,
            "annual_savings": round(year_savings, 0),
            "cumulative_savings": round(cumulative_savings, 0),
            "annual_roi_percentage": round(roi_percentage, 1)
        })
    
    return timeline


def _generate_roi_chart(base_roi: schemas.ROIAnalysisResponse, simulations: Dict) -> Dict:
    """
    Recharts format'ında ROI karşılaştırma tablosu
    """
    data = []
    
    # Base opportunities
    for i, opp in enumerate(base_roi.top_opportunities[:3]):
        data.append({
            "name": opp["name"],
            "investment": opp["investment_tl"],
            "annual_savings": opp["annual_savings_tl"],
            "payback_months": opp["payback_months"],
            "roi": (opp["annual_savings_tl"] / opp["investment_tl"] * 100) if opp["investment_tl"] > 0 else 0
        })
    
    # Simulations
    for key, sim in simulations.items():
        if sim.get("annual_savings_tl"):
            data.append({
                "name": sim.get("measure_name", key),
                "investment": sim.get("investment_tl", 0),
                "annual_savings": sim.get("annual_savings_tl", 0),
                "payback_months": sim.get("payback_months", 999),
                "roi": (sim.get("annual_savings_tl", 0) / sim.get("investment_tl", 1) * 100) if sim.get("investment_tl", 0) > 0 else 0
            })
    
    return {
        "title": "Yatırım vs Tasarruf Potansiyeli",
        "data": data,
        "xAxisKey": "name",
        "series": ["investment", "annual_savings"],
        "colors": ["#ef4444", "#10b981"]
    }


def _generate_payback_chart(simulations: Dict) -> Dict:
    """
    Geri ödeme süresi karşılaştırması
    """
    data = []
    
    for key, sim in simulations.items():
        if sim.get("payback_months", 999) < 999:
            data.append({
                "measure": sim.get("measure_name", key),
                "payback_months": sim.get("payback_months", 0),
                "annual_savings": sim.get("annual_savings_tl", 0),
                "investment": sim.get("investment_tl", 0)
            })
    
    return {
        "title": "Geri Ödeme Süresi Karşılaştırması",
        "data": sorted(data, key=lambda x: x["payback_months"]),
        "sortBy": "payback_months",
        "colors": ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"]
    }

# YENİ: Asenkron Rapor Endpoints (Modül 2.1)

@app.post("/companies/{company_id}/reports/request", response_model=schemas.ReportGenerationResponse)
@limiter.limit("10/minute")
def request_report_generation(
    company_id: int,
    report_request: schemas.ReportCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Rapor üretimini iste (CBAM veya ROI)
    
    Request body:
    {
        "report_type": "cbam_xml" | "roi_analysis" | "combined",
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "period_name": "Q1 2024" (opsiyonel),
        "notify_user": true
    }
    
    Response:
    {
        "report_id": 123,
        "celery_task_id": "abc-123-def",
        "status": "pending",
        "message": "Raporunuz hazırlanıyor...",
        "estimated_time_seconds": 30
    }
    """
    
    # Erişim kontrolü
    company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.owner_id == current_user.id
    ).first()
    
    if not company:
        raise HTTPException(status_code=403, detail="Bu şirkete erişim yetkiniz yok")
    
    try:
        # Report kaydı oluştur
        report = models.Report(
            company_id=company_id,
            user_id=current_user.id,
            report_type=report_request.report_type,
            start_date=report_request.start_date,
            end_date=report_request.end_date,
            period_name=report_request.period_name,
            status=models.ReportStatus.pending,
            notify_user_when_ready=report_request.notify_user
        )
        
        db.add(report)
        db.commit()
        db.refresh(report)
        
        # Celery task'ine gönder
        from tasks import generate_cbam_report_async, calculate_roi_analysis_async
        
        if report_request.report_type == "cbam_xml":
            task = generate_cbam_report_async.delay(report.id)
            estimated_time = 20  # CBAM üretimi ~20 saniye
        elif report_request.report_type == "roi_analysis":
            task = calculate_roi_analysis_async.delay(report.id)
            estimated_time = 15  # ROI hesaplama ~15 saniye
        else:  # combined
            # Her iki task'i de tetikle
            task1 = generate_cbam_report_async.delay(report.id)
            task2 = calculate_roi_analysis_async.delay(report.id)
            task = task1  # First task ID'yi dön
            estimated_time = 35
        
        # Task ID'yi kaydet
        report.celery_task_id = task.id
        db.commit()
        
        logger.info(
            f"📨 Rapor isteği oluşturuldu: Report #{report.id}, "
            f"Task {task.id}, Type: {report_request.report_type}"
        )
        
        return schemas.ReportGenerationResponse(
            report_id=report.id,
            celery_task_id=task.id,
            status="pending",
            message=f"Raporunuz hazırlanıyor... ({estimated_time} saniye sürebilir)",
            estimated_time_seconds=estimated_time
        )
        
    except Exception as e:
        logger.error(f"❌ Rapor isteği oluşturma hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Rapor isteği oluşturulamadı: {str(e)}")


@app.get("/companies/{company_id}/reports", response_model=schemas.ReportList)
@limiter.limit("20/minute")
def list_company_reports(
    company_id: int,
    status: Optional[str] = None,
    report_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Şirketin raporlarını listele ve filtrele
    
    Query parameters:
    - status: "pending", "processing", "completed", "failed"
    - report_type: "cbam_xml", "roi_analysis", "combined"
    """
    
    # Erişim kontrolü
    company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.owner_id == current_user.id
    ).first()
    
    if not company:
        raise HTTPException(status_code=403, detail="Bu şirkete erişim yetkiniz yok")
    
    # Query oluştur
    query = db.query(models.Report).filter(
        models.Report.company_id == company_id
    )
    
    if status:
        query = query.filter(models.Report.status == status)
    
    if report_type:
        query = query.filter(models.Report.report_type == report_type)
    
    reports = query.order_by(models.Report.created_at.desc()).all()
    
    # İstatistikler
    pending_count = db.query(models.Report).filter(
        models.Report.company_id == company_id,
        models.Report.status == models.ReportStatus.pending
    ).count()
    
    processing_count = db.query(models.Report).filter(
        models.Report.company_id == company_id,
        models.Report.status == models.ReportStatus.processing
    ).count()
    
    completed_count = db.query(models.Report).filter(
        models.Report.company_id == company_id,
        models.Report.status == models.ReportStatus.completed
    ).count()
    
    return schemas.ReportList(
        reports=reports,
        total=len(reports),
        pending_count=pending_count,
        processing_count=processing_count,
        completed_count=completed_count
    )


@app.get("/reports/{report_id}/status")
@limiter.limit("30/minute")
def get_report_status(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Rapor durumunu kontrol et
    """
    
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.user_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Rapor bulunamadı")
    
    return {
        "report_id": report.id,
        "status": report.status,
        "celery_task_id": report.celery_task_id,
        "completed_at": report.completed_at,
        "file_size_bytes": report.file_size_bytes,
        "download_count": report.download_count,
        "error_message": report.error_message,
        "expires_at": report.expires_at
    }


@app.get("/reports/{report_id}/download")
@limiter.limit("20/minute")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Tamamlanan raporu indir
    """
    
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.user_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Rapor bulunamadı")
    
    if report.status != models.ReportStatus.completed:
        raise HTTPException(
            status_code=400,
            detail=f"Rapor henüz hazır değil. Durum: {report.status}"
        )
    
    if not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Rapor dosyası bulunamadı")
    
    try:
        # Download sayısını artır
        report.download_count += 1
        db.commit()
        
        # Dosyayı döndür
        import mimetypes
        
        file_ext = os.path.splitext(report.file_path)[1].lower()
        media_type = "application/xml" if file_ext == ".xml" else "application/json"
        
        filename = f"{report.report_type}_{report.company_id}_{report.id}{file_ext}"
        
        logger.info(f"📥 Rapor indirildi: #{report_id} - {filename}")
        
        return FileResponse(
            path=report.file_path,
            media_type=media_type,
            filename=filename
        )
        
    except Exception as e:
        logger.error(f"❌ Rapor indirme hatası: {e}")
        raise HTTPException(status_code=500, detail="Rapor indirilemedi")


@app.delete("/reports/{report_id}")
@limiter.limit("10/minute")
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Raporu sil
    """
    
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.user_id == current_user.id
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Rapor bulunamadı")
    
    try:
        # Dosyayı sil
        if report.file_path and os.path.exists(report.file_path):
            os.remove(report.file_path)
        
        # Veritabanı kaydını sil
        db.delete(report)
        db.commit()
        
        logger.info(f"🗑️ Rapor silindi: #{report_id}")
        
        return {"message": "Rapor başarıyla silindi"}
        
    except Exception as e:
        logger.error(f"❌ Rapor silme hatası: {e}")
        raise HTTPException(status_code=500, detail="Rapor silinemedi")

# YENİ: Tedarikçi Ağı Endpoints (Modül 3.1)

import secrets

@app.post("/suppliers/invite", response_model=schemas.SupplierInviteResponse)
@limiter.limit("20/minute")
def invite_supplier(
    company_id: int,
    invite_request: schemas.SupplierInviteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Tedarikçiyi davet et
    
    Request body:
    {
        "supplier_email": "supplier@example.com",
        "supplier_company_name": "Örnek Tedarikçi Ltd",
        "relationship_type": "supplier"
    }
    """
    
    # Erişim kontrolü
    company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.owner_id == current_user.id
    ).first()
    
    if not company:
        raise HTTPException(status_code=403, detail="Bu şirkete erişim yetkiniz yok")
    
    try:
        # Tedarikçi zaten varsa bul, yoksa oluştur
        supplier = db.query(models.Supplier).filter(
            models.Supplier.email == invite_request.supplier_email
        ).first()
        
        if not supplier:
            supplier = models.Supplier(
                company_name=invite_request.supplier_company_name,
                email=invite_request.supplier_email,
                is_active=True
            )
            db.add(supplier)
            db.flush()
        
        # Davet token'ı oluştur (güvenli)
        invite_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=30)
        
        # Davet kaydı oluştur
        invitation = models.SupplierInvitation(
            supplier_id=supplier.id,
            company_id=company_id,
            invited_by_user_id=current_user.id,
            invite_token=invite_token,
            status=models.SupplierInvitationStatus.pending,
            relationship_type=invite_request.relationship_type,
            expires_at=expires_at
        )
        
        db.add(invitation)
        db.commit()
        db.refresh(invitation)
        
        # Email gönder (SendGrid)
        try:
            from services.notification_service import get_notification_service
            notif_service = get_notification_service()
            
            invite_link = f"{os.getenv('FRONTEND_URL', 'https://app.karbonuyum.com')}/suppliers/accept/{invite_token}"
            
            notif_service.send_email_notification(
                to_email=invite_request.supplier_email,
                subject=f"🤝 {company.name} Sizi Ağına Davet Ediyor!",
                message=f"""
                Merhaba,
                
                {company.name}, KarbonUyum platformumuzda birlikte çalışmak üzere sizi davet ediyor.
                
                Davetinizi kabul etmek için lütfen şu linke tıklayınız:
                {invite_link}
                
                Bu davet 30 gün içinde geçerlidir.
                
                Saygılarımızla,
                KarbonUyum Ekibi
                """,
                action_url=invite_link
            )
        except Exception as e:
            logger.warning(f"⚠️ Tedarikçi davet emaili gönderilemedi: {e}")
        
        logger.info(f"📨 Tedarikçi daveti gönderildi: {invite_request.supplier_email}")
        
        return schemas.SupplierInviteResponse(
            id=invitation.id,
            status="pending",
            invite_token=invite_token,
            invited_at=invitation.invited_at,
            expires_at=expires_at,
            message=f"Davet {invite_request.supplier_email}'e gönderildi"
        )
        
    except Exception as e:
        logger.error(f"❌ Tedarikçi davet hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Davet gönderilemedi: {str(e)}")


@app.post("/suppliers/accept/{invite_token}")
def accept_supplier_invitation(
    invite_token: str,
    db: Session = Depends(get_db)
):
    """
    Tedarikçi daveti kabul et
    """
    
    # Token'ı bul
    invitation = db.query(models.SupplierInvitation).filter(
        models.SupplierInvitation.invite_token == invite_token
    ).first()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Davet bulunamadı")
    
    if invitation.status != models.SupplierInvitationStatus.pending:
        raise HTTPException(status_code=400, detail=f"Davet zaten {invitation.status}")
    
    if invitation.expires_at and datetime.utcnow() > invitation.expires_at:
        invitation.status = models.SupplierInvitationStatus.expired
        db.commit()
        raise HTTPException(status_code=400, detail="Davet süresi dolmuş")
    
    try:
        # Daveti kabul et
        invitation.status = models.SupplierInvitationStatus.accepted
        invitation.accepted_at = datetime.utcnow()
        invitation.supplier.is_active = True
        
        db.commit()
        
        logger.info(f"✅ Tedarikçi daveti kabul edildi: {invitation.supplier.email}")
        
        return {
            "status": "accepted",
            "message": "Daveti başarıyla kabul ettiniz. Artık ürünlerinizi ekleyebilirsiniz.",
            "supplier_id": invitation.supplier_id,
            "company_name": invitation.company.name
        }
        
    except Exception as e:
        logger.error(f"❌ Davet kabul hatası: {e}")
        raise HTTPException(status_code=500, detail="Davet kabul edilemedi")


@app.post("/suppliers/{supplier_id}/products", response_model=schemas.ProductFootprint)
@limiter.limit("30/minute")
def add_supplier_product(
    supplier_id: int,
    product: schemas.ProductFootprintCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Tedarikçi ürünü ekle (Footprint verisi)
    """
    
    # Tedarikçi bul
    supplier = db.query(models.Supplier).filter(
        models.Supplier.id == supplier_id,
        models.Supplier.is_active == True
    ).first()
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
    
    # TODO: Tedarikçi kendisi mi ekliyor, yoksa müşteri mi? Kontrol et
    # Şimdilik açık bırakıyoruz
    
    try:
        db_product = models.ProductFootprint(
            supplier_id=supplier_id,
            product_name=product.product_name,
            product_category=product.product_category,
            unit=product.unit,
            co2e_per_unit_kg=product.co2e_per_unit_kg,
            product_code=product.product_code,
            data_source=product.data_source,
            external_id=product.external_id
        )
        
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        
        logger.info(f"✅ Ürün eklendi: {product.product_name} ({supplier.company_name})")
        
        return db_product
        
    except Exception as e:
        logger.error(f"❌ Ürün ekleme hatası: {e}")
        raise HTTPException(status_code=500, detail="Ürün eklenemedi")


@app.get("/companies/{company_id}/suppliers", response_model=schemas.SupplierList)
@limiter.limit("20/minute")
def list_company_suppliers(
    company_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Şirketin tedarikçilerini listele
    """
    
    # Erişim kontrolü
    company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.owner_id == current_user.id
    ).first()
    
    if not company:
        raise HTTPException(status_code=403, detail="Bu şirkete erişim yetkiniz yok")
    
    # Davetleri bul
    query = db.query(models.SupplierInvitation).filter(
        models.SupplierInvitation.company_id == company_id
    )
    
    if status:
        query = query.filter(models.SupplierInvitation.status == status)
    
    invitations = query.all()
    
    # Suppliers listesi (kabul edilenleri al)
    suppliers = [inv.supplier for inv in invitations if inv.status == models.SupplierInvitationStatus.accepted]
    
    active_count = len([s for s in suppliers if s.is_active])
    verified_count = len([s for s in suppliers if s.verified])
    
    return schemas.SupplierList(
        suppliers=suppliers,
        total=len(suppliers),
        active_count=active_count,
        verified_count=verified_count
    )


@app.get("/suppliers/{supplier_id}/products", response_model=schemas.ProductFootprintList)
@limiter.limit("20/minute")
def list_supplier_products(
    supplier_id: int,
    verified_only: bool = False,
    db: Session = Depends(get_db)
):
    """
    Tedarikçinin ürünlerini listele
    """
    
    query = db.query(models.ProductFootprint).filter(
        models.ProductFootprint.supplier_id == supplier_id
    )
    
    if verified_only:
        query = query.filter(models.ProductFootprint.is_verified == True)
    
    products = query.all()
    verified_count = len([p for p in products if p.is_verified])
    
    return schemas.ProductFootprintList(
        products=products,
        total=len(products),
        verified_count=verified_count
    )


@app.post("/facilities/{facility_id}/scope3-emissions", response_model=schemas.Scope3Emission)
@limiter.limit("30/minute")
def record_scope3_emission(
    facility_id: int,
    emission: schemas.Scope3EmissionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Scope 3 Emisyon Kaydı (Satın Alınan Malzeme)
    
    Request body:
    {
        "product_footprint_id": 123,
        "quantity_purchased": 50.5,
        "purchase_date": "2024-01-15"
    }
    """
    
    # Erişim kontrolü
    facility = auth_utils.check_facility_access(db, facility_id, current_user.id)
    if not facility:
        raise HTTPException(status_code=403, detail="Bu tesise erişim yetkiniz yok")
    
    # Product Footprint'i bul
    product = db.query(models.ProductFootprint).filter(
        models.ProductFootprint.id == emission.product_footprint_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    if not product.is_verified:
        logger.warning(f"⚠️ Doğrulanmamış ürün kullanılıyor: {product.product_name}")
    
    try:
        # CO2e hesapla
        calculated_co2e_kg = emission.quantity_purchased * product.co2e_per_unit_kg
        
        # Scope 3 kaydı oluştur
        db_emission = models.Scope3Emission(
            facility_id=facility_id,
            product_footprint_id=emission.product_footprint_id,
            quantity_purchased=emission.quantity_purchased,
            purchase_date=emission.purchase_date,
            calculated_co2e_kg=calculated_co2e_kg
        )
        
        db.add(db_emission)
        db.commit()
        db.refresh(db_emission)
        
        logger.info(
            f"✅ Scope 3 Emisyon kaydı: {emission.quantity_purchased} {product.unit} "
            f"{product.product_name} = {calculated_co2e_kg:.2f} kg CO2e"
        )
        
        return db_emission
        
    except Exception as e:
        logger.error(f"❌ Scope 3 kayıt hatası: {e}")
        raise HTTPException(status_code=500, detail="Emisyon kaydı yapılamadı")


@app.get("/facilities/{facility_id}/scope3-emissions")
@limiter.limit("20/minute")
def list_facility_scope3_emissions(
    facility_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Tesis için Scope 3 emisyonlarını listele
    """
    
    # Erişim kontrolü
    facility = auth_utils.check_facility_access(db, facility_id, current_user.id)
    if not facility:
        raise HTTPException(status_code=403, detail="Bu tesise erişim yetkiniz yok")
    
    emissions = db.query(models.Scope3Emission).filter(
        models.Scope3Emission.facility_id == facility_id
    ).order_by(models.Scope3Emission.purchase_date.desc()).all()
    
    # Toplam hesapla
    total_co2e_kg = sum([e.calculated_co2e_kg for e in emissions])
    
    return {
        "emissions": emissions,
        "total": len(emissions),
        "total_co2e_kg": total_co2e_kg,
        "total_co2e_tons": total_co2e_kg / 1000
    }


# ===== SUPPLIER PRODUCT MANAGEMENT ENDPOINTS =====

@app.get("/suppliers/my-products")
@limiter.limit("20/minute")
def get_supplier_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Tedarikçinin ürünlerini listele (Supplier Dashboard)
    """
    
    # Tedarikçi kaydı bul
    supplier = db.query(models.Supplier).filter(
        models.Supplier.email == current_user.email
    ).first()
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Tedarikçi kaydı bulunamadı")
    
    products = db.query(models.ProductFootprint).filter(
        models.ProductFootprint.supplier_id == supplier.id
    ).order_by(models.ProductFootprint.product_name).all()
    
    return {
        "products": products,
        "total": len(products),
        "verified_count": len([p for p in products if p.is_verified])
    }


@app.post("/suppliers/my-products", response_model=schemas.ProductFootprint)
@limiter.limit("20/minute")
def create_supplier_product(
    product_data: schemas.ProductFootprintCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Tedarikçi tarafından yeni ürün ekle
    """
    
    # Tedarikçi kaydı bul
    supplier = db.query(models.Supplier).filter(
        models.Supplier.email == current_user.email
    ).first()
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Tedarikçi kaydı bulunamadı")
    
    # Ürün oluştur
    db_product = models.ProductFootprint(
        supplier_id=supplier.id,
        product_name=product_data.product_name,
        product_category=product_data.product_category,
        unit=product_data.unit,
        co2e_per_unit_kg=product_data.co2e_per_unit_kg,
        product_code=product_data.product_code,
        data_source=product_data.data_source,
        external_id=product_data.external_id
    )
    
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    logger.info(
        f"✅ Tedarikçi ürünü oluşturuldu: {product_data.product_name} "
        f"({product_data.co2e_per_unit_kg} kg CO2e / {product_data.unit})"
    )
    
    return db_product


@app.delete("/suppliers/products/{product_id}")
@limiter.limit("20/minute")
def delete_supplier_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Tedarikçi ürünü sil
    """
    
    # Ürünü bul
    product = db.query(models.ProductFootprint).filter(
        models.ProductFootprint.id == product_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    # Yetki kontrolü - supplier'ın kendi ürünü mü?
    supplier = db.query(models.Supplier).filter(
        models.Supplier.email == current_user.email
    ).first()
    
    if not supplier or product.supplier_id != supplier.id:
        raise HTTPException(status_code=403, detail="Bu ürünü silmek yetkiniz yok")
    
    db.delete(product)
    db.commit()
    
    logger.info(f"✅ Tedarikçi ürünü silindi: {product.product_name}")
    
    return {"message": "Ürün başarıyla silindi"}


@app.get("/suppliers/invitation/{token}")
@limiter.limit("5/minute")
def get_invitation_details(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Davet detaylarını al (Accept sayfasında kullanılan)
    """
    
    invitation = db.query(models.SupplierInvitation).filter(
        models.SupplierInvitation.invite_token == token
    ).first()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Davet bulunamadı")
    
    # Token süresinin dolup dolmadığını kontrol et
    if invitation.expires_at and datetime.utcnow() > invitation.expires_at:
        raise HTTPException(status_code=410, detail="Davet süresi dolmuş")
    
    if invitation.status == "accepted":
        raise HTTPException(status_code=400, detail="Bu davet zaten kabul edilmiş")
    
    return {
        "supplier_id": invitation.supplier_id,
        "supplier_name": invitation.supplier.company_name,
        "company_name": invitation.company.name,
        "invited_at": invitation.invited_at,
        "expires_at": invitation.expires_at,
        "status": invitation.status
    }


# ===== GRANULAR ACCESS CONTROL - MEMBER MANAGEMENT ENDPOINTS =====

@app.get("/companies/{company_id}/members")
@limiter.limit("20/minute")
def list_company_members(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Şirketin tüm üyelerini ve yetkilendirmelerini listele
    """
    
    # Erişim kontrolü (Admin veya Owner olmalı)
    auth_utils.check_user_role(
        company_id, db, current_user,
        allowed_roles=[models.CompanyMemberRole.admin, models.CompanyMemberRole.owner]
    )
    
    # Üyeleri getir
    members = db.query(models.Member).filter(
        models.Member.company_id == company_id
    ).order_by(models.Member.created_at).all()
    
    # Rol dağılımı
    role_count = {}
    for member in members:
        role_count[str(member.role)] = role_count.get(str(member.role), 0) + 1
    
    # Detaylı bilgilerle
    members_detail = []
    for member in members:
        user = db.query(models.User).filter(models.User.id == member.user_id).first()
        facility_name = None
        if member.facility_id:
            facility = db.query(models.Facility).filter(
                models.Facility.id == member.facility_id
            ).first()
            facility_name = facility.name if facility else None
        
        members_detail.append({
            "id": member.id,
            "user_id": member.user_id,
            "company_id": member.company_id,
            "role": member.role,
            "facility_id": member.facility_id,
            "created_at": member.created_at.isoformat() if member.created_at else None,
            "updated_at": member.updated_at.isoformat() if member.updated_at else None,
            "user_email": user.email if user else None,
            "facility_name": facility_name
        })
    
    return schemas.MemberList(
        members=members_detail,
        total=len(members),
        by_role=role_count
    )


@app.post("/companies/{company_id}/members", response_model=schemas.Member)
@limiter.limit("20/minute")
def add_company_member(
    company_id: int,
    member_data: schemas.MemberCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Şirkete yeni üye ekle (Admin/Owner)
    
    Request:
    {
        "user_id": 5,
        "role": "data_entry",
        "facility_id": 15  // Opsiyonel: NULL ise tüm tesisler
    }
    """
    
    # Erişim kontrolü
    auth_utils.check_user_role(
        company_id, db, current_user,
        allowed_roles=[models.CompanyMemberRole.admin, models.CompanyMemberRole.owner]
    )
    
    # Kullanıcı var mı kontrol et
    user = db.query(models.User).filter(
        models.User.id == member_data.user_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Zaten üye mi?
    existing = db.query(models.Member).filter(
        models.Member.user_id == member_data.user_id,
        models.Member.company_id == company_id,
        models.Member.facility_id == member_data.facility_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Kullanıcı zaten bu tesislere üye")
    
    # Tesis varsa kontrol et
    if member_data.facility_id:
        facility = db.query(models.Facility).filter(
            models.Facility.id == member_data.facility_id,
            models.Facility.company_id == company_id
        ).first()
        
        if not facility:
            raise HTTPException(status_code=404, detail="Tesis bulunamadı")
    
    # Yeni üye oluştur
    db_member = models.Member(
        user_id=member_data.user_id,
        company_id=company_id,
        role=member_data.role,
        facility_id=member_data.facility_id
    )
    
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    
    logger.info(
        f"✅ Yeni üye eklendi: {user.email} → {member_data.role} "
        f"(Tesis: {member_data.facility_id or 'Tümü'})"
    )
    
    return db_member


@app.put("/companies/{company_id}/members/{member_id}", response_model=schemas.Member)
@limiter.limit("20/minute")
def update_company_member(
    company_id: int,
    member_id: int,
    update_data: schemas.MemberUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Üyenin rolünü ve/veya tesis erişimini güncelle
    """
    
    # Erişim kontrolü
    auth_utils.check_user_role(
        company_id, db, current_user,
        allowed_roles=[models.CompanyMemberRole.admin, models.CompanyMemberRole.owner]
    )
    
    # Üyeyi bul
    member = db.query(models.Member).filter(
        models.Member.id == member_id,
        models.Member.company_id == company_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Üye bulunamadı")
    
    # Güncelle
    if update_data.role is not None:
        member.role = update_data.role
    
    if update_data.facility_id is not None:
        # Tesis var mı kontrol et
        if update_data.facility_id:
            facility = db.query(models.Facility).filter(
                models.Facility.id == update_data.facility_id,
                models.Facility.company_id == company_id
            ).first()
            
            if not facility:
                raise HTTPException(status_code=404, detail="Tesis bulunamadı")
        
        member.facility_id = update_data.facility_id
    
    db.commit()
    db.refresh(member)
    
    logger.info(f"✅ Üye güncellendi: {member_id}")
    
    return member


@app.delete("/companies/{company_id}/members/{member_id}")
@limiter.limit("20/minute")
def remove_company_member(
    company_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Şirketten üyeyi sil
    """
    
    # Erişim kontrolü
    auth_utils.check_user_role(
        company_id, db, current_user,
        allowed_roles=[models.CompanyMemberRole.admin, models.CompanyMemberRole.owner]
    )
    
    # Üyeyi bul
    member = db.query(models.Member).filter(
        models.Member.id == member_id,
        models.Member.company_id == company_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Üye bulunamadı")
    
    # Owner/Admin'in kendini silmesini engelle
    if member.user_id == current_user.id and member.role in [models.CompanyMemberRole.owner, models.CompanyMemberRole.admin]:
        raise HTTPException(status_code=400, detail="Kendi yönetici hesabınızı silemezsiniz")
    
    db.delete(member)
    db.commit()
    
    logger.info(f"✅ Üye silindi: {member_id}")
    
    return {"message": "Üye başarıyla silindi"}


# ===== GAMIFICATION - BADGE & LEADERBOARD ENDPOINTS =====

@app.get("/users/me/badges", response_model=schemas.UserBadgeList)
@limiter.limit("30/minute")
def get_user_badges(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Kullanıcının kazandığı rozetleri listele
    """
    
    user_badges = db.query(models.UserBadge).filter(
        models.UserBadge.user_id == current_user.id,
        models.UserBadge.displayed == True
    ).order_by(models.UserBadge.earned_at.desc()).all()
    
    return schemas.UserBadgeList(
        badges=[
            schemas.UserBadgeDetail(
                id=ub.id,
                badge_id=ub.badge_id,
                earned_at=ub.earned_at.isoformat(),
                badge=schemas.Badge.from_orm(ub.badge)
            )
            for ub in user_badges
        ],
        total=len(user_badges),
        earned_count=len(user_badges)
    )


@app.get("/leaderboard")
@limiter.limit("20/minute")
def get_leaderboard(
    industry_type: Optional[str] = None,
    region: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Sektör sıralamasını göster
    
    Query Parameters:
    - industry_type: Sektör filtresi (optional)
    - region: Bölge filtresi (optional)
    - limit: Kaç kişi gösterilsin (default: 50)
    """
    
    # Leaderboard girdilerini sorgula
    query = db.query(models.LeaderboardEntry)
    
    if industry_type:
        query = query.filter(models.LeaderboardEntry.industry_type == industry_type)
    
    if region:
        query = query.filter(models.LeaderboardEntry.region == region)
    
    entries = query.order_by(models.LeaderboardEntry.rank).limit(limit).all()
    
    # Kullanıcının şirketi bulundu mu?
    user_company = db.query(models.Member).filter(
        models.Member.user_id == current_user.id
    ).first()
    
    your_rank = None
    your_score = None
    
    if user_company:
        your_entry = db.query(models.LeaderboardEntry).filter(
            models.LeaderboardEntry.company_id == user_company.company_id
        ).first()
        
        if your_entry:
            your_rank = your_entry.rank
            your_score = your_entry.efficiency_score
    
    leaderboard_entries = []
    for entry in entries:
        company = db.query(models.Company).filter(
            models.Company.id == entry.company_id
        ).first()
        
        leaderboard_entries.append(
            schemas.LeaderboardEntry(
                company_id=entry.company_id,
                company_name=company.name if company else "Bilinmiyor",
                rank=entry.rank,
                efficiency_score=entry.efficiency_score,
                emissions_per_employee_kwh=entry.emissions_per_employee_kwh,
                region=entry.region
            )
        )
    
    return schemas.Leaderboard(
        industry_type=industry_type or "Tümü",
        region=region,
        entries=leaderboard_entries,
        total=len(leaderboard_entries),
        your_rank=your_rank,
        your_score=your_score
    )


@app.post("/admin/badges", response_model=schemas.Badge)
@limiter.limit("10/minute")
def create_badge(
    badge_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Yeni rozet ekle (Admin only)
    
    Request:
    {
        "badge_name": "İlk Rapor",
        "description": "İlk raporunuzu ürettiniz!",
        "icon_emoji": "📄",
        "unlock_condition": "first_report",
        "category": "achievement"
    }
    """
    
    # Admin kontrolü
    auth_utils.require_superuser(current_user)
    
    db_badge = models.Badge(
        badge_name=badge_data.get("badge_name"),
        description=badge_data.get("description"),
        icon_emoji=badge_data.get("icon_emoji"),
        unlock_condition=badge_data.get("unlock_condition"),
        category=badge_data.get("category")
    )
    
    db.add(db_badge)
    db.commit()
    db.refresh(db_badge)
    
    logger.info(f"✅ Yeni rozet oluşturuldu: {badge_data.get('badge_name')}")
    
    return db_badge