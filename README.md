# OpCrime AI — Predictive Crime & Emergency Response Platform

A role-based safe-city platform (Citizen / Police / Municipal / Emergency) combining an
XGBoost-based crime risk prediction engine with a real-time FastAPI + React application:
JWT auth, RBAC, GPS tracking, heatmaps, and emergency SOS routing.

## Stack
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL (SQLite for local dev), JWT/OAuth2
- **ML:** XGBoost (risk scoring), Random Forest (crime-type classification), KMeans (hotspot clustering), scikit-learn
- **Frontend:** React, React Router, Leaflet/React-Leaflet (maps), Framer Motion, Axios

## Project structure
```
backend/
  app/            # FastAPI app: main, config, database, schemas
  db/             # schema.sql + seed.py
  ml/             # generate_dataset.py, trained models, metrics
frontend/
  src/
    pages/        # Login, Register, role dashboards
    components/   # CrimeMap, ScoreGauge, StatCard, Navbar, Sidebar, DashboardLayout
    services/     # api.js (axios client), auth.js (auth context)
    utils/        # citizenBus.js (cross-tab event bus), localityData.js
```

## Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Default DB is local SQLite; set DATABASE_URL for Postgres, e.g.
# export DATABASE_URL=postgresql://user:pass@localhost:5432/opcrime_ai
# export SECRET_KEY=<your-own-random-secret>

python run.py
```
API runs at `http://localhost:8001`.

### Database
The ML models and dataset (`backend/ml/models/*.pkl`, `backend/ml/data/*.csv`) are **not
committed to this repo** — they're either large (one model file is ~99MB, over GitHub's
100MB limit) or regeneratable. To rebuild them locally:
```bash
cd backend
python ml/generate_dataset.py     # regenerates backend/ml/data/crime_dataset.csv
python db/seed.py                 # creates tables + seeds default users + locations
```
You'll also need to (re)train the models — the training script that produced
`xgb_regressor.pkl`, `rf_classifier.pkl`, `kmeans_hotspot.pkl`, and `preprocessor.pkl`
isn't included here yet.

### Frontend
```bash
cd frontend
npm install
npm start
```
Runs at `http://localhost:3000`, proxying API calls to `http://localhost:8001`.

## Known gaps / TODO
- `backend/app/models.py` (SQLAlchemy models) — not yet added to this repo
- `backend/app/routers/` (auth, predictions, map_data, citizen, police, municipal, emergency) — not yet added
- `backend/app/services/auth_service.py` — not yet added
- Model training script (produces the `.pkl` files) — not yet added
- A native Android build exists via Capacitor but is maintained as a separate project and isn't included here

## Note on demo credentials
The login screen currently displays demo account credentials directly in the UI
(citizen / police / municipal / emergency, shared test password). This is fine for local
development and portfolio demos, but if you deploy this publicly, anyone can log in as
any role. Gate this behind an environment flag (e.g. `SHOW_DEMO_CREDS=false` in production)
before sharing a live deployment link.

## License
Add a license of your choice (MIT is common for portfolio projects) — none included yet.
