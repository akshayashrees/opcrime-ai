# OpCrime AI: Opportunity-Driven Crime Intelligence & Prevention System

A production-level full-stack system that predicts opportunity-driven crimes using ML models and provides role-based dashboards with real-time insights, simulation, and safe routing.

## Architecture
opcrime-ai/
├── ml/ # Machine Learning Module
│ ├── generate_dataset.py # Synthetic dataset generator (30K rows, Tamil Nadu)
│ ├── train_models.py # ML training pipeline (XGBoost, RF, KMeans)
│ ├── predict.py # Prediction & explanation functions
│ ├── safe_route.py # Dijkstra-based safe route algorithm
│ ├── data/ # Generated datasets
│ └── models/ # Trained model files (.pkl)
├── backend/ # FastAPI Backend
│ ├── app/
│ │ ├── main.py # App entry point
│ │ ├── config.py # Settings & env vars
│ │ ├── database.py # SQLAlchemy setup
│ │ ├── schemas.py # Pydantic models
│ │ ├── models/ # SQLAlchemy ORM models
│ │ ├── routers/ # API route handlers
│ │ └── services/ # Business logic layer
│ └── requirements.txt
├── frontend/ # React Frontend
│ ├── public/
│ ├── src/
│ │ ├── components/ # Reusable UI components
│ │ │ ├── common/ # Navbar, Sidebar, Map, Gauge, Cards
│ │ │ └── [role]/ # Role-specific components
│ │ ├── pages/ # Dashboard pages per role
│ │ ├── services/ # API client & auth context
│ │ ├── styles/ # Cinematic dark-themed CSS
│ │ └── utils/
│ └── package.json
└── database/ # Database
├── schema.sql # PostgreSQL schema
├── seed.py # Data seeder (bulk: users + locations from dataset)
└── create_user.py # Standalone utility: create individual demo users
## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Leaflet.js, Recharts, Framer Motion |
| Backend | FastAPI, SQLAlchemy, JWT Auth |
| Database | PostgreSQL |
| ML | XGBoost, Scikit-learn, Pandas, NumPy |

## Setup & Run

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL 13+

### Step 1: Generate Dataset & Train Models

```bash
cd ml
pip install -r requirements.txt
python generate_dataset.py
python train_models.py
```

### Step 2: Setup Database

```bash
# Create PostgreSQL database
psql -U postgres -f database/schema.sql

# Or use the Python seeder (also creates tables via SQLAlchemy)
cd database
python seed.py
```

### Step 3: Start Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### Step 4: Start Frontend

```bash
cd frontend
npm install
npm start
```

App runs at: http://localhost:3000

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Citizen | citizen@opcrime.ai | citizen123 |
| Police | police@opcrime.ai | police123 |
| Municipal | municipal@opcrime.ai | municipal123 |
| Emergency | emergency@opcrime.ai | emergency123 |
| Planner | planner@opcrime.ai | planner123 |
| NGO | ngo@opcrime.ai | ngo123 |

## ML Models

| Model | Algorithm | Output | Metric |
|-------|-----------|--------|--------|
| OpCrime Score | XGBoost Regressor | Score 0-100 | RMSE, R² |
| Crime Type | Random Forest Classifier | Crime category | Accuracy, F1 |
| Hotspots | KMeans Clustering | Cluster ID | Silhouette Score |

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login, returns JWT
- `GET /api/auth/me` - Current user info

### Predictions
- `GET /api/predictions/score` - Get OpCrime score
- `GET /api/predictions/crime-type` - Predict crime type
- `GET /api/predictions/explain` - Feature importance
- `POST /api/predictions/simulate` - What-if simulation

### Map Data
- `GET /api/map/heatmap/{city}` - Heatmap data points
- `GET /api/map/hotspots/{city}` - Clustered hotspots
- `GET /api/map/safe-route` - Safe route waypoints

### Role-Specific
- `GET/POST /api/citizen/*` - Citizen endpoints
- `GET/POST/PUT /api/police/*` - Police endpoints
- `GET/POST /api/municipal/*` - Municipal endpoints
- `GET/PUT /api/emergency/*` - Emergency endpoints

## Features

- **Role-based dashboards** with cinematic dark UI
- **Interactive crime heatmaps** with Leaflet.js
- **What-if simulation** - adjust lighting/CCTV/patrol and see score changes
- **Safe route generation** - Dijkstra algorithm weighted by crime scores
- **Emergency alert system** - one-tap emergency with location
- **Women/Children safety mode** - safe routes + auto police notification
- **Budget estimation** - cost analysis for crime reduction interventions
- **Feature importance** - explainable AI showing why an area is risky

## Note on this repo

`ml/data/*.csv` and `ml/models/*.pkl` are **not committed** — one model file is ~99MB
(over GitHub's 100MB hard limit) and the rest are regeneratable via the two commands
in Step 1 above. Run those locally before starting the backend.

The demo credentials table above is intentional for local development and portfolio
review. If you ever deploy this publicly, gate it behind an environment flag before
sharing the live link, since anyone with those credentials can log in as any role
(including police/municipal/emergency).

## Known gaps / TODO
- `backend/app/models/` (SQLAlchemy ORM models) — not yet in this repo
- `backend/app/routers/` (auth, predictions, map_data, citizen, police, municipal, emergency) — not yet in this repo
- `backend/app/services/` (e.g. `auth_service.py`) — not yet in this repo
- A native Android build exists via Capacitor but is maintained as a separate project and isn't included here