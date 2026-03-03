from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=List[schemas.UserOut])
def get_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.rolle == models.UserRole.admin:
        return db.query(models.User).all()
    # Reguläre Nutzer sehen nur sich selbst
    return [current_user]

@router.put("/me/profil", response_model=schemas.UserOut)
def update_own_profile(update_data: schemas.UserProfileUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Eigenes Profil (Vorname, Nachname, Email, Schulungsnachweis) ändern."""
    if current_user.email != update_data.email:
        db_user = db.query(models.User).filter(models.User.email == update_data.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="E-Mail bereits verwendet")
    
    current_user.vorname = update_data.vorname
    current_user.nachname = update_data.nachname
    current_user.email = update_data.email
    current_user.hat_schulungsnachweis = update_data.hat_schulungsnachweis
    current_user.hat_flugordnung_bestaetigt = update_data.hat_flugordnung_bestaetigt
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/me/passwort", status_code=status.HTTP_200_OK)
def update_own_password(update_data: schemas.UserPasswordUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Eigenes Passwort ändern."""
    current_user.passwort_hash = auth.get_password_hash(update_data.passwort)
    db.commit()
    return {"message": "Passwort erfolgreich geändert"}

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

@router.put("/{id}/profil", response_model=schemas.UserOut)
def update_user_profile(id: str, update_data: schemas.UserProfileUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.rolle != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Nur Admins können Profile bearbeiten")
        
    db_user = db.query(models.User).filter(models.User.id == id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
        
    if db_user.email != update_data.email:
        existing = db.query(models.User).filter(models.User.email == update_data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="E-Mail bereits verwendet")
            
    db_user.vorname = update_data.vorname
    db_user.nachname = update_data.nachname
    db_user.email = update_data.email
    db_user.hat_schulungsnachweis = update_data.hat_schulungsnachweis
    db_user.hat_flugordnung_bestaetigt = update_data.hat_flugordnung_bestaetigt
    
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
