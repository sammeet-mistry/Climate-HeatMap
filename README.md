# HeatSense AI

## Project structure

- `frontend/`
  - `index.html` — single-page dashboard UI
  - `styles.css` — application styling
  - `script.js` — frontend logic and backend API integration
- `backend/`
  - `app.py` — Flask API server for station data, alerts, forecast, and advisory generation
  - `requirements.txt` — Python dependencies for the backend
- `index.html` — redirect page to `frontend/index.html`

## Run locally

1. Install backend dependencies:
   ```bash
   cd backend
   python -m pip install -r requirements.txt
   ```
2. Start the backend server:
   ```bash
   python app.py
   ```
3. Open your browser to `http://127.0.0.1:5000/`.

## Notes

- The backend serves the frontend and the API from the same server.
- The frontend automatically uses `http://localhost:5000/api` in local development and `/api` in hosted deployments.

## Render deployment

1. Create a new Web Service in Render and connect this repository.
2. Use the following settings:
   - Build command: `pip install -r backend/requirements.txt`
   - Start command: `gunicorn backend.app:app`
3. Keep the app port as `10000` in Render if prompted, or ensure the framework binds to the `$PORT` environment variable.

Example Render configuration is available in [render.yaml](render.yaml).

## Vercel deployment

1. Deploy the frontend as a static site on Vercel using the `frontend` directory as the project root.
2. Add a rewrite in [vercel.json](vercel.json) to forward `/api/*` to your Render backend URL.
3. Replace the placeholder domain in [vercel.json](vercel.json) with your live Render service URL.

Example environment variable for manual configuration:

```bash
HEATSENSE_API_ROOT=https://your-render-service.onrender.com/api
```

## npm scripts

- `npm run frontend` — starts a static server for `frontend/` on port `4173`
- `npm run backend` — starts the Python backend server
- `npm run dev` — starts both frontend and backend together
- `npm run test-python` — runs the Python test runner
- `npm run test-java` — compiles and runs the Java test runner

## Java/Python test files

- `python-tests/Tests.py` — simple Python assertion test
- `python-tests/TestRunner.py` — executes the Python test
- `java-tests/TestJUnit.java` — simple Java assertion test
- `java-tests/TestRunner.java` — executes the Java test
