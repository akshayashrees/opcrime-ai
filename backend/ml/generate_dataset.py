"""
OpCrime AI - Synthetic Crime Dataset Generator
Generates 30,000 realistic crime records for Tamil Nadu cities
with specific localities/sub-areas per city.
"""

import numpy as np
import pandas as pd
import os

SEED = 42
np.random.seed(SEED)

NUM_ROWS = 30_000

# ---------------------------------------------------------------------------
# LOCALITY DEFINITIONS
# Each locality has:
#   lat, lng        — centre coordinates
#   radius          — how much to jitter (in degrees)
#   area_type       — dominant land use
#   lighting_base   — base lighting score (1-10)
#   cctv_base       — base CCTV density (0-20)
#   patrol_base     — base patrol frequency (0-10)
#   alcohol_base    — typical alcohol shop proximity in metres
#   crowd_base      — typical crowd density (0-100)
#   crime_bias      — multiplicative bias on crime probability
#   prev_crimes     — poisson lambda for previous_crime_count
# ---------------------------------------------------------------------------

LOCALITIES = {
    # ── CHENNAI ──────────────────────────────────────────────────────────────
    "Chennai|T. Nagar":           {"lat": 13.0418, "lng": 80.2341, "r": 0.015, "area": "commercial",   "lt": 8.5, "cv": 15, "pt": 6, "al": 250, "cr": 80, "cb": 1.30, "pc": 18},
    "Chennai|Anna Nagar":         {"lat": 13.0856, "lng": 80.2099, "r": 0.018, "area": "residential",  "lt": 7.5, "cv": 8,  "pt": 5, "al": 500, "cr": 55, "cb": 0.85, "pc": 8},
    "Chennai|Tambaram":           {"lat": 12.9249, "lng": 80.1000, "r": 0.020, "area": "mixed",        "lt": 5.5, "cv": 5,  "pt": 4, "al": 450, "cr": 60, "cb": 1.05, "pc": 11},
    "Chennai|Velachery":          {"lat": 12.9752, "lng": 80.2207, "r": 0.016, "area": "residential",  "lt": 6.5, "cv": 7,  "pt": 4, "al": 400, "cr": 62, "cb": 0.90, "pc": 9},
    "Chennai|Koyambedu":          {"lat": 13.0692, "lng": 80.1959, "r": 0.012, "area": "commercial",   "lt": 7.0, "cv": 10, "pt": 5, "al": 300, "cr": 85, "cb": 1.25, "pc": 15},
    "Chennai|Adyar":              {"lat": 13.0012, "lng": 80.2565, "r": 0.014, "area": "residential",  "lt": 7.0, "cv": 9,  "pt": 5, "al": 550, "cr": 50, "cb": 0.80, "pc": 7},
    "Chennai|Egmore":             {"lat": 13.0732, "lng": 80.2609, "r": 0.012, "area": "commercial",   "lt": 8.0, "cv": 12, "pt": 6, "al": 280, "cr": 75, "cb": 1.15, "pc": 14},
    "Chennai|Royapuram":          {"lat": 13.1142, "lng": 80.2893, "r": 0.013, "area": "slum",         "lt": 3.5, "cv": 3,  "pt": 2, "al": 200, "cr": 65, "cb": 1.60, "pc": 25},
    "Chennai|Perambur":           {"lat": 13.1167, "lng": 80.2483, "r": 0.013, "area": "slum",         "lt": 4.0, "cv": 3,  "pt": 2, "al": 220, "cr": 70, "cb": 1.55, "pc": 22},
    "Chennai|Guindy":             {"lat": 13.0067, "lng": 80.2206, "r": 0.015, "area": "industrial",   "lt": 6.0, "cv": 8,  "pt": 4, "al": 600, "cr": 40, "cb": 0.95, "pc": 10},
    "Chennai|Sholinganallur":     {"lat": 12.9010, "lng": 80.2279, "r": 0.018, "area": "mixed",        "lt": 6.0, "cv": 7,  "pt": 3, "al": 500, "cr": 55, "cb": 0.92, "pc": 9},
    "Chennai|Ambattur":           {"lat": 13.1143, "lng": 80.1548, "r": 0.018, "area": "industrial",   "lt": 5.0, "cv": 5,  "pt": 3, "al": 650, "cr": 45, "cb": 1.05, "pc": 12},
    "Chennai|Mylapore":           {"lat": 13.0368, "lng": 80.2676, "r": 0.013, "area": "commercial",   "lt": 7.5, "cv": 11, "pt": 6, "al": 350, "cr": 70, "cb": 1.10, "pc": 13},
    "Chennai|Avadi":              {"lat": 13.1149, "lng": 80.0980, "r": 0.020, "area": "residential",  "lt": 5.5, "cv": 4,  "pt": 3, "al": 700, "cr": 50, "cb": 1.00, "pc": 10},
    "Chennai|Porur":              {"lat": 13.0358, "lng": 80.1574, "r": 0.015, "area": "mixed",        "lt": 6.0, "cv": 6,  "pt": 3, "al": 480, "cr": 52, "cb": 0.95, "pc": 9},

    # ── COIMBATORE ───────────────────────────────────────────────────────────
    "Coimbatore|Gandhipuram":     {"lat": 11.0168, "lng": 76.9718, "r": 0.012, "area": "commercial",   "lt": 8.0, "cv": 12, "pt": 6, "al": 280, "cr": 80, "cb": 1.25, "pc": 16},
    "Coimbatore|RS Puram":        {"lat": 10.9963, "lng": 76.9638, "r": 0.013, "area": "commercial",   "lt": 7.5, "cv": 10, "pt": 5, "al": 350, "cr": 72, "cb": 1.10, "pc": 13},
    "Coimbatore|Peelamedu":       {"lat": 11.0296, "lng": 77.0440, "r": 0.018, "area": "mixed",        "lt": 6.5, "cv": 7,  "pt": 4, "al": 500, "cr": 55, "cb": 0.90, "pc": 9},
    "Coimbatore|Singanallur":     {"lat": 10.9883, "lng": 77.0189, "r": 0.016, "area": "residential",  "lt": 6.0, "cv": 5,  "pt": 3, "al": 600, "cr": 48, "cb": 0.88, "pc": 8},
    "Coimbatore|Saravanampatti":  {"lat": 11.0558, "lng": 77.0183, "r": 0.020, "area": "residential",  "lt": 5.5, "cv": 4,  "pt": 3, "al": 650, "cr": 42, "cb": 0.85, "pc": 7},
    "Coimbatore|Vadavalli":       {"lat": 11.0024, "lng": 76.9149, "r": 0.015, "area": "slum",         "lt": 3.5, "cv": 2,  "pt": 2, "al": 250, "cr": 62, "cb": 1.50, "pc": 20},
    "Coimbatore|Podanur":         {"lat": 10.9579, "lng": 76.9710, "r": 0.015, "area": "industrial",   "lt": 5.0, "cv": 5,  "pt": 3, "al": 700, "cr": 38, "cb": 1.00, "pc": 11},
    "Coimbatore|Kuniyamuthur":    {"lat": 10.9607, "lng": 76.9396, "r": 0.014, "area": "mixed",        "lt": 5.5, "cv": 5,  "pt": 3, "al": 550, "cr": 46, "cb": 0.95, "pc": 10},

    # ── MADURAI ──────────────────────────────────────────────────────────────
    "Madurai|Anna Nagar":         {"lat": 9.9396,  "lng": 78.1353, "r": 0.015, "area": "residential",  "lt": 6.5, "cv": 6,  "pt": 4, "al": 500, "cr": 55, "cb": 0.88, "pc": 8},
    "Madurai|Simmakkal":          {"lat": 9.9120,  "lng": 78.1197, "r": 0.012, "area": "commercial",   "lt": 7.0, "cv": 9,  "pt": 5, "al": 300, "cr": 76, "cb": 1.20, "pc": 15},
    "Madurai|KK Nagar":           {"lat": 9.9490,  "lng": 78.1052, "r": 0.016, "area": "residential",  "lt": 6.0, "cv": 5,  "pt": 4, "al": 600, "cr": 50, "cb": 0.85, "pc": 8},
    "Madurai|Tallakulam":         {"lat": 9.9307,  "lng": 78.1373, "r": 0.013, "area": "commercial",   "lt": 7.5, "cv": 10, "pt": 5, "al": 280, "cr": 72, "cb": 1.15, "pc": 14},
    "Madurai|Mattuthavani":       {"lat": 9.9598,  "lng": 78.1162, "r": 0.013, "area": "commercial",   "lt": 7.0, "cv": 8,  "pt": 5, "al": 320, "cr": 80, "cb": 1.18, "pc": 13},
    "Madurai|Teppakulam":         {"lat": 9.9291,  "lng": 78.1345, "r": 0.012, "area": "mixed",        "lt": 6.0, "cv": 7,  "pt": 4, "al": 420, "cr": 60, "cb": 0.95, "pc": 10},
    "Madurai|Arappalayam":        {"lat": 9.9339,  "lng": 78.1101, "r": 0.012, "area": "slum",         "lt": 3.5, "cv": 2,  "pt": 2, "al": 230, "cr": 65, "cb": 1.60, "pc": 24},
    "Madurai|Vilangudi":          {"lat": 9.9648,  "lng": 78.1516, "r": 0.015, "area": "residential",  "lt": 5.5, "cv": 4,  "pt": 3, "al": 680, "cr": 44, "cb": 0.90, "pc": 8},

    # ── TIRUCHIRAPPALLI ───────────────────────────────────────────────────────
    "Tiruchirappalli|Srirangam":  {"lat": 10.8657, "lng": 78.6929, "r": 0.015, "area": "commercial",   "lt": 6.5, "cv": 8,  "pt": 5, "al": 380, "cr": 70, "cb": 1.15, "pc": 13},
    "Tiruchirappalli|Woraiyur":   {"lat": 10.8419, "lng": 78.7031, "r": 0.013, "area": "residential",  "lt": 6.0, "cv": 5,  "pt": 4, "al": 500, "cr": 52, "cb": 0.90, "pc": 9},
    "Tiruchirappalli|Ariyamangalam":{"lat": 10.7631,"lng": 78.7513, "r": 0.018, "area": "mixed",       "lt": 5.5, "cv": 5,  "pt": 3, "al": 550, "cr": 48, "cb": 0.95, "pc": 10},
    "Tiruchirappalli|Thillai Nagar":{"lat": 10.8043,"lng": 78.6885, "r": 0.013, "area": "residential", "lt": 6.5, "cv": 7,  "pt": 4, "al": 450, "cr": 56, "cb": 0.85, "pc": 8},
    "Tiruchirappalli|KK Nagar":   {"lat": 10.7991, "lng": 78.7120, "r": 0.014, "area": "residential",  "lt": 6.0, "cv": 6,  "pt": 4, "al": 520, "cr": 50, "cb": 0.87, "pc": 8},
    "Tiruchirappalli|Puthur":     {"lat": 10.8240, "lng": 78.7380, "r": 0.013, "area": "slum",         "lt": 3.5, "cv": 2,  "pt": 2, "al": 240, "cr": 60, "cb": 1.55, "pc": 22},
    "Tiruchirappalli|Chathiram":  {"lat": 10.8046, "lng": 78.6856, "r": 0.012, "area": "commercial",   "lt": 7.5, "cv": 10, "pt": 5, "al": 300, "cr": 78, "cb": 1.20, "pc": 14},

    # ── SALEM ─────────────────────────────────────────────────────────────────
    "Salem|Fairlands":            {"lat": 11.6837, "lng": 78.1450, "r": 0.015, "area": "residential",  "lt": 6.5, "cv": 7,  "pt": 4, "al": 480, "cr": 52, "cb": 0.88, "pc": 8},
    "Salem|Shevapet":             {"lat": 11.6612, "lng": 78.1560, "r": 0.013, "area": "commercial",   "lt": 7.0, "cv": 9,  "pt": 5, "al": 300, "cr": 74, "cb": 1.18, "pc": 14},
    "Salem|Suramangalam":         {"lat": 11.6246, "lng": 78.1761, "r": 0.016, "area": "mixed",        "lt": 5.5, "cv": 5,  "pt": 3, "al": 520, "cr": 50, "cb": 0.95, "pc": 10},
    "Salem|Yercaud Road":         {"lat": 11.7000, "lng": 78.1600, "r": 0.020, "area": "mixed",        "lt": 5.0, "cv": 4,  "pt": 3, "al": 600, "cr": 40, "cb": 0.98, "pc": 9},
    "Salem|Hasthampatti":         {"lat": 11.6479, "lng": 78.1262, "r": 0.014, "area": "slum",         "lt": 3.5, "cv": 2,  "pt": 2, "al": 220, "cr": 63, "cb": 1.55, "pc": 21},
    "Salem|Attur Road":           {"lat": 11.6960, "lng": 78.2020, "r": 0.020, "area": "residential",  "lt": 5.0, "cv": 3,  "pt": 2, "al": 700, "cr": 35, "cb": 1.00, "pc": 10},

    # ── TIRUNELVELI ───────────────────────────────────────────────────────────
    "Tirunelveli|Palayamkottai":  {"lat": 8.7074,  "lng": 77.7470, "r": 0.015, "area": "commercial",   "lt": 7.0, "cv": 8,  "pt": 5, "al": 320, "cr": 72, "cb": 1.15, "pc": 14},
    "Tirunelveli|Vannarpettai":   {"lat": 8.7399,  "lng": 77.6883, "r": 0.014, "area": "slum",         "lt": 3.5, "cv": 2,  "pt": 2, "al": 220, "cr": 64, "cb": 1.58, "pc": 23},
    "Tirunelveli|Pettai":         {"lat": 8.7128,  "lng": 77.7181, "r": 0.013, "area": "commercial",   "lt": 6.5, "cv": 7,  "pt": 4, "al": 360, "cr": 68, "cb": 1.12, "pc": 13},
    "Tirunelveli|Melapalayam":    {"lat": 8.7195,  "lng": 77.7070, "r": 0.013, "area": "residential",  "lt": 6.0, "cv": 5,  "pt": 3, "al": 520, "cr": 50, "cb": 0.90, "pc": 9},
    "Tirunelveli|High Ground":    {"lat": 8.7470,  "lng": 77.7233, "r": 0.014, "area": "residential",  "lt": 6.5, "cv": 6,  "pt": 4, "al": 480, "cr": 48, "cb": 0.85, "pc": 8},
    "Tirunelveli|Nanguneri Road": {"lat": 8.6900,  "lng": 77.6680, "r": 0.020, "area": "mixed",        "lt": 4.5, "cv": 3,  "pt": 2, "al": 650, "cr": 38, "cb": 1.05, "pc": 11},

    # ── ERODE ─────────────────────────────────────────────────────────────────
    "Erode|Erode Town":       {"lat": 11.3411, "lng": 77.7172, "r": 0.013, "area": "commercial",   "lt": 7.0, "cv": 9,  "pt": 5, "al": 300, "cr": 75, "cb": 1.20, "pc": 15},
    "Erode|Raja Street":      {"lat": 11.3479, "lng": 77.7250, "r": 0.012, "area": "commercial",   "lt": 6.5, "cv": 8,  "pt": 4, "al": 260, "cr": 78, "cb": 1.28, "pc": 17},
    "Erode|Surampatti":       {"lat": 11.3650, "lng": 77.7350, "r": 0.015, "area": "residential",  "lt": 6.0, "cv": 5,  "pt": 4, "al": 520, "cr": 50, "cb": 0.88, "pc": 8},
    "Erode|Perundurai":       {"lat": 11.2772, "lng": 77.5878, "r": 0.018, "area": "industrial",   "lt": 5.5, "cv": 6,  "pt": 3, "al": 650, "cr": 42, "cb": 0.98, "pc": 10},
    "Erode|Bhavani":          {"lat": 11.4459, "lng": 77.6822, "r": 0.018, "area": "mixed",        "lt": 5.5, "cv": 5,  "pt": 3, "al": 480, "cr": 58, "cb": 1.05, "pc": 12},
    "Erode|Sathy Road":       {"lat": 11.3800, "lng": 77.7500, "r": 0.016, "area": "mixed",        "lt": 5.5, "cv": 5,  "pt": 3, "al": 550, "cr": 48, "cb": 0.95, "pc": 9},
    "Erode|Kongalnagaram":    {"lat": 11.3200, "lng": 77.6900, "r": 0.014, "area": "slum",         "lt": 3.5, "cv": 2,  "pt": 2, "al": 230, "cr": 65, "cb": 1.55, "pc": 22},
    "Erode|Kodumudi":         {"lat": 11.0997, "lng": 77.8649, "r": 0.018, "area": "residential",  "lt": 5.0, "cv": 3,  "pt": 2, "al": 700, "cr": 38, "cb": 0.92, "pc": 8},
}

