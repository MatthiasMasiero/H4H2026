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
    "cardiac", "vascular", "hematologic", "organ_damage",
    "systemic", "gi_respiratory", "musculoskeletal", "demographics",
]

# Ranges for the 8 condensed composite features (all map to [0, pi])
CLINICAL_RANGES = {
    "cardiac":         (0.0, np.pi),
    "vascular":        (0.0, np.pi),
    "hematologic":     (0.0, np.pi),
    "organ_damage":    (0.0, np.pi),
    "systemic":        (0.0, np.pi),
    "gi_respiratory":  (0.0, np.pi),
    "musculoskeletal": (0.0, np.pi),
    "demographics":    (0.0, np.pi),
}

# Raw clinical ranges for individual features before condensation
RAW_CLINICAL_RANGES = {
    "heart_rate":   (40.0, 140.0),    # bpm
    "bp_systolic":  (80.0, 200.0),    # mmHg
    "bp_diastolic": (40.0, 130.0),    # mmHg
    "age":          (0.0, 100.0),     # years
    "wbc":          (500.0, 35000.0), # cells/uL
    "platelets":    (5000.0, 1000000.0),  # cells/uL
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
    Condense 24 raw leptospirosis patient features into 8 composite features
    for 8-qubit encoding.

    Args:
        raw_dict: dict with keys: heart_rate, bp_systolic, bp_diastolic, age, sex,
                  wbc, platelets, and 17 binary symptoms (fever, jaundice,
                  vomiting, confusion, muscle_pain, headache, chills, rigors, nausea,
                  diarrhoea, cough, bleeding, prostration, oliguria, anuria,
                  conjunctival_suffusion, muscle_tenderness).
                  Missing keys use sensible clinical defaults.

    Returns:
        np.ndarray of shape (8,) with values in [0, pi].
    """
    # Extract continuous features with defaults
    hr = float(raw_dict.get("heart_rate", 72.0))
    sbp = float(raw_dict.get("bp_systolic", 120.0))
    dbp = float(raw_dict.get("bp_diastolic", 80.0))
    age = float(raw_dict.get("age", 25.0))
    wbc = float(raw_dict.get("wbc", 7000.0))
    platelets = float(raw_dict.get("platelets", 250000.0))

    sex_raw = raw_dict.get("sex", "M")
    sex = 1.0 if str(sex_raw).upper() in ("F", "FEMALE") else 0.0

    # Extract binary symptoms (0.0 or 1.0)
    def _bin(key):
        return 1.0 if raw_dict.get(key, False) else 0.0

    jaundice     = _bin("jaundice")
    muscle_pain  = _bin("muscle_pain")
    oliguria     = _bin("oliguria")
    anuria       = _bin("anuria")
    fever        = _bin("fever")
    chills       = _bin("chills")
    rigors       = _bin("rigors")
    conj_suff    = _bin("conjunctival_suffusion")
    nausea       = _bin("nausea")
    vomiting     = _bin("vomiting")
    diarrhoea    = _bin("diarrhoea")
    cough        = _bin("cough")
    muscle_tend  = _bin("muscle_tenderness")
    prostration  = _bin("prostration")
    headache     = _bin("headache")
    bleeding     = _bin("bleeding")

    # Build 8 composite features
    condensed = np.array([
        # Q0: cardiac
        0.6 * _normalize_raw(hr, "heart_rate") + 0.4 * _normalize_raw(sbp, "bp_systolic"),
        # Q1: vascular (platelets inverted — low platelets = disease)
        0.6 * _normalize_raw(dbp, "bp_diastolic") + 0.4 * (np.pi - _normalize_raw(platelets, "platelets")),
        # Q2: hematologic
        _normalize_raw(wbc, "wbc"),
        # Q3: organ_damage
        (jaundice + oliguria + anuria) / 3.0 * np.pi,
        # Q4: systemic
        (fever + chills + rigors + conj_suff) / 4.0 * np.pi,
        # Q5: gi_respiratory
        (nausea + vomiting + diarrhoea + cough) / 4.0 * np.pi,
        # Q6: musculoskeletal
        (muscle_pain + muscle_tend + prostration + headache) / 4.0 * np.pi,
        # Q7: demographics
        0.6 * _normalize_raw(age, "age") + 0.2 * (sex * np.pi) + 0.2 * (bleeding * np.pi),
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


# ── Serialization Helpers (complex state vectors <-> JSON) ─────────────────

# ── 16-Qubit Constants ─────────────────────────────────────────────────────

NUM_QUBITS_16 = 16

# Clinical weights for binary symptoms (leptospirosis literature)
CLINICAL_WEIGHTS_16Q = {
    "jaundice":                0.95,  # Pathognomonic for Weil's disease
    "oliguria":                0.90,  # Renal involvement, severe
    "conjunctival_suffusion":  0.85,  # Classic leptospirosis sign
    "bleeding":                0.80,  # Hemorrhagic complications
    "anuria":                  0.85,  # Severe renal failure
    "fever":                   0.70,  # Universal but not specific
    "muscle_pain":             0.75,  # Classic calf pain presentation
    "vomiting":                0.60,  # GI involvement
    "headache":                0.50,  # Common, least specific
}

SELECTED_SYMPTOMS_16Q = list(CLINICAL_WEIGHTS_16Q.keys())

FEATURE_COLS_16Q = [
    "heart_rate", "bp_systolic", "bp_diastolic", "wbc",
    "platelets_inv", "age", "sex",
    "jaundice", "oliguria", "conjunctival_suffusion",
    "bleeding", "anuria", "fever", "muscle_pain", "vomiting", "headache",
]


def build_feature_map_16q():
    """Construct a 16-qubit ZZFeatureMap with linear entanglement (depth=2)."""
    return ZZFeatureMap(feature_dimension=NUM_QUBITS_16, reps=2, entanglement="linear")


def encode_16q(raw_dict) -> np.ndarray:
    """
    Encode 16 clinical features individually for 16-qubit quantum circuit.
    No condensation — each feature gets its own qubit.

    Qubits 0-5: continuous vitals normalized to [0, pi]
    Qubit 6: sex (F -> pi, M -> 0)
    Qubits 7-15: 9 key symptoms with clinical weights (0 or weight * pi)

    Returns:
        np.ndarray of shape (16,) with values in [0, pi].
    """
    hr = float(raw_dict.get("heart_rate", 72.0))
    sbp = float(raw_dict.get("bp_systolic", 120.0))
    dbp = float(raw_dict.get("bp_diastolic", 80.0))
    wbc = float(raw_dict.get("wbc", 7000.0))
    platelets = float(raw_dict.get("platelets", 250000.0))
    age = float(raw_dict.get("age", 25.0))

    sex_raw = raw_dict.get("sex", "M")
    sex_val = np.pi if str(sex_raw).upper() in ("F", "FEMALE") else 0.0

    encoded = np.array([
        _normalize_raw(hr, "heart_rate"),                    # Q0
        _normalize_raw(sbp, "bp_systolic"),                  # Q1
        _normalize_raw(dbp, "bp_diastolic"),                 # Q2
        _normalize_raw(wbc, "wbc"),                          # Q3
        np.pi - _normalize_raw(platelets, "platelets"),      # Q4: inverted
        _normalize_raw(age, "age"),                          # Q5
        sex_val,                                             # Q6
    ] + [
        CLINICAL_WEIGHTS_16Q[sym] * np.pi
        if raw_dict.get(sym, False) else 0.0
        for sym in SELECTED_SYMPTOMS_16Q                     # Q7-Q15
    ], dtype=np.float64)

    return np.clip(encoded, 0.0, np.pi)


def get_quantum_signature_16q(data_row) -> np.ndarray:
    """
    Encode patient features into a 16-qubit quantum state via ZZFeatureMap
    and return the full complex state vector (length 2^16 = 65536).
    """
    if isinstance(data_row, dict):
        features = encode_16q(data_row)
    else:
        features = np.asarray(data_row, dtype=np.float64)[:NUM_QUBITS_16]
    normed = np.clip(features, 0.0, np.pi)

    circuit = build_feature_map_16q().assign_parameters(normed)
    sv = Statevector.from_instruction(circuit)
    return sv.data


# ── Serialization Helpers (complex state vectors <-> JSON) ─────────────────

def signature_to_dict(sig) -> dict:
    """Convert a complex state vector to a JSON-serializable dict."""
    return {"re": np.real(sig).tolist(), "im": np.imag(sig).tolist()}


def signature_from_dict(d) -> Statevector:
    """Reconstruct a complex state vector from its dict representation."""
    return np.array(d["re"]) + 1j * np.array(d["im"])
