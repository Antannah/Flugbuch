from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date as date_type
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/flugbuch", tags=["flugbuch"])

@router.get("", response_model=List[schemas.FlugeintragOut])
def get_flugbuch(
    gelaende_id: str, 
    datum: date_type = None, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.Flugeintrag).filter(models.Flugeintrag.gelaende_id == gelaende_id)
    if datum:
        query = query.filter(models.Flugeintrag.datum == datum)
        
    # Order by start time
    return query.order_by(models.Flugeintrag.startzeit).all()

@router.post("", response_model=schemas.FlugeintragOut, status_code=status.HTTP_201_CREATED)
def create_flugeintrag(eintrag: schemas.FlugeintragCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not eintrag.hat_flugordnung_bestaetigt:
        raise HTTPException(status_code=400, detail="Die Flugordnung muss bestätigt werden")
        
    # Validate model belongs to user or it's a flugleiter entry
    if not eintrag.ist_flugleiter and eintrag.modell_id:
        modell = db.query(models.Modell).filter(models.Modell.id == eintrag.modell_id, models.Modell.user_id == current_user.id).first()
        if not modell:
            raise HTTPException(status_code=404, detail="Modell nicht gefunden oder gehört nicht dem Benutzer")
            
    new_eintrag = models.Flugeintrag(
        **eintrag.model_dump(), 
        user_id=current_user.id
    )
    db.add(new_eintrag)
    db.commit()
    db.refresh(new_eintrag)
    return new_eintrag

@router.put("/{id}", response_model=schemas.FlugeintragOut)
def update_flugeintrag(id: str, update_data: schemas.FlugeintragUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_eintrag = db.query(models.Flugeintrag).filter(models.Flugeintrag.id == id).first()
    
    if not db_eintrag:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")
        
    # Only the pilot themselves or an admin can edit
    if db_eintrag.user_id != current_user.id and current_user.rolle != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Keine Berechtigung, diesen Eintrag zu bearbeiten")
        
    db_eintrag.endzeit = update_data.endzeit
    if update_data.besonderes_ereignis:
        db_eintrag.besonderes_ereignis = update_data.besonderes_ereignis
        
    db.commit()
    db.refresh(db_eintrag)
    return db_eintrag
