const API_ROOT = (() => {
  const configuredRoot = window.HEATSENSE_API_ROOT || '';
  if (configuredRoot) {
    return configuredRoot.replace(/\/$/, '');
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }

  return '/api';
})();

const stationList = document.getElementById('stationList');
const alertList = document.getElementById('alertList');
const forecastCards = document.getElementById('forecastCards');
const advisoryForm = document.getElementById('advisoryForm');
const advisoryBody = document.getElementById('advisoryBody');
const stakeholderSelect = document.getElementById('stakeholderSelect');
const regionSelect = document.getElementById('regionSelect');
const riskSelect = document.getElementById('riskSelect');
const generateAdvisoryBtn = document.getElementById('generateAdvisory');
const generateAdvisoryFromMapBtn = document.getElementById('generateAdvisoryFromMap');
const selectedRegionPanel = document.getElementById('selectedRegionPanel');
const selectedRegionName = document.getElementById('selectedRegionName');
const panelTemp = document.getElementById('panelTemp');
const panelFeels = document.getElementById('panelFeels');
const panelHumidity = document.getElementById('panelHumidity');
const panelRisk = document.getElementById('panelRisk');
const panelAnomaly = document.getElementById('panelAnomaly');
const panelAction = document.getElementById('panelAction');
const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');
const filterPills = document.querySelectorAll('.filter-pill');
const regionMap = document.getElementById('regionMap');
const liveMapStatus = document.getElementById('liveMapStatus');
const liveMapUpdated = document.getElementById('liveMapUpdated');
let liveLeafletMap;
let liveHeatLayer;
let liveBoundaryLayer;
const snapshotCards = document.querySelectorAll('.snapshot-card');
const pythonStatus = document.getElementById('pythonStatus');
const javaStatus = document.getElementById('javaStatus');
const apiStatus = document.getElementById('apiStatus');
const frontendStatus = document.getElementById('frontendStatus');
const pythonOutput = document.getElementById('pythonOutput');
const javaOutput = document.getElementById('javaOutput');
const apiOutput = document.getElementById('apiOutput');
const frontendOutput = document.getElementById('frontendOutput');
const refreshTestStatusBtn = document.getElementById('refreshTestStatus');
const runTestsNowBtn = document.getElementById('runTestsNow');
const userTableBody = document.getElementById('userTableBody');
const refreshUsersBtn = document.getElementById('refreshUsers');

const regionData = [
  {
    name: 'Central Plains',
    temperature: 44.8,
    feels_like: 48.2,
    humidity: 36,
    risk: 'Extreme Alert',
    anomaly: '+4.2°C',
    action: 'Activate emergency cooling centers and alert vulnerable populations.'
  },
  {
    name: 'Deccan Belt',
    temperature: 45.1,
    feels_like: 49.0,
    humidity: 34,
    risk: 'Severe Heat',
    anomaly: '+3.8°C',
    action: 'Limit outdoor operations and deploy hydration support.'
  },
  {
    name: 'Coastal Corridor',
    temperature: 41.8,
    feels_like: 45.2,
    humidity: 68,
    risk: 'Mild Heat',
    anomaly: '+2.1°C',
    action: 'Monitor humidity-driven heat stress and keep cool water available.'
  },
  {
    name: 'Northern Highlands',
    temperature: 33.5,
    feels_like: 35.2,
    humidity: 45,
    risk: 'Normal',
    anomaly: '+0.3°C',
    action: 'No immediate heat advisory; watch for local warming trends.'
  }
];

function initNavigation() {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    siteNav.classList.toggle('open');
  });
}

function animateMetrics() {
  snapshotCards.forEach((card) => {
    const target = Number(card.dataset.target.replace(/[^0-9.-]/g, ''));
    const unit = card.dataset.unit;
    const change = card.dataset.change;
    const valueElement = card.querySelector('.metric-line strong');
    let current = 0;
    const duration = 1200;
    const stepTime = 16;
    const steps = Math.ceil(duration / stepTime);
    const increment = target / steps;
    let count = 0;

    const interval = setInterval(() => {
      current += increment;
      count += 1;
      valueElement.textContent = unit === 'zones' ? Math.round(current) : current.toFixed(1);
      if (count >= steps) {
        clearInterval(interval);
        valueElement.textContent = unit === 'zones' ? `${Math.round(target)}` : `${target.toFixed(1)}`;
      }
    }, stepTime);

    const changeEl = document.createElement('div');
    changeEl.className = 'metric-change';
    changeEl.textContent = change;
    card.appendChild(changeEl);
  });
}

