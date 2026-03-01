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
CLINICS_DIR = "clinics"


# ── In-memory model cache ────────────────────────────────────────────────────

_state: dict = {}


def _load_state():
    """Load signatures, labels, params, and pre-train the SVM on startup."""
    if not os.path.exists(SIGS_PATH):
        return

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ────────────────────────────────────────────────

class PatientInput(BaseModel):
    heart_rate_bpm: float
    systolic_bp_mmHg: float
    diastolic_bp_mmHg: float = 80.0
    temperature_c: float
    oxygen_saturation_pct: float
    age_years: int = 25
    sex: Optional[str] = "M"
    height_cm: float = 170.0
    weight_kg: float = 70.0
    fatigue: bool = False
    weight_loss: bool = False
    seizures: bool = False
    developmental_delay: bool = False
    muscle_weakness: bool = False


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
        "temperature": patient.temperature_c,
        "spo2": patient.oxygen_saturation_pct,
        "age": float(patient.age_years),
        "sex": patient.sex or "M",
        "height": patient.height_cm,
        "weight": patient.weight_kg,
        "fatigue": patient.fatigue,
        "weight_loss": patient.weight_loss,
        "seizures": patient.seizures,
        "dev_delay": patient.developmental_delay,
        "muscle_weakness": patient.muscle_weakness,
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
