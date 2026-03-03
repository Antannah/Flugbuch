from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, date, datetime
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.passwort_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falsche E-Mail oder Passwort",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": {
            "id": user.id, 
            "email": user.email, 
            "rolle": user.rolle, 
            "vorname": user.vorname, 
            "nachname": user.nachname
        }
    }

@router.post("/gast")
def login_gast(gast_in: schemas.UserGastCreate, db: Session = Depends(get_db)):
    # Very simple gast token mechanism for phase 1/4
    expected_token = "gast2026"
    if gast_in.gast_token != expected_token:
        raise HTTPException(status_code=401, detail="Ungültiges Gast-Token")
        
    gueltig_bis = date.today()
    gast_user = models.User(
        vorname=gast_in.vorname,
        nachname=gast_in.nachname,
        email=f"gast_{datetime.now().strftime('%Y%m%d%H%M%S')}@gast.local",
        ist_gast=True,
        rolle=models.UserRole.pilot,
        gast_gueltig_bis=gueltig_bis,
        passwort_hash="disabled"
    )
    db.add(gast_user)
    db.commit()
    db.refresh(gast_user)
    
    access_token_expires = timedelta(minutes=60*24)
    access_token = auth.create_access_token(
        data={"sub": gast_user.id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": {
            "id": gast_user.id, 
            "vorname": gast_user.vorname, 
            "nachname": gast_user.nachname, 
            "rolle": gast_user.rolle
        }
    }