function renderStations(stations) {
  stationList.innerHTML = '';
  stations.forEach((station) => {
    const stationCard = document.createElement('article');
    stationCard.className = 'station-card';
    stationCard.innerHTML = `
      <div>
        <h3>${station.name}</h3>
        <p>${station.location}</p>
      </div>
      <div class="station-meta">
        <span class="station-badge">${station.status}</span>
        <span>Temp: ${station.temperature.toFixed(1)}°C</span>
        <span>Heat Index: ${station.heat_index.toFixed(1)}°C</span>
        <span>Updated ${station.updated}</span>
      </div>
    `;
    stationList.appendChild(stationCard);
  });
}

function renderAlerts(alerts) {
  alertList.innerHTML = '';
  alerts.forEach((alert) => {
    const alertCard = document.createElement('article');
    alertCard.className = 'alert-card';
    alertCard.dataset.level = alert.level;
    alertCard.innerHTML = `
      <strong>${alert.level} — ${alert.region}</strong>
      <div class="alert-meta">
        <span>${alert.timestamp}</span>
        <span>${alert.conditions}</span>
      </div>
      <p>${alert.reason}</p>
      <p><strong>Action:</strong> ${alert.action}</p>
    `;
    alertList.appendChild(alertCard);
  });
}

function renderForecast(forecast) {
  forecastCards.innerHTML = '';
  forecast.forEach((day) => {
    const card = document.createElement('article');
    const statusClass = day.risk === 'Extreme Alert' ? 'extreme' : day.risk === 'Severe Heat' ? 'severe' : 'mild';
    card.className = `forecast-card ${statusClass}`;
    card.innerHTML = `
      <span>${day.day}</span>
      <strong>${day.temperature}°C</strong>
      <small>${day.risk}</small>
    `;
    forecastCards.appendChild(card);
  });
}

async function loadData() {
  try {
    const [stationsResponse, alertsResponse, forecastResponse] = await Promise.all([
      fetch(`${API_ROOT}/stations`),
      fetch(`${API_ROOT}/alerts`),
      fetch(`${API_ROOT}/forecast`)
    ]);

    if (!stationsResponse.ok || !alertsResponse.ok || !forecastResponse.ok) {
      throw new Error('API fetch failed');
    }

    const stations = await stationsResponse.json();
    const alerts = await alertsResponse.json();
    const forecast = await forecastResponse.json();

    renderStations(stations);
    renderAlerts(alerts);
    renderForecast(forecast);
  } catch (error) {
    console.error('Failed to load data:', error);
    stationList.innerHTML = '<p class="notification-text">Unable to load station data.</p>';
    alertList.innerHTML = '<p class="notification-text">Unable to load alerts.</p>';
    forecastCards.innerHTML = '<p class="notification-text">Unable to load forecast.</p>';
  }
}

async function loadAdminUsers() {
  try {
    const response = await fetch(`${API_ROOT}/admin/users`);
    if (!response.ok) throw new Error('User data fetch failed');
    const data = await response.json();
    Object.entries(data.counts).forEach(([key, value]) => {
      const element = document.getElementById(`${key}Users`);
      if (element) element.textContent = value;
    });
    userTableBody.innerHTML = data.users.map((user) => `
      <tr>
        <td><strong>${user.name}</strong><span>${user.email}</span></td>
        <td>${user.role}</td>
        <td><span class="user-status ${user.status.toLowerCase()}">${user.status}</span></td>
        <td>${user.joined}</td>
      </tr>
    `).join('');
  } catch (error) {
    userTableBody.innerHTML = '<tr><td colspan="4">Unable to load users.</td></tr>';
    console.error('Admin users error:', error);
  }
}

function updateRegionPanel(region) {
  selectedRegionName.textContent = region.name;
  panelTemp.textContent = `${region.temperature.toFixed(1)}°C`;
  panelFeels.textContent = `${region.feels_like.toFixed(1)}°C`;
  panelHumidity.textContent = `${region.humidity}%`;
  panelRisk.textContent = region.risk;
  panelAnomaly.textContent = region.anomaly;
  panelAction.textContent = region.action;
  regionSelect.value = region.name;
}

function initRegionSelection() {
  regionSelect.addEventListener('change', () => {
    const region = regionData.find((entry) => entry.name === regionSelect.value);
    if (region) {
      updateRegionPanel(region);
    }
  });
}

function heatColor(temperature) {
  if (temperature > 42) return 'extreme';
  if (temperature >= 36) return 'severe';
  if (temperature >= 28) return 'mild';
  return 'normal';
}

