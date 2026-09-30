const API_ROOT = (() => {
  const configuredRoot = window.HEATSENSE_API_ROOT || '';
  if (configuredRoot) {
    return configuredRoot.replace(/\/$/, '');
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    if (window.location.port === '4173' || window.location.port === '3000') {
      return 'http://127.0.0.1:5000/api';
    }
    return `${window.location.origin}/api`;
  }

  return '/api';
})();

const CARTO_API_KEY = window.CARTO_API_KEY || '';

function apiFetch(path, options = {}) {
  return fetch(`${API_ROOT}${path}`, { ...options, credentials: 'include' });
}

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
const notificationButton = document.getElementById('notificationButton');
const filterPills = document.querySelectorAll('.filter-pill');
const regionMap = document.getElementById('regionMap');
const liveMapStatus = document.getElementById('liveMapStatus');
const liveMapUpdated = document.getElementById('liveMapUpdated');
const caseStudyForm = document.getElementById('caseStudyForm');
const caseStudyReport = document.getElementById('caseStudyReport');
const printCaseStudyButton = document.getElementById('printCaseStudy');
let liveLeafletMap;
let liveHeatLayer;
let livePointLayer;
let liveMapFitted = false;
let latestMapData;
let latestStations = [];
let selectedRegion;
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
const loginScreen = document.getElementById('loginScreen');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const logoutButton = document.getElementById('logoutButton');

const regionData = [
  {
    name: 'Central Plains',
    temperature: 44.8,
    feels_like: 48.2,
    humidity: 36,
    risk: 'Extreme Alert',
    anomaly: 'Illustrative scenario',
    action: 'Activate emergency cooling centers and alert vulnerable populations.'
  },
  {
    name: 'Deccan Belt',
    temperature: 45.1,
    feels_like: 49.0,
    humidity: 34,
    risk: 'Severe Heat',
    anomaly: 'Illustrative scenario',
    action: 'Limit outdoor operations and deploy hydration support.'
  },
  {
    name: 'Coastal Corridor',
    temperature: 41.8,
    feels_like: 45.2,
    humidity: 68,
    risk: 'Mild Heat',
    anomaly: 'Illustrative scenario',
    action: 'Monitor humidity-driven heat stress and keep cool water available.'
  },
  {
    name: 'Northern Highlands',
    temperature: 33.5,
    feels_like: 35.2,
    humidity: 45,
    risk: 'Normal',
    anomaly: 'Illustrative scenario',
    action: 'No immediate heat advisory; watch for local warming trends.'
  }
];
selectedRegion = regionData[0];

function initNavigation() {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    siteNav.classList.toggle('open');
  });

  siteNav.addEventListener('click', (event) => {
    if (!event.target.closest('a')) return;
    navToggle.setAttribute('aria-expanded', 'false');
    siteNav.classList.remove('open');
  });

  notificationButton.addEventListener('click', () => {
    document.getElementById('alerts').scrollIntoView({ behavior: 'smooth' });
  });

  if ('IntersectionObserver' in window) {
    const links = [...siteNav.querySelectorAll('a')];
    const observer = new IntersectionObserver((entries) => {
      const current = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
      if (!current) return;
      links.forEach((link) => link.classList.toggle('active', link.hash === `#${current.target.id}`));
    }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.2, 0.5] });
    document.querySelectorAll('main > section[id]').forEach((section) => observer.observe(section));
  }
}

