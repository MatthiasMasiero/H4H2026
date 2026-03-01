"""
quantum_engine.py — Privacy-First Quantum Diagnostic Engine
===========================================================
Encodes clinical features into quantum states via ZZFeatureMap,
computes quantum kernel matrices, and securely shreds raw data.
"""

import os
import json
import numpy as np
from qiskit.circuit.library import ZZFeatureMap
from qiskit.quantum_info import Statevector

try:
    from qiskit_machine_learning.kernels import FidelityQuantumKernel
    HAS_QML = True
except ImportError:
    HAS_QML = False


# ── Constants ───────────────────────────────────────────────────────────────

NUM_QUBITS = 8
FEATURE_COLS = [
    "cardiac", "vascular", "respiratory", "metabolic",
    "body_comp", "neurological", "musculoskeletal", "demographics",
]

# Ranges for the 8 condensed composite features (all map to [0, pi])
CLINICAL_RANGES = {
    "cardiac":         (0.0, np.pi),
    "vascular":        (0.0, np.pi),
    "respiratory":     (0.0, np.pi),
    "metabolic":       (0.0, np.pi),
    "body_comp":       (0.0, np.pi),
    "neurological":    (0.0, np.pi),
    "musculoskeletal": (0.0, np.pi),
    "demographics":    (0.0, np.pi),
}

# Raw clinical ranges for individual features before condensation
RAW_CLINICAL_RANGES = {
    "heart_rate":   (40.0, 140.0),    # bpm
    "bp_systolic":  (80.0, 200.0),    # mmHg
    "bp_diastolic": (40.0, 130.0),    # mmHg
    "temperature":  (35.0, 40.0),     # Celsius
    "spo2":         (85.0, 100.0),    # percent
    "age":          (0.0, 100.0),     # years
    "height":       (40.0, 200.0),    # cm
    "weight":       (2.0, 150.0),     # kg
    "bmi":          (10.0, 50.0),     # kg/m^2
}


# ── Feature Map ─────────────────────────────────────────────────────────────

def build_feature_map():
    """Construct an 8-qubit ZZFeatureMap with linear entanglement (depth=2)."""
    return ZZFeatureMap(feature_dimension=NUM_QUBITS, reps=2, entanglement="linear")


# ── Feature Condensation ───────────────────────────────────────────────────

def _normalize_raw(value, feature_name):
    """Normalize a single raw clinical value to [0, pi] using RAW_CLINICAL_RANGES."""
    lo, hi = RAW_CLINICAL_RANGES[feature_name]
    return np.clip((value - lo) / (hi - lo) * np.pi, 0.0, np.pi)


def condense_features(raw_dict) -> np.ndarray:
    """
    Condense 14 raw patient features into 8 composite features for 8-qubit encoding.

    Args:
        raw_dict: dict with keys like 'heart_rate', 'bp_systolic', 'temperature',
                  'spo2', 'bp_diastolic', 'age', 'sex', 'height', 'weight',
                  'fatigue', 'weight_loss', 'seizures', 'dev_delay', 'muscle_weakness'.
                  Missing keys use sensible clinical defaults.

    Returns:
        np.ndarray of shape (8,) with values in [0, pi].
    """
    # Extract with defaults
    hr = float(raw_dict.get("heart_rate", 72.0))
    sbp = float(raw_dict.get("bp_systolic", 120.0))
    dbp = float(raw_dict.get("bp_diastolic", 80.0))
    temp = float(raw_dict.get("temperature", 37.0))
    spo2 = float(raw_dict.get("spo2", 97.0))
    age = float(raw_dict.get("age", 25.0))
    sex_raw = raw_dict.get("sex", "M")
    sex = 1.0 if str(sex_raw).upper() in ("F", "FEMALE") else 0.0
    height = float(raw_dict.get("height", 170.0))
    weight = float(raw_dict.get("weight", 70.0))
    fatigue = 1.0 if raw_dict.get("fatigue", False) else 0.0
    weight_loss = 1.0 if raw_dict.get("weight_loss", False) else 0.0
    seizures = 1.0 if raw_dict.get("seizures", False) else 0.0
    dev_delay = 1.0 if raw_dict.get("dev_delay", False) else 0.0
    muscle_weakness = 1.0 if raw_dict.get("muscle_weakness", False) else 0.0

    # Compute BMI
    height_m = max(height / 100.0, 0.01)
    bmi = weight / (height_m ** 2)

    # Build 8 composite features
    condensed = np.array([
        0.5 * _normalize_raw(hr, "heart_rate") + 0.5 * _normalize_raw(sbp, "bp_systolic"),       # cardiac
        _normalize_raw(dbp, "bp_diastolic"),                                                       # vascular
        _normalize_raw(spo2, "spo2"),                                                              # respiratory
        0.7 * _normalize_raw(temp, "temperature") + 0.3 * (weight_loss * np.pi),                   # metabolic
        _normalize_raw(bmi, "bmi"),                                                                # body_comp
        0.5 * (seizures * np.pi) + 0.5 * (dev_delay * np.pi),                                     # neurological
        0.5 * (muscle_weakness * np.pi) + 0.5 * (fatigue * np.pi),                                 # musculoskeletal
        0.7 * _normalize_raw(age, "age") + 0.3 * (sex * np.pi),                                   # demographics
    ], dtype=np.float64)

    return np.clip(condensed, 0.0, np.pi)


