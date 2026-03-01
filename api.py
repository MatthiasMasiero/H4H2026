"""
api.py — FastAPI backend for Quantum Diagnostic predictions
============================================================
Run with:  uvicorn api:app --reload --port 8000

Docs at:   http://localhost:8000/docs
"""

import os
import json
import numpy as np
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.svm import SVC

from quantum_engine import (
    get_quantum_signature,
    condense_features,
    compute_kernel_from_params,
    compute_kernel_from_signatures,
    signature_from_dict,
    signature_to_dict,
    normalize_features,
    FEATURE_COLS,
    NUM_QUBITS,
)
from aggregator import FederatedAggregator


# ── Paths ────────────────────────────────────────────────────────────────────

DATA_DIR = "data"
SIGS_PATH = os.path.join(DATA_DIR, "signatures.json")
CSV_PATH = os.path.join(DATA_DIR, "patients_lepto_clean.csv")
CLINICS_DIR = "clinics"


# ── In-memory model cache ────────────────────────────────────────────────────

_state: dict = {}


def _bootstrap_from_csv():
    """Read leptospirosis CSV, encode all patients into quantum signatures, and save."""
    import pandas as pd

    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(
            f"Leptospirosis dataset not found at {CSV_PATH}. "
            "Place patients_lepto_clean.csv in the data/ directory."
        )

    df = pd.read_csv(CSV_PATH)

    signatures = {}
    labels = {}
    params = {}
    for _, row in df.iterrows():
        raw_dict = _row_to_raw_dict(row)
        condensed = condense_features(raw_dict)
        sig = get_quantum_signature(raw_dict)
        pid = row["patient_id"]
        signatures[pid] = signature_to_dict(sig)
        labels[pid] = int(row["diagnosis"])
        params[pid] = condensed.tolist()

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(SIGS_PATH, "w") as f:
        json.dump({"signatures": signatures, "labels": labels, "params": params}, f)

    return signatures, labels, params


def _row_to_raw_dict(row) -> dict:
    """Convert a CSV row (pandas Series) to the raw_dict condense_features expects."""
    return {
        "heart_rate": float(row.get("heart_rate", 72)),
        "bp_systolic": float(row.get("bp_systolic", 120)),
        "bp_diastolic": float(row.get("bp_diastolic", 80)),
        "age": float(row.get("age", 25)),
        "sex": str(row.get("sex", "M")),
        "wbc": float(row.get("wbc", 7000)),
        "platelets": float(row.get("platelets", 250000)),
        "fatigue": bool(int(row.get("fatigue", 0))),
        "muscle_weakness": bool(int(row.get("muscle_weakness", 0))),
        "weight_loss": bool(int(row.get("weight_loss", 0))),
        "seizures": bool(int(row.get("seizures", 0))),
        "dev_delay": bool(int(row.get("dev_delay", 0))),
        "headache": bool(int(row.get("headache", 0))),
        "chills": bool(int(row.get("chills", 0))),
        "rigors": bool(int(row.get("rigors", 0))),
        "nausea": bool(int(row.get("nausea", 0))),
        "diarrhoea": bool(int(row.get("diarrhoea", 0))),
        "cough": bool(int(row.get("cough", 0))),
        "bleeding": bool(int(row.get("bleeding", 0))),
        "prostration": bool(int(row.get("prostration", 0))),
        "oliguria": bool(int(row.get("oliguria", 0))),
        "anuria": bool(int(row.get("anuria", 0))),
        "conjunctival_suffusion": bool(int(row.get("conjunctival_suffusion", 0))),
        "muscle_tenderness": bool(int(row.get("muscle_tenderness", 0))),
    }


def _load_state():
    """Load signatures, labels, params, and pre-train the SVM on startup."""
    if not os.path.exists(SIGS_PATH):
        # Bootstrap: generate mock data and encode
        sigs, labs, par = _bootstrap_from_csv()
        _state["signatures"] = sigs
        _state["labels"] = labs
        _state["params"] = par
    else:
        with open(SIGS_PATH) as f:
            stored = json.load(f)
        _state["signatures"] = stored["signatures"]
        _state["labels"] = stored.get("labels", {})
        _state["params"] = stored.get("params", {})

    # Pre-train local SVM so predictions are instant
    sigs = _state["signatures"]
    labs = _state["labels"]
    if sigs and labs:
        X_train = np.array([np.abs(signature_from_dict(s)) for s in sigs.values()])
        y_train = np.array(list(labs.values()))
        model = SVC(kernel="linear", probability=True, C=1.0, random_state=42)
        model.fit(X_train, y_train)
        _state["model"] = model

    # Load global boundary if clinics have been federated
    _load_global_boundary()


def _load_global_boundary():
    """Load federated global boundary from clinic model files if available."""
    clinic_names = ["Clinic_A", "Clinic_B", "Clinic_C"]
    aggregator = FederatedAggregator(clinic_names)
    loaded = 0

    for clinic in clinic_names:
        model_path = os.path.join(CLINICS_DIR, clinic, "local_model.json")
        if os.path.exists(model_path):
            with open(model_path) as f:
                m = json.load(f)
            aggregator.accept_weights(
                clinic,
                np.array(m["coef"]),
                m["intercept"],
                m["n_samples"],
            )
            loaded += 1

    if loaded > 0:
        global_w, global_b = aggregator.compute_global_boundary()
        _state["global_weights"] = global_w
        _state["global_intercept"] = global_b


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_state()
    yield


# ── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="QuantumDx API",
    description="Privacy-first quantum diagnostic prediction API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://quantumdx.vercel.app", "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ────────────────────────────────────────────────

