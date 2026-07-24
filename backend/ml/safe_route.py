"""
OpCrime AI - Safe Route Algorithm
Dijkstra-based pathfinding that minimizes crime risk exposure.
"""

import heapq
import math
from typing import Dict, List, Optional, Tuple

import numpy as np

# Lazy import to avoid circular dependency at module load time
_predict_module = None


def _get_predictor():
    """Lazy-load the predict module."""
    global _predict_module
    if _predict_module is None:
        from ml import predict as _mod
        _predict_module = _mod
    return _predict_module


# --- City bounding boxes (matches generate_dataset.py) ---
CITY_BOUNDS = {
    "Chennai":         {"lat": (12.90, 13.20), "lng": (80.15, 80.30)},
    "Coimbatore":      {"lat": (10.95, 11.10), "lng": (76.90, 77.05)},
    "Madurai":         {"lat": (9.88,  9.97),  "lng": (78.08, 78.18)},
    "Tiruchirappalli": {"lat": (10.76, 10.87), "lng": (78.66, 78.74)},
    "Salem":           {"lat": (11.62, 11.72), "lng": (78.12, 78.22)},
    "Tirunelveli":     {"lat": (8.70,  8.78),  "lng": (77.68, 77.76)},
    "Erode":           {"lat": (11.09, 11.47), "lng": (77.58, 77.88)},
}

