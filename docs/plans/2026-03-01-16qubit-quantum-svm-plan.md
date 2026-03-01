# 16-Qubit Quantum Kernel SVM Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the uniform `mean(condensed)/pi` prediction with a 16-qubit quantum kernel SVM that uses actual quantum statevector fidelities and clinically weighted feature encoding.

**Architecture:** Expand quantum engine from 8 to 16 qubits. Encode 16 clinical features individually (no condensation) with literature-based leptospirosis weights. Train an SVM on the precomputed quantum fidelity kernel of 75 stratified patients. Prediction computes fidelity of a new patient against all 75 training statevectors, then applies the SVM decision function. The 8-qubit path stays intact for `/encode` and Streamlit.

**Tech Stack:** Qiskit (ZZFeatureMap, Statevector), scikit-learn (SVC with precomputed kernel), numpy, pandas.

---

### Task 1: Add 16-Qubit Feature Encoding

**Files:**
- Modify: `quantum_engine.py` (add new constants and functions alongside existing 8-qubit code)
- Test: `tests/test_quantum_engine.py`

**Step 1: Write failing tests for `encode_16q`**

Add to `tests/test_quantum_engine.py`:

```python
from quantum_engine import (
    encode_16q,
    build_feature_map_16q,
    get_quantum_signature_16q,
    NUM_QUBITS_16,
    CLINICAL_WEIGHTS_16Q,
    SELECTED_SYMPTOMS_16Q,
)

class TestEncode16q:
    def test_output_shape(self):
        """Should return a 16-dim array."""
        result = encode_16q(HEALTHY_PATIENT)
        assert result.shape == (16,)

    def test_values_in_range(self):
        """All values should be in [0, pi]."""
        for patient in [HEALTHY_PATIENT, SICK_PATIENT]:
            result = encode_16q(patient)
            assert np.all(result >= 0.0), f"Found value below 0: {result}"
            assert np.all(result <= np.pi + 1e-10), f"Found value above pi: {result}"

    def test_jaundice_weight_higher_than_headache(self):
        """Jaundice (weight 0.95) should produce a larger value than headache (weight 0.50)."""
        jaundice_only = {**HEALTHY_PATIENT, "jaundice": True}
        headache_only = {**HEALTHY_PATIENT, "headache": True}
        j = encode_16q(jaundice_only)
        h = encode_16q(headache_only)
        # Q7 is jaundice, Q15 is headache
        assert j[7] > h[15], "Jaundice should encode with higher angle than headache"

    def test_different_symptoms_different_values(self):
        """Each symptom should produce a different encoded value due to clinical weights."""
        jaundice_only = {**HEALTHY_PATIENT, "jaundice": True}
        fever_only = {**HEALTHY_PATIENT, "fever": True}
        j = encode_16q(jaundice_only)
        f = encode_16q(fever_only)
        assert not np.allclose(j, f)

    def test_defaults_for_missing_keys(self):
        """Should use defaults when keys are missing."""
        minimal = {"heart_rate": 72, "bp_systolic": 120}
        result = encode_16q(minimal)
        assert result.shape == (16,)
        assert np.all(result >= 0.0) and np.all(result <= np.pi + 1e-10)
```

**Step 2: Run tests to verify they fail**

Run: `pytest tests/test_quantum_engine.py::TestEncode16q -v`
Expected: FAIL with ImportError (encode_16q not defined)

**Step 3: Implement `encode_16q` and constants in `quantum_engine.py`**

Add after the existing 8-qubit constants:

```python
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
```

**Step 4: Run tests to verify they pass**

Run: `pytest tests/test_quantum_engine.py::TestEncode16q -v`
Expected: All 5 PASS

**Step 5: Write failing test for `get_quantum_signature_16q`**

Add to `tests/test_quantum_engine.py`:

```python
class TestGetQuantumSignature16q:
    def test_shape_and_dtype(self):
        """Signature should be a length-65536 complex vector."""
        sig = get_quantum_signature_16q(HEALTHY_PATIENT)
        assert sig.shape == (2 ** 16,)
        assert np.issubdtype(sig.dtype, np.complexfloating)

    def test_normalization(self):
        """Quantum state must be normalized (sum of |amp|^2 == 1)."""
        sig = get_quantum_signature_16q(HEALTHY_PATIENT)
        assert np.isclose(np.sum(np.abs(sig) ** 2), 1.0)

    def test_deterministic(self):
        """Same input should always produce the same signature."""
        s1 = get_quantum_signature_16q(HEALTHY_PATIENT)
        s2 = get_quantum_signature_16q(HEALTHY_PATIENT)
        np.testing.assert_array_equal(s1, s2)

    def test_weighted_symptoms_produce_different_states(self):
        """Jaundice-only and headache-only should give distinct statevectors."""
        j = get_quantum_signature_16q({**HEALTHY_PATIENT, "jaundice": True})
        h = get_quantum_signature_16q({**HEALTHY_PATIENT, "headache": True})
        fidelity = np.abs(np.vdot(j, h)) ** 2
        assert fidelity < 0.99, "Different weighted symptoms should produce distinguishable states"
```