function renderLiveMap(data) {
  if (!window.L) {
    liveMapStatus.textContent = 'Map library unavailable';
    return;
  }
  if (!liveLeafletMap) {
    liveLeafletMap = L.map(regionMap, { zoomControl: true, attributionControl: true }).setView([22.5, 79], 4.5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 8,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(liveLeafletMap);
    fetch('https://raw.githubusercontent.com/datameet/maps/master/States/india_state.geojson')
      .then((response) => response.json())
      .then((geometry) => {
        liveBoundaryLayer = L.geoJSON(geometry, {
          style: { color: '#d8f3ff', weight: 1.5, fillColor: '#183b4d', fillOpacity: 0.2 }
        }).addTo(liveLeafletMap);
        liveLeafletMap.fitBounds(liveBoundaryLayer.getBounds(), { padding: [18, 18] });
      })
      .catch(() => { liveMapStatus.textContent = 'Live feed · boundary unavailable'; });
    liveHeatLayer = L.heatLayer([], {
      radius: 38,
      blur: 28,
      maxZoom: 7,
      max: 1,
      gradient: { 0.15: '#2c7bb6', 0.35: '#4dcadc', 0.55: '#a6d96a', 0.72: '#fdae61', 0.88: '#f46d43', 1: '#d73027' }
    }).addTo(liveLeafletMap);
  }
  const temperatures = data.points.map((point) => point.temperature).filter(Number.isFinite);
  const apparentTemperatures = data.points.map((point) => point.apparent_temperature).filter(Number.isFinite);
  const averageTemperature = temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length;
  const maximumHeatIndex = Math.max(...apparentTemperatures);
  const extremeCount = temperatures.filter((temperature) => temperature > 42).length;
  const liveValues = [averageTemperature, maximumHeatIndex, extremeCount, data.points.length, averageTemperature - 30];
  snapshotCards.forEach((card, index) => {
    const valueElement = card.querySelector('.metric-line strong');
    if (!valueElement) return;
    valueElement.textContent = index === 2 || index === 3 ? Math.round(liveValues[index]) : liveValues[index].toFixed(1);
  });
  const minimumTemperature = Math.min(...temperatures);
  const temperatureRange = Math.max(...temperatures) - minimumTemperature || 1;
  liveHeatLayer.setLatLngs(data.points.map((point) => [
    point.lat,
    point.lon,
    0.25 + ((point.temperature - minimumTemperature) / temperatureRange) * 0.75
  ]));
  data.points.forEach((point) => {
    const marker = L.circleMarker([point.lat, point.lon], {
      radius: 7,
      color: '#ffffff',
      fillColor: '#ffffff',
      fillOpacity: 0,
      opacity: 0,
      weight: 0
    }).addTo(liveLeafletMap);
    marker.bindTooltip(`${point.temperature}°C · feels like ${point.apparent_temperature}°C`, { direction: 'top' });
    marker.on('click', () => {
      const risk = heatColor(point.temperature) === 'extreme' ? 'Extreme Alert' : heatColor(point.temperature) === 'severe' ? 'Severe Heat' : heatColor(point.temperature) === 'mild' ? 'Mild Heat' : 'Normal';
      updateRegionPanel({
        name: `${point.lat.toFixed(0)}°N / ${point.lon.toFixed(0)}°E`,
        temperature: point.temperature,
        feels_like: point.apparent_temperature,
        humidity: point.humidity,
        risk,
        anomaly: 'Live feed',
        action: risk === 'Extreme Alert' ? 'Activate cooling centers and alert vulnerable populations.' : 'Monitor local conditions and maintain hydration.'
      });
    });
  });
  liveMapStatus.textContent = `Live feed · ${data.points.length} grid cells · ${data.source}`;
  liveMapUpdated.textContent = `Updated ${new Date(data.updated_at).toLocaleTimeString()}`;
}

async function loadLiveMap() {
  try {
    const response = await fetch(`${API_ROOT}/live-map`);
    if (!response.ok) throw new Error('Live map fetch failed');
    renderLiveMap(await response.json());
  } catch (error) {
    liveMapStatus.textContent = 'Weather feed unavailable';
    liveMapUpdated.textContent = 'Retrying in 5 minutes';
    console.error('Live map error:', error);
  }
}

function initAlertFiltering() {
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const filter = pill.dataset.filter;
      const alertCards = document.querySelectorAll('.alert-card');
      alertCards.forEach((card) => {
        card.style.display = filter === 'all' || card.dataset.level === filter ? 'grid' : 'none';
      });
    });
  });
}

