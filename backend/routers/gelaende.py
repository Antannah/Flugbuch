from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/gelaende", tags=["gelaende"])

@router.get("", response_model=List[schemas.GelaendeOut])
def get_gelaende(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Gelaende).all()

@router.post("", response_model=schemas.GelaendeOut, status_code=status.HTTP_201_CREATED)
def create_gelaende(gelaende: schemas.GelaendeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.rolle != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Nur Admins können Gelände anlegen")
        
    new_gelaende = models.Gelaende(**gelaende.model_dump())
    db.add(new_gelaende)
    db.commit()
    db.refresh(new_gelaende)
    return new_gelaende
