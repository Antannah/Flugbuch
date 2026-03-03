import pytest
import datetime

def test_start_flight(client, pilot_token, test_gelaende):
    hoy = datetime.date.today().isoformat()
    now_time = datetime.datetime.now().time().strftime("%H:%M:%S")

    response = client.post(
        "/api/flugeintraege/",
        headers={"Authorization": f"Bearer {pilot_token}"},
        json={
            "gelaende_id": test_gelaende.id,
            "datum": hoy,
            "startzeit": now_time,
            "ist_flugleiter": True, # Test without model for simplicity
            "hat_flugordnung_bestaetigt": True,
            "besonderes_ereignis": "Alles super"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["ist_flugleiter"] == True
    assert data["endzeit"] is None # Flug läuft noch

def test_end_flight(client, pilot_token, test_gelaende, session, test_pilot):
    # Manually create a running flight
    from models import Flugeintrag
    flug = Flugeintrag(
        user_id=test_pilot.id,
        gelaende_id=test_gelaende.id,
        datum=datetime.date.today(),
        startzeit=datetime.datetime.now().time(),
        ist_flugleiter=True
    )
    session.add(flug)
    session.commit()

    # Now end it
    response = client.put(
        f"/api/flugeintraege/{flug.id}/abmelden",
        headers={"Authorization": f"Bearer {pilot_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["endzeit"] is not None

def test_get_aktive_fluege(client, pilot_token, test_gelaende, session, test_pilot):
    # 1. Create active flight
    from models import Flugeintrag
    flug_aktiv = Flugeintrag(
        user_id=test_pilot.id,
        gelaende_id=test_gelaende.id,
        datum=datetime.date.today(),
        startzeit=datetime.datetime.now().time(),
        ist_flugleiter=True
    )
    # 2. Create ended flight
    flug_beendet = Flugeintrag(
        user_id=test_pilot.id,
        gelaende_id=test_gelaende.id,
        datum=datetime.date.today(),
        startzeit=datetime.datetime.now().time(),
        endzeit=(datetime.datetime.now() + datetime.timedelta(hours=1)).time(),
        ist_flugleiter=False
    )
    session.add_all([flug_aktiv, flug_beendet])
    session.commit()

    response = client.get(
        "/api/flugeintraege/heute",
        headers={"Authorization": f"Bearer {pilot_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2 # both flights today should be returned
    
    # We could also check that one is "active" based on endzeit == None
    active_flights = [f for f in data if f["endzeit"] is None]
    assert len(active_flights) == 1