# City-level weights (proportional total rows per city)
CITY_WEIGHTS = {
    "Chennai": 0.27, "Coimbatore": 0.16, "Madurai": 0.14,
    "Tiruchirappalli": 0.12, "Salem": 0.11, "Tirunelveli": 0.10, "Erode": 0.10,
}

# Locality weights within each city (uniform by default)
def _locality_weights(city):
    locs = [k for k in LOCALITIES if k.startswith(city + "|")]
    return locs, [1.0 / len(locs)] * len(locs)


WEATHER_TYPES  = ["clear", "rainy", "foggy"]
WEATHER_WEIGHTS = [0.60, 0.25, 0.15]

CRIME_TYPES = [
    "theft", "burglary", "robbery", "assault",
    "vandalism", "chain_snatching", "eve_teasing", "vehicle_theft",
]


def _population_density(area_type: str) -> float:
    base = {"residential": 6000, "commercial": 4000, "slum": 12000, "industrial": 1500, "mixed": 5000}
    v = base[area_type] + np.random.normal(0, base[area_type] * 0.25)
    return np.clip(v, 500, 15000)


def _compute_crime_probability(row: dict) -> float:
    score = 0.22  # baseline

    hour = row["time_of_day"]
    if 22 <= hour or hour <= 5:
        score += 0.18
    elif 18 <= hour < 22:
        score += 0.09

    score += (10 - row["lighting_score"]) * 0.020
    score -= row["cctv_density"] * 0.008
    score -= row["police_patrol_frequency"] * 0.012

    area_bonus = {"residential": 0.0, "commercial": 0.06, "slum": 0.18, "industrial": 0.03, "mixed": 0.05}
    score += area_bonus.get(row["area_type"], 0)

    if row["alcohol_shop_proximity"] < 200:
        score += 0.13
    elif row["alcohol_shop_proximity"] < 500:
        score += 0.07

    score += row["previous_crime_count"] * 0.004

    if row["weather"] == "foggy":
        score += 0.07
    elif row["weather"] == "rainy":
        score += 0.03

    score += (10 - row["visibility"]) * 0.01

    cd = row["crowd_density"]
    if cd < 10:
        score += 0.08
    elif cd > 80:
        score += 0.05

    if row["holiday_flag"] == 1:
        score += 0.04
    if row["day_of_week"] in (5, 6):
        score += 0.03

    # Locality-specific crime bias
    score *= row.get("_crime_bias", 1.0)

    score += np.random.normal(0, 0.04)
    return float(np.clip(score, 0.01, 0.99))


