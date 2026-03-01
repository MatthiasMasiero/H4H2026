"""Tests for quantum_engine.py"""

import os
import tempfile
import numpy as np
import pytest

from quantum_engine import (
    normalize_features,
    get_quantum_signature,
    condense_features,
    compute_kernel_from_signatures,
    shred_data,
    signature_to_dict,
    signature_from_dict,
    FEATURE_COLS,
    NUM_QUBITS,
    CLINICAL_RANGES,
    RAW_CLINICAL_RANGES,
    encode_16q,
    build_feature_map_16q,
    get_quantum_signature_16q,
    NUM_QUBITS_16,
    CLINICAL_WEIGHTS_16Q,
    SELECTED_SYMPTOMS_16Q,
    train_quantum_svm,
    predict_quantum_svm,
)


# ── Sample patient dicts ────────────────────────────────────────────────────

HEALTHY_PATIENT = {
    "heart_rate": 72, "bp_systolic": 120, "bp_diastolic": 78,
    "age": 30, "sex": "M", "wbc": 7000, "platelets": 250000,
    "fever": False, "muscle_pain": False, "jaundice": False,
    "vomiting": False, "confusion": False, "headache": False,
    "chills": False, "rigors": False, "nausea": False,
    "diarrhoea": False, "cough": False, "bleeding": False,
    "prostration": False, "oliguria": False, "anuria": False,
    "conjunctival_suffusion": False, "muscle_tenderness": False,
}

SICK_PATIENT = {
    "heart_rate": 110, "bp_systolic": 160, "bp_diastolic": 105,
    "age": 45, "sex": "F", "wbc": 25000, "platelets": 30000,
    "fever": True, "muscle_pain": True, "jaundice": True,
    "vomiting": True, "confusion": True, "headache": True,
    "chills": True, "rigors": True, "nausea": True,
    "diarrhoea": True, "cough": True, "bleeding": True,
    "prostration": True, "oliguria": True, "anuria": True,
    "conjunctival_suffusion": True, "muscle_tenderness": True,
}


# ── condense_features ───────────────────────────────────────────────────────

class TestCondenseFeatures:
    def test_output_shape(self):
        """Should return an 8-dim array."""
        result = condense_features(HEALTHY_PATIENT)
        assert result.shape == (8,)

    def test_values_in_range(self):
        """All values should be in [0, pi]."""
        for patient in [HEALTHY_PATIENT, SICK_PATIENT]:
            result = condense_features(patient)
            assert np.all(result >= 0.0), f"Found value below 0: {result}"
            assert np.all(result <= np.pi + 1e-10), f"Found value above pi: {result}"

    def test_defaults_for_missing_keys(self):
        """Should use defaults when keys are missing."""
        minimal = {"heart_rate": 72, "bp_systolic": 120}
        result = condense_features(minimal)
        assert result.shape == (8,)
        assert np.all(result >= 0.0) and np.all(result <= np.pi + 1e-10)

    def test_binary_feature_behavior(self):
        """Binary composite qubits (indices 3-6) should be 0 with no symptoms, pi with all."""
        no_symptoms = condense_features(HEALTHY_PATIENT)
        all_symptoms = condense_features(SICK_PATIENT)
        for idx in [3, 4, 5, 6]:
            assert np.isclose(no_symptoms[idx], 0.0), f"Qubit {idx} should be 0 with no symptoms"
            assert np.isclose(all_symptoms[idx], np.pi), f"Qubit {idx} should be pi with all symptoms"

    def test_different_patients_produce_different_features(self):
        """Healthy and sick patients should have different condensed features."""
        h = condense_features(HEALTHY_PATIENT)
        s = condense_features(SICK_PATIENT)
        assert not np.allclose(h, s)


# ── normalize_features ────────────────────────────────────────────────────

