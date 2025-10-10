# backend/main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas, crud
from database import SessionLocal, engine

# Veritabanı tablolarını oluştur (Alembic kullanıldığı için production'da gerekmeyebilir ama geliştirme için iyi)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="KarbonUyum API",
    version="0.1.0"
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
    return {"status": "ok", "message": "KarbonUyum Backend API v0.1.0 çalışıyor."}

@app.post("/users/", response_model=schemas.User, status_code=201)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Bu email adresi zaten kayıtlı.")
    return crud.create_user(db=db, user=user)