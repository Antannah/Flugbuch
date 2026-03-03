from locust import HttpUser, task, between
import random

class FlugbuchUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        """ Echter Login beim Start der Simulation """
        # Ein Test-User sollte in der DB existieren, ansonsten wirft der Test 401
        # Hier gehen wir davon aus, dass wir einen User haben: test@mfg.de / testpassword
        response = self.client.post("/api/auth/login", data={
            "username": "admin@test.de", # Using the admin from our tests, though we should make sure one exists
            "password": "testpassword"
        })
        
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.client.headers.update({'Authorization': f'Bearer {self.token}'})

    @task(3)
    def lade_dashboard(self):
        """ Haupt-Aufgabe: Dashboard mit Tagesflügen laden """
        if self.token:
            self.client.get("/api/flugeintraege/heute")

    @task(1)
    def lade_modelle(self):
        """ Weniger häufig: Modelle des Piloten ansehen """
        if self.token:
            self.client.get("/api/modelle/")