class TestNormalizeFeatures:
    def test_clipping(self):
        """Output should be clipped to [0, pi]."""
        extreme_low = np.array([-1.0] * 8)
        extreme_high = np.array([99.0] * 8)
        assert np.all(normalize_features(extreme_low) >= 0.0)
        assert np.all(normalize_features(extreme_high) <= np.pi)

    def test_passthrough_valid_range(self):
        """Values already in [0, pi] should pass through unchanged."""
        vals = np.array([0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 0.1, np.pi])
        result = normalize_features(vals)
        np.testing.assert_array_almost_equal(result, vals)

    def test_2d_input(self):
        """Should handle a 2-D matrix."""
        rows = np.array([
            [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 0.1, 0.2],
            [1.0, 1.5, 2.0, 2.5, 3.0, 0.1, 0.2, 0.3],
        ])
        result = normalize_features(rows)
        assert result.shape == (2, 8)
        assert np.all(result >= 0.0) and np.all(result <= np.pi)


# ── get_quantum_signature ─────────────────────────────────────────────────

class TestGetQuantumSignature:
    def test_shape_and_dtype_from_dict(self):
        """Signature from dict should be a length-256 complex vector."""
        sig = get_quantum_signature(HEALTHY_PATIENT)
        assert sig.shape == (2 ** NUM_QUBITS,)
        assert sig.shape == (256,)
        assert np.issubdtype(sig.dtype, np.complexfloating)

    def test_shape_and_dtype_from_array(self):
        """Signature from 8-dim array should be a length-256 complex vector."""
        condensed = condense_features(HEALTHY_PATIENT)
        sig = get_quantum_signature(condensed)
        assert sig.shape == (256,)
        assert np.issubdtype(sig.dtype, np.complexfloating)

    def test_normalization(self):
        """Quantum state must be normalized (sum of |amp|^2 == 1)."""
        sig = get_quantum_signature(HEALTHY_PATIENT)
        assert np.isclose(np.sum(np.abs(sig) ** 2), 1.0)

    def test_deterministic(self):
        """Same input should always produce the same signature."""
        s1 = get_quantum_signature(HEALTHY_PATIENT)
        s2 = get_quantum_signature(HEALTHY_PATIENT)
        np.testing.assert_array_equal(s1, s2)

    def test_dict_and_array_agree(self):
        """Passing dict vs pre-condensed array should give the same result."""
        sig_dict = get_quantum_signature(HEALTHY_PATIENT)
        condensed = condense_features(HEALTHY_PATIENT)
        sig_array = get_quantum_signature(condensed)
        np.testing.assert_array_almost_equal(sig_dict, sig_array)


# ── compute_kernel_from_signatures ────────────────────────────────────────

class TestKernel:
    def test_symmetry(self):
        """Kernel matrix should be symmetric."""
        sigs = [get_quantum_signature(HEALTHY_PATIENT),
                get_quantum_signature(SICK_PATIENT)]
        K = compute_kernel_from_signatures(sigs)
        np.testing.assert_array_almost_equal(K, K.T)

    def test_diagonal_ones(self):
        """Diagonal entries (self-fidelity) should be 1.0."""
        sigs = [get_quantum_signature(HEALTHY_PATIENT),
                get_quantum_signature(SICK_PATIENT)]
        K = compute_kernel_from_signatures(sigs)
        np.testing.assert_array_almost_equal(np.diag(K), 1.0)

    def test_values_in_range(self):
        """All kernel values should be in [0, 1]."""
        sigs = [get_quantum_signature(HEALTHY_PATIENT),
                get_quantum_signature(SICK_PATIENT),
                get_quantum_signature({"heart_rate": 60, "bp_systolic": 100})]
        K = compute_kernel_from_signatures(sigs)
        assert np.all(K >= -1e-10) and np.all(K <= 1.0 + 1e-10)


# ── shred_data ────────────────────────────────────────────────────────────

class TestShredData:
    def test_file_removed(self, tmp_path):
        p = tmp_path / "secret.csv"
        p.write_text("patient,data\n1,abc")
        assert shred_data(str(p)) is True
        assert not p.exists()

    def test_nonexistent_file(self):
        assert shred_data("/nonexistent/file.csv") is False


# ── serialization round-trip ──────────────────────────────────────────────

class TestSerialization:
    def test_round_trip(self):
        sig = get_quantum_signature(HEALTHY_PATIENT)
        d = signature_to_dict(sig)
        recovered = signature_from_dict(d)
        np.testing.assert_array_almost_equal(sig, recovered)


# ── 16-Qubit Encoding ────────────────────────────────────────────────────

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


# ── train_quantum_svm ──────────────────────────────────────────────────────

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


# ── predict_quantum_svm ────────────────────────────────────────────────────

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
