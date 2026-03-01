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
                  diarrhea, cough, bleeding, prostration, oliguria, anuria,
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
    diarrhea    = _bin("diarrhea")
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
        (nausea + vomiting + diarrhea + cough) / 4.0 * np.pi,
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


# ── Quantum Kernel SVM ─────────────────────────────────────────────────────

def train_quantum_svm(patient_label_pairs):
    """
    Train a quantum kernel SVM on patient data.

    Args:
        patient_label_pairs: list of (raw_dict, label) tuples.
            raw_dict: patient features dict.
            label: 0 (healthy) or 1 (positive).

    Returns:
        dict with keys:
            train_statevectors: list of complex statevectors for all training patients
            train_params: (n_train, 16) encoded params
            train_labels: (n_train,) labels
            n_train: int
            svc: fitted sklearn SVC with precomputed kernel
    """
    from sklearn.svm import SVC

    n = len(patient_label_pairs)
    params_list = []
    statevectors = []
    labels = []

    for raw_dict, label in patient_label_pairs:
        enc = encode_16q(raw_dict)
        params_list.append(enc)
        sv = get_quantum_signature_16q(enc)
        statevectors.append(sv)
        labels.append(label)

    params_matrix = np.array(params_list)
    labels_arr = np.array(labels)

    # Compute fidelity kernel matrix
    K = np.empty((n, n))
    for i in range(n):
        for j in range(i, n):
            fid = np.abs(np.vdot(statevectors[i], statevectors[j])) ** 2
            K[i, j] = K[j, i] = fid

    # Train SVM with precomputed kernel
    svc = SVC(kernel="precomputed", probability=True)
    svc.fit(K, labels_arr)

    return {
        "train_statevectors": statevectors,
        "train_params": params_matrix,
        "train_labels": labels_arr,
        "n_train": n,
        "svc": svc,
    }


def predict_quantum_svm(raw_dict, model):
    """
    Predict anomaly probability for a patient using quantum fidelity kernel.

    Computes mean fidelity to healthy and sick training clusters, then
    derives probability from the ratio. This bypasses SVC's Platt scaling
    which compresses probabilities toward 0.5 with small training sets.

    Args:
        raw_dict: patient features dict.
        model: dict returned by train_quantum_svm().

    Returns:
        float: anomaly probability in [0, 1].
    """
    enc = encode_16q(raw_dict)
    new_sv = get_quantum_signature_16q(enc)

    train_svs = model["train_statevectors"]
    train_labels = model["train_labels"]

    # Compute fidelity to each training sample
    fidelities = np.array([
        np.abs(np.vdot(new_sv, sv)) ** 2 for sv in train_svs
    ])

    # Mean fidelity to healthy (label=0) and sick (label=1) clusters
    healthy_mask = train_labels == 0
    sick_mask = train_labels == 1

    mean_fid_healthy = fidelities[healthy_mask].mean() if healthy_mask.any() else 0.0
    mean_fid_sick = fidelities[sick_mask].mean() if sick_mask.any() else 0.0

    # Anomaly probability from relative similarity to sick cluster
    # Laplace-style smoothing (ε) prevents collapsing to exactly 0% or 100%
    # eps must scale with fidelity magnitudes (which are ~1e-5 in 65536-dim space)
    eps = 0.02 * max(mean_fid_healthy, mean_fid_sick, 1e-15)
    total = mean_fid_healthy + mean_fid_sick + 2 * eps
    if total < 1e-12:
        return 0.5
    return float((mean_fid_sick + eps) / total)


# ── Save / Load Quantum SVM ────────────────────────────────────────────────

def save_quantum_svm(model, path):
    """Save quantum SVM training data to disk (params + labels only, numpy format)."""
    np.savez_compressed(
        path,
        train_params=model["train_params"],
        train_labels=model["train_labels"],
    )


def load_quantum_svm(path):
    """
    Load saved quantum SVM training data and retrain.
    Recomputes statevectors from saved params and retrains the SVM
    on the fidelity kernel matrix.
    """
    from sklearn.svm import SVC

    data = np.load(path)
    train_params = data["train_params"]
    train_labels = data["train_labels"]
    n = len(train_params)

    # Recompute statevectors
    statevectors = []
    for row in train_params:
        sv = get_quantum_signature_16q(row)
        statevectors.append(sv)

    # Recompute kernel matrix
    K = np.empty((n, n))
    for i in range(n):
        for j in range(i, n):
            fid = np.abs(np.vdot(statevectors[i], statevectors[j])) ** 2
            K[i, j] = K[j, i] = fid

    # Retrain SVM (instant on precomputed kernel)
    svc = SVC(kernel="precomputed", probability=True)
    svc.fit(K, train_labels)

    return {
        "train_statevectors": statevectors,
        "train_params": train_params,
        "train_labels": train_labels,
        "n_train": n,
        "svc": svc,
    }


