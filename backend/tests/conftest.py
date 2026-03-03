import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database import Base, get_db
from models import User, UserRole, Gelaende
from auth import create_access_token

# SQLite in-memory database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def session():
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop tables after test
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(session):
    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def test_admin(session):
    admin = User(
        vorname="Admin",
        nachname="Pilot",
        email="admin@test.de",
        passwort_hash="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", # "testpassword"
        rolle=UserRole.admin
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)
    return admin

@pytest.fixture
def admin_token(test_admin):
    access_token = create_access_token(data={"sub": test_admin.id})
    return access_token

@pytest.fixture
def test_pilot(session):
    pilot = User(
        vorname="Normal",
        nachname="Pilot",
        email="pilot@test.de",
        passwort_hash="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", # "testpassword"
        rolle=UserRole.pilot
    )
    session.add(pilot)
    session.commit()
    session.refresh(pilot)
    return pilot

@pytest.fixture
def pilot_token(test_pilot):
    access_token = create_access_token(data={"sub": test_pilot.id})
    return access_token

@pytest.fixture
def test_gelaende(session):
    gelaende = Gelaende(
        bezeichnung="Testgelände MFG",
        ist_vereinsgelaende=True
    )
    session.add(gelaende)
    session.commit()
    session.refresh(gelaende)
    return gelaende
