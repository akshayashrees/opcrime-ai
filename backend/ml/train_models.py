"""
OpCrime AI - Model Training Pipeline
Trains XGBoost regressor, Random Forest classifier, and KMeans clustering.
"""

import os
import json
import pickle
import warnings

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    mean_squared_error,
    mean_absolute_error,
    r2_score,
    accuracy_score,
    classification_report,
)
from sklearn.cluster import KMeans
from xgboost import XGBRegressor
from sklearn.ensemble import RandomForestClassifier

warnings.filterwarnings("ignore")

SEED = 42
BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, "data", "crime_dataset.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Features used for regression and classification
CATEGORICAL_FEATURES = ["city", "area_type", "weather"]
NUMERIC_FEATURES = [
    "latitude", "longitude", "population_density", "lighting_score",
    "cctv_density", "police_patrol_frequency", "time_of_day", "day_of_week",
    "holiday_flag", "crowd_density", "alcohol_shop_proximity",
    "school_proximity", "previous_crime_count", "visibility",
]
ALL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def load_and_preprocess(path: str):
    """Load CSV and preprocess features."""
    print("Loading dataset...")
    df = pd.read_csv(path)
    print(f"Loaded {len(df):,} rows, {len(df.columns)} columns")

    # --- Label Encode categoricals ---
    label_encoders = {}
    for col in CATEGORICAL_FEATURES:
        le = LabelEncoder()
        df[col + "_encoded"] = le.fit_transform(df[col])
        label_encoders[col] = le

    # Encode target crime_type
    le_crime = LabelEncoder()
    df["crime_type_encoded"] = le_crime.fit_transform(df["crime_type"])
    label_encoders["crime_type"] = le_crime

    # Build feature matrix
    encoded_cat_cols = [c + "_encoded" for c in CATEGORICAL_FEATURES]
    feature_cols = encoded_cat_cols + NUMERIC_FEATURES

    X = df[feature_cols].values.astype(np.float64)

    # --- Standard Scaler ---
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Targets
    y_score = df["opcrime_score"].values
    y_crime = df["crime_type_encoded"].values

    # Lat/lng + score for clustering
    X_cluster = df[["latitude", "longitude", "opcrime_score"]].values

    return X_scaled, y_score, y_crime, X_cluster, feature_cols, label_encoders, scaler, df


def train_xgboost_regressor(X_train, X_test, y_train, y_test, feature_names):
    """Train XGBoost regressor for opcrime_score prediction."""
    print("\n" + "=" * 60)
    print("TRAINING: XGBoost Regressor for OpCrime Score")
    print("=" * 60)

    model = XGBRegressor(
        n_estimators=300,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=SEED,
        n_jobs=-1,
        verbosity=0,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    y_pred = model.predict(X_test)

    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"  RMSE:  {rmse:.4f}")
    print(f"  MAE:   {mae:.4f}")
    print(f"  R2:    {r2:.4f}")

    # Feature importance
    importance = dict(zip(feature_names, model.feature_importances_.tolist()))
    importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
    print("\n  Top 10 Feature Importances:")
    for i, (feat, imp) in enumerate(importance.items()):
        if i >= 10:
            break
        print(f"    {feat:35s} {imp:.4f}")

    return model, importance, {"rmse": rmse, "mae": mae, "r2": r2}


def train_random_forest_classifier(X_train, X_test, y_train, y_test, label_encoder):
    """Train Random Forest classifier for crime_type prediction."""
    print("\n" + "=" * 60)
    print("TRAINING: Random Forest Classifier for Crime Type")
    print("=" * 60)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features="sqrt",
        class_weight="balanced",
        random_state=SEED,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    print(f"  Accuracy: {accuracy:.4f}")

    target_names = label_encoder.classes_.tolist()
    report = classification_report(y_test, y_pred, target_names=target_names)
    print(f"\n  Classification Report:\n{report}")

    return model, {"accuracy": accuracy, "report": report}