**Step 6: Implement `get_quantum_signature_16q`**

Add to `quantum_engine.py`:

```python
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
```

**Step 7: Run tests to verify they pass**

Run: `pytest tests/test_quantum_engine.py::TestGetQuantumSignature16q -v`
Expected: All 4 PASS (may take ~2-5s each due to 16-qubit simulation)

**Step 8: Run all existing tests to verify nothing broke**

Run: `pytest tests/ -v`
Expected: All existing tests PASS + new tests PASS

**Step 9: Commit**

```bash
git add quantum_engine.py tests/test_quantum_engine.py
git commit -m "feat: add 16-qubit individual feature encoding with clinical weights"
```

---

### Task 2: Add Quantum SVM Training Pipeline

**Files:**
- Modify: `quantum_engine.py` (add `train_quantum_svm` function)
- Test: `tests/test_quantum_engine.py`

**Step 1: Write failing test for `train_quantum_svm`**

Add to `tests/test_quantum_engine.py`:

```python
from quantum_engine import train_quantum_svm

class TestTrainQuantumSVM:
    def test_returns_model_dict(self):
        """Should return a dict with required keys."""
        patients = []
        for i in range(3):
            p = {**HEALTHY_PATIENT, "heart_rate": 60 + i * 5}
            patients.append((p, 0))
        for i in range(3):
            p = {**SICK_PATIENT, "heart_rate": 100 + i * 5}
            patients.append((p, 1))

        model = train_quantum_svm(patients)
        assert "train_statevectors" in model
        assert "train_params" in model
        assert "train_labels" in model
        assert "n_train" in model
        assert "svc" in model

    def test_train_statevectors_are_normalized(self):
        """All training statevectors should be normalized quantum states."""
        patients = []
        for i in range(3):
            patients.append(({**HEALTHY_PATIENT, "heart_rate": 60 + i * 5}, 0))
        for i in range(3):
            patients.append(({**SICK_PATIENT, "heart_rate": 100 + i * 5}, 1))

        model = train_quantum_svm(patients)
        for sv in model["train_statevectors"]:
            norm = np.sum(np.abs(sv) ** 2)
            assert np.isclose(norm, 1.0), f"Statevector not normalized: {norm}"
```

**Step 2: Run tests to verify they fail**

Run: `pytest tests/test_quantum_engine.py::TestTrainQuantumSVM -v`
Expected: FAIL with ImportError

**Step 3: Implement `train_quantum_svm`**

Add to `quantum_engine.py`:

```python
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
```

**Step 4: Run tests to verify they pass**

Run: `pytest tests/test_quantum_engine.py::TestTrainQuantumSVM -v`
Expected: All 2 PASS (may take ~10-20s due to 6 x 16-qubit circuits)

**Step 5: Commit**

```bash
git add quantum_engine.py tests/test_quantum_engine.py
git commit -m "feat: add quantum kernel SVM training pipeline for 16 qubits"
```

---

### Task 3: Add SVM Prediction Function

**Files:**
- Modify: `quantum_engine.py` (add `predict_quantum_svm`)
- Test: `tests/test_quantum_engine.py`

**Step 1: Write failing test for `predict_quantum_svm`**

```python
from quantum_engine import predict_quantum_svm

class TestPredictQuantumSVM:
    @pytest.fixture
    def trained_model(self):
        """Train a small model for testing."""
        patients = []
        for i in range(3):
            patients.append(({**HEALTHY_PATIENT, "heart_rate": 60 + i * 5}, 0))
        for i in range(3):
            patients.append(({**SICK_PATIENT, "heart_rate": 100 + i * 5}, 1))
        return train_quantum_svm(patients)

    def test_returns_probability(self, trained_model):
        """Should return a float probability in [0, 1]."""
        prob = predict_quantum_svm(HEALTHY_PATIENT, trained_model)
        assert 0.0 <= prob <= 1.0

    def test_sick_higher_than_healthy(self, trained_model):
        """Sick patient should have higher anomaly probability than healthy."""
        p_healthy = predict_quantum_svm(HEALTHY_PATIENT, trained_model)
        p_sick = predict_quantum_svm(SICK_PATIENT, trained_model)
        assert p_sick > p_healthy, f"Sick ({p_sick}) should score higher than healthy ({p_healthy})"

    def test_different_symptoms_different_scores(self, trained_model):
        """Patients with different symptoms should get different scores."""
        jaundice_only = {**HEALTHY_PATIENT, "jaundice": True}
        headache_only = {**HEALTHY_PATIENT, "headache": True}
        p_j = predict_quantum_svm(jaundice_only, trained_model)
        p_h = predict_quantum_svm(headache_only, trained_model)
        assert not np.isclose(p_j, p_h, atol=1e-4), \
            f"Jaundice ({p_j}) and headache ({p_h}) should produce different scores"
```