# ── Normalization ───────────────────────────────────────────────────────────

def normalize_features(raw) -> list[float]:
    """
    Clip condensed feature values to [0, pi].
    Accepts a single row (1-D) or a matrix (2-D).
    Values are expected to already be in [0, pi] from condense_features().
    """
    raw = np.asarray(raw, dtype=np.float64)
    return np.clip(raw, 0.0, np.pi)


# ── Quantum Signature ──────────────────────────────────────────────────────

def get_quantum_signature(data_row) -> Statevector:
    """
    Encode patient features into a quantum state via ZZFeatureMap
    and return the full complex state vector (length 2^8 = 256).

    Args:
        data_row: dict of raw patient features (calls condense_features)
                  OR array-like of 8 pre-condensed values in [0, pi].

    Returns:
        np.ndarray (complex128): Full quantum state vector.
    """
    if isinstance(data_row, dict):
        features = condense_features(data_row)
    else:
        features = np.asarray(data_row, dtype=np.float64)[:NUM_QUBITS]
    normed = normalize_features(features)

    circuit = build_feature_map().assign_parameters(normed)
    sv = Statevector.from_instruction(circuit)
    return sv.data  # complex-valued state vector


# ── Quantum Kernel ──────────────────────────────────────────────────────────

def compute_kernel(data_matrix):
    """
    Build a quantum kernel matrix from raw feature rows using
    FidelityQuantumKernel (statevector / AerSimulator-equivalent simulation).

    Falls back to manual fidelity computation when
    qiskit-machine-learning is unavailable.

    Args:
        data_matrix: np.array (n_samples, 4) of raw clinical features.

    Returns:
        np.ndarray (n, n): Kernel / similarity matrix.
    """
    normed = normalize_features(np.asarray(data_matrix)[:, :NUM_QUBITS])

    if HAS_QML:
        qkernel = FidelityQuantumKernel(feature_map=build_feature_map())
        return qkernel.evaluate(x_vec=normed)

    # Manual fallback — circuit-by-circuit statevector simulation
    sigs = []
    for row in normed:
        qc = build_feature_map().assign_parameters(row)
        sigs.append(Statevector.from_instruction(qc).data)
    return compute_kernel_from_signatures(sigs)


def compute_kernel_from_params(param_matrix):
    """
    Build a quantum kernel matrix from pre-normalized circuit parameters.
    Simulates actual quantum circuits pair-by-pair via Qiskit.

    Args:
        param_matrix: np.array (n_samples, 4) of already-normalized [0, pi] values.

    Returns:
        np.ndarray (n, n): Kernel / similarity matrix.
    """
    normed = np.asarray(param_matrix, dtype=np.float64)[:, :NUM_QUBITS]

    if HAS_QML:
        qkernel = FidelityQuantumKernel(feature_map=build_feature_map())
        return qkernel.evaluate(x_vec=normed)

    # Manual fallback — circuit-by-circuit statevector simulation
    sigs = []
    for row in normed:
        qc = build_feature_map().assign_parameters(row)
        sigs.append(Statevector.from_instruction(qc).data)
    return compute_kernel_from_signatures(sigs)


