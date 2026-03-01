"""
quantum_engine.py — Privacy-First Quantum Diagnostic Engine
===========================================================
Encodes clinical features into quantum states via ZZFeatureMap,
computes quantum kernel matrices, and securely shreds raw data.
"""

import os
import json
import numpy as np
import pandas as pd
from qiskit.circuit.library import ZZFeatureMap
from qiskit.quantum_info import Statevector

try:
    from qiskit_machine_learning.kernels import FidelityQuantumKernel
    HAS_QML = True
except ImportError:
    HAS_QML = False


# ── Constants ───────────────────────────────────────────────────────────────

NUM_QUBITS = 4
FEATURE_COLS = ["heart_rate", "bp_systolic", "temperature", "spo2"]

# Known clinical ranges for deterministic normalization
CLINICAL_RANGES = {
    "heart_rate":  (40.0, 140.0),   # bpm
    "bp_systolic": (80.0, 200.0),   # mmHg
    "temperature": (35.0, 40.0),    # Celsius
    "spo2":        (85.0, 100.0),   # percent
}


# ── Feature Map ─────────────────────────────────────────────────────────────

def build_feature_map():
    """Construct a 4-qubit ZZFeatureMap with linear entanglement (depth=2)."""
    return ZZFeatureMap(feature_dimension=NUM_QUBITS, reps=2, entanglement="linear")


# ── Normalization ───────────────────────────────────────────────────────────

def normalize_features(raw):
    """
    Scale raw clinical values to [0, pi] using fixed clinical ranges.
    Accepts a single row (1-D) or a matrix (2-D).
    """
    raw = np.asarray(raw, dtype=np.float64)
    squeeze = raw.ndim == 1
    if squeeze:
        raw = raw.reshape(1, -1)

    normed = np.empty_like(raw)
    for i, (lo, hi) in enumerate(CLINICAL_RANGES.values()):
        normed[:, i] = (raw[:, i] - lo) / (hi - lo) * np.pi

    normed = np.clip(normed, 0.0, np.pi)
    return normed.squeeze() if squeeze else normed


# ── Quantum Signature ──────────────────────────────────────────────────────

def get_quantum_signature(data_row):
    """
    Encode 4 patient features into a quantum state via ZZFeatureMap
    and return the full complex state vector (length 2^4 = 16).

    Args:
        data_row: array-like of 4 clinical feature values.

    Returns:
        np.ndarray (complex128): Full quantum state vector.
    """
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


def compute_kernel_from_signatures(signatures):
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

def shred_data(filepath):
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

def generate_mock_dataset(filepath="data/patients.csv", n_patients=30):
    """
    Create a synthetic 30-patient CSV with 4 clinical features
    and a binary diagnosis label (0 = healthy, 1 = anomaly).

    Healthy patients have normal vitals; anomalous patients show
    elevated heart rate / blood pressure and reduced SpO2.
    """
    rng = np.random.default_rng(42)
    n_h = int(n_patients * 0.6)   # 18 healthy
    n_a = n_patients - n_h        # 12 anomaly

    data = pd.DataFrame({
        "patient_id":  [f"P{i+1:03d}" for i in range(n_patients)],
        "heart_rate":  np.concatenate([rng.normal(72, 8, n_h),   rng.normal(95, 15, n_a)]),
        "bp_systolic": np.concatenate([rng.normal(118, 10, n_h), rng.normal(145, 18, n_a)]),
        "temperature": np.concatenate([rng.normal(36.8, 0.3, n_h), rng.normal(38.2, 0.6, n_a)]),
        "spo2":        np.concatenate([rng.normal(97.5, 1.0, n_h), rng.normal(93.0, 2.5, n_a)]),
        "diagnosis":   [0] * n_h + [1] * n_a,
    }).sample(frac=1, random_state=42).reset_index(drop=True)

    os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
    data.to_csv(filepath, index=False)
    return data


# ── Serialization Helpers (complex state vectors <-> JSON) ─────────────────

def signature_to_dict(sig):
    """Convert a complex state vector to a JSON-serializable dict."""
    return {"re": np.real(sig).tolist(), "im": np.imag(sig).tolist()}


def signature_from_dict(d):
    """Reconstruct a complex state vector from its dict representation."""
    return np.array(d["re"]) + 1j * np.array(d["im"])
