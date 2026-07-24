"""
OpCrime AI - Prediction Module
Provides functions to load trained models and make predictions.
"""

import os
import json
import pickle
from typing import Dict, List, Optional

import numpy as np

BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Default feature values used when caller omits a field
_FEATURE_DEFAULTS = {
    "city": "Chennai",
    "area_type": "residential",
    "weather": "clear",
    "latitude": 13.0827,
    "longitude": 80.2707,
    "population_density": 5000.0,
    "lighting_score": 6.0,
    "cctv_density": 5.0,
    "police_patrol_frequency": 3.0,
    "time_of_day": 12,
    "day_of_week": 3,
    "holiday_flag": 0,
    "crowd_density": 50.0,
    "alcohol_shop_proximity": 800.0,
    "school_proximity": 1200.0,
    "previous_crime_count": 5,
    "visibility": 7.0,
}


class _ModelStore:
    """Lazy-loading singleton for model artifacts."""

    _instance = None

    def __init__(self):
        self.xgb_model = None
        self.rf_model = None
        self.kmeans_model = None
        self.preprocessor = None
        self.feature_importance = None
        self._loaded = False

    @classmethod
    def get(cls) -> "_ModelStore":
        if cls._instance is None:
            cls._instance = cls()
        if not cls._instance._loaded:
            cls._instance._load()
        return cls._instance

    def _load(self):
        """Load all model artifacts from disk."""
        with open(os.path.join(MODELS_DIR, "xgb_regressor.pkl"), "rb") as f:
            self.xgb_model = pickle.load(f)

        with open(os.path.join(MODELS_DIR, "rf_classifier.pkl"), "rb") as f:
            self.rf_model = pickle.load(f)

        with open(os.path.join(MODELS_DIR, "kmeans_hotspot.pkl"), "rb") as f:
            self.kmeans_model = pickle.load(f)

        with open(os.path.join(MODELS_DIR, "preprocessor.pkl"), "rb") as f:
            self.preprocessor = pickle.load(f)

        feat_path = os.path.join(MODELS_DIR, "feature_importance.json")
        if os.path.exists(feat_path):
            with open(feat_path, "r") as f:
                self.feature_importance = json.load(f)
        else:
            self.feature_importance = {}

        self._loaded = True


def _prepare_features(features_dict: Dict) -> np.ndarray:
    """
    Convert a user-supplied feature dict into the scaled numpy array
    expected by the trained models.
    """
    store = _ModelStore.get()
    prep = store.preprocessor

    # Merge with defaults
    merged = {**_FEATURE_DEFAULTS, **features_dict}

    # Encode categoricals
    encoded_values = []
    for col in prep["categorical_features"]:
        le = prep["label_encoders"][col]
        val = merged[col]
        # Handle unseen labels gracefully
        if val in le.classes_:
            encoded_values.append(le.transform([val])[0])
        else:
            encoded_values.append(0)

    # Numeric values
    numeric_values = [float(merged[col]) for col in prep["numeric_features"]]

    feature_vector = np.array(encoded_values + numeric_values, dtype=np.float64).reshape(1, -1)

    # Scale
    feature_vector = prep["scaler"].transform(feature_vector)
    return feature_vector


def predict_opcrime_score(features_dict: Dict) -> float:
    """
    Predict the OpCrime score (0-100) for a given set of features.

    Args:
        features_dict: dict with feature names as keys. Missing features
                       are filled with sensible defaults.

    Returns:
        Predicted OpCrime score as a float between 0 and 100.
    """
    store = _ModelStore.get()
    X = _prepare_features(features_dict)
    score = store.xgb_model.predict(X)[0]
    return float(np.clip(score, 0, 100))


def predict_crime_type(features_dict: Dict) -> str:
    """
    Predict the most likely crime type for a given set of features.

    Returns:
        Crime type string (e.g., "theft", "burglary").
    """
    store = _ModelStore.get()
    X = _prepare_features(features_dict)
    pred_encoded = store.rf_model.predict(X)[0]
    le = store.preprocessor["label_encoders"]["crime_type"]
    return le.inverse_transform([int(pred_encoded)])[0]


def get_hotspot_cluster(lat: float, lng: float, score: float) -> int:
    """
    Assign a location to a hotspot cluster.

    Args:
        lat: latitude
        lng: longitude
        score: opcrime score (0-100)

    Returns:
        Cluster label (int).
    """
    store = _ModelStore.get()
    prep = store.preprocessor
    point = np.array([[lat, lng, score]], dtype=np.float64)
    point_scaled = prep["cluster_scaler"].transform(point)
    return int(store.kmeans_model.predict(point_scaled)[0])


def get_feature_importance() -> Dict[str, float]:
    """
    Return feature importance dict from the trained XGBoost model,
    sorted by importance descending.
    """
    store = _ModelStore.get()
    return dict(store.feature_importance)


