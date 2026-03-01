"""
classical_benchmark.py — Classical ML Benchmark vs Quantum Model
================================================================
Compares standard scikit-learn classifiers against the 16-qubit quantum
fidelity kernel model on the leptospirosis dataset.

Regime A: 5-fold CV on all 498 patients (expected ~50% AUC — no signal)
Regime B: Train on 30 synthetic patients, test on 141 clinically filtered
          patients (same protocol as the quantum model)

Run with:  python3 classical_benchmark.py
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

from quantum_engine import CLINICAL_WEIGHTS_16Q

# ── Constants ──────────────────────────────────────────────────────────────

CSV_PATH = "data/patients_lepto_clean.csv"

SYMPTOM_COLS = [
    "fever", "muscle_pain", "jaundice", "vomiting", "confusion", "headache",
    "chills", "rigors", "nausea", "diarrhoea", "cough", "bleeding",
    "prostration", "oliguria", "anuria", "conjunctival_suffusion",
    "muscle_tenderness",
]

FEATURE_COLS = [
    "age", "sex_enc", "heart_rate", "bp_systolic", "bp_diastolic",
    "wbc", "platelets",
] + SYMPTOM_COLS  # 7 continuous + 17 binary = 24 features

# Severe symptoms for clinical filtering (same as Validation.tsx)
SEVERE_SYMPTOMS = ["jaundice", "oliguria", "anuria", "bleeding",
                   "conjunctival_suffusion"]

# Quantum model's known results on the 141-patient filtered set
QUANTUM_RESULTS = {"TP": 34, "FN": 23, "FP": 7, "TN": 77}


# ── Data Loading ──────────────────────────────────────────────────────────

def load_data(csv_path=CSV_PATH):
    """
    Load the cleaned leptospirosis CSV and return feature matrix + labels.

    Returns:
        X: np.ndarray (n, 24) — all clinical features
        y: np.ndarray (n,)    — binary diagnosis labels
        df: pd.DataFrame      — full dataframe for filtering
    """
    df = pd.read_csv(csv_path)
    df["sex_enc"] = (df["sex"].str.upper().isin(["F", "FEMALE"])).astype(float)
    X = df[FEATURE_COLS].values.astype(np.float64)
    y = df["diagnosis"].values.astype(int)
    return X, y, df


# ── Model Definitions ────────────────────────────────────────────────────

def get_models():
    """Return dict of name -> sklearn Pipeline for each classical model."""
    return {
        "Logistic Regression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=1000, random_state=42)),
        ]),
        "Random Forest": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", RandomForestClassifier(
                n_estimators=100, random_state=42)),
        ]),
        "Gradient Boosting": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", GradientBoostingClassifier(
                n_estimators=100, random_state=42)),
        ]),
        "SVM (RBF)": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", SVC(kernel="rbf", probability=True, random_state=42)),
        ]),
    }


# ── Regime A: 5-Fold Cross-Validation ────────────────────────────────────

def run_cross_validation(X, y):
    """
    Stratified 5-fold CV on all 498 patients.

    Returns:
        list of dicts with keys: name, accuracy, auc, cm (confusion matrix)
    """
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    results = []

    for name, pipeline in get_models().items():
        y_pred = cross_val_predict(pipeline, X, y, cv=cv)
        y_prob = cross_val_predict(pipeline, X, y, cv=cv, method="predict_proba")[:, 1]

        acc = accuracy_score(y, y_pred)
        auc = roc_auc_score(y, y_prob)
        cm = confusion_matrix(y, y_pred)

        results.append({
            "name": name,
            "accuracy": acc,
            "auc": auc,
            "cm": cm,
        })

    return results


# ── Synthetic Patient Generation ─────────────────────────────────────────

def generate_synthetic_patients(n_healthy=15, n_sick=15, random_state=42):
    """
    Generate synthetic reference patients as raw feature vectors (not quantum
    states). Uses the same RNG seed and clinical weight logic as
    quantum_engine.bootstrap_svm_synthetic().

    Returns:
        X_train: np.ndarray (30, 24)
        y_train: np.ndarray (30,)
    """
    rng = np.random.RandomState(random_state)
    symptom_keys = list(CLINICAL_WEIGHTS_16Q.keys())
    rows = []
    labels = []

    # Healthy patients
    for _ in range(n_healthy):
        row = {
            "heart_rate": rng.uniform(60, 85),
            "bp_systolic": rng.uniform(110, 135),
            "bp_diastolic": rng.uniform(68, 85),
            "wbc": rng.uniform(4000, 10000),
            "platelets": rng.uniform(150000, 400000),
            "age": rng.uniform(18, 55),
            "sex": rng.choice(["M", "F"]),
        }
        for sym in symptom_keys:
            row[sym] = False
        if rng.random() < 0.3:
            row[rng.choice(["headache", "fever"])] = True
        # Fill remaining symptom cols not in symptom_keys
        for sym in SYMPTOM_COLS:
            if sym not in row:
                row[sym] = False
        rows.append(row)
        labels.append(0)

    # Sick patients
    for i in range(n_sick):
        row = {
            "heart_rate": rng.uniform(95, 130),
            "bp_systolic": rng.uniform(80, 105),
            "bp_diastolic": rng.uniform(48, 65),
            "wbc": rng.uniform(14000, 30000),
            "platelets": rng.uniform(15000, 80000),
            "age": rng.uniform(25, 70),
            "sex": rng.choice(["M", "F"]),
        }
        severity = (i + 1) / n_sick
        for sym in symptom_keys:
            weight = CLINICAL_WEIGHTS_16Q[sym]
            prob = weight * severity
            row[sym] = rng.random() < prob
        # Ensure at least 2 symptoms
        active = [s for s in symptom_keys if row[s]]
        while len(active) < 2:
            sym = rng.choice(symptom_keys)
            row[sym] = True
            active.append(sym)
        # Fill remaining symptom cols
        for sym in SYMPTOM_COLS:
            if sym not in row:
                row[sym] = False
        rows.append(row)
        labels.append(1)

    # Convert to feature matrix
    X_train = np.zeros((len(rows), len(FEATURE_COLS)), dtype=np.float64)
    for i, row in enumerate(rows):
        X_train[i, 0] = row["age"]
        X_train[i, 1] = 1.0 if str(row["sex"]).upper() in ("F", "FEMALE") else 0.0
        X_train[i, 2] = row["heart_rate"]
        X_train[i, 3] = row["bp_systolic"]
        X_train[i, 4] = row["bp_diastolic"]
        X_train[i, 5] = row["wbc"]
        X_train[i, 6] = row["platelets"]
        for j, sym in enumerate(SYMPTOM_COLS):
            X_train[i, 7 + j] = float(row[sym])

    return X_train, np.array(labels)


# ── Clinical Filtering ───────────────────────────────────────────────────

def filter_test_patients(df):
    """
    Apply the same clinical filter as the quantum validation (141 patients):
    - Positive (diagnosis=1): >= 2 severe symptoms, OR >= 1 severe AND PLT < 80k
    - Negative (diagnosis=0): 0 severe symptoms AND platelets >= 120,000

    Returns:
        X_test: np.ndarray (n_filtered, 24)
        y_test: np.ndarray (n_filtered,)
    """
    df = df.copy()
    df["sex_enc"] = (df["sex"].str.upper().isin(["F", "FEMALE"])).astype(float)
    df["n_severe"] = df[SEVERE_SYMPTOMS].sum(axis=1)

    pos_mask = (df["diagnosis"] == 1) & (
        (df["n_severe"] >= 2) |
        ((df["n_severe"] >= 1) & (df["platelets"] < 80000))
    )
    neg_mask = (df["diagnosis"] == 0) & (df["n_severe"] == 0) & (df["platelets"] >= 120000)

    filtered = pd.concat([df[pos_mask], df[neg_mask]])
    X_test = filtered[FEATURE_COLS].values.astype(np.float64)
    y_test = filtered["diagnosis"].values.astype(int)

    return X_test, y_test


# ── Regime B: Synthetic Training → Filtered Test ─────────────────────────

def run_filtered_comparison(X_train, y_train, X_test, y_test):
    """
    Train each classical model on synthetic patients, test on clinically
    filtered real patients. Append quantum model results for comparison.

    Returns:
        list of dicts with keys: name, accuracy, sensitivity, specificity,
                                 cm (as dict TP/FN/FP/TN)
    """
    results = []

    for name, pipeline in get_models().items():
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        acc = accuracy_score(y_test, y_pred)
        cm = confusion_matrix(y_test, y_pred, labels=[1, 0])
        tp, fn = cm[0]
        fp, tn = cm[1]

        n_pos = tp + fn
        n_neg = fp + tn
        sens = tp / n_pos if n_pos > 0 else 0.0
        spec = tn / n_neg if n_neg > 0 else 0.0

        results.append({
            "name": name,
            "accuracy": acc,
            "sensitivity": sens,
            "specificity": spec,
            "cm": {"TP": int(tp), "FN": int(fn), "FP": int(fp), "TN": int(tn)},
        })

    # Append quantum model's known results
    q = QUANTUM_RESULTS
    total = q["TP"] + q["FN"] + q["FP"] + q["TN"]
    n_pos = q["TP"] + q["FN"]
    n_neg = q["FP"] + q["TN"]
    results.append({
        "name": "Quantum Fidelity (16q)",
        "accuracy": (q["TP"] + q["TN"]) / total,
        "sensitivity": q["TP"] / n_pos,
        "specificity": q["TN"] / n_neg,
        "cm": q,
    })

    return results


# ── Pretty Printing ──────────────────────────────────────────────────────

def print_regime_a(results):
    """Print Regime A results as ASCII table."""
    print("=" * 72)
    print("  REGIME A: 5-Fold Cross-Validation on 498 Patients")
    print("  (Expected: ~50% AUC — near-zero class separation in raw data)")
    print("=" * 72)
    print()
    print(f"  {'Model':<25} {'Accuracy':>10} {'AUC':>10}")
    print(f"  {'-'*25} {'-'*10} {'-'*10}")
    for r in results:
        print(f"  {r['name']:<25} {r['accuracy']:>9.1%} {r['auc']:>9.3f}")
    print()


def print_regime_b(results, n_test):
    """Print Regime B results as ASCII table with confusion matrices."""
    print("=" * 72)
    print(f"  REGIME B: Train on 30 Synthetic, Test on {n_test} Filtered Patients")
    print("  (Same protocol as quantum model)")
    print("=" * 72)
    print()
    print(f"  {'Model':<25} {'Acc':>7} {'Sens':>7} {'Spec':>7}  "
          f"{'TP':>4} {'FN':>4} {'FP':>4} {'TN':>4}")
    print(f"  {'-'*25} {'-'*7} {'-'*7} {'-'*7}  {'-'*4} {'-'*4} {'-'*4} {'-'*4}")
    for r in results:
        cm = r["cm"]
        marker = " <--" if "Quantum" in r["name"] else ""
        print(f"  {r['name']:<25} {r['accuracy']:>6.1%} {r['sensitivity']:>6.1%} "
              f"{r['specificity']:>6.1%}  {cm['TP']:>4} {cm['FN']:>4} "
              f"{cm['FP']:>4} {cm['TN']:>4}{marker}")
    print()


# ── Main ─────────────────────────────────────────────────────────────────

def main():
    print()
    print("Classical ML Benchmark vs Quantum Fidelity Model")
    print("Leptospirosis dataset — Kisumu County, Kenya (498 patients)")
    print()

    # Load data
    X, y, df = load_data()
    print(f"Loaded {len(y)} patients ({y.sum()} positive, {(y == 0).sum()} negative)")
    print(f"Features: {X.shape[1]} ({7} continuous + {17} binary symptoms)")
    print()

    # ── Regime A ──────────────────────────────────────────────────────────
    print("Running Regime A: 5-fold cross-validation...")
    cv_results = run_cross_validation(X, y)
    print_regime_a(cv_results)

    # ── Regime B ──────────────────────────────────────────────────────────
    print("Running Regime B: synthetic training → filtered test...")
    X_train, y_train = generate_synthetic_patients()
    X_test, y_test = filter_test_patients(df)
    print(f"  Synthetic training set: {len(y_train)} patients "
          f"({(y_train == 0).sum()} healthy, {(y_train == 1).sum()} sick)")
    print(f"  Filtered test set:     {len(y_test)} patients "
          f"({(y_test == 1).sum()} positive, {(y_test == 0).sum()} negative)")
    print()

    filtered_results = run_filtered_comparison(X_train, y_train, X_test, y_test)
    print_regime_b(filtered_results, len(y_test))

    # ── Summary ───────────────────────────────────────────────────────────
    print("=" * 72)
    print("  TAKEAWAY")
    print("=" * 72)
    print()
    print("  Regime A confirms no model can separate classes in the raw data")
    print("  (AUC ~0.5). Regime B shows how each model performs under the")
    print("  quantum model's protocol: synthetic training + clinical filtering.")
    print()


if __name__ == "__main__":
    main()
