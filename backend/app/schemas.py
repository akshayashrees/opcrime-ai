from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "citizen"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str = "citizen"


# ── Location / Features ──────────────────────────────────────────────────────

class FeaturesIn(BaseModel):
    city: str = "Chennai"
    area_type: str = "residential"
    weather: str = "clear"
    latitude: float = 13.0827
    longitude: float = 80.2707
    population_density: float = 5000.0
    lighting_score: float = 6.0
    cctv_density: float = 5.0
    police_patrol_frequency: float = 3.0
    time_of_day: int = 12
    day_of_week: int = 3
    holiday_flag: int = 0
    crowd_density: float = 50.0
    alcohol_shop_proximity: float = 800.0
    school_proximity: float = 1200.0
    previous_crime_count: int = 5
    visibility: float = 7.0


class SimulationRequest(BaseModel):
    features: Dict[str, Any]
    interventions: Dict[str, Any]


class SimulationResponse(BaseModel):
    score_before: float
    score_after: float
    score_change: float
    crime_type_before: str
    crime_type_after: str
    interventions_applied: Dict[str, Any]


class PredictionResponse(BaseModel):
    opcrime_score: float
    crime_type: str
    explanation: Optional[Dict[str, Any]] = None


# ── Map ───────────────────────────────────────────────────────────────────────

class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    score: float


class HotspotPoint(BaseModel):
    lat: float
    lng: float
    score: float
    cluster: int


class RouteWaypoint(BaseModel):
    lat: float
    lng: float
    score: float


class SafeRouteResponse(BaseModel):
    waypoints: List[RouteWaypoint]
    summary: Dict[str, Any]


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    alert_type: str = "emergency"
    latitude: float
    longitude: float
    message: Optional[str] = None


class AlertOut(BaseModel):
    id: int
    user_id: int
    alert_type: str
    latitude: float
    longitude: float
    message: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AlertStatusUpdate(BaseModel):
    status: str


# ── Police Dashboard ─────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_active_alerts: int
    emergency_count: int
    distress_count: int
    auto_count: int
    avg_opcrime_score: Optional[float] = None
    high_risk_zones: int = 0


# ── Municipal ─────────────────────────────────────────────────────────────────

class RiskZone(BaseModel):
    lat: float
    lng: float
    score: float
    cluster: int
    risk_level: str


class Suggestion(BaseModel):
    area: str
    current_score: float
    suggested_interventions: List[str]
    estimated_score_after: float
    priority: str


class BudgetEstimateRequest(BaseModel):
    interventions: Dict[str, Any]
    area_count: int = 1


class BudgetEstimateResponse(BaseModel):
    total_estimate_inr: float
    breakdown: Dict[str, float]
    estimated_score_reduction: float


# ── Emergency ─────────────────────────────────────────────────────────────────

class EmergencyRouteRequest(BaseModel):
    alert_lat: float
    alert_lng: float
    responder_lat: float
    responder_lng: float
    city: str = "Chennai"