# ── Serialization Helpers (complex state vectors <-> JSON) ─────────────────

def signature_to_dict(sig) -> dict:
    """Convert a complex state vector to a JSON-serializable dict."""
    return {"re": np.real(sig).tolist(), "im": np.imag(sig).tolist()}


def signature_from_dict(d) -> Statevector:
    """Reconstruct a complex state vector from its dict representation."""
    return np.array(d["re"]) + 1j * np.array(d["im"])


# ── Reference Bootstrap ────────────────────────────────────────────────────

def bootstrap_svm_reference(n_healthy=15, n_sick=15, random_state=42):
    """
    Generate reference patients with clear class separation
    and train a quantum kernel SVM.

    Reference patients span the clinical spectrum based on leptospirosis
    literature so the SVM learns the clinical weight structure.

    Args:
        n_healthy: number of healthy reference patients.
        n_sick: number of sick reference patients.
        random_state: random seed for reproducibility.

    Returns:
        dict: trained model (same format as train_quantum_svm).
    """
    rng = np.random.RandomState(random_state)
    pairs = []

    symptom_keys = list(CLINICAL_WEIGHTS_16Q.keys())

    # ── Healthy patients: normal vitals, few or no symptoms ──
    for _ in range(n_healthy):
        raw = {
            "heart_rate": rng.uniform(60, 85),
            "bp_systolic": rng.uniform(110, 135),
            "bp_diastolic": rng.uniform(68, 85),
            "wbc": rng.uniform(4000, 10000),
            "platelets": rng.uniform(150000, 400000),
            "age": rng.uniform(18, 55),
            "sex": rng.choice(["M", "F"]),
        }
        # At most 1 mild symptom (headache or fever with low probability)
        for sym in symptom_keys:
            raw[sym] = False
        if rng.random() < 0.3:
            raw[rng.choice(["headache", "fever"])] = True
        pairs.append((raw, 0))

    # ── Sick patients: abnormal vitals, multiple weighted symptoms ──
    for i in range(n_sick):
        raw = {
            "heart_rate": rng.uniform(95, 130),
            "bp_systolic": rng.uniform(80, 105),
            "bp_diastolic": rng.uniform(48, 65),
            "wbc": rng.uniform(14000, 30000),
            "platelets": rng.uniform(15000, 80000),
            "age": rng.uniform(25, 70),
            "sex": rng.choice(["M", "F"]),
        }
        # Activate symptoms based on severity tier
        # More severe patients get more (and higher-weight) symptoms
        severity = (i + 1) / n_sick  # 0.1 to 1.0
        for sym in symptom_keys:
            weight = CLINICAL_WEIGHTS_16Q[sym]
            # Higher-weight symptoms more likely, scaled by severity
            prob = weight * severity
            raw[sym] = rng.random() < prob
        # Ensure at least 2 symptoms are active for every sick patient
        active = [s for s in symptom_keys if raw[s]]
        while len(active) < 2:
            sym = rng.choice(symptom_keys)
            raw[sym] = True
            active.append(sym)
        pairs.append((raw, 1))

    return train_quantum_svm(pairs)


# ── CSV Bootstrap ─────────────────────────────────────────────────────────

def bootstrap_svm_from_csv(csv_path, n_samples=75, random_state=42):
    """
    Load leptospirosis CSV, take a stratified sample, train quantum SVM.

    Args:
        csv_path: path to patients_lepto_clean.csv
        n_samples: number of patients to sample (stratified by diagnosis)
        random_state: random seed for reproducibility

    Returns:
        dict: trained model (same format as train_quantum_svm)
    """
    import pandas as pd

    df = pd.read_csv(csv_path)

    if len(df) > n_samples:
        from sklearn.model_selection import train_test_split
        df_sample, _ = train_test_split(
            df, train_size=n_samples, stratify=df["diagnosis"],
            random_state=random_state,
        )
    else:
        df_sample = df

    pairs = []
    for _, row in df_sample.iterrows():
        raw_dict = {
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
            "diarrhea": bool(int(row.get("diarrhea", 0))),
            "cough": bool(int(row.get("cough", 0))),
            "bleeding": bool(int(row.get("bleeding", 0))),
            "prostration": bool(int(row.get("prostration", 0))),
            "oliguria": bool(int(row.get("oliguria", 0))),
            "anuria": bool(int(row.get("anuria", 0))),
            "conjunctival_suffusion": bool(int(row.get("conjunctival_suffusion", 0))),
            "muscle_tenderness": bool(int(row.get("muscle_tenderness", 0))),
        }
        pairs.append((raw_dict, int(row["diagnosis"])))

    return train_quantum_svm(pairs)