**Step 2: Run tests to verify they fail**

Run: `pytest tests/test_quantum_engine.py::TestPredictQuantumSVM -v`
Expected: FAIL with ImportError

**Step 3: Implement `predict_quantum_svm`**

Add to `quantum_engine.py`:

```python
def predict_quantum_svm(raw_dict, model):
    """
    Predict anomaly probability for a patient using the trained quantum SVM.

    Args:
        raw_dict: patient features dict.
        model: dict returned by train_quantum_svm().

    Returns:
        float: anomaly probability in [0, 1].
    """
    enc = encode_16q(raw_dict)
    new_sv = get_quantum_signature_16q(enc)

    # Compute fidelity kernel row against all training samples
    train_svs = model["train_statevectors"]
    n_train = model["n_train"]
    K_row = np.empty((1, n_train))
    for j in range(n_train):
        K_row[0, j] = np.abs(np.vdot(new_sv, train_svs[j])) ** 2

    # Use sklearn model for calibrated probability
    svc = model["svc"]
    proba = svc.predict_proba(K_row)[0]

    # Return probability of class 1 (anomaly/positive)
    class_1_idx = list(svc.classes_).index(1)
    return float(proba[class_1_idx])
```

**Step 4: Run tests to verify they pass**

Run: `pytest tests/test_quantum_engine.py::TestPredictQuantumSVM -v`
Expected: All 3 PASS

**Step 5: Run all tests**

Run: `pytest tests/ -v`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add quantum_engine.py tests/test_quantum_engine.py
git commit -m "feat: add quantum SVM prediction with fidelity kernel"
```

---

### Task 4: Add Model Persistence (Save/Load) — No Pickle

**Files:**
- Modify: `quantum_engine.py` (add save/load functions)
- Test: `tests/test_quantum_engine.py`

**Step 1: Write failing tests for save/load**

```python
from quantum_engine import save_quantum_svm, load_quantum_svm

class TestQuantumSVMPersistence:
    @pytest.fixture
    def trained_model(self):
        patients = []
        for i in range(3):
            patients.append(({**HEALTHY_PATIENT, "heart_rate": 60 + i * 5}, 0))
        for i in range(3):
            patients.append(({**SICK_PATIENT, "heart_rate": 100 + i * 5}, 1))
        return train_quantum_svm(patients)

    def test_save_creates_file(self, trained_model, tmp_path):
        """Saving model should create a file."""
        path = str(tmp_path / "model.npz")
        save_quantum_svm(trained_model, path)
        assert os.path.exists(path)

    def test_round_trip_prediction(self, trained_model, tmp_path):
        """Loading a saved model should produce the same prediction."""
        path = str(tmp_path / "model.npz")
        save_quantum_svm(trained_model, path)
        loaded = load_quantum_svm(path)

        p_original = predict_quantum_svm(SICK_PATIENT, trained_model)
        p_loaded = predict_quantum_svm(SICK_PATIENT, loaded)
        assert np.isclose(p_original, p_loaded, atol=1e-6), \
            f"Original: {p_original}, Loaded: {p_loaded}"
```

**Step 2: Implement save/load (no pickle — saves params + labels, retrains on load)**

Save only the encoded params and labels as numpy arrays. On load, recompute
statevectors and retrain the SVM (both are fast: statevectors from params,
SVM on a precomputed kernel matrix).

```python
def save_quantum_svm(model, path):
    """Save quantum SVM training data to disk (params + labels only, no pickle)."""
    np.savez_compressed(
        path,
        train_params=model["train_params"],
        train_labels=model["train_labels"],
    )


