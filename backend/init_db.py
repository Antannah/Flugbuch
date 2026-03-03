import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
import models
import auth

# Create tables
models.Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    # Check if admin exists
    admin = db.query(models.User).filter(models.User.email == "admin@mfgkitzingen.de").first()
    if not admin:
        admin = models.User(
            vorname="Admin",
            nachname="Test",
            email="admin@mfgkitzingen.de",
            passwort_hash=auth.get_password_hash("admin123"),
            rolle=models.UserRole.admin,
            hat_schulungsnachweis=True
        )
        db.add(admin)
        print("Test-Admin angelegt: admin@mfgkitzingen.de / admin123")
        
    # Check if gelaende exists
    gelaende = db.query(models.Gelaende).filter(models.Gelaende.bezeichnung == "MFG Kitzingen Hauptgelände").first()
    if not gelaende:
        gelaende = models.Gelaende(
            bezeichnung="MFG Kitzingen Hauptgelände",
            ist_vereinsgelaende=True,
            qr_code_string="Gelaende#MFG Kitzingen;Strasse;12345;Kitzingen;"
        )
        db.add(gelaende)
        print("Test-Gelände angelegt: MFG Kitzingen Hauptgelände")
        
    db.commit()
    print("Test-Datenbank erfolgreich initialisiert!")
except Exception as e:
    print(f"Fehler: {e}")
finally:
    db.close()
