import pytest

def test_login_success(client, test_pilot):
    # Default password established in conftest.py fixture
    response = client.post(
        "/api/auth/login",
        data={"username": "pilot@test.de", "password": "testpassword"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_failure(client, test_pilot):
    response = client.post(
        "/api/auth/login",
        data={"username": "pilot@test.de", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Falsche E-Mail oder Passwort"

def test_pilot_cannot_create_gelaende(client, pilot_token):
    response = client.post(
        "/api/gelaende/",
        headers={"Authorization": f"Bearer {pilot_token}"},
        json={
            "bezeichnung": "Neues Gelände via Pilot",
            "ist_vereinsgelaende": False
        }
    )
    assert response.status_code == 403 

def test_admin_can_create_gelaende(client, admin_token):
    response = client.post(
        "/api/gelaende/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "bezeichnung": "Neues Gelände via Admin",
            "ist_vereinsgelaende": True
        }
    )
    assert response.status_code == 200
    assert response.json()["bezeichnung"] == "Neues Gelände via Admin"