# Default routing parameters
DEFAULT_GRID_STEPS = 20  # grid resolution per axis
CRIME_WEIGHT_FACTOR = 5.0  # how much crime score amplifies edge weight
DISTANCE_WEIGHT = 1.0  # base weight for geographic distance


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Haversine distance between two points in meters.
    """
    R = 6_371_000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _score_point(
    lat: float,
    lng: float,
    city: str,
    time_of_day: int = 12,
    area_type: str = "mixed",
    weather: str = "clear",
    extra_features: Optional[Dict] = None,
) -> float:
    """
    Get the opcrime score for a single grid point using the trained model.
    Falls back to a simple heuristic if models are not available.
    """
    features = {
        "city": city,
        "latitude": lat,
        "longitude": lng,
        "area_type": area_type,
        "time_of_day": time_of_day,
        "weather": weather,
    }
    if extra_features:
        features.update(extra_features)

    try:
        predictor = _get_predictor()
        return predictor.predict_opcrime_score(features)
    except Exception:
        # Heuristic fallback: return a moderate score
        return 35.0


def _build_grid(
    lat_min: float,
    lat_max: float,
    lng_min: float,
    lng_max: float,
    steps: int,
) -> Tuple[np.ndarray, np.ndarray, int, int]:
    """
    Build a regular lat/lng grid.
    Returns (lat_values, lng_values, n_rows, n_cols).
    """
    lats = np.linspace(lat_min, lat_max, steps)
    lngs = np.linspace(lng_min, lng_max, steps)
    return lats, lngs, steps, steps


def _snap_to_grid(
    lat: float, lng: float, lats: np.ndarray, lngs: np.ndarray
) -> Tuple[int, int]:
    """Snap a coordinate to the nearest grid cell (row, col)."""
    row = int(np.argmin(np.abs(lats - lat)))
    col = int(np.argmin(np.abs(lngs - lng)))
    return row, col


def _grid_neighbors(row: int, col: int, n_rows: int, n_cols: int):
    """Yield valid 8-connected neighbors of a grid cell."""
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if dr == 0 and dc == 0:
                continue
            nr, nc = row + dr, col + dc
            if 0 <= nr < n_rows and 0 <= nc < n_cols:
                yield nr, nc


def find_safe_route(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    city: str,
    grid_steps: int = DEFAULT_GRID_STEPS,
    time_of_day: int = 12,
    area_type: str = "mixed",
    weather: str = "clear",
    extra_features: Optional[Dict] = None,
    crime_weight: float = CRIME_WEIGHT_FACTOR,
) -> List[Dict]:
    """
    Find the safest route between two points using Dijkstra's algorithm on
    a grid weighted by predicted crime scores.

    Args:
        start_lat, start_lng: origin coordinates
        end_lat, end_lng: destination coordinates
        city: city name (must be in CITY_BOUNDS)
        grid_steps: grid resolution (higher = more precise, slower)
        time_of_day: hour 0-23 for crime scoring
        area_type: default area type for grid cells
        weather: weather condition for scoring
        extra_features: additional features passed to the crime model
        crime_weight: multiplier for crime score in edge weights

    Returns:
        List of waypoint dicts: [{"lat": float, "lng": float, "score": float}, ...]
    """
    if city not in CITY_BOUNDS:
        raise ValueError(f"Unknown city: {city}. Choose from {list(CITY_BOUNDS.keys())}")

    bounds = CITY_BOUNDS[city]

    # Expand bounds slightly to include start/end if they're near edges
    lat_min = min(bounds["lat"][0], start_lat, end_lat) - 0.005
    lat_max = max(bounds["lat"][1], start_lat, end_lat) + 0.005
    lng_min = min(bounds["lng"][0], start_lng, end_lng) - 0.005
    lng_max = max(bounds["lng"][1], start_lng, end_lng) + 0.005

    # Build grid
    lats, lngs, n_rows, n_cols = _build_grid(lat_min, lat_max, lng_min, lng_max, grid_steps)

    # Score every grid cell
    scores = np.zeros((n_rows, n_cols), dtype=np.float64)
    for r in range(n_rows):
        for c in range(n_cols):
            scores[r, c] = _score_point(
                lats[r], lngs[c], city,
                time_of_day=time_of_day,
                area_type=area_type,
                weather=weather,
                extra_features=extra_features,
            )

    # Snap start and end to grid
    start_rc = _snap_to_grid(start_lat, start_lng, lats, lngs)
    end_rc = _snap_to_grid(end_lat, end_lng, lats, lngs)

    # Dijkstra's algorithm
    dist = np.full((n_rows, n_cols), np.inf)
    prev = {}
    dist[start_rc] = 0.0

    # Priority queue: (cost, row, col)
    pq = [(0.0, start_rc[0], start_rc[1])]

    while pq:
        cost, r, c = heapq.heappop(pq)

        if (r, c) == end_rc:
            break

        if cost > dist[r, c]:
            continue

        for nr, nc in _grid_neighbors(r, c, n_rows, n_cols):
            # Edge weight = geographic distance + crime penalty
            geo_dist = _haversine(lats[r], lngs[c], lats[nr], lngs[nc])

            # Average crime score of the two endpoints
            avg_score = (scores[r, c] + scores[nr, nc]) / 2.0

            # Weight: base distance + crime amplification
            weight = (DISTANCE_WEIGHT * geo_dist) + (crime_weight * avg_score * geo_dist / 100.0)

            new_cost = cost + weight
            if new_cost < dist[nr, nc]:
                dist[nr, nc] = new_cost
                prev[(nr, nc)] = (r, c)
                heapq.heappush(pq, (new_cost, nr, nc))

    # Reconstruct path
    path = []
    current = end_rc
    while current != start_rc:
        r, c = current
        path.append({
            "lat": round(float(lats[r]), 6),
            "lng": round(float(lngs[c]), 6),
            "score": round(float(scores[r, c]), 2),
        })
        if current not in prev:
            # No path found; return direct line
            return _direct_route(start_lat, start_lng, end_lat, end_lng, city, scores, lats, lngs)
        current = prev[current]

    # Add start
    r, c = start_rc
    path.append({
        "lat": round(float(lats[r]), 6),
        "lng": round(float(lngs[c]), 6),
        "score": round(float(scores[r, c]), 2),
    })

    path.reverse()

    # Simplify path: remove collinear intermediate points to reduce waypoints
    simplified = _simplify_path(path)

    return simplified


def _direct_route(
    start_lat, start_lng, end_lat, end_lng, city, scores, lats, lngs
) -> List[Dict]:
    """Fallback: straight-line route with scores sampled along the way."""
    waypoints = []
    num_points = 10
    for i in range(num_points + 1):
        frac = i / num_points
        lat = start_lat + frac * (end_lat - start_lat)
        lng = start_lng + frac * (end_lng - start_lng)
        r, c = _snap_to_grid(lat, lng, lats, lngs)
        waypoints.append({
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "score": round(float(scores[r, c]), 2),
        })
    return waypoints


def _simplify_path(path: List[Dict], tolerance: float = 0.0005) -> List[Dict]:
    """
    Simplify a path using the Ramer-Douglas-Peucker algorithm.
    Reduces number of waypoints while preserving route shape.
    """
    if len(path) <= 2:
        return path

    # Find point with max perpendicular distance
    start = np.array([path[0]["lat"], path[0]["lng"]])
    end = np.array([path[-1]["lat"], path[-1]["lng"]])

    max_dist = 0.0
    max_idx = 0

    line_vec = end - start
    line_len = np.linalg.norm(line_vec)
    if line_len == 0:
        return [path[0], path[-1]]

    line_unit = line_vec / line_len

    for i in range(1, len(path) - 1):
        point = np.array([path[i]["lat"], path[i]["lng"]])
        vec = point - start
        proj_len = np.dot(vec, line_unit)
        proj = start + proj_len * line_unit
        dist = np.linalg.norm(point - proj)
        if dist > max_dist:
            max_dist = dist
            max_idx = i

    if max_dist > tolerance:
        left = _simplify_path(path[: max_idx + 1], tolerance)
        right = _simplify_path(path[max_idx:], tolerance)
        return left[:-1] + right
    else:
        return [path[0], path[-1]]


def get_route_summary(waypoints: List[Dict]) -> Dict:
    """
    Compute summary statistics for a route.

    Returns:
        Dict with total_distance_m, avg_score, max_score, min_score, num_waypoints.
    """
    if not waypoints:
        return {"total_distance_m": 0, "avg_score": 0, "max_score": 0, "min_score": 0, "num_waypoints": 0}

    total_dist = 0.0
    scores = [w["score"] for w in waypoints]

    for i in range(len(waypoints) - 1):
        total_dist += _haversine(
            waypoints[i]["lat"], waypoints[i]["lng"],
            waypoints[i + 1]["lat"], waypoints[i + 1]["lng"],
        )

    return {
        "total_distance_m": round(total_dist, 1),
        "avg_score": round(float(np.mean(scores)), 2),
        "max_score": round(float(np.max(scores)), 2),
        "min_score": round(float(np.min(scores)), 2),
        "num_waypoints": len(waypoints),
    }


# --- CLI test ---
if __name__ == "__main__":
    print("=== Safe Route Test: Chennai ===")
    print("Finding route from T. Nagar to Marina Beach...")

    route = find_safe_route(
        start_lat=13.0418, start_lng=80.2341,  # T. Nagar
        end_lat=13.0500, end_lng=80.2824,       # Marina Beach
        city="Chennai",
        time_of_day=22,
        weather="clear",
        grid_steps=15,  # smaller for quick test
    )

    summary = get_route_summary(route)
    print(f"\nRoute found with {summary['num_waypoints']} waypoints")
    print(f"Total distance: {summary['total_distance_m']:.0f} meters")
    print(f"Avg crime score: {summary['avg_score']:.1f}")
    print(f"Max crime score: {summary['max_score']:.1f}")
    print(f"Min crime score: {summary['min_score']:.1f}")

    print("\nWaypoints:")
    for i, wp in enumerate(route):
        print(f"  {i + 1}. ({wp['lat']}, {wp['lng']})  score={wp['score']}")
