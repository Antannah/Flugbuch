import uuid
from sqlalchemy import Column, String, Boolean, Date, Time, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
import enum

class UserRole(str, enum.Enum):
    pilot = "pilot"
    flugleiter = "flugleiter"
    admin = "admin"

class ModellTyp(str, enum.Enum):
    motorflugzeug = "motorflugzeug"
    segelflugzeug = "segelflugzeug"
    hubschrauber = "hubschrauber"
    multikopter = "multikopter"
    sonstige = "sonstige"

class Antriebsart(str, enum.Enum):
    elektro = "elektro"
    verbrennung = "verbrennung"
    turbine = "turbine"
    anderer = "anderer"
    kein_antrieb = "kein_antrieb"

class Gewichtsklasse(str, enum.Enum):
    bis_250g = "bis_250g"
    bis_2kg = "bis_2kg"
    bis_4kg = "bis_4kg"
    bis_12kg = "bis_12kg"
    bis_25kg = "bis_25kg"
    bis_150kg = "bis_150kg"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    vorname = Column(String(50), nullable=False)
    nachname = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, index=True)
    passwort_hash = Column(String(255))
    hat_schulungsnachweis = Column(Boolean, default=False)
    rolle = Column(Enum(UserRole), default=UserRole.pilot)
    ist_gast = Column(Boolean, default=False)
    gast_gueltig_bis = Column(Date, nullable=True)

    modelle = relationship("Modell", back_populates="besitzer")
    flugeintraege = relationship("Flugeintrag", back_populates="pilot")


class Gelaende(Base):
    __tablename__ = "gelaende"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    bezeichnung = Column(String(100), nullable=False)
    qr_code_string = Column(String(255), nullable=True)
    ist_vereinsgelaende = Column(Boolean, default=True)

    flugeintraege = relationship("Flugeintrag", back_populates="gelaende")


class Modell(Base):
    __tablename__ = "modelle"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    bezeichnung = Column(String(100), nullable=False)
    modell_typ = Column(Enum(ModellTyp), nullable=False, default=ModellTyp.motorflugzeug)
    antrieb = Column(Enum(Antriebsart), nullable=False)
    gewichtsklasse = Column(Enum(Gewichtsklasse), nullable=False)
    frequenz = Column(String(50), nullable=True)
    registriernummer = Column(String(50), nullable=True)
    aktiv = Column(Boolean, default=True)

    besitzer = relationship("User", back_populates="modelle")
    flugeintraege = relationship("Flugeintrag", back_populates="modell")


class Flugeintrag(Base):
    __tablename__ = "flugeintraege"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    modell_id = Column(String, ForeignKey("modelle.id"), nullable=True)
    gelaende_id = Column(String, ForeignKey("gelaende.id"), nullable=False)
    
    datum = Column(Date, nullable=False)
    startzeit = Column(Time, nullable=False)
    endzeit = Column(Time, nullable=True)
    
    ist_flugleiter = Column(Boolean, default=False)
    hat_flugordnung_bestaetigt = Column(Boolean, default=True)
    besonderes_ereignis = Column(Text, nullable=True)

    pilot = relationship("User", back_populates="flugeintraege")
    modell = relationship("Modell", back_populates="flugeintraege")
    gelaende = relationship("Gelaende", back_populates="flugeintraege")
