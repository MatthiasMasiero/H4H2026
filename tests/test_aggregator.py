"""Tests for aggregator.py"""

import numpy as np
import pytest

from aggregator import FederatedAggregator


# ── weighted averaging ────────────────────────────────────────────────────

class TestComputeGlobalBoundary:
    def test_equal_weights(self):
        """Two clinics with equal samples should produce a simple average."""
        agg = FederatedAggregator(["A", "B"])
        w1 = np.array([1.0, 2.0, 3.0])
        w2 = np.array([3.0, 2.0, 1.0])
        agg.accept_weights("A", w1, 0.5, 10)
        agg.accept_weights("B", w2, 1.5, 10)

        gw, gb = agg.compute_global_boundary()
        np.testing.assert_array_almost_equal(gw, [2.0, 2.0, 2.0])
        assert np.isclose(gb, 1.0)

    def test_unequal_weights(self):
        """Clinic with more samples should have proportionally more influence."""
        agg = FederatedAggregator(["A", "B"])
        w1 = np.array([0.0, 0.0])
        w2 = np.array([4.0, 4.0])
        agg.accept_weights("A", w1, 0.0, 25)
        agg.accept_weights("B", w2, 2.0, 75)

        gw, gb = agg.compute_global_boundary()
        np.testing.assert_array_almost_equal(gw, [3.0, 3.0])
        assert np.isclose(gb, 1.5)

    def test_no_weights_raises(self):
        agg = FederatedAggregator(["A"])
        with pytest.raises(ValueError, match="No clinic weights"):
            agg.compute_global_boundary()


# ── single-clinic edge case ───────────────────────────────────────────────

class TestSingleClinic:
    def test_single_clinic_passthrough(self):
        """Single clinic boundary should be returned as-is."""
        agg = FederatedAggregator(["Solo"])
        w = np.array([1.0, -2.0, 3.0])
        agg.accept_weights("Solo", w, -0.5, 20)

        gw, gb = agg.compute_global_boundary()
        np.testing.assert_array_almost_equal(gw, w)
        assert np.isclose(gb, -0.5)


# ── train_local_svm ──────────────────────────────────────────────────────

class TestTrainLocalSvm:
    def test_output_shape(self):
        """Coef should match feature dimension; intercept should be scalar."""
        rng = np.random.default_rng(0)
        X = rng.random((20, 256))
        y = np.array([0] * 10 + [1] * 10)
        coef, intercept = FederatedAggregator.train_local_svm(X, y)
        assert coef.shape == (256,)
        assert isinstance(intercept, (float, np.floating))

    def test_separable_data(self):
        """SVM should perfectly separate linearly separable data."""
        X = np.vstack([np.zeros((5, 4)), np.ones((5, 4))])
        y = np.array([0] * 5 + [1] * 5)
        coef, intercept = FederatedAggregator.train_local_svm(X, y)
        # Decision value should be negative for class 0, positive for class 1
        decisions_0 = X[:5] @ coef + intercept
        decisions_1 = X[5:] @ coef + intercept
        assert np.all(decisions_0 < 0)
        assert np.all(decisions_1 > 0)
