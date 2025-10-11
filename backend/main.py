# backend/main.py
from datetime import timedelta
from fastapi import Depends, FastAPI, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
import auth
import crud
import models
import schemas
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KarbonUyum API", # Başlığı senin projen için güncelledim
    version="0.2.0"
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
    return {"status": "ok", "message": "KarbonUyum API v0.2.0 çalışıyor."}

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # form_data.username olarak gelen aslında email adresidir
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
# ... create_user fonksiyonundan sonra ...

@app.post("/companies/", response_model=schemas.Company, status_code=status.HTTP_201_CREATED)
def create_company_for_user(
    company: schemas.CompanyCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """
    Giriş yapmış kullanıcı için yeni bir şirket oluşturur.
    """
    return crud.create_user_company(db=db, company=company, user_id=current_user.id)

@app.post("/companies/{company_id}/facilities/", response_model=schemas.Facility, status_code=status.HTTP_201_CREATED)
def create_facility_for_company(
    company_id: int,
    facility: schemas.FacilityCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """
    Belirtilen şirket altına yeni bir tesis ekler.
    YALNIZCA şirketin sahibi bu işlemi yapabilir.
    """
    db_company = crud.get_company_by_id(db, company_id=company_id)
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    if db_company.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add facility to this company")
    
    return crud.create_company_facility(db=db, facility=facility, company_id=company_id)


@app.get("/users/me/", response_model=schemas.User)
def read_users_me(current_user: schemas.User = Depends(auth.get_current_user)):
    """
    Giriş yapmış olan kullanıcının kendi bilgilerini döndürür.
    Bu endpoint korunmuştur ve geçerli bir token gerektirir.
    """
    return current_user