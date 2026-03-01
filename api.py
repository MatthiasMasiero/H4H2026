"""
api.py — FastAPI backend for Quantum Diagnostic predictions
============================================================
Run with:  uvicorn api:app --reload --port 8000

Docs at:   http://localhost:8000/docs
"""

import os
import json
import threading
import numpy as np
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import math

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
    bootstrap_svm_from_csv,
    predict_quantum_svm,
    save_quantum_svm,
    load_quantum_svm,
    NUM_QUBITS_16,
)
from aggregator import FederatedAggregator


# ── Paths ────────────────────────────────────────────────────────────────────

DATA_DIR = "data"
SIGS_PATH = os.path.join(DATA_DIR, "signatures.json")
CSV_PATH = os.path.join(DATA_DIR, "patients_lepto_clean.csv")
CLINICS_DIR = "clinics"
SVM_MODEL_PATH = os.path.join(DATA_DIR, "quantum_svm_model.npz")
SVM_N_SAMPLES = 30


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
        "fever": bool(int(row.get("fever", 0))),
        "muscle_pain": bool(int(row.get("muscle_pain", 0))),
        "jaundice": bool(int(row.get("jaundice", 0))),
        "vomiting": bool(int(row.get("vomiting", 0))),
        "confusion": bool(int(row.get("confusion", 0))),
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
    """Load signatures, labels, params, and quantum SVM on startup."""
    if not os.path.exists(SIGS_PATH):
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

    # Load or train 16-qubit quantum SVM in background (non-blocking)
    # Server starts immediately with fallback scoring; SVM becomes available once ready.
    def _bootstrap_svm():
        try:
            if os.path.exists(SVM_MODEL_PATH):
                _state["svm_model"] = load_quantum_svm(SVM_MODEL_PATH)
            elif os.path.exists(CSV_PATH):
                model = bootstrap_svm_from_csv(CSV_PATH, n_samples=SVM_N_SAMPLES)
                os.makedirs(DATA_DIR, exist_ok=True)
                save_quantum_svm(model, SVM_MODEL_PATH)
                _state["svm_model"] = model
        except Exception:
            pass  # Server works without SVM (falls back to risk score)

    threading.Thread(target=_bootstrap_svm, daemon=True).start()

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
    fever: bool = False
    muscle_pain: bool = False
    jaundice: bool = False
    vomiting: bool = False
    confusion: bool = False
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
        "fever": patient.fever,
        "muscle_pain": patient.muscle_pain,
        "jaundice": patient.jaundice,
        "vomiting": patient.vomiting,
        "confusion": patient.confusion,
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
    try:
        raw_dict = _patient_to_raw_dict(patient)

        svm_model = _state.get("svm_model")
        if svm_model is not None:
            anomaly_prob = predict_quantum_svm(raw_dict, svm_model)
            healthy_prob = 1.0 - anomaly_prob
            prediction = "anomaly" if anomaly_prob > 0.5 else "healthy"
            model_used = "quantum_kernel_svm_16q"
            sig_dim = 2 ** NUM_QUBITS_16
        else:
            # Fallback to old mean/pi scoring
            condensed = condense_features(raw_dict)
            sig = get_quantum_signature(raw_dict)
            anomaly_prob = float(condensed.mean() / math.pi)
            healthy_prob = 1.0 - anomaly_prob
            prediction = "anomaly" if anomaly_prob > 0.5 else "healthy"
            model_used = "quantum_risk_score"
            sig_dim = len(sig)

        return PredictionResult(
            prediction=prediction,
            anomaly_probability=round(anomaly_prob, 4),
            healthy_probability=round(healthy_prob, 4),
            model_used=model_used,
            quantum_signature_dim=sig_dim,
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
