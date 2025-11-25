# backend/auth.py

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import schemas

# Diğer dosyalarımızdan gerekli parçaları import ediyoruz
from database import get_db

# .env dosyasından güvenlik ayarlarını yükle
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Şifre hashleme ve doğrulama işlemleri için
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# FastAPI'ye token'ın hangi endpoint'ten alınacağını belirtir
# Bu "token" string'i, main.py'deki login fonksiyonumuzun adresi olacak
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Girilen şifre ile veritabanındaki hash'lenmiş şifreyi karşılaştırır."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Verilen bilgilere göre yeni bir JWT access token oluşturur."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# get_db fonksiyonu artık database.py dosyasında tanımlı
# from database import get_db şeklinde import edilebilir


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Token'ı çözer ve veritabanından ilgili kullanıcıyı bulup döndürür."""
    # crud.py ile döngüsel import (circular import) hatası almamak için
    # crud'u fonksiyonun içinde import ediyoruz. Bu yaygın bir çözümdür.
    import crud

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = crud.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user