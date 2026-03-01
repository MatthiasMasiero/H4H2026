# QuantumDx — Privacy-First Federated Quantum Diagnostic System

## What This Project Is

A hackathon MVP (H4H 2026) that encodes patient clinical data into quantum states for disease diagnosis, then securely destroys the raw data. Built for community health posts in Kenya (Kisumu County).

## Architecture

```
Frontend (Vercel)  →  FastAPI Backend (Railway)  →  Quantum Engine (Qiskit)
quantumdx.vercel.app   h4h2026-production.up.railway.app
```

### Backend (Python)
- **quantum_engine.py** — Core quantum logic: ZZFeatureMap (4 qubits), statevector simulation, fidelity kernel, secure data shredding (DoD 5220.22-M 3-pass)
- **api.py** — FastAPI REST API with endpoints: `/predict`, `/encode`, `/patients`, `/kernel`, `/health`, `/docs`
- **app.py** — Streamlit UI for local use (upload CSV, encode, diagnose, federate)
- **aggregator.py** — Federated learning: weighted SVM aggregation across 3 clinics
- **Dockerfile** — Deploys api.py on Railway

### Frontend (React + TypeScript)
- **Web App/** — Vite + React 19 + Framer Motion landing page
- **LaunchCta.tsx** — Patient diagnosis form wired to Railway `/predict` endpoint
- Deployed on Vercel

## Key Technical Details

### Quantum Pipeline
1. 4 clinical features encoded: heart_rate, bp_systolic, temperature, spo2
2. Normalized to [0, π] using fixed clinical ranges
3. ZZFeatureMap with linear entanglement (depth=2) → 16-dim complex state vector
4. Fidelity kernel: F(ψ,φ) = |⟨ψ|φ⟩|²
5. SVM classification on quantum signature amplitudes

### CSV Column Mapping
The patient CSV uses different column names than the engine expects:
- `heart_rate_bpm` → `heart_rate`
- `systolic_bp_mmHg` → `bp_systolic`
- `temperature_c` → `temperature`
- `oxygen_saturation_pct` → `spo2`
- `has_target_disease` → `diagnosis`

Handled by `COLUMN_ALIASES` + `_normalize_columns()` in app.py.

### Data Flow
1. CSV uploaded → columns mapped → quantum encoded → signatures.json saved → raw CSV shredded
2. Diagnose step rebuilds quantum circuits from stored normalized params (not just numpy)
3. Prediction: vitals → quantum signature → |amplitude| feature vector → SVM predict

## Running Locally

```bash
# Backend API
uvicorn api:app --reload --port 8000

# Streamlit UI
streamlit run app.py

# Frontend
cd "Web App" && npm install && npm run dev

# Tests
pytest tests/test_quantum_engine.py tests/test_aggregator.py -v
```

## Deployment

- **Backend**: Railway auto-deploys from GitHub on push (Dockerfile)
- **Frontend**: `cd "Web App" && npx vercel --prod`

## What's Been Done

- [x] Quantum engine with ZZFeatureMap encoding + fidelity kernel
- [x] CSV column mapping for real patient data (50 patients from Kisumu County)
- [x] Full quantum circuit simulation in Diagnose step (not just numpy dot products)
- [x] Streamlit UI with upload, encode, diagnose, federate workflow
- [x] Patient diagnosis form with randomize button
- [x] Deterministic predictions (random_state=42 on SVC)
- [x] Upload deduplication (doesn't re-clear state on Streamlit reruns)
- [x] FastAPI REST API with CORS for frontend consumption
- [x] Frontend connected to Railway backend (LaunchCta.tsx → /predict)
- [x] Backend deployed on Railway, frontend deployed on Vercel
- [x] Tests passing (20/20 + 6 e2e pipeline tests)

## What Could Be Next

- [ ] Protein-ligand binding simulation (VQE) — design docs exist in docs/plans/
- [ ] Noise model simulation (Aer with shot-based measurement)
- [ ] HPO term integration into quantum encoding
- [ ] Auth/rate limiting on the API
- [ ] Real-time WebSocket for streaming quantum simulation progress