def _assign_crime_type(row: dict) -> str:
    w = {
        "theft": 3.0, "burglary": 1.5, "robbery": 1.0, "assault": 1.5,
        "vandalism": 1.0, "chain_snatching": 1.2, "eve_teasing": 1.0, "vehicle_theft": 1.8,
    }

    hour = row["time_of_day"]
    if 22 <= hour or hour <= 5:
        w["burglary"] *= 2.5; w["robbery"] *= 2.0; w["vehicle_theft"] *= 1.8

    if row["area_type"] == "commercial":
        w["theft"] *= 2.0; w["chain_snatching"] *= 2.5
    if row["area_type"] == "slum":
        w["assault"] *= 2.5; w["eve_teasing"] *= 1.8
    if row["area_type"] == "residential":
        w["vehicle_theft"] *= 2.0; w["burglary"] *= 1.8
    if row["area_type"] == "industrial":
        w["vehicle_theft"] *= 1.5; w["vandalism"] *= 2.0

    if row["alcohol_shop_proximity"] < 300:
        w["assault"] *= 2.0; w["vandalism"] *= 2.0

    cd = row["crowd_density"]
    if cd < 15:
        w["robbery"] *= 1.8; w["vehicle_theft"] *= 1.5
    if cd > 70:
        w["chain_snatching"] *= 2.0; w["theft"] *= 1.5

    types = list(w.keys())
    weights = np.array([w[t] for t in types], dtype=float)
    weights /= weights.sum()
    return np.random.choice(types, p=weights)


