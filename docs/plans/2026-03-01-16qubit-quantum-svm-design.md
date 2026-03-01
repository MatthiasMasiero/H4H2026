# 16-Qubit Quantum Kernel SVM Design

## Problem

Every symptom changes the prediction by a uniform ~3.125%. Root cause: the prediction on `api.py:278` is `mean(condensed) / pi` — a simple arithmetic mean that ignores the quantum statevector entirely. The quantum circuit runs but its output is never used.

## Solution

Expand from 8 to 16 qubits, encode 16 clinical features individually (no condensation), train a quantum kernel SVM on 75 stratified patients, and use the SVM decision function for prediction.

## Feature Encoding (16 qubits)

### Continuous features (Q0-Q5) — normalized to [0, pi]

| Qubit | Feature | Range | Note |
|-------|---------|-------|------|
| Q0 | heart_rate | 40-140 bpm | |
| Q1 | bp_systolic | 80-200 mmHg | |
| Q2 | bp_diastolic | 40-130 mmHg | |
| Q3 | wbc | 500-35000 cells/uL | |
| Q4 | platelets | 5000-1000000 cells/uL | Inverted (low = high angle) |
| Q5 | age | 0-100 years | |

### Categorical (Q6)

| Qubit | Feature | Encoding |
|-------|---------|----------|
| Q6 | sex | F -> pi, M -> 0 |

### Binary symptoms (Q7-Q15) — weighted: 0 or weight * pi

| Qubit | Symptom | Weight | Rationale |
|-------|---------|--------|-----------|
| Q7 | jaundice | 0.95 | Pathognomonic for Weil's disease |
| Q8 | oliguria | 0.90 | Renal involvement |
| Q9 | conjunctival_suffusion | 0.85 | Classic lepto sign |
| Q10 | bleeding | 0.80 | Hemorrhagic complications |
| Q11 | anuria | 0.85 | Severe renal failure |
| Q12 | fever | 0.70 | Universal but not specific |
| Q13 | muscle_pain | 0.75 | Classic calf pain |
| Q14 | vomiting | 0.60 | GI involvement |
| Q15 | headache | 0.50 | Common, least specific |

### Dropped symptoms (8)

chills, rigors, nausea, diarrhoea, cough, prostration, muscle_tenderness, confusion — least discriminative for leptospirosis.

## Quantum Circuit

- 16-qubit ZZFeatureMap, linear entanglement, reps=2
- Statevector dimension: 2^16 = 65,536
- ZZ entanglement creates nonlinear cross-feature interactions

## Training Pipeline (one-time)

1. Stratified sample of 75 patients from 498 (maintain diagnosis ratio)
2. Encode each patient -> 16-qubit statevector (~0.3s each, ~25s total)
3. Compute 75x75 fidelity kernel matrix: K[i,j] = |<psi_i|psi_j>|^2
4. Train sklearn SVC with precomputed kernel
5. Apply Platt scaling for probability output
6. Save to data/quantum_svm_model.json: support vector indices, dual coefficients, intercept, precomputed support vector statevectors

## Live Prediction

1. Encode new patient -> 16-qubit statevector (~0.5s)
2. Compute fidelity with each support vector (~20-30 fidelities)
3. SVM decision: f(x) = sum(alpha_i * K(x_i, x)) + b
4. Sigmoid for probability output
5. Total: ~2-3 seconds

## Files Changed

| File | Change |
|------|--------|
| quantum_engine.py | NUM_QUBITS=16, new encode_16q(), clinical weights, remove condense_features from prediction path |
| api.py | /predict uses SVM decision function, new bootstrap_svm() |
| LaunchCta.tsx | No changes (sends same fields) |
| New: data/quantum_svm_model.json | Cached trained model |

## Backward Compatibility

- The 8-qubit condense_features() stays for the /encode endpoint and Streamlit app
- Only /predict switches to the 16-qubit SVM path
- If model file missing, falls back to current mean/pi scoring

## Limitations

- Dataset AUC ~0.47 — weak class separation inherent in the data
- SVM may achieve AUC 0.55-0.60 at best
- Symptoms will contribute different amounts (not uniform 3%)
- 16-qubit simulation is ~100x slower than 8-qubit per patient
