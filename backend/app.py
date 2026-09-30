import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timezone
import subprocess
import sys
import shutil
import json
import urllib.parse
import urllib.request
import hmac
import secrets
from flask import session

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
frontend_path = os.path.join(BASE_DIR, 'frontend')
app = Flask(__name__, static_folder=frontend_path, static_url_path='')
app.secret_key = os.environ.get('HEATSENSE_SESSION_SECRET') or secrets.token_hex(32)
CORS(app, supports_credentials=True)
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('SESSION_COOKIE_SECURE', '0') == '1'
IMD_API_URL = os.environ.get('IMD_API_URL', '').strip()
AUTH_EMAIL = os.environ.get('HEATSENSE_ADMIN_EMAIL', 'admin@heatsense.local').strip().lower()
AUTH_PASSWORD = os.environ.get('HEATSENSE_ADMIN_PASSWORD', 'ChangeMe123!')

LIVE_GRID = [
    (lat, lon) for lat in (8, 12, 16, 20, 24, 28, 32, 36)
    for lon in (68, 73, 78, 83, 88, 93, 98)
]
live_map_cache = {'timestamp': 0, 'data': None}


@app.before_request
def require_api_login():
    if request.path.startswith('/api/') and request.path not in {'/api/auth/login', '/api/health'}:
        if 'user' not in session:
            return jsonify({'error': 'Authentication required.'}), 401


def run_subprocess(command, cwd=None, timeout=25):
    try:
        completed = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False,
        )
        stdout = completed.stdout.strip()
        stderr = completed.stderr.strip()
        return completed.returncode, stdout, stderr
    except subprocess.TimeoutExpired as exc:
        return -1, '', f'Timeout expired after {timeout} seconds'
    except Exception as exc:
        return -1, '', str(exc)


def run_python_tests():
    runner = os.path.join(BASE_DIR, 'python-tests', 'TestRunner.py')
    code, out, err = run_subprocess([sys.executable, runner], cwd=os.path.dirname(runner))
    status = 'success' if code == 0 else 'failed'
    message = out or err or 'Python runner completed.'
    return {
        'status': status,
        'output': message,
        'code': code,
    }


def run_java_tests():
    script = os.path.join(BASE_DIR, 'java-tests', 'run-java-tests.js')
    node_exec = shutil.which('node') or shutil.which('node.exe')
    if not node_exec:
        return {
            'status': 'failed',
            'output': 'Node.js is not available on PATH.',
            'code': -1,
        }
    if not os.path.exists(script):
        return {
            'status': 'failed',
            'output': 'Java test script is missing.',
            'code': -1,
        }

    code, out, err = run_subprocess([node_exec, script], cwd=os.path.dirname(script))
    status = 'success' if code == 0 else 'failed'
    message = out or err or 'Java runner completed.'
    return {
        'status': status,
        'output': message,
        'code': code,
    }

@app.route('/')
def serve_frontend():
    return app.send_static_file('index.html')


@app.route('/signin')
def serve_signin():
    return app.send_static_file('signin.html')


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'online', 'data_source': 'IMD' if IMD_API_URL else 'Open-Meteo development fallback'})


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    if not hmac.compare_digest(email, AUTH_EMAIL) or not hmac.compare_digest(password, AUTH_PASSWORD):
        return jsonify({'error': 'Invalid email or password.'}), 401
    session.clear()
    session['user'] = {'email': AUTH_EMAIL, 'name': 'HeatSense Administrator', 'role': 'Administrator'}
    return jsonify({'user': session['user']})


@app.route('/api/auth/session', methods=['GET'])
def get_session():
    return jsonify({'authenticated': 'user' in session, 'user': session.get('user')})


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

# Sample telemetry and advisory data
stations = [
    {
        "id": 1,
        "name": "SVU Campus",
        "location": "Vidyavihar",
        "temperature": 44.6,
        "humidity": 32,
        "wind_speed": 14,
        "heat_index": 47.9,
        "updated": "3 min ago",
        "status": "Online"
    },
    {
        "id": 2,
        "name": "Shivneri Observatory",
        "location": "Pune",
        "temperature": 45.1,
        "humidity": 34,
        "wind_speed": 10,
        "heat_index": 49.2,
        "updated": "5 min ago",
        "status": "Online"
    },
    {
        "id": 3,
        "name": "Pashan Meteorological Station",
        "location": "Pune",
        "temperature": 44.9,
        "humidity": 36,
        "wind_speed": 12,
        "heat_index": 48.0,
        "updated": "4 min ago",
        "status": "Online"
    },
    {
        "id": 4,
        "name": "Agro Research Station",
        "location": "Aurangabad",
        "temperature": 46.2,
        "humidity": 30,
        "wind_speed": 15,
        "heat_index": 50.0,
        "updated": "2 min ago",
        "status": "Online"
    },
    {
        "id": 5,
        "name": "Airport Observatory",
        "location": "Mumbai",
        "temperature": 43.4,
        "humidity": 48,
        "wind_speed": 18,
        "heat_index": 45.6,
        "updated": "6 min ago",
        "status": "Online"
    },
    {
        "id": 6,
        "name": "Indore Canal Node",
        "location": "Indore",
        "temperature": 45.8,
        "humidity": 38,
        "wind_speed": 11,
        "heat_index": 49.4,
        "updated": "3 min ago",
        "status": "Online"
    }
]

