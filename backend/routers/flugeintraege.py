from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
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
    query = db.query(models.Flugeintrag).options(
        joinedload(models.Flugeintrag.pilot),
        joinedload(models.Flugeintrag.modell)
    ).filter(models.Flugeintrag.gelaende_id == gelaende_id)
    if datum:
        query = query.filter(models.Flugeintrag.datum == datum)
        
    # Order by start time descending (newest first)
    return query.order_by(models.Flugeintrag.startzeit.desc()).all()

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

import csv
from io import StringIO
from fastapi.responses import Response

@router.get("/export/csv")
def export_flugbuch_csv(
    gelaende_id: str, 
    datum: date_type = None, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.rolle != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Nur Admins dürfen exportieren")

    query = db.query(models.Flugeintrag).filter(models.Flugeintrag.gelaende_id == gelaende_id)
    if datum:
        query = query.filter(models.Flugeintrag.datum == datum)
        
    eintraege = query.order_by(models.Flugeintrag.startzeit).all()
    
    f = StringIO()
    writer = csv.writer(f, delimiter=";")
    writer.writerow(["Datum", "Start", "Ende", "Pilot", "Schulungsnachweis", "Flugleiter", "Modell", "Antrieb", "Gewichtsklasse", "Frequenz", "Reg.Nr. >25kg", "Bemerkung"])
    
    for e in eintraege:
        pilot_name = f"{e.pilot.vorname} {e.pilot.nachname}" if e.pilot else "Unbekannt"
        schulung = "Ja" if (e.pilot and e.pilot.hat_schulungsnachweis) else "Nein"
        modell_name = e.modell.bezeichnung if e.modell else ""
        antrieb = e.modell.antrieb.value if e.modell else ""
        gewicht = e.modell.gewichtsklasse.value if e.modell else ""
        frequenz = e.modell.frequenz if e.modell and e.modell.frequenz else ""
        reg_nr = e.modell.registriernummer if e.modell and e.modell.registriernummer else ""
        
        writer.writerow([
            e.datum.strftime("%d.%m.%Y"),
            e.startzeit.strftime("%H:%M"),
            e.endzeit.strftime("%H:%M") if e.endzeit else "",
            pilot_name,
            schulung,
            "Ja" if e.ist_flugleiter else "Nein",
            modell_name,
            antrieb,
            gewicht,
            frequenz,
            reg_nr,
            e.besonderes_ereignis or ""
        ])
        
    response = Response(content=f.getvalue().encode('utf-8-sig'), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=flugbuch_export_{datum or 'all'}.csv"
    return response

from fpdf import FPDF

@router.get("/export/pdf")
def export_flugbuch_pdf(
    gelaende_id: str, 
    datum: date_type = None, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.rolle != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Nur Admins dürfen exportieren")

    query = db.query(models.Flugeintrag).filter(models.Flugeintrag.gelaende_id == gelaende_id)
    if datum:
        query = query.filter(models.Flugeintrag.datum == datum)
        
    eintraege = query.order_by(models.Flugeintrag.startzeit).all()
    
    pdf = FPDF(orientation="L", format="A4") # Landscape for wider columns
    pdf.add_page()
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 10, f"Flugbuch Export - {datum.strftime('%d.%m.%Y') if datum else 'Komplett'}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(5)
    
    # Table header
    pdf.set_font("helvetica", "B", 8)
    # Define column widths (landscape A4 = ~277mm usable)
    cols = [20, 12, 12, 32, 12, 18, 32, 22, 22, 18, 22, 55]
    headers = ["Datum", "Start", "Ende", "Pilot", "Schulg.", "Flugleiter", "Modell", "Antrieb", "Gewicht", "Freq.", "Reg.Nr.", "Bemerkung"]
    
    for w, h in zip(cols, headers):
        pdf.cell(w, 7, h, border=1)
    pdf.ln()
    
    pdf.set_font("helvetica", "", 7)
    # Table body
    for e in eintraege:
        pilot_name = f"{e.pilot.vorname} {e.pilot.nachname}" if e.pilot else "Unbekannt"
        schulung = "Ja" if (e.pilot and e.pilot.hat_schulungsnachweis) else "Nein"
        modell_name = e.modell.bezeichnung if e.modell else ""
        antrieb = e.modell.antrieb.value if e.modell else ""
        gewicht = e.modell.gewichtsklasse.value if e.modell else ""
        frequenz = e.modell.frequenz if e.modell and e.modell.frequenz else ""
        reg_nr = e.modell.registriernummer if e.modell and e.modell.registriernummer else ""
        
        row_data = [
            e.datum.strftime("%d.%m.%Y"),
            e.startzeit.strftime("%H:%M"),
            e.endzeit.strftime("%H:%M") if e.endzeit else "--:--",
            pilot_name,
            schulung,
            "Ja" if e.ist_flugleiter else "Nein",
            modell_name,
            antrieb,
            gewicht,
            frequenz,
            reg_nr,
            e.besonderes_ereignis or ""
        ]
        
        for w, d in zip(cols, row_data):
            text = str(d)[:30] if str(d) else ""
            pdf.cell(w, 7, text, border=1)
        pdf.ln()
        
    pdf_content = bytes(pdf.output())
    
    response = Response(content=pdf_content, media_type="application/pdf")
    response.headers["Content-Disposition"] = f"attachment; filename=flugbuch_export_{datum or 'all'}.pdf"
    return response