async function generateAdvisory(stakeholder, region, risk) {
  try {
    const response = await fetch(`${API_ROOT}/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stakeholder, region, risk })
    });

    if (!response.ok) {
      throw new Error('Advisory request failed');
    }

    const advisory = await response.json();
    advisoryBody.innerHTML = `
      <div class="result-body">
        <p><strong>Stakeholder:</strong> ${advisory.stakeholder}</p>
        <p><strong>Region:</strong> ${advisory.region}</p>
        <p><strong>Risk:</strong> ${advisory.risk}</p>
        <p><strong>${advisory.summary}</strong></p>
        <h4>Recommended actions</h4>
        <p>${advisory.recommended_actions}</p>
        <h4>Precautions</h4>
        <p>${advisory.precautions}</p>
        <p class="advisory-footer">Generated at ${new Date(advisory.timestamp).toLocaleString()}</p>
      </div>
    `;
  } catch (error) {
    advisoryBody.innerHTML = '<p class="notification-text">Failed to generate advisory. Please try again later.</p>';
    console.error('Advisory error:', error);
  }
}

function setCardState(cardElement, state) {
  cardElement.classList.remove('success', 'fail', 'warning');
  cardElement.classList.add(state);
}

function updateTestCard(statusElement, outputElement, state, message) {
  const card = statusElement.closest('.test-card');
  if (card) setCardState(card, state);
  statusElement.textContent = state === 'success' ? 'Success' : state === 'fail' ? 'Failed' : 'Pending';
  outputElement.textContent = message;
}

function interpretStatus(value) {
  if (!value) return 'warning';
  if (value.toLowerCase().includes('success') || value.toLowerCase().includes('ready') || value.toLowerCase().includes('online')) {
    return 'success';
  }
  if (value.toLowerCase().includes('failed') || value.toLowerCase().includes('error')) {
    return 'fail';
  }
  return 'warning';
}

async function loadTestStatus() {
  updateTestCard(pythonStatus, pythonOutput, 'warning', 'Checking Python tests...');
  updateTestCard(javaStatus, javaOutput, 'warning', 'Checking Java tests...');
  updateTestCard(apiStatus, apiOutput, 'warning', 'Checking backend status...');
  updateTestCard(frontendStatus, frontendOutput, 'success', 'Frontend is loaded.');

  try {
    const response = await fetch(`${API_ROOT}/test-status`);
    if (!response.ok) throw new Error('Status fetch failed');
    const data = await response.json();

    updateTestCard(pythonStatus, pythonOutput, interpretStatus(data.python.status), data.python.details || 'Python status loaded.');
    updateTestCard(javaStatus, javaOutput, interpretStatus(data.java.status), data.java.details || 'Java status loaded.');
    updateTestCard(apiStatus, apiOutput, interpretStatus(data.backend.status), data.backend.details || 'Backend status loaded.');
    updateTestCard(frontendStatus, frontendOutput, 'success', 'Frontend is loaded.');
  } catch (error) {
    updateTestCard(pythonStatus, pythonOutput, 'fail', 'Unable to load test status.');
    updateTestCard(javaStatus, javaOutput, 'fail', 'Unable to load test status.');
    updateTestCard(apiStatus, apiOutput, 'fail', 'Unable to load backend status.');
    console.error(error);
  }
}

async function runAllTests() {
  updateTestCard(pythonStatus, pythonOutput, 'warning', 'Running Python tests...');
  updateTestCard(javaStatus, javaOutput, 'warning', 'Running Java tests...');
  updateTestCard(apiStatus, apiOutput, 'warning', 'Running backend checks...');

  try {
    const response = await fetch(`${API_ROOT}/run-tests`, { method: 'POST' });
    if (!response.ok) throw new Error('Run tests request failed');
    const data = await response.json();

    updateTestCard(pythonStatus, pythonOutput, interpretStatus(data.python.status), data.python.output || 'Python runner completed.');
    updateTestCard(javaStatus, javaOutput, interpretStatus(data.java.status), data.java.output || 'Java runner completed.');
    updateTestCard(apiStatus, apiOutput, interpretStatus(data.backend.status), data.backend.details || 'Backend is online.');
    updateTestCard(frontendStatus, frontendOutput, 'success', 'Frontend is loaded.');
  } catch (error) {
    updateTestCard(pythonStatus, pythonOutput, 'fail', 'Test run failed.');
    updateTestCard(javaStatus, javaOutput, 'fail', 'Test run failed.');
    updateTestCard(apiStatus, apiOutput, 'fail', 'Test run failed.');
    console.error(error);
  }
}

function initAdvisoryGenerator() {
  generateAdvisoryBtn.addEventListener('click', () => {
    generateAdvisory(stakeholderSelect.value, regionSelect.value, riskSelect.value);
  });

  generateAdvisoryFromMapBtn.addEventListener('click', () => {
    const regionName = selectedRegionName.textContent;
    const selected = regionData.find((entry) => entry.name === regionName) || regionData[0];
    generateAdvisory(stakeholderSelect.value, selected.name, selected.risk);
  });

  refreshTestStatusBtn.addEventListener('click', loadTestStatus);
  runTestsNowBtn.addEventListener('click', runAllTests);
}

function init() {
  initNavigation();
  animateMetrics();
  initRegionSelection();
  initAlertFiltering();
  initAdvisoryGenerator();
  loadData();
  loadLiveMap();
  setInterval(loadLiveMap, 300000);
  refreshUsersBtn.addEventListener('click', loadAdminUsers);
  loadAdminUsers();
  loadTestStatus();
}

init();
