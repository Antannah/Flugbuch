from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("", response_model=schemas.SystemSettingsOut)
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(models.SystemSettings).first()
    if not settings:
        # Fallback if init_db wasn't run or failed
        settings = models.SystemSettings(id="default")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("", response_model=schemas.SystemSettingsOut)
def update_settings(
    settings_update: schemas.SystemSettingsUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.rolle != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Nur Admins können Einstellungen ändern")
        
    settings = db.query(models.SystemSettings).first()
    if not settings:
        settings = models.SystemSettings(id="default")
        db.add(settings)
    
    settings.flugplatz_name = settings_update.flugplatz_name
    settings.adresse = settings_update.adresse
    
    db.commit()
    db.refresh(settings)
    return settings