function renderStations(stations) {
  latestStations = stations;
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
        <span class="station-badge">Sample reading</span>
        <span>Temp: ${station.temperature.toFixed(1)}°C</span>
        <span>Heat Index: ${station.heat_index.toFixed(1)}°C</span>
        <span>Demonstration data</span>
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
      <p class="alert-source">Source: ${alert.source || 'Demonstration station feed'} · Threshold-based demonstration, not an official warning.</p>
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
      apiFetch('/stations'),
      apiFetch('/alerts'),
      apiFetch('/forecast')
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
    const response = await apiFetch('/admin/users');
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
  selectedRegion = region;
  selectedRegionName.textContent = region.name;
  panelTemp.textContent = `${region.temperature.toFixed(1)}°C`;
  panelFeels.textContent = `${region.feels_like.toFixed(1)}°C`;
  panelHumidity.textContent = `${region.humidity}%`;
  panelRisk.textContent = region.risk;
  panelAnomaly.textContent = region.anomaly;
  panelAction.textContent = region.action;
    if ([...regionSelect.options].some((option) => option.value === region.name)) {
      regionSelect.value = region.name;
    } else {
      regionSelect.value = 'Live map grid cell';
    }
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

function buildFallbackMapData() {
  const now = new Date();
  const points = [
    { lat: 8, lon: 68, temperature: 29.8, apparent_temperature: 31.5, humidity: 42 },
    { lat: 12, lon: 73, temperature: 34.9, apparent_temperature: 37.8, humidity: 46 },
    { lat: 16, lon: 78, temperature: 39.2, apparent_temperature: 42.4, humidity: 40 },
    { lat: 20, lon: 83, temperature: 42.8, apparent_temperature: 45.9, humidity: 36 },
    { lat: 24, lon: 88, temperature: 44.1, apparent_temperature: 47.3, humidity: 35 },
    { lat: 28, lon: 93, temperature: 41.2, apparent_temperature: 44.0, humidity: 38 },
    { lat: 32, lon: 98, temperature: 38.7, apparent_temperature: 41.2, humidity: 33 }
  ];

  return {
    updated_at: now.toISOString(),
    source: 'offline fallback map',
    points
  };
}

function renderLiveMap(data) {
  if (!window.L) {
    liveMapStatus.textContent = 'Map library unavailable';
    return;
  }
  if (!liveLeafletMap) {
    liveLeafletMap = L.map(regionMap, { zoomControl: true, attributionControl: true }).setView([22.5, 79], 4.5);
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(liveLeafletMap);
    liveHeatLayer = L.heatLayer([], {
      radius: 38,
      blur: 28,
      maxZoom: 7,
      max: 1,
      gradient: { 0.15: '#2c7bb6', 0.35: '#4dcadc', 0.55: '#a6d96a', 0.72: '#fdae61', 0.88: '#f46d43', 1: '#d73027' }
    }).addTo(liveLeafletMap);
  }
  const points = data.points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon) && Number.isFinite(point.temperature));
  if (!points.length) {
    liveMapStatus.textContent = 'Weather feed returned no usable temperature points';
    return;
  }
  latestMapData = data;
  const temperatures = points.map((point) => point.temperature);
  const apparentTemperatures = points.map((point) => Number.isFinite(point.apparent_temperature) ? point.apparent_temperature : point.temperature);
  const minimumTemperature = Math.min(...temperatures);
  const maximumTemperature = Math.max(...temperatures);
  const temperatureRange = maximumTemperature - minimumTemperature;
  const normalizationRange = temperatureRange || 1;
  if (!liveMapFitted) {
    liveLeafletMap.fitBounds(L.latLngBounds(points.map((point) => [point.lat, point.lon])).pad(0.08));
    liveMapFitted = true;
  }
  const averageTemperature = temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length;
  const maximumHeatIndex = Math.max(...apparentTemperatures);
  const extremeCount = temperatures.filter((temperature) => temperature > 42).length;
  const liveValues = [averageTemperature, maximumHeatIndex, extremeCount, points.length, temperatureRange];
  snapshotCards.forEach((card, index) => {
    const valueElement = card.querySelector('.metric-line strong');
    if (!valueElement) return;
    valueElement.textContent = index === 2 || index === 3 ? Math.round(liveValues[index]) : liveValues[index].toFixed(1);
  });
  liveHeatLayer.setLatLngs(points.map((point) => [
    point.lat,
    point.lon,
    0.25 + ((point.temperature - minimumTemperature) / normalizationRange) * 0.75
  ]));
  if (!livePointLayer) livePointLayer = L.layerGroup().addTo(liveLeafletMap);
  livePointLayer.clearLayers();
  points.forEach((point) => {
    const marker = L.circleMarker([point.lat, point.lon], {
      radius: 6,
      color: '#ffffff',
      fillColor: point.temperature > 42 ? '#d73027' : point.temperature >= 36 ? '#fdae61' : point.temperature >= 28 ? '#a6d96a' : '#2c7bb6',
      fillOpacity: 0.9,
      weight: 1.5
    }).addTo(livePointLayer);
    const apparentTemperature = Number.isFinite(point.apparent_temperature) ? point.apparent_temperature : point.temperature;
    marker.bindTooltip(`${point.temperature}°C · feels like ${apparentTemperature}°C`, { direction: 'top' });
    marker.on('click', () => {
      const risk = heatColor(point.temperature) === 'extreme' ? 'Extreme Alert' : heatColor(point.temperature) === 'severe' ? 'Severe Heat' : heatColor(point.temperature) === 'mild' ? 'Mild Heat' : 'Normal';
      updateRegionPanel({
        name: `${point.lat.toFixed(0)}°N / ${point.lon.toFixed(0)}°E`,
        temperature: point.temperature,
        feels_like: Number.isFinite(point.apparent_temperature) ? point.apparent_temperature : point.temperature,
        humidity: Number.isFinite(point.humidity) ? point.humidity : 0,
        risk,
        anomaly: data.source,
        action: risk === 'Extreme Alert' ? 'Activate cooling centers and alert vulnerable populations.' : 'Monitor local conditions and maintain hydration.'
      });
    });
  });
  liveMapStatus.textContent = `${data.source} · ${points.length} grid cells`;
  liveMapUpdated.textContent = `Updated ${new Date(data.updated_at).toLocaleTimeString()}`;
}