users = [
    {'id': 1, 'name': 'Swarup Valvi', 'email': 'swarup@example.com', 'role': 'Administrator', 'status': 'Active', 'joined': '2026-01-18'},
    {'id': 2, 'name': 'Anita Rao', 'email': 'anita@example.com', 'role': 'Analyst', 'status': 'Active', 'joined': '2026-02-04'},
    {'id': 3, 'name': 'Rohan Desai', 'email': 'rohan@example.com', 'role': 'Field Operator', 'status': 'Pending', 'joined': '2026-02-22'},
    {'id': 4, 'name': 'Asha Kulkarni', 'email': 'asha@example.com', 'role': 'Analyst', 'status': 'Active', 'joined': '2026-03-01'},
    {'id': 5, 'name': 'Vikram Singh', 'email': 'vikram@example.com', 'role': 'Viewer', 'status': 'Inactive', 'joined': '2026-03-06'},
]


def fallback_live_map():
    """Keep the dashboard useful when the upstream weather service is unavailable."""
    now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    points = []
    for latitude, longitude in LIVE_GRID:
        temperature = 28 + (latitude - 8) * 0.18 + (longitude - 68) * 0.08
        if 18 <= latitude <= 30 and 72 <= longitude <= 88:
            temperature += 7
        points.append({
            'lat': latitude,
            'lon': longitude,
            'temperature': round(temperature, 1),
            'apparent_temperature': round(temperature + 3, 1),
            'humidity': 45,
            'wind_speed': 12,
        })
    return {'updated_at': now, 'source': 'fallback model', 'points': points}


def _get_value_from_array(values, index, default=None):
    if not isinstance(values, list):
        return default
    if index >= len(values):
        return default
    return values[index]


def fetch_live_map():
    query = urllib.parse.urlencode({
        'latitude': ','.join(str(point[0]) for point in LIVE_GRID),
        'longitude': ','.join(str(point[1]) for point in LIVE_GRID),
        'current': 'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m',
        'timezone': 'auto',
    })
    url = IMD_API_URL or f'https://api.open-meteo.com/v1/forecast?{query}'
    with urllib.request.urlopen(url, timeout=8) as response:
        payload = json.loads(response.read().decode('utf-8'))

    current = payload.get('current', {}) if isinstance(payload, dict) else {}
    current_keys = {
        'temperature_2m': current.get('temperature_2m', []),
        'apparent_temperature': current.get('apparent_temperature', []),
        'relative_humidity_2m': current.get('relative_humidity_2m', []),
        'wind_speed_10m': current.get('wind_speed_10m', []),
    }
    point_count = max((len(value) for value in current_keys.values() if isinstance(value, list)), default=0)

    if point_count == 0:
        raise ValueError('Open-Meteo payload did not include current weather arrays.')

    points = []
    for index in range(point_count):
        latitude, longitude = LIVE_GRID[index]
        points.append({
            'lat': latitude,
            'lon': longitude,
            'temperature': _get_value_from_array(current_keys['temperature_2m'], index),
            'apparent_temperature': _get_value_from_array(current_keys['apparent_temperature'], index),
            'humidity': _get_value_from_array(current_keys['relative_humidity_2m'], index),
            'wind_speed': _get_value_from_array(current_keys['wind_speed_10m'], index),
        })

    return {
        'updated_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'source': 'IMD official feed' if IMD_API_URL else 'Open-Meteo development fallback',
        'points': points,
    }

@app.route('/api/stations', methods=['GET'])
def get_stations():
    return jsonify(stations)


@app.route('/api/admin/users', methods=['GET'])
def get_admin_users():
    counts = {
        'total': len(users),
        'active': sum(user['status'] == 'Active' for user in users),
        'pending': sum(user['status'] == 'Pending' for user in users),
        'inactive': sum(user['status'] == 'Inactive' for user in users),
    }
    return jsonify({'counts': counts, 'users': users, 'updated_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')})


