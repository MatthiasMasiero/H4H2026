"""Tests for classical_benchmark.py"""

import numpy as np
import pytest

from classical_benchmark import (
    FEATURE_COLS,
    SEVERE_SYMPTOMS,
    SYMPTOM_COLS,
    filter_test_patients,
    generate_synthetic_patients,
    get_models,
    load_data,
    run_cross_validation,
    run_filtered_comparison,
)


class TestLoadData:
    def test_loads_correct_shape(self):
        X, y, df = load_data()
        assert X.shape == (498, 24)
        assert y.shape == (498,)
        assert len(df) == 498

    def test_labels_are_binary(self):
        _, y, _ = load_data()
        assert set(np.unique(y)) == {0, 1}

    def test_sex_encoded(self):
        X, _, df = load_data()
        sex_col_idx = FEATURE_COLS.index("sex_enc")
        assert set(np.unique(X[:, sex_col_idx])).issubset({0.0, 1.0})


class TestGetModels:
    def test_returns_four_models(self):
        models = get_models()
        assert len(models) == 4

    def test_model_names(self):
        models = get_models()
        expected = {"Logistic Regression", "Random Forest",
                    "Gradient Boosting", "SVM (RBF)"}
        assert set(models.keys()) == expected

    def test_pipelines_have_scaler(self):
        for name, pipeline in get_models().items():
            assert "scaler" in pipeline.named_steps, f"{name} missing scaler"


class TestSyntheticPatients:
    def test_correct_shape(self):
        X, y = generate_synthetic_patients()
        assert X.shape == (30, 24)
        assert y.shape == (30,)

    def test_label_balance(self):
        _, y = generate_synthetic_patients()
        assert (y == 0).sum() == 15
        assert (y == 1).sum() == 15

    def test_deterministic(self):
        X1, y1 = generate_synthetic_patients(random_state=42)
        X2, y2 = generate_synthetic_patients(random_state=42)
        np.testing.assert_array_equal(X1, X2)
        np.testing.assert_array_equal(y1, y2)

    def test_healthy_have_normal_vitals(self):
        X, y = generate_synthetic_patients()
        healthy = X[y == 0]
        # Heart rate should be in [60, 85]
        hr_idx = FEATURE_COLS.index("heart_rate")
        assert np.all(healthy[:, hr_idx] >= 60)
        assert np.all(healthy[:, hr_idx] <= 85)

    def test_sick_have_abnormal_vitals(self):
        X, y = generate_synthetic_patients()
        sick = X[y == 1]
        hr_idx = FEATURE_COLS.index("heart_rate")
        assert np.all(sick[:, hr_idx] >= 95)
        assert np.all(sick[:, hr_idx] <= 130)

    def test_sick_have_at_least_one_symptom(self):
        X, y = generate_synthetic_patients()
        sick = X[y == 1]
        symptom_start = 7  # first 7 cols are continuous
        for i in range(len(sick)):
            n_active = sick[i, symptom_start:].sum()
            assert n_active >= 1, f"Sick patient {i} has no symptoms"


class TestFilterTestPatients:
    def test_produces_141_patients(self):
        _, _, df = load_data()
        X_test, y_test = filter_test_patients(df)
        assert len(y_test) == 141

    def test_positive_negative_split(self):
        _, _, df = load_data()
        _, y_test = filter_test_patients(df)
        assert (y_test == 1).sum() == 57
        assert (y_test == 0).sum() == 84


class TestCrossValidation:
    def test_returns_results_for_all_models(self):
        X, y, _ = load_data()
        results = run_cross_validation(X, y)
        assert len(results) == 4

    def test_auc_near_random(self):
        X, y, _ = load_data()
        results = run_cross_validation(X, y)
        for r in results:
            assert 0.35 <= r["auc"] <= 0.65, (
                f"{r['name']} AUC={r['auc']:.3f} outside expected range"
            )


class TestFilteredComparison:
    def test_includes_quantum_results(self):
        X_train, y_train = generate_synthetic_patients()
        _, _, df = load_data()
        X_test, y_test = filter_test_patients(df)
        results = run_filtered_comparison(X_train, y_train, X_test, y_test)
        names = [r["name"] for r in results]
        assert "Quantum Fidelity (16q)" in names

    def test_quantum_accuracy(self):
        X_train, y_train = generate_synthetic_patients()
        _, _, df = load_data()
        X_test, y_test = filter_test_patients(df)
        results = run_filtered_comparison(X_train, y_train, X_test, y_test)
        quantum = [r for r in results if "Quantum" in r["name"]][0]
        assert abs(quantum["accuracy"] - 0.787) < 0.01

    def test_confusion_matrix_sums(self):
        X_train, y_train = generate_synthetic_patients()
        _, _, df = load_data()
        X_test, y_test = filter_test_patients(df)
        results = run_filtered_comparison(X_train, y_train, X_test, y_test)
        for r in results:
            cm = r["cm"]
            assert cm["TP"] + cm["FN"] + cm["FP"] + cm["TN"] == len(y_test)
