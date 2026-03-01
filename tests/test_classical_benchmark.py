"""Tests for classical_benchmark.py"""

import numpy as np
import pytest

from classical_benchmark import (
    FEATURE_COLS,
    SYMPTOM_COLS,
    generate_reference_profiles,
    get_models,
    load_data,
    run_benchmark,
)


class TestLoadData:
    def test_loads_correct_shape(self):
        X, y, df = load_data()
        assert X.shape == (141, 24)
        assert y.shape == (141,)
        assert len(df) == 141

    def test_positive_negative_split(self):
        _, y, _ = load_data()
        assert (y == 1).sum() == 57
        assert (y == 0).sum() == 84

    def test_labels_are_binary(self):
        _, y, _ = load_data()
        assert set(np.unique(y)) == {0, 1}

    def test_sex_encoded(self):
        X, _, _ = load_data()
        sex_col_idx = FEATURE_COLS.index("sex_enc")
        assert set(np.unique(X[:, sex_col_idx])).issubset({0.0, 1.0})


class TestGetModels:
    def test_returns_three_models(self):
        models = get_models()
        assert len(models) == 3

    def test_model_names(self):
        models = get_models()
        expected = {"Random Forest", "Gradient Boosting", "SVM (RBF)"}
        assert set(models.keys()) == expected

    def test_pipelines_have_scaler(self):
        for name, pipeline in get_models().items():
            assert "scaler" in pipeline.named_steps, f"{name} missing scaler"


class TestReferenceProfiles:
    def test_correct_shape(self):
        X, y = generate_reference_profiles()
        assert X.shape == (30, 24)
        assert y.shape == (30,)

    def test_label_balance(self):
        _, y = generate_reference_profiles()
        assert (y == 0).sum() == 15
        assert (y == 1).sum() == 15

    def test_deterministic(self):
        X1, y1 = generate_reference_profiles(random_state=42)
        X2, y2 = generate_reference_profiles(random_state=42)
        np.testing.assert_array_equal(X1, X2)
        np.testing.assert_array_equal(y1, y2)

    def test_healthy_have_normal_vitals(self):
        X, y = generate_reference_profiles()
        healthy = X[y == 0]
        hr_idx = FEATURE_COLS.index("heart_rate")
        assert np.all(healthy[:, hr_idx] >= 60)
        assert np.all(healthy[:, hr_idx] <= 85)

    def test_sick_have_abnormal_vitals(self):
        X, y = generate_reference_profiles()
        sick = X[y == 1]
        hr_idx = FEATURE_COLS.index("heart_rate")
        assert np.all(sick[:, hr_idx] >= 95)
        assert np.all(sick[:, hr_idx] <= 130)


class TestBenchmark:
    def test_returns_four_results(self):
        X_train, y_train = generate_reference_profiles()
        X_test, y_test, _ = load_data()
        results = run_benchmark(X_train, y_train, X_test, y_test)
        assert len(results) == 4  # 3 classical + 1 quantum

    def test_includes_quantum_results(self):
        X_train, y_train = generate_reference_profiles()
        X_test, y_test, _ = load_data()
        results = run_benchmark(X_train, y_train, X_test, y_test)
        names = [r["name"] for r in results]
        assert "Quantum Fidelity (16q)" in names

    def test_quantum_accuracy(self):
        X_train, y_train = generate_reference_profiles()
        X_test, y_test, _ = load_data()
        results = run_benchmark(X_train, y_train, X_test, y_test)
        quantum = [r for r in results if "Quantum" in r["name"]][0]
        assert abs(quantum["accuracy"] - 0.787) < 0.01

    def test_confusion_matrix_sums(self):
        X_train, y_train = generate_reference_profiles()
        X_test, y_test, _ = load_data()
        results = run_benchmark(X_train, y_train, X_test, y_test)
        for r in results:
            cm = r["cm"]
            assert cm["TP"] + cm["FN"] + cm["FP"] + cm["TN"] == 141

    def test_quantum_sensitivity_beats_viable_classical(self):
        X_train, y_train = generate_reference_profiles()
        X_test, y_test, _ = load_data()
        results = run_benchmark(X_train, y_train, X_test, y_test)
        quantum = [r for r in results if "Quantum" in r["name"]][0]
        # Only compare against models with reasonable specificity (>50%)
        viable = [r for r in results if "Quantum" not in r["name"]
                  and r["specificity"] > 0.5]
        best_viable_sens = max(r["sensitivity"] for r in viable)
        assert quantum["sensitivity"] > best_viable_sens