def train_kmeans_clustering(X_cluster):
    """Train KMeans for hotspot identification with elbow method."""
    print("\n" + "=" * 60)
    print("TRAINING: KMeans Clustering for Hotspot Detection")
    print("=" * 60)

    # Scale clustering features
    cluster_scaler = StandardScaler()
    X_scaled = cluster_scaler.fit_transform(X_cluster)

    # Elbow method: test k from 3 to 10
    inertias = {}
    k_range = range(3, 11)
    for k in k_range:
        km = KMeans(n_clusters=k, random_state=SEED, n_init=10, max_iter=300)
        km.fit(X_scaled)
        inertias[k] = km.inertia_
        print(f"  k={k:2d}  inertia={km.inertia_:,.0f}")

    # Pick optimal k using largest drop in inertia (simple elbow heuristic)
    drops = {}
    ks = sorted(inertias.keys())
    for i in range(1, len(ks)):
        drops[ks[i]] = inertias[ks[i - 1]] - inertias[ks[i]]

    # Find k where marginal decrease drops most (second derivative)
    second_deriv = {}
    dk = sorted(drops.keys())
    for i in range(1, len(dk)):
        second_deriv[dk[i]] = drops[dk[i - 1]] - drops[dk[i]]

    optimal_k = max(second_deriv, key=second_deriv.get) if second_deriv else 5
    print(f"\n  Optimal k (elbow): {optimal_k}")

    # Train final model
    final_model = KMeans(n_clusters=optimal_k, random_state=SEED, n_init=10, max_iter=300)
    final_model.fit(X_scaled)

    # Cluster summary
    labels = final_model.labels_
    for c in range(optimal_k):
        mask = labels == c
        cluster_scores = X_cluster[mask, 2]  # opcrime_score column
        print(
            f"  Cluster {c}: {mask.sum():,} points, "
            f"avg_score={cluster_scores.mean():.1f}, "
            f"max_score={cluster_scores.max():.1f}"
        )

    return final_model, cluster_scaler, optimal_k, inertias


def save_artifacts(
    xgb_model, rf_model, kmeans_model, cluster_scaler,
    label_encoders, scaler, feature_names, feature_importance,
    xgb_metrics, rf_metrics, optimal_k, inertias,
):
    """Save all models and preprocessors to disk."""
    os.makedirs(MODELS_DIR, exist_ok=True)

    # Save XGBoost regressor
    path = os.path.join(MODELS_DIR, "xgb_regressor.pkl")
    with open(path, "wb") as f:
        pickle.dump(xgb_model, f)
    print(f"\nSaved XGBoost regressor -> {path}")

    # Save Random Forest classifier
    path = os.path.join(MODELS_DIR, "rf_classifier.pkl")
    with open(path, "wb") as f:
        pickle.dump(rf_model, f)
    print(f"Saved RF classifier    -> {path}")

    # Save KMeans
    path = os.path.join(MODELS_DIR, "kmeans_hotspot.pkl")
    with open(path, "wb") as f:
        pickle.dump(kmeans_model, f)
    print(f"Saved KMeans           -> {path}")

    # Save preprocessor bundle
    preprocessor = {
        "label_encoders": label_encoders,
        "scaler": scaler,
        "cluster_scaler": cluster_scaler,
        "feature_names": feature_names,
        "categorical_features": CATEGORICAL_FEATURES,
        "numeric_features": NUMERIC_FEATURES,
    }
    path = os.path.join(MODELS_DIR, "preprocessor.pkl")
    with open(path, "wb") as f:
        pickle.dump(preprocessor, f)
    print(f"Saved preprocessor     -> {path}")

    # Save feature importance as JSON
    path = os.path.join(MODELS_DIR, "feature_importance.json")
    with open(path, "w") as f:
        json.dump(feature_importance, f, indent=2)
    print(f"Saved feature importance -> {path}")

    # Save metrics as JSON
    metrics = {
        "xgboost_regressor": {
            "rmse": xgb_metrics["rmse"],
            "mae": xgb_metrics["mae"],
            "r2": xgb_metrics["r2"],
        },
        "random_forest_classifier": {
            "accuracy": rf_metrics["accuracy"],
        },
        "kmeans_clustering": {
            "optimal_k": optimal_k,
            "inertias": {str(k): v for k, v in inertias.items()},
        },
    }
    path = os.path.join(MODELS_DIR, "metrics.json")
    with open(path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved metrics          -> {path}")


def main():
    # Load & preprocess
    X, y_score, y_crime, X_cluster, feature_names, label_encoders, scaler, df = \
        load_and_preprocess(DATA_PATH)

    # Train/test split
    X_train, X_test, y_score_train, y_score_test, y_crime_train, y_crime_test = \
        train_test_split(X, y_score, y_crime, test_size=0.20, random_state=SEED)

    print(f"Train size: {X_train.shape[0]:,}  |  Test size: {X_test.shape[0]:,}")

    # Model 1: XGBoost Regressor
    xgb_model, feat_imp, xgb_metrics = train_xgboost_regressor(
        X_train, X_test, y_score_train, y_score_test, feature_names
    )

    # Model 2: Random Forest Classifier
    rf_model, rf_metrics = train_random_forest_classifier(
        X_train, X_test, y_crime_train, y_crime_test, label_encoders["crime_type"]
    )

    # Model 3: KMeans Clustering
    kmeans_model, cluster_scaler, optimal_k, inertias = train_kmeans_clustering(X_cluster)

    # Save everything
    save_artifacts(
        xgb_model, rf_model, kmeans_model, cluster_scaler,
        label_encoders, scaler, feature_names, feat_imp,
        xgb_metrics, rf_metrics, optimal_k, inertias,
    )

    print("\n" + "=" * 60)
    print("ALL MODELS TRAINED AND SAVED SUCCESSFULLY")
    print("=" * 60)


if __name__ == "__main__":
    main()
