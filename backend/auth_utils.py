# backend/auth_utils.py
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

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
    
    # SQLAlchemy'nin `any` fonksiyonu, ilişkideki bir elemanın koşulu sağlayıp sağlamadığını kontrol eder.
    # members collection'ında current_user var mı kontrolü
    is_member = any(member.id == current_user.id for member in db_company.members)
    
    if not is_member:
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

    # Doğrudan ara tablo (association table) üzerinden sorgu yapıyoruz.
    from models import company_members_association
    membership = db.query(company_members_association).filter(
        company_members_association.c.user_id == current_user.id,
        company_members_association.c.company_id == company_id
    ).first()

    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this company")

    # Kullanıcının rolü, izin verilen rollerden biri mi?
    # Şirket sahibi her zaman tüm yetkilere sahiptir.
    if membership.role not in allowed_roles and membership.role != models.CompanyMemberRole.owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have the required permissions for this action")

    return True