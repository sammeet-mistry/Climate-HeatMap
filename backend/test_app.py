import json
from types import SimpleNamespace

import backend.app as app_module


class _Response:
    def __init__(self, payload):
        self._payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return json.dumps(self._payload).encode("utf-8")


def test_fetch_live_map_parses_open_meteo_arrays(monkeypatch):
    payload = {
        "latitude": [8.0, 12.0],
        "longitude": [68.0, 73.0],
        "current": {
            "temperature_2m": [42.4, 41.8],
            "relative_humidity_2m": [31, 40],
            "apparent_temperature": [45.2, 44.4],
            "wind_speed_10m": [10.0, 12.5],
        },
    }

    def fake_urlopen(url, timeout):
        return _Response(payload)

    monkeypatch.setattr(app_module.urllib.request, "urlopen", fake_urlopen)

    result = app_module.fetch_live_map()

    assert result["source"] == "Open-Meteo development fallback"
    assert len(result["points"]) == 2
    assert result["points"][0]["temperature"] == 42.4
    assert result["points"][1]["humidity"] == 40


def test_api_requires_login_and_accepts_configured_credentials():
    client = app_module.app.test_client()

    unauthenticated = client.get('/api/stations')
    assert unauthenticated.status_code == 401

    invalid = client.post('/api/auth/login', json={
        'email': app_module.AUTH_EMAIL,
        'password': 'wrong-password',
    })
    assert invalid.status_code == 401

    authenticated = client.post('/api/auth/login', json={
        'email': app_module.AUTH_EMAIL,
        'password': app_module.AUTH_PASSWORD,
    })
    assert authenticated.status_code == 200
    assert client.get('/api/stations').status_code == 200

    client.post('/api/auth/logout')
    assert client.get('/api/stations').status_code == 401


def test_alerts_are_generated_from_station_thresholds():
    client = app_module.app.test_client()
    client.post('/api/auth/login', json={
        'email': app_module.AUTH_EMAIL,
        'password': app_module.AUTH_PASSWORD,
    })

    original_temperature = app_module.stations[0]['temperature']
    try:
        app_module.stations[0]['temperature'] = 45.0
        response = client.get('/api/alerts')
        alerts = response.get_json()

        assert response.status_code == 200
        assert alerts[0]['level'] == 'Extreme Alert'
        assert alerts[0]['source'] == 'Demonstration station feed'

        app_module.stations[0]['temperature'] = 37.9
        alerts = client.get('/api/alerts').get_json()
        assert all(alert['id'] != app_module.stations[0]['id'] for alert in alerts)
    finally:
        app_module.stations[0]['temperature'] = original_temperature


def test_normal_risk_advisory_includes_precautions():
    client = app_module.app.test_client()
    client.post('/api/auth/login', json={
        'email': app_module.AUTH_EMAIL,
        'password': app_module.AUTH_PASSWORD,
    })

    response = client.post('/api/advisory', json={
        'stakeholder': 'General Public',
        'region': 'Northern Highlands',
        'risk': 'Normal',
    })

    assert response.status_code == 200
    assert 'below the dashboard heat-alert thresholds' in response.get_json()['risk_description']
    assert 'Continue routine hydration' in response.get_json()['precautions']


def test_admin_roster_has_requested_admins_and_preserves_placeholders():
    client = app_module.app.test_client()
    client.post('/api/auth/login', json={
        'email': app_module.AUTH_EMAIL,
        'password': app_module.AUTH_PASSWORD,
    })

    response = client.get('/api/admin/users')
    data = response.get_json()
    users_by_name = {user['name']: user for user in data['users']}

    assert response.status_code == 200
    assert 'Swarup Valvi' not in users_by_name
    assert users_by_name['Sammeet Mistry']['role'] == 'Administrator'
    assert users_by_name['Shravan Thakker']['role'] == 'Administrator'
    assert {'Anita Rao', 'Rohan Desai', 'Asha Kulkarni', 'Vikram Singh'} <= users_by_name.keys()
    assert data['counts']['total'] == 6