def simulate_intervention(
    features_dict: Dict,
    interventions_dict: Dict,
) -> Dict:
    """
    What-if analysis: predict the score before and after applying interventions.

    Args:
        features_dict: current feature values.
        interventions_dict: features to override (e.g., {"cctv_density": 15, "lighting_score": 9}).

    Returns:
        Dict with keys:
            - score_before: float
            - score_after: float
            - score_change: float (negative means improvement)
            - crime_type_before: str
            - crime_type_after: str
            - interventions_applied: dict
    """
    score_before = predict_opcrime_score(features_dict)
    crime_before = predict_crime_type(features_dict)

    modified = {**features_dict, **interventions_dict}
    score_after = predict_opcrime_score(modified)
    crime_after = predict_crime_type(modified)

    return {
        "score_before": round(score_before, 2),
        "score_after": round(score_after, 2),
        "score_change": round(score_after - score_before, 2),
        "crime_type_before": crime_before,
        "crime_type_after": crime_after,
        "interventions_applied": interventions_dict,
    }


def explain_prediction(features_dict: Dict) -> Dict:
    """
    Explain which features contributed most to a prediction by measuring
    each feature's marginal impact relative to the default baseline.

    Returns:
        Dict with keys:
            - predicted_score: float
            - predicted_crime_type: str
            - feature_contributions: list of {feature, value, impact} sorted by |impact|
            - top_risk_factors: list of top 5 features increasing the score
            - top_protective_factors: list of top 5 features decreasing the score
    """
    merged = {**_FEATURE_DEFAULTS, **features_dict}

    # Baseline prediction with all defaults
    baseline_score = predict_opcrime_score(_FEATURE_DEFAULTS)

    # Full prediction
    full_score = predict_opcrime_score(merged)
    crime_type = predict_crime_type(merged)

    # Measure marginal contribution of each changed feature
    contributions = []
    for feature, value in merged.items():
        if feature not in _FEATURE_DEFAULTS:
            continue
        # Predict with just this one feature changed from default
        single_change = {**_FEATURE_DEFAULTS, feature: value}
        single_score = predict_opcrime_score(single_change)
        impact = single_score - baseline_score
        contributions.append({
            "feature": feature,
            "value": value,
            "impact": round(impact, 4),
        })

    contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)

    risk_factors = [c for c in contributions if c["impact"] > 0][:5]
    protective = [c for c in contributions if c["impact"] < 0][:5]

    return {
        "predicted_score": round(full_score, 2),
        "predicted_crime_type": crime_type,
        "baseline_score": round(baseline_score, 2),
        "feature_contributions": contributions,
        "top_risk_factors": risk_factors,
        "top_protective_factors": protective,
    }


# --- Convenience: allow running as a quick test ---
if __name__ == "__main__":
    test_features = {
        "city": "Chennai",
        "area_type": "slum",
        "latitude": 13.05,
        "longitude": 80.24,
        "lighting_score": 3.0,
        "cctv_density": 1.0,
        "time_of_day": 23,
        "alcohol_shop_proximity": 100,
        "previous_crime_count": 20,
        "weather": "foggy",
        "visibility": 2.0,
    }

    print("=== OpCrime Score Prediction ===")
    score = predict_opcrime_score(test_features)
    print(f"Predicted OpCrime Score: {score:.2f}")

    print("\n=== Crime Type Prediction ===")
    crime = predict_crime_type(test_features)
    print(f"Predicted Crime Type: {crime}")

    print("\n=== Hotspot Cluster ===")
    cluster = get_hotspot_cluster(13.05, 80.24, score)
    print(f"Cluster: {cluster}")

    print("\n=== Feature Importance (top 5) ===")
    imp = get_feature_importance()
    for i, (k, v) in enumerate(imp.items()):
        if i >= 5:
            break
        print(f"  {k}: {v:.4f}")

    print("\n=== Intervention Simulation ===")
    result = simulate_intervention(
        test_features,
        {"cctv_density": 15, "lighting_score": 9, "police_patrol_frequency": 8},
    )
    print(f"  Before: {result['score_before']:.2f} ({result['crime_type_before']})")
    print(f"  After:  {result['score_after']:.2f} ({result['crime_type_after']})")
    print(f"  Change: {result['score_change']:.2f}")

    print("\n=== Prediction Explanation ===")
    explanation = explain_prediction(test_features)
    print(f"  Score: {explanation['predicted_score']:.2f}")
    print(f"  Top risk factors:")
    for rf in explanation["top_risk_factors"]:
        print(f"    {rf['feature']}: {rf['value']} (impact: {rf['impact']:+.2f})")
    print(f"  Top protective factors:")
    for pf in explanation["top_protective_factors"]:
        print(f"    {pf['feature']}: {pf['value']} (impact: {pf['impact']:+.2f})")
