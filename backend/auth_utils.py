# backend/auth_utils.py
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

# Projemizin diğer parçalarını import ediyoruz
import crud
import models
import schemas
import auth
from database import get_db # get_db'yi database.py'den alıyoruz

def get_company_if_member(
    company_id: int, 
    db: Session = Depends(get_db), 
    current_user: schemas.User = Depends(auth.get_current_user)
) -> models.Company:
    """
    FastAPI Dependency'si:
    Bir şirket ID'si alır, şirketi veritabanından bulur.
    Giriş yapmış kullanıcının o şirketin üyesi olup olmadığını kontrol eder.
    Eğer üye değilse 403 Forbidden hatası verir, üyeyse şirket nesnesini döndürür.
    """
    db_company = crud.get_company_by_id(db, company_id=company_id)
    if not db_company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    # KULLANICI BU ŞİRKETİN ÜYELERİNDEN BİRİ Mİ?
    # any(...) fonksiyonu, listedeki herhangi bir eleman koşulu sağlıyorsa True döner.
    is_member = any(member.id == current_user.id for member in db_company.members)
    
    if not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this company's resources")
        
    return db_company