def generate_dataset() -> pd.DataFrame:
    print(f"Generating {NUM_ROWS:,} synthetic crime records with locality data...")

    city_names = list(CITY_WEIGHTS.keys())
    city_wts   = list(CITY_WEIGHTS.values())
    chosen_cities = np.random.choice(city_names, size=NUM_ROWS, p=city_wts)

    records = []
    for i, city in enumerate(chosen_cities):
        locs, lwts = _locality_weights(city)
        loc_key = np.random.choice(locs, p=lwts)
        lcfg    = LOCALITIES[loc_key]
        locality_name = loc_key.split("|")[1]

        # Jitter coordinates around locality centre
        lat = lcfg["lat"] + np.random.uniform(-lcfg["r"], lcfg["r"])
        lng = lcfg["lng"] + np.random.uniform(-lcfg["r"], lcfg["r"])

        area_type = lcfg["area"]
        weather   = np.random.choice(WEATHER_TYPES, p=WEATHER_WEIGHTS)

        lighting = np.clip(lcfg["lt"] + np.random.normal(0, 1.0), 1, 10)
        cctv     = np.clip(lcfg["cv"] + np.random.normal(0, 2.0), 0, 20)
        patrol   = np.clip(lcfg["pt"] + np.random.normal(0, 1.0), 0, 10)
        alcohol  = np.clip(lcfg["al"] + np.random.exponential(200), 0, 2000)
        crowd    = np.clip(lcfg["cr"] + np.random.normal(0, 15),    1, 100)

        visibility = np.clip(np.random.normal(6.5, 1.8), 1, 10)
        if weather == "foggy":
            visibility = np.clip(visibility - 3.0, 1, 10)
        elif weather == "rainy":
            visibility = np.clip(visibility - 1.5, 1, 10)

        row = {
            "city":                  city,
            "locality":              locality_name,
            "latitude":              round(lat, 6),
            "longitude":             round(lng, 6),
            "area_type":             area_type,
            "population_density":    round(_population_density(area_type), 1),
            "lighting_score":        round(lighting, 2),
            "cctv_density":          round(cctv, 2),
            "police_patrol_frequency": round(patrol, 2),
            "time_of_day":           int(np.random.randint(0, 24)),
            "day_of_week":           int(np.random.randint(0, 7)),
            "holiday_flag":          int(np.random.random() < 0.10),
            "crowd_density":         round(crowd, 1),
            "alcohol_shop_proximity": round(alcohol, 1),
            "school_proximity":      round(np.clip(np.random.exponential(900), 0, 3000), 1),
            "previous_crime_count":  int(np.clip(np.random.poisson(lcfg["pc"]), 0, 60)),
            "weather":               weather,
            "visibility":            round(visibility, 2),
            "_crime_bias":           lcfg["cb"],
        }

        row["crime_probability"] = round(_compute_crime_probability(row), 4)
        row["crime_type"]        = _assign_crime_type(row)
        row["opcrime_score"]     = round(
            np.clip(row["crime_probability"] * 100 + np.random.normal(0, 4), 0, 100), 2
        )

        # Remove internal key before saving
        del row["_crime_bias"]
        records.append(row)

        if (i + 1) % 5000 == 0:
            print(f"  Generated {i + 1:,} / {NUM_ROWS:,} rows...")

    return pd.DataFrame(records)


def main():
    df = generate_dataset()

    print("\n--- Dataset Summary ---")
    print(f"Shape: {df.shape}")
    print(f"\nCity distribution:\n{df['city'].value_counts()}")
    print(f"\nTop localities:\n{df['locality'].value_counts().head(20)}")
    print(f"\nArea type distribution:\n{df['area_type'].value_counts()}")
    print(f"\nCrime type distribution:\n{df['crime_type'].value_counts()}")
    print(f"\nOpCrime score stats:\n{df['opcrime_score'].describe()}")
    print(f"\nCrime probability stats:\n{df['crime_probability'].describe()}")

    out_dir  = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "crime_dataset.csv")
    df.to_csv(out_path, index=False)
    print(f"\nDataset saved to {out_path}")
    print(f"File size: {os.path.getsize(out_path) / (1024**2):.2f} MB")


if __name__ == "__main__":
    main()