def load_quantum_svm(path):
    """
    Load saved quantum SVM training data and retrain.
    Recomputes statevectors from saved params and retrains the SVM
    on the fidelity kernel matrix. No pickle needed.
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
```

**Step 3: Run tests**

Run: `pytest tests/test_quantum_engine.py::TestQuantumSVMPersistence -v`
Expected: All 2 PASS

**Step 4: Commit**

```bash
git add quantum_engine.py tests/test_quantum_engine.py
git commit -m "feat: add pickle-free quantum SVM save/load with npz"
```

---

### Task 5: Add CSV Bootstrap Function

**Files:**
- Modify: `quantum_engine.py` (add `bootstrap_svm_from_csv`)
- Test: `tests/test_quantum_engine.py`

**Step 1: Write failing test**

```python
from quantum_engine import bootstrap_svm_from_csv

class TestBootstrapSVMFromCSV:
    def test_produces_model(self, tmp_path):
        """Should load CSV, sample, train, and return a model."""
        import pandas as pd
        rows = []
        for i in range(5):
            rows.append({
                "patient_id": f"H_{i}", "age": 25 + i, "sex": "M",
                "heart_rate": 65 + i * 3, "bp_systolic": 115 + i * 2,
                "bp_diastolic": 75 + i, "wbc": 6000 + i * 500,
                "platelets": 200000 + i * 20000,
                "fever": 0, "muscle_pain": 0, "jaundice": 0, "vomiting": 0,
                "confusion": 0, "headache": 0, "chills": 0, "rigors": 0,
                "nausea": 0, "diarrhoea": 0, "cough": 0, "bleeding": 0,
                "prostration": 0, "oliguria": 0, "anuria": 0,
                "conjunctival_suffusion": 0, "muscle_tenderness": 0,
                "diagnosis": 0,
            })
        for i in range(5):
            rows.append({
                "patient_id": f"S_{i}", "age": 40 + i, "sex": "F",
                "heart_rate": 100 + i * 3, "bp_systolic": 90 + i * 2,
                "bp_diastolic": 55 + i, "wbc": 15000 + i * 1000,
                "platelets": 50000 + i * 5000,
                "fever": 1, "muscle_pain": 1, "jaundice": 1, "vomiting": 1,
                "confusion": 0, "headache": 1, "chills": 1, "rigors": 1,
                "nausea": 1, "diarrhoea": 0, "cough": 0, "bleeding": 1,
                "prostration": 0, "oliguria": 1, "anuria": 0,
                "conjunctival_suffusion": 1, "muscle_tenderness": 1,
                "diagnosis": 1,
            })
        csv_path = str(tmp_path / "test_patients.csv")
        pd.DataFrame(rows).to_csv(csv_path, index=False)

        model = bootstrap_svm_from_csv(csv_path, n_samples=10)
        assert model["n_train"] == 10
        assert len(model["train_statevectors"]) == 10

        prob = predict_quantum_svm(HEALTHY_PATIENT, model)
        assert 0.0 <= prob <= 1.0
```

**Step 2: Implement `bootstrap_svm_from_csv`**

```python
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
            "diarrhoea": bool(int(row.get("diarrhoea", 0))),
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
```

**Step 3: Run test**

Run: `pytest tests/test_quantum_engine.py::TestBootstrapSVMFromCSV -v`
Expected: PASS (may take ~30-60s due to 10 x 16-qubit circuits)

**Step 4: Commit**

```bash
git add quantum_engine.py tests/test_quantum_engine.py
git commit -m "feat: add CSV bootstrap for stratified quantum SVM training"
```

---

### Task 6: Update API to Use Quantum SVM

**Files:**
- Modify: `api.py` (update `_load_state`, `/predict`)
- Test: `tests/test_api.py` (new file)

**Step 1: Write failing test for the updated `/predict` endpoint**

Create `tests/test_api.py`:

```python
"""Tests for the /predict endpoint with quantum SVM."""

import pytest
from fastapi.testclient import TestClient

# Patch to use tiny dataset for fast tests
import api
api.SVM_N_SAMPLES = 6

from api import app

client = TestClient(app)

HEALTHY_INPUT = {
    "heart_rate_bpm": 72,
    "systolic_bp_mmHg": 120,
    "diastolic_bp_mmHg": 80,
    "age_years": 30,
    "sex": "M",
    "wbc": 7000,
    "platelets": 250000,
}

SICK_INPUT = {
    "heart_rate_bpm": 110,
    "systolic_bp_mmHg": 95,
    "diastolic_bp_mmHg": 58,
    "age_years": 45,
    "sex": "F",
    "wbc": 18000,
    "platelets": 60000,
    "fever": True,
    "muscle_pain": True,
    "jaundice": True,
    "vomiting": True,
    "headache": True,
    "oliguria": True,
    "conjunctival_suffusion": True,
    "bleeding": True,
}


class TestPredictEndpoint:
    def test_returns_prediction(self):
        resp = client.post("/predict", json=HEALTHY_INPUT)
        assert resp.status_code == 200
        data = resp.json()
        assert "prediction" in data
        assert "anomaly_probability" in data
        assert "healthy_probability" in data

    def test_model_used_is_quantum_svm(self):
        resp = client.post("/predict", json=HEALTHY_INPUT)
        data = resp.json()
        assert data["model_used"] == "quantum_kernel_svm_16q"

    def test_probabilities_sum_to_one(self):
        resp = client.post("/predict", json=HEALTHY_INPUT)
        data = resp.json()
        total = data["anomaly_probability"] + data["healthy_probability"]
        assert abs(total - 1.0) < 0.01

    def test_sick_scores_higher_than_healthy(self):
        resp_h = client.post("/predict", json=HEALTHY_INPUT)
        resp_s = client.post("/predict", json=SICK_INPUT)
        p_h = resp_h.json()["anomaly_probability"]
        p_s = resp_s.json()["anomaly_probability"]
        assert p_s > p_h, f"Sick ({p_s}) should score higher than healthy ({p_h})"
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_api.py -v`
Expected: FAIL (model_used will be "quantum_risk_score")

**Step 3: Update `api.py`**

Add imports at the top of `api.py`:
```python
from quantum_engine import (
    # ... existing imports ...
    bootstrap_svm_from_csv,
    predict_quantum_svm,
    save_quantum_svm,
    load_quantum_svm,
    NUM_QUBITS_16,
)
```

Add constants:
```python
SVM_MODEL_PATH = os.path.join(DATA_DIR, "quantum_svm_model.npz")
SVM_N_SAMPLES = 75
```

Update `_load_state()` — add SVM loading after existing signature loading:
```python
def _load_state():
    """Load signatures, labels, params, and quantum SVM on startup."""
    # ... existing signature loading code stays unchanged ...

    # Load or train 16-qubit quantum SVM
    if os.path.exists(SVM_MODEL_PATH):
        _state["svm_model"] = load_quantum_svm(SVM_MODEL_PATH)
    elif os.path.exists(CSV_PATH):
        model = bootstrap_svm_from_csv(CSV_PATH, n_samples=SVM_N_SAMPLES)
        os.makedirs(DATA_DIR, exist_ok=True)
        save_quantum_svm(model, SVM_MODEL_PATH)
        _state["svm_model"] = model

    _load_global_boundary()
```

Replace the `/predict` endpoint body:
```python
@app.post("/predict", response_model=PredictionResult)
async def predict(patient: PatientInput):
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
```

**Step 4: Run API tests**

Run: `pytest tests/test_api.py -v`
Expected: All 4 PASS

**Step 5: Run all tests**

Run: `pytest tests/ -v`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add api.py tests/test_api.py
git commit -m "feat: update /predict to use 16-qubit quantum kernel SVM"
```

---

### Task 7: Final Integration Verification

**Files:**
- No new files. Run full test suite + manual verification.

**Step 1: Run full test suite**

Run: `pytest tests/ -v`
Expected: All tests PASS

**Step 2: Start local API and test manually**

Run: `uvicorn api:app --reload --port 8000`

Test healthy:
```bash
curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"heart_rate_bpm": 68, "systolic_bp_mmHg": 118, "diastolic_bp_mmHg": 76, "age_years": 28}' | python3 -m json.tool
```

Test sick:
```bash
curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"heart_rate_bpm": 105, "systolic_bp_mmHg": 95, "diastolic_bp_mmHg": 58, "age_years": 38, "sex": "M", "wbc": 18000, "platelets": 60000, "fever": true, "muscle_pain": true, "jaundice": true, "vomiting": true, "headache": true, "chills": true, "rigors": true, "nausea": true, "diarrhoea": true, "cough": true, "bleeding": true, "prostration": true, "oliguria": true, "conjunctival_suffusion": true, "muscle_tenderness": true}' | python3 -m json.tool
```

Test individual symptom impact:
```bash
# Just jaundice (weight 0.95 — should be high impact)
curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"heart_rate_bpm": 72, "systolic_bp_mmHg": 120, "jaundice": true}' | python3 -m json.tool

# Just headache (weight 0.50 — should be lower impact)
curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"heart_rate_bpm": 72, "systolic_bp_mmHg": 120, "headache": true}' | python3 -m json.tool
```

Verify:
- `model_used` is `"quantum_kernel_svm_16q"`
- Sick preset scores significantly higher than healthy
- Jaundice and headache produce **different** anomaly probabilities (not uniform 3%)

**Step 3: Commit any final adjustments**

```bash
git add -A
git commit -m "chore: finalize 16-qubit quantum SVM integration"
```
