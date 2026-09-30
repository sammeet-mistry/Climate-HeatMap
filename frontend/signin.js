const configuredRoot = window.HEATSENSE_API_ROOT || '';
const API_ROOT = configuredRoot
  ? configuredRoot.replace(/\/$/, '')
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api');

const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

async function redirectIfAuthenticated() {
  const response = await fetch(`${API_ROOT}/auth/session`, { credentials: 'include' });
  const state = await response.json();
  if (state.authenticated) window.location.replace('index.html');
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginMessage.textContent = 'Signing in...';
  const formData = new FormData(loginForm);
  try {
    const response = await fetch(`${API_ROOT}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.get('email'), password: formData.get('password') })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to sign in.');
    window.location.replace('index.html');
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

redirectIfAuthenticated().catch(() => {
  loginMessage.textContent = 'The backend is unavailable. Start the Flask server and try again.';
});
