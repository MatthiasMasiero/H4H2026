"""Tests for the /predict endpoint with quantum SVM."""

import os
import time
import pytest
from fastapi.testclient import TestClient

import api
from api import app

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


@pytest.fixture(scope="module")
def client():
    # Remove any stale model file so the SVM is freshly trained
    model_path = api.SVM_MODEL_PATH
    if os.path.exists(model_path):
        os.remove(model_path)
    api._state.clear()

    with TestClient(app) as c:
        # Wait for background SVM training to finish (small dataset, ~2-5s)
        for _ in range(30):
            if "svm_model" in api._state:
                break
            time.sleep(0.5)
        yield c

    # Cleanup: remove the model file created during the test
    if os.path.exists(model_path):
        os.remove(model_path)


class TestPredictEndpoint:
    def test_returns_prediction(self, client):
        resp = client.post("/predict", json=HEALTHY_INPUT)
        assert resp.status_code == 200
        data = resp.json()
        assert "prediction" in data
        assert "anomaly_probability" in data
        assert "healthy_probability" in data

    def test_model_used_is_quantum_svm(self, client):
        resp = client.post("/predict", json=HEALTHY_INPUT)
        data = resp.json()
        assert data["model_used"] == "quantum_kernel_svm_16q"

    def test_probabilities_sum_to_one(self, client):
        resp = client.post("/predict", json=HEALTHY_INPUT)
        data = resp.json()
        total = data["anomaly_probability"] + data["healthy_probability"]
        assert abs(total - 1.0) < 0.01

    def test_sick_scores_higher_than_healthy(self, client):
        resp_h = client.post("/predict", json=HEALTHY_INPUT)
        resp_s = client.post("/predict", json=SICK_INPUT)
        p_h = resp_h.json()["anomaly_probability"]
        p_s = resp_s.json()["anomaly_probability"]
        # With reference training data, the SVM learns the clinical weight
        # structure and should clearly rank sick > healthy.
        assert 0.0 <= p_h <= 1.0
        assert 0.0 <= p_s <= 1.0
        assert p_s > p_h, \
            f"Sick ({p_s}) should be higher than healthy ({p_h})"
