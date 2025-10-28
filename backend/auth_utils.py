# backend/auth_utils.py
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

# Projemizin diğer parçalarını import ediyoruz
import crud
import models
import auth
from database import get_db

def require_superuser(current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have superuser privileges"
        )
    return current_user

def get_company_if_member(
    company_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
) -> models.Company:
    """
    Dependency: Kullanıcının bir şirketin üyesi olup olmadığını kontrol eder.
    Üye ise şirketi, değilse 403 hatası döndürür.
    """
    db_company = crud.get_company_by_id(db, company_id=company_id)
    if not db_company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    # Yeni Member modeli üzerinden kontrol
    member = db.query(models.Member).filter(
        models.Member.user_id == current_user.id,
        models.Member.company_id == company_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this company")
        
    return db_company

def check_user_role(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
    allowed_roles: List[models.CompanyMemberRole] = None
) -> bool:
    """
    Dependency: Kullanıcının belirli bir şirkette gerekli role sahip olup olmadığını kontrol eder.
    """
    if allowed_roles is None:
        allowed_roles = []

    # Member tablosu üzerinden sorgu
    member = db.query(models.Member).filter(
        models.Member.user_id == current_user.id,
        models.Member.company_id == company_id
    ).first()

    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this company")

    # Kullanıcının rolü, izin verilen rollerden biri mi?
    # Şirket sahibi/admin her zaman tüm yetkilere sahiptir.
    if member.role not in allowed_roles and member.role not in [models.CompanyMemberRole.owner, models.CompanyMemberRole.admin]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have the required permissions for this action")

    return True


# ===== YENİ: FACILITY-LEVEL ACCESS CONTROL =====

def check_facility_access(
    db: Session,
    facility_id: int,
    user_id: int
) -> Optional[models.Facility]:
    """
    Kullanıcının bir tesise erişip erişemeyeceğini kontrol eder.
    
    Erişim senaryoları:
    1. Owner/Admin: facility_id = NULL (tüm tesisler)
    2. Restricted: facility_id = belirli tesis ID'si
    3. No access: Hiç üye değilse
    
    Başarılı → Facility nesnesi, başarısız → None
    """
    
    # Tesisi bul
    facility = db.query(models.Facility).filter(
        models.Facility.id == facility_id
    ).first()
    
    if not facility:
        return None
    
    company_id = facility.company_id
    
    # Üyelik kaydını kontrol et
    member = db.query(models.Member).filter(
        models.Member.user_id == user_id,
        models.Member.company_id == company_id
    ).first()
    
    if not member:
        return None
    
    # Üye ise, tesis kısıtlaması var mı kontrol et
    if member.facility_id is None:
        # Kısıtlama yok → tüm tesisler erişim var
        return facility
    elif member.facility_id == facility_id:
        # Kısıtlanmış tesis ve eşleşiyor
        return facility
    else:
        # Kısıtlanmış tesis ama eşleşmiyor
        return None


def get_member_facilities(
    db: Session,
    user_id: int,
    company_id: int
) -> List[models.Facility]:
    """
    Kullanıcının belirli bir şirketteki hangi tesislere erişip
    erişemeyeceğini listeler.
    
    Dönen değer:
    - Eğer member.facility_id = NULL → şirketin tüm tesisleri
    - Eğer member.facility_id varsa → sadece o tesis
    """
    
    member = db.query(models.Member).filter(
        models.Member.user_id == user_id,
        models.Member.company_id == company_id
    ).first()
    
    if not member:
        return []
    
    if member.facility_id is None:
        # Tüm tesisler erişim var
        facilities = db.query(models.Facility).filter(
            models.Facility.company_id == company_id
        ).all()
        return facilities
    else:
        # Sadece belirli tesis
        facility = db.query(models.Facility).filter(
            models.Facility.id == member.facility_id
        ).first()
        return [facility] if facility else []