def compute_kernel_from_signatures(signatures) -> np.ndarray:
    """
    Compute the fidelity kernel from pre-computed state vectors.
    Fidelity: F(psi, phi) = |<psi|phi>|^2

    Args:
        signatures: list of complex np.ndarrays (state vectors).

    Returns:
        np.ndarray (n, n): Symmetric kernel matrix.
    """
    sigs = [np.asarray(s, dtype=np.complex128) for s in signatures]
    n = len(sigs)
    K = np.empty((n, n))
    for i in range(n):
        for j in range(i, n):
            fid = np.abs(np.vdot(sigs[i], sigs[j])) ** 2
            K[i, j] = K[j, i] = fid
    return K


# ── Secure Shredding ───────────────────────────────────────────────────────

def shred_data(filepath) -> None:
    """
    Securely delete a file with a 3-pass random overwrite
    (inspired by DoD 5220.22-M) before unlinking.

    Returns True on success, False if the file did not exist.
    """
    if not os.path.isfile(filepath):
        return False

    size = os.path.getsize(filepath)
    with open(filepath, "r+b") as f:
        for _ in range(3):
            f.seek(0)
            f.write(os.urandom(max(size, 1)))
            f.flush()
            os.fsync(f.fileno())

    os.remove(filepath)
    return True


# ── Mock Data Generator ────────────────────────────────────────────────────

def generate_mock_dataset(filepath="data/patients.csv", n_patients=30) -> "pd.DataFrame":
    """
    Create a synthetic 30-patient CSV with all 14 clinical features
    and a binary diagnosis label (0 = healthy, 1 = anomaly).

    Healthy patients have normal vitals; anomalous patients show
    elevated heart rate / blood pressure, reduced SpO2, and more symptoms.
    """
    import pandas as pd

    rng = np.random.default_rng(42)
    n_h = int(n_patients * 0.6)   # 18 healthy
    n_a = n_patients - n_h        # 12 anomaly

    data = pd.DataFrame({
        "patient_id":    [f"P{i+1:03d}" for i in range(n_patients)],
        "heart_rate":    np.concatenate([rng.normal(72, 8, n_h),   rng.normal(95, 15, n_a)]),
        "bp_systolic":   np.concatenate([rng.normal(118, 10, n_h), rng.normal(145, 18, n_a)]),
        "bp_diastolic":  np.concatenate([rng.normal(78, 8, n_h),   rng.normal(95, 12, n_a)]),
        "temperature":   np.concatenate([rng.normal(36.8, 0.3, n_h), rng.normal(38.2, 0.6, n_a)]),
        "spo2":          np.concatenate([rng.normal(97.5, 1.0, n_h), rng.normal(93.0, 2.5, n_a)]),
        "age":           np.concatenate([rng.integers(5, 60, n_h), rng.integers(10, 70, n_a)]).astype(float),
        "sex":           rng.choice(["M", "F"], n_patients).tolist(),
        "height":        np.concatenate([rng.normal(160, 20, n_h), rng.normal(155, 25, n_a)]),
        "weight":        np.concatenate([rng.normal(65, 12, n_h),  rng.normal(60, 15, n_a)]),
        "fatigue":       np.concatenate([rng.choice([0, 1], n_h, p=[0.9, 0.1]),
                                         rng.choice([0, 1], n_a, p=[0.4, 0.6])]),
        "weight_loss":   np.concatenate([rng.choice([0, 1], n_h, p=[0.95, 0.05]),
                                         rng.choice([0, 1], n_a, p=[0.5, 0.5])]),
        "seizures":      np.concatenate([rng.choice([0, 1], n_h, p=[0.98, 0.02]),
                                         rng.choice([0, 1], n_a, p=[0.7, 0.3])]),
        "dev_delay":     np.concatenate([rng.choice([0, 1], n_h, p=[0.97, 0.03]),
                                         rng.choice([0, 1], n_a, p=[0.75, 0.25])]),
        "muscle_weakness": np.concatenate([rng.choice([0, 1], n_h, p=[0.92, 0.08]),
                                           rng.choice([0, 1], n_a, p=[0.45, 0.55])]),
        "diagnosis":     [0] * n_h + [1] * n_a,
    }).sample(frac=1, random_state=42).reset_index(drop=True)

    os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
    data.to_csv(filepath, index=False)
    return data


# ── Serialization Helpers (complex state vectors <-> JSON) ─────────────────

def signature_to_dict(sig) -> dict:
    """Convert a complex state vector to a JSON-serializable dict."""
    return {"re": np.real(sig).tolist(), "im": np.imag(sig).tolist()}


def signature_from_dict(d) -> Statevector:
    """Reconstruct a complex state vector from its dict representation."""
    return np.array(d["re"]) + 1j * np.array(d["im"])
