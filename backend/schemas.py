from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, time
from models import UserRole, Antriebsart, Gewichtsklasse, ModellTyp

# --- System Settings ---
class SystemSettingsBase(BaseModel):
    flugplatz_name: str
    adresse: str

class SystemSettingsOut(SystemSettingsBase):
    id: str
    class Config:
        from_attributes = True

class SystemSettingsUpdate(SystemSettingsBase):
    pass

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

class UserRoleUpdate(BaseModel):
    rolle: UserRole

class UserPasswordUpdate(BaseModel):
    passwort: str

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

class UserShort(BaseModel):
    vorname: str
    nachname: str
    class Config:
        from_attributes = True

class FlugeintragOut(FlugeintragBase):
    id: str
    user_id: str
    gelaende_id: str
    modell_id: Optional[str] = None
    pilot: Optional[UserShort] = None
    modell: Optional[ModellOut] = None
    class Config:
        from_attributes = True
