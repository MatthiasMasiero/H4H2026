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
    generate_mock_dataset,
    shred_data,
    signature_to_dict,
    signature_from_dict,
    FEATURE_COLS,
    NUM_QUBITS,
    CLINICAL_RANGES,
    RAW_CLINICAL_RANGES,
)


# ── Sample patient dicts ────────────────────────────────────────────────────

HEALTHY_PATIENT = {
    "heart_rate": 72, "bp_systolic": 120, "bp_diastolic": 78,
    "temperature": 37.0, "spo2": 97, "age": 30, "sex": "M",
    "height": 175, "weight": 70, "fatigue": False, "weight_loss": False,
    "seizures": False, "dev_delay": False, "muscle_weakness": False,
}

SICK_PATIENT = {
    "heart_rate": 110, "bp_systolic": 160, "bp_diastolic": 105,
    "temperature": 39.0, "spo2": 90, "age": 45, "sex": "F",
    "height": 160, "weight": 55, "fatigue": True, "weight_loss": True,
    "seizures": True, "dev_delay": True, "muscle_weakness": True,
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
        """Binary features (seizures, etc.) should produce 0 or pi contribution."""
        no_symptoms = condense_features(HEALTHY_PATIENT)
        all_symptoms = condense_features(SICK_PATIENT)
        # Neurological qubit (index 5) should be 0 when no seizures/dev_delay
        assert np.isclose(no_symptoms[5], 0.0)
        # With all symptoms on, neurological should be pi
        assert np.isclose(all_symptoms[5], np.pi)

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


# ── generate_mock_dataset ─────────────────────────────────────────────────

class TestMockDataset:
    def test_generates_csv(self, tmp_path):
        path = str(tmp_path / "mock.csv")
        df = generate_mock_dataset(path, n_patients=10)
        assert os.path.isfile(path)
        assert len(df) == 10
        # Check all 14 feature columns + patient_id + diagnosis
        expected_cols = [
            "patient_id", "heart_rate", "bp_systolic", "bp_diastolic",
            "temperature", "spo2", "age", "sex", "height", "weight",
            "fatigue", "weight_loss", "seizures", "dev_delay",
            "muscle_weakness", "diagnosis",
        ]
        for col in expected_cols:
            assert col in df.columns, f"Missing column: {col}"

    def test_label_distribution(self, tmp_path):
        path = str(tmp_path / "mock.csv")
        df = generate_mock_dataset(path, n_patients=20)
        assert set(df["diagnosis"].unique()) == {0, 1}


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