class PatientInput(BaseModel):
    heart_rate_bpm: float
    systolic_bp_mmHg: float
    diastolic_bp_mmHg: float = 80.0
    age_years: int = 25
    sex: Optional[str] = "M"
    wbc: float = 7000.0
    platelets: float = 250000.0
    fatigue: bool = False
    muscle_weakness: bool = False
    weight_loss: bool = False
    seizures: bool = False
    developmental_delay: bool = False
    headache: bool = False
    chills: bool = False
    rigors: bool = False
    nausea: bool = False
    diarrhoea: bool = False
    cough: bool = False
    bleeding: bool = False
    prostration: bool = False
    oliguria: bool = False
    anuria: bool = False
    conjunctival_suffusion: bool = False
    muscle_tenderness: bool = False


class PredictionResult(BaseModel):
    prediction: str
    anomaly_probability: float
    healthy_probability: float
    model_used: str
    quantum_signature_dim: int


class HealthResponse(BaseModel):
    status: str
    patients_loaded: int
    model_ready: bool
    global_boundary_available: bool


def _patient_to_raw_dict(patient: PatientInput) -> dict:
    """Map PatientInput fields to the dict keys condense_features expects."""
    return {
        "heart_rate": patient.heart_rate_bpm,
        "bp_systolic": patient.systolic_bp_mmHg,
        "bp_diastolic": patient.diastolic_bp_mmHg,
        "age": float(patient.age_years),
        "sex": patient.sex or "M",
        "wbc": patient.wbc,
        "platelets": patient.platelets,
        "fatigue": patient.fatigue,
        "muscle_weakness": patient.muscle_weakness,
        "weight_loss": patient.weight_loss,
        "seizures": patient.seizures,
        "dev_delay": patient.developmental_delay,
        "headache": patient.headache,
        "chills": patient.chills,
        "rigors": patient.rigors,
        "nausea": patient.nausea,
        "diarrhoea": patient.diarrhoea,
        "cough": patient.cough,
        "bleeding": patient.bleeding,
        "prostration": patient.prostration,
        "oliguria": patient.oliguria,
        "anuria": patient.anuria,
        "conjunctival_suffusion": patient.conjunctival_suffusion,
        "muscle_tenderness": patient.muscle_tenderness,
    }


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check if the API is ready and models are loaded."""
    return HealthResponse(
        status="ok",
        patients_loaded=len(_state.get("signatures", {})),
        model_ready="model" in _state,
        global_boundary_available="global_weights" in _state,
    )


@app.post("/predict", response_model=PredictionResult)
async def predict(patient: PatientInput):
    """
    Encode patient vitals into a quantum state via ZZFeatureMap
    and return a diagnostic prediction.
    """
    if "model" not in _state and "global_weights" not in _state:
        raise HTTPException(
            status_code=503,
            detail="No trained model available. Run the Streamlit app to encode patients first.",
        )

    try:
        # Quantum encode all patient features via 8-qubit condensation
        raw_dict = _patient_to_raw_dict(patient)
        sig = get_quantum_signature(raw_dict)
        feature_vec = np.abs(sig).reshape(1, -1)

        # Predict using global boundary if available, else local SVM
        if "global_weights" in _state:
            w = np.asarray(_state["global_weights"]).flatten()
            b = float(_state["global_intercept"])
            decision = float((feature_vec @ w + b).item())
            anomaly_prob = 1.0 / (1.0 + np.exp(-decision))
            healthy_prob = 1.0 - anomaly_prob
            prediction = "anomaly" if anomaly_prob > 0.5 else "healthy"
            model_used = "federated_global_boundary"
        else:
            model = _state["model"]
            proba = model.predict_proba(feature_vec)[0]
            pred = model.predict(feature_vec)[0]
            class_order = model.classes_
            healthy_prob = float(proba[class_order == 0][0]) if 0 in class_order else 0.0
            anomaly_prob = float(proba[class_order == 1][0]) if 1 in class_order else 0.0
            prediction = "anomaly" if pred == 1 else "healthy"
            model_used = "local_svm"

        return PredictionResult(
            prediction=prediction,
            anomaly_probability=round(anomaly_prob, 4),
            healthy_probability=round(healthy_prob, 4),
            model_used=model_used,
            quantum_signature_dim=len(sig),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/encode")
async def encode_vitals(patient: PatientInput):
    """
    Return the raw quantum signature for a patient (256-dim complex state vector).
    Useful for debugging or custom downstream processing.
    """
    raw_dict = _patient_to_raw_dict(patient)
    condensed = condense_features(raw_dict)
    sig = get_quantum_signature(raw_dict)
    return {
        "signature": signature_to_dict(sig),
        "condensed_params": condensed.tolist(),
        "num_qubits": NUM_QUBITS,
        "state_vector_dim": len(sig),
    }


@app.get("/patients")
async def list_patients():
    """List all encoded patient IDs and their labels."""
    sigs = _state.get("signatures", {})
    labs = _state.get("labels", {})
    return {
        "count": len(sigs),
        "patients": [
            {"patient_id": pid, "label": labs.get(pid)}
            for pid in sigs
        ],
    }


@app.post("/kernel")
async def compute_kernel_endpoint():
    """Compute and return the quantum fidelity kernel matrix for all stored patients."""
    params = _state.get("params", {})
    sigs = _state.get("signatures", {})

    if not sigs:
        raise HTTPException(status_code=503, detail="No patient signatures loaded.")

    pids = list(sigs.keys())

    if params:
        param_matrix = np.array(list(params.values()))
        K = compute_kernel_from_params(param_matrix)
    else:
        vectors = [signature_from_dict(s) for s in sigs.values()]
        K = compute_kernel_from_signatures(vectors)

    return {
        "patient_ids": pids,
        "kernel_matrix": K.tolist(),
        "size": K.shape[0],
    }