async function loadLiveMap() {
  try {
    const response = await apiFetch('/live-map');
    if (!response.ok) throw new Error('Live map fetch failed');
    renderLiveMap(await response.json());
  } catch (error) {
    const fallbackData = buildFallbackMapData();
    renderLiveMap(fallbackData);
    liveMapStatus.textContent = 'Weather feed unavailable';
    liveMapUpdated.textContent = 'Showing offline fallback map';
    console.error('Live map error:', error);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function buildCaseStudy(event) {
  event.preventDefault();
  const title = escapeHtml(document.getElementById('caseStudyTitle').value.trim());
  const area = escapeHtml(document.getElementById('caseStudyRegion').value.trim());
  const question = escapeHtml(document.getElementById('caseStudyQuestion').value.trim());
  const mapPoints = latestMapData?.points?.filter((point) => Number.isFinite(point.temperature)) || [];
  const averageTemperature = mapPoints.length
    ? (mapPoints.reduce((total, point) => total + point.temperature, 0) / mapPoints.length).toFixed(1)
    : 'Unavailable';
  const maximumTemperature = mapPoints.length
    ? `${Math.max(...mapPoints.map((point) => point.temperature)).toFixed(1)}°C`
    : 'Unavailable';
  const highestStation = latestStations.length
    ? latestStations.reduce((highest, station) => station.temperature > highest.temperature ? station : highest)
    : null;
  const alertCount = document.querySelectorAll('.alert-card').length;
  const source = latestMapData?.source || 'Weather map feed unavailable';

  caseStudyReport.innerHTML = `
    <p class="report-kicker">HEATSENSE AI · CASE STUDY</p>
    <h3>${title}</h3>
    <p class="report-meta">Study area: ${area} · Prepared ${new Date().toLocaleDateString()}</p>
    <h4>Research question</h4>
    <p>${question}</p>
    <h4>Purpose and approach</h4>
    <p>This case study examines how a heat-monitoring dashboard can turn temperature signals into understandable risk levels and practical preparedness actions. It reviews a gridded weather map, sample station readings, threshold-based alerts, and audience-specific guidance. The study-area field identifies the intended focus; the displayed grid spans India and the sample stations include other cities, so these figures are contextual rather than area-specific findings.</p>
    <h4>Evidence snapshot</h4>
    <ul>
      <li>Map grid average temperature: ${averageTemperature}${averageTemperature === 'Unavailable' ? '' : '°C'}; highest grid reading: ${maximumTemperature}.</li>
      <li>Highest demonstration station reading: ${highestStation ? `${highestStation.temperature.toFixed(1)}°C at ${escapeHtml(highestStation.location)}` : 'Station data unavailable'}.</li>
      <li>Active threshold alerts shown: ${alertCount}. Map data source: ${escapeHtml(source)}.</li>
    </ul>
    <h4>Preparedness implications</h4>
    <p>Use rising heat readings to prioritize local checks on older adults, people with health conditions, outdoor workers, and households with limited cooling. Pair alerts with clear advice on hydration, shade, reduced midday exertion, and where to seek help. Escalate through local authorities rather than treating a dashboard threshold as an official warning.</p>
    <h4>Limitations</h4>
    <p class="report-caveat">Station readings and alert thresholds in this project are a demonstration, not validated public-safety guidance. Weather-feed availability and geographic coverage vary. This snapshot is not a historical climate analysis and should not be presented as an official IMD warning or as proof of a long-term trend.</p>
    <p class="report-meta">Suggested next step: compare verified local observations with official IMD heatwave criteria and district heat-action plans.</p>
  `;
}

function printCaseStudy() {
  if (!caseStudyForm.reportValidity()) return;
  buildCaseStudy({ preventDefault() {} });
  document.body.classList.add('print-report');
  window.print();
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
    const response = await apiFetch('/advisory', {
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
    showAdvisoryPopup(`Heat advisory generated for ${advisory.region}.`);
  } catch (error) {
    advisoryBody.innerHTML = '<p class="notification-text">Failed to generate advisory. Please try again later.</p>';
    showAdvisoryPopup('Heat advisory could not be generated. Please try again.');
    console.error('Advisory error:', error);
  }
}

function showAdvisoryPopup(message) {
  let popup = document.getElementById('heat-advisory-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'heat-advisory-popup';
    popup.className = 'advisory-popup';
    document.body.appendChild(popup);
  }

  popup.textContent = message;
  popup.classList.add('visible');
  clearTimeout(showAdvisoryPopup.timeoutId);
  showAdvisoryPopup.timeoutId = setTimeout(() => {
    popup.classList.remove('visible');
  }, 2600);
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
    const response = await apiFetch('/test-status');
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
    const response = await apiFetch('/run-tests', { method: 'POST' });
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
      generateAdvisory(stakeholderSelect.value, selectedRegion.name, selectedRegion.risk);
  });
    caseStudyForm.addEventListener('submit', buildCaseStudy);
    printCaseStudyButton.addEventListener('click', printCaseStudy);
    window.addEventListener('afterprint', () => document.body.classList.remove('print-report'));

  refreshTestStatusBtn.addEventListener('click', loadTestStatus);
  runTestsNowBtn.addEventListener('click', runAllTests);
}

async function authenticate() {
  try {
    const response = await apiFetch('/auth/session');
    const state = await response.json();
    if (state.authenticated) {
      document.body.classList.add('authenticated');
      return true;
    }
  } catch (error) {
    loginMessage.textContent = 'The backend is unavailable. Start the Flask server and try again.';
  }
  return false;
}

async function handleLogin(event) {
  event.preventDefault();
  loginMessage.textContent = 'Signing in...';
  const formData = new FormData(loginForm);
  try {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.get('email'), password: formData.get('password') })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to sign in.');
    loginMessage.textContent = '';
    document.body.classList.add('authenticated');
    initDashboard();
  } catch (error) {
    loginMessage.textContent = error.message;
  }
}

async function handleLogout() {
  await apiFetch('/auth/logout', { method: 'POST' });
  document.body.classList.remove('authenticated');
  loginForm.reset();
  loginMessage.textContent = '';
}

function initDashboard() {
  initNavigation();
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

loginForm.addEventListener('submit', handleLogin);
logoutButton.addEventListener('click', handleLogout);
authenticate().then((authenticated) => {
  if (authenticated) initDashboard();
});
