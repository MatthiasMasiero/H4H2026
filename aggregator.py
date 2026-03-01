"""
aggregator.py — Federated Learning Aggregator
==============================================
Combines local SVM weight vectors from distributed clinics
into a single global decision boundary via weighted averaging.

Each clinic trains a local linear SVM on quantum signature amplitudes,
then shares only model weights (never raw patient data) with the
central aggregator.
"""

import numpy as np
from sklearn.svm import SVC


class FederatedAggregator:
    """
    Accepts SVM weight vectors from multiple clinics and computes
    a sample-weighted average to produce a global decision boundary.

    Workflow:
        1. Each clinic calls train_local_svm() on its own data.
        2. Each clinic registers its weights via accept_weights().
        3. The aggregator produces the global boundary via compute_global_boundary().
    """

    def __init__(self, clinic_names):
        """
        Args:
            clinic_names: list of str — identifiers for participating clinics
                          (e.g. ["Clinic_A", "Clinic_B", "Clinic_C"]).
        """
        self.clinic_names = list(clinic_names)
        self.weights = {}         # clinic_name -> np.array weight vector
        self.intercepts = {}      # clinic_name -> float intercept
        self.sample_counts = {}   # clinic_name -> int number of local samples

    # ── Registration ────────────────────────────────────────────────────────

    def accept_weights(self, clinic_name, weight_vector, intercept, n_samples) -> None:
        """
        Register a clinic's local SVM decision boundary.

        Args:
            clinic_name:   str — must be in self.clinic_names.
            weight_vector: array-like — SVM coef_ (1-D).
            intercept:     float — SVM intercept_.
            n_samples:     int — number of patients the clinic trained on.
        """
        self.weights[clinic_name] = np.asarray(weight_vector, dtype=np.float64)
        self.intercepts[clinic_name] = float(intercept)
        self.sample_counts[clinic_name] = int(n_samples)

    # ── Aggregation ─────────────────────────────────────────────────────────

    def compute_global_boundary(self) -> tuple[np.ndarray, float]:
        """
        Compute the global decision boundary as a sample-weighted
        average of all registered clinic weight vectors.

        Returns:
            (global_weights, global_intercept) — the federated model.

        Raises:
            ValueError: if no clinic weights have been registered.
        """
        if not self.weights:
            raise ValueError("No clinic weights registered yet.")

        total_samples = sum(self.sample_counts.values())
        dim = next(iter(self.weights.values())).shape[0]

        global_w = np.zeros(dim)
        global_b = 0.0

        for name in self.weights:
            ratio = self.sample_counts[name] / total_samples
            global_w += self.weights[name] * ratio
            global_b += self.intercepts[name] * ratio

        return global_w, global_b

    # ── Summary ─────────────────────────────────────────────────────────────

    def get_clinic_summary(self) -> dict:
        """Return a dict summarizing each clinic's registration status."""
        return {
            name: {
                "n_samples": self.sample_counts.get(name, 0),
                "registered": name in self.weights,
            }
            for name in self.clinic_names
        }

    # ── Local Training Helper ───────────────────────────────────────────────

    @staticmethod
    def train_local_svm(features, labels) -> tuple[np.ndarray, float]:
        """
        Train a linear SVM on local quantum signature amplitudes.

        Args:
            features: np.array (n_samples, n_features) — |psi| amplitudes.
            labels:   np.array (n_samples,) — binary diagnosis (0/1).

        Returns:
            (coef, intercept) — SVM decision boundary parameters.
        """
        svm = SVC(kernel="linear", C=1.0)
        svm.fit(features, labels)
        return svm.coef_[0], svm.intercept_[0]