@app.route('/api/live-map', methods=['GET'])
def get_live_map():
    now = datetime.now(timezone.utc).timestamp()
    if live_map_cache['data'] and now - live_map_cache['timestamp'] < 300:
        return jsonify(live_map_cache['data'])
    try:
        data = fetch_live_map()
    except Exception:
        data = fallback_live_map()
    live_map_cache.update({'timestamp': now, 'data': data})
    return jsonify(data)

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    now = datetime.now(timezone.utc).strftime('%I:%M %p UTC')
    generated_alerts = []
    for station in stations:
        temperature = station['temperature']
        if temperature >= 45:
            level = 'Extreme Alert'
            action = 'Activate cooling locations, check on vulnerable residents, and follow local emergency guidance.'
        elif temperature >= 42:
            level = 'Severe Heat'
            action = 'Limit strenuous outdoor activity, provide water and shade, and monitor for heat illness.'
        elif temperature >= 38:
            level = 'Mild Heat'
            action = 'Share hydration and shade guidance, especially with people at higher risk.'
        else:
            continue

        generated_alerts.append({
            'id': station['id'],
            'level': level,
            'region': station['location'],
            'timestamp': now,
            'conditions': f"{temperature:.1f}°C, {station['humidity']}% humidity",
            'reason': f"Demonstration station reading reached the {level.lower()} threshold.",
            'action': action,
            'source': 'Demonstration station feed',
        })

    return jsonify(generated_alerts)

@app.route('/api/forecast', methods=['GET'])
def get_forecast():
    forecast = [
        {"day": "MON", "temperature": 42, "risk": "Severe Heat"},
        {"day": "TUE", "temperature": 44, "risk": "Severe Heat"},
        {"day": "WED", "temperature": 46, "risk": "Extreme Alert"},
        {"day": "THU", "temperature": 45, "risk": "Extreme Alert"},
        {"day": "FRI", "temperature": 43, "risk": "Severe Heat"},
        {"day": "SAT", "temperature": 41, "risk": "Mild Heat"},
        {"day": "SUN", "temperature": 40, "risk": "Mild Heat"}
    ]
    return jsonify(forecast)

@app.route('/api/advisory', methods=['POST'])
def generate_advisory():
    data = request.json or {}
    stakeholder = data.get('stakeholder', 'General Public')
    region = data.get('region', 'Mumbai')
    risk = data.get('risk', 'Mild Heat')

    descriptions = {
        'Normal': 'Current readings are below the dashboard heat-alert thresholds.',
        'Extreme Alert': 'Lethal heat risk with rapid escalation of heat stress.',
        'Severe Heat': 'Dangerous thermal stress for outdoor activities.',
        'Mild Heat': 'Elevated heat load with caution advised.'
    }
    actions = {
        'Farmers': 'Protect crops with shading, irrigation scheduling, and limit fieldwork during peak hours.',
        'Disaster Management': 'Deploy cooling centers, coordinate emergency response, and issue urgent public alerts.',
        'Public Health Agencies': 'Mobilize health outreach teams, distribute hydration guidance, and monitor heat illnesses.',
        'Municipal Authorities': 'Activate urban cooling strategies, manage power demand, and support vulnerable neighborhoods.',
        'General Public': 'Stay hydrated, avoid midday exposure, and check on family members and neighbors.'
    }
    precautions = {
        'Normal': 'Continue routine hydration and sun protection; monitor official local forecasts for changes.',
        'Extreme Alert': 'Remain indoors with cooling and follow emergency instructions immediately.',
        'Severe Heat': 'Limit strenuous outdoor work, hydrate frequently, and seek shaded areas.',
        'Mild Heat': 'Monitor conditions, use sun protection, and stay hydrated throughout the day.'
    }

    advisory = {
        'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'stakeholder': stakeholder,
        'region': region,
        'risk': risk,
        'summary': f'HeatSense AI indicates {risk.lower()} conditions for {region}.',
        'risk_description': descriptions.get(risk, ''),
        'recommended_actions': actions.get(stakeholder, ''),
        'precautions': precautions.get(risk, ''),
        'target_audience': stakeholder
    }

    return jsonify(advisory)

@app.route('/api/test-status', methods=['GET'])
def get_test_status():
    python_status = run_python_tests()
    java_status = run_java_tests()
    backend_status = {'status': 'online', 'details': 'Backend endpoints are reachable.'}

    return jsonify({
        'python': {'status': python_status['status'], 'details': python_status['output']},
        'java': {'status': java_status['status'], 'details': java_status['output']},
        'backend': backend_status
    })

@app.route('/api/run-tests', methods=['POST'])
def post_run_tests():
    python_status = run_python_tests()
    java_status = run_java_tests()
    backend_status = {'status': 'online', 'details': 'Backend endpoints are reachable.'}

    return jsonify({
        'python': {'status': python_status['status'], 'output': python_status['output']},
        'java': {'status': java_status['status'], 'output': java_status['output']},
        'backend': backend_status
    })

@app.route('/<path:path>')
def serve_asset(path):
    return app.send_static_file(path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', '5000')), debug=os.environ.get('FLASK_DEBUG') == '1')
