import pytest
import datetime
from models import Flugeintrag

def test_idor_cannot_end_others_flight(client, session, test_pilot, test_admin, admin_token, pilot_token, test_gelaende):
    # Pilot startet einen Flug
    flug = Flugeintrag(
        user_id=test_admin.id, # The admin started a flight
        gelaende_id=test_gelaende.id,
        datum=datetime.date.today(),
        startzeit=datetime.datetime.now().time(),
        ist_flugleiter=True
    )
    session.add(flug)
    session.commit()

    # The normal pilot tries to end the admin's flight
    response = client.put(
        f"/api/flugeintraege/{flug.id}/abmelden",
        headers={"Authorization": f"Bearer {pilot_token}"}
    )
    
    # This should be prevented (403 Forbidden or 404 Not found)
    assert response.status_code in [403, 404]

def test_idor_cannot_delete_others_flight(client, session, test_pilot, test_admin, pilot_token, test_gelaende):
    # Admin started a flight
    flug = Flugeintrag(
        user_id=test_admin.id,
        gelaende_id=test_gelaende.id,
        datum=datetime.date.today(),
        startzeit=datetime.datetime.now().time(),
        ist_flugleiter=True
    )
    session.add(flug)
    session.commit()

    # Pilot tries to delete it
    response = client.delete(
        f"/api/flugeintraege/{flug.id}",
        headers={"Authorization": f"Bearer {pilot_token}"}
    )
    
    assert response.status_code in [403, 404]
