from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, time
from models import UserRole, Antriebsart, Gewichtsklasse, ModellTyp

# --- Gelaende ---
class GelaendeBase(BaseModel):
    bezeichnung: str
    qr_code_string: Optional[str] = None
    ist_vereinsgelaende: bool = True

class GelaendeCreate(GelaendeBase):
    pass

class GelaendeOut(GelaendeBase):
    id: str
    class Config:
        from_attributes = True

# --- Modell ---
class ModellBase(BaseModel):
    bezeichnung: str
    modell_typ: ModellTyp = ModellTyp.motorflugzeug
    antrieb: Antriebsart
    gewichtsklasse: Gewichtsklasse
    frequenz: Optional[str] = None
    registriernummer: Optional[str] = None
    aktiv: bool = True

class ModellCreate(ModellBase):
    pass

class ModellOut(ModellBase):
    id: str
    user_id: str
    class Config:
        from_attributes = True

# --- User ---
class UserBase(BaseModel):
    vorname: str
    nachname: str
    email: EmailStr
    hat_schulungsnachweis: bool = False
    ist_gast: bool = False

class UserCreate(UserBase):
    passwort: str
    rolle: UserRole = UserRole.pilot

class UserGastCreate(BaseModel):
    vorname: str
    nachname: str
    gast_token: str

class UserOut(UserBase):
    id: str
    rolle: UserRole
    gast_gueltig_bis: Optional[date] = None
    modelle: List[ModellOut] = []
    class Config:
        from_attributes = True

# --- Flugeintrag ---
class FlugeintragBase(BaseModel):
    datum: date
    startzeit: time
    endzeit: Optional[time] = None
    ist_flugleiter: bool = False
    hat_flugordnung_bestaetigt: bool = True
    besonderes_ereignis: Optional[str] = None

class FlugeintragCreate(FlugeintragBase):
    gelaende_id: str
    modell_id: Optional[str] = None

class FlugeintragUpdate(BaseModel):
    endzeit: time
    besonderes_ereignis: Optional[str] = None

class FlugeintragOut(FlugeintragBase):
    id: str
    user_id: str
    gelaende_id: str
    modell_id: Optional[str] = None
    class Config:
        from_attributes = True
