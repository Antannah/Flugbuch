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

@router.put("/{id}/rolle", response_model=schemas.UserOut)
def update_user_role(id: str, update_data: schemas.UserRoleUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.rolle != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Nur Admins können Berechtigungen ändern")
        
    db_user = db.query(models.User).filter(models.User.id == id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
        
    db_user.rolle = update_data.rolle
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/{id}/passwort", status_code=status.HTTP_200_OK)
def update_user_password(id: str, update_data: schemas.UserPasswordUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.rolle != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Nur Admins können Passwörter zurücksetzen")
        
    db_user = db.query(models.User).filter(models.User.id == id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
        
    db_user.passwort_hash = auth.get_password_hash(update_data.passwort)
    db.commit()
    return {"message": "Passwort erfolgreich geändert"}

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(id: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.rolle != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Nur Admins können Benutzer löschen")
        
    db_user = db.query(models.User).filter(models.User.id == id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
        
    db.delete(db_user)
    db.commit()
    return None
