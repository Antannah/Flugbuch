from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=List[schemas.UserOut])
def get_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    users = db.query(models.User).all()
    return users

@router.post("", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.rolle != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Nur Admins können Benutzer anlegen")
    
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="E-Mail bereits registriert")
    
    hashed_password = auth.get_password_hash(user.passwort)
    new_user = models.User(
        vorname=user.vorname,
        nachname=user.nachname,
        email=user.email,
        hat_schulungsnachweis=user.hat_schulungsnachweis,
        rolle=user.rolle,
        passwort_hash=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
