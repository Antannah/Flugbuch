from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/modelle", tags=["modelle"])

@router.get("", response_model=List[schemas.ModellOut])
def get_user_modelle(user_id: str = None, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    target_user_id = user_id if user_id else current_user.id
    
    # Non-admins can only view their own models
    if target_user_id != current_user.id and current_user.rolle != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Keine Berechtigung, Modelle anderer Benutzer anzuzeigen")
        
    modelle = db.query(models.Modell).filter(models.Modell.user_id == target_user_id, models.Modell.aktiv == True).all()
    return modelle

@router.post("", response_model=schemas.ModellOut, status_code=status.HTTP_201_CREATED)
def create_model(modell: schemas.ModellCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_modell = models.Modell(**modell.model_dump(), user_id=current_user.id)
    db.add(new_modell)
    db.commit()
    db.refresh(new_modell)
    return new_modell

@router.put("/{id}", response_model=schemas.ModellOut)
def update_model(id: str, modell_update: schemas.ModellCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_modell = db.query(models.Modell).filter(models.Modell.id == id).first()
    
    if not db_modell:
        raise HTTPException(status_code=404, detail="Modell nicht gefunden")
    
    if db_modell.user_id != current_user.id and current_user.rolle != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Keine Berechtigung, dieses Modell zu bearbeiten")
        
    for key, value in modell_update.model_dump().items():
        setattr(db_modell, key, value)
        
    db.commit()
    db.refresh(db_modell)
    return db_modell
