"""Tests for quantum_engine.py"""

import os
import tempfile
import numpy as np
import pytest

from quantum_engine import (
    normalize_features,
    get_quantum_signature,
    compute_kernel_from_signatures,
    generate_mock_dataset,
    shred_data,
    signature_to_dict,
    signature_from_dict,
    FEATURE_COLS,
    NUM_QUBITS,
    CLINICAL_RANGES,
)


# ── normalize_features ────────────────────────────────────────────────────

class TestNormalizeFeatures:
    def test_bounds(self):
        """Output should be clipped to [0, pi]."""
        # Values at the exact clinical min/max
        lo = np.array([r[0] for r in CLINICAL_RANGES.values()])
        hi = np.array([r[1] for r in CLINICAL_RANGES.values()])
        assert np.allclose(normalize_features(lo), 0.0)
        assert np.allclose(normalize_features(hi), np.pi)

    def test_out_of_range_clipped(self):
        """Values outside clinical ranges should be clipped."""
        extreme_low = np.array([0.0, 0.0, 0.0, 0.0])
        extreme_high = np.array([999.0, 999.0, 999.0, 999.0])
        assert np.all(normalize_features(extreme_low) >= 0.0)
        assert np.all(normalize_features(extreme_high) <= np.pi)

    def test_2d_input(self):
        """Should handle a 2-D matrix and return same shape."""
        rows = np.array([
            [72.0, 120.0, 37.0, 97.0],
            [95.0, 145.0, 38.0, 93.0],
        ])
        result = normalize_features(rows)
        assert result.shape == (2, 4)
        assert np.all(result >= 0.0) and np.all(result <= np.pi)


# ── get_quantum_signature ─────────────────────────────────────────────────

class TestGetQuantumSignature:
    def test_shape_and_dtype(self):
        """Signature should be a length-16 complex vector."""
        sig = get_quantum_signature([72, 120, 37, 97])
        assert sig.shape == (2 ** NUM_QUBITS,)
        assert np.issubdtype(sig.dtype, np.complexfloating)

    def test_normalization(self):
        """Quantum state must be normalized (sum of |amp|^2 == 1)."""
        sig = get_quantum_signature([80, 130, 36.5, 96])
        assert np.isclose(np.sum(np.abs(sig) ** 2), 1.0)

    def test_deterministic(self):
        """Same input should always produce the same signature."""
        s1 = get_quantum_signature([72, 120, 37, 97])
        s2 = get_quantum_signature([72, 120, 37, 97])
        np.testing.assert_array_equal(s1, s2)


# ── compute_kernel_from_signatures ────────────────────────────────────────

class TestKernel:
    def test_symmetry(self):
        """Kernel matrix should be symmetric."""
        sigs = [get_quantum_signature([72, 120, 37, 97]),
                get_quantum_signature([95, 145, 38, 93])]
        K = compute_kernel_from_signatures(sigs)
        np.testing.assert_array_almost_equal(K, K.T)

    def test_diagonal_ones(self):
        """Diagonal entries (self-fidelity) should be 1.0."""
        sigs = [get_quantum_signature([72, 120, 37, 97]),
                get_quantum_signature([95, 145, 38, 93])]
        K = compute_kernel_from_signatures(sigs)
        np.testing.assert_array_almost_equal(np.diag(K), 1.0)

    def test_values_in_range(self):
        """All kernel values should be in [0, 1]."""
        sigs = [get_quantum_signature([72, 120, 37, 97]),
                get_quantum_signature([95, 145, 38, 93]),
                get_quantum_signature([60, 100, 36, 99])]
        K = compute_kernel_from_signatures(sigs)
        assert np.all(K >= -1e-10) and np.all(K <= 1.0 + 1e-10)


# ── generate_mock_dataset ─────────────────────────────────────────────────

class TestMockDataset:
    def test_generates_csv(self, tmp_path):
        path = str(tmp_path / "mock.csv")
        df = generate_mock_dataset(path, n_patients=10)
        assert os.path.isfile(path)
        assert len(df) == 10
        for col in FEATURE_COLS + ["patient_id", "diagnosis"]:
            assert col in df.columns

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
        sig = get_quantum_signature([72, 120, 37, 97])
        d = signature_to_dict(sig)
        recovered = signature_from_dict(d)
        np.testing.assert_array_almost_equal(sig, recovered)
