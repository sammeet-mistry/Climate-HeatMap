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

    assert result["source"] == "Open-Meteo live weather"
    assert len(result["points"]) == 2
    assert result["points"][0]["temperature"] == 42.4
    assert result["points"][1]["humidity"] == 40
