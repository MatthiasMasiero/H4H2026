# QuantumDx — Privacy-First Federated Quantum Diagnostic System

## What This Project Is

A hackathon MVP (H4H 2026) that encodes patient clinical data into quantum states for disease diagnosis, then securely destroys the raw data. Built for community health posts in Kenya (Kisumu County). Uses real leptospirosis clinical data (498 patients).

## Architecture

```
Frontend (Vercel)  →  FastAPI Backend (Railway)  →  Quantum Engine (Qiskit)
quantumdx.vercel.app   h4h2026-production.up.railway.app
```

### Backend (Python)
- **quantum_engine.py** — Core quantum logic: ZZFeatureMap (8 qubits), statevector simulation, fidelity kernel, secure data shredding (DoD 5220.22-M 3-pass)
- **api.py** — FastAPI REST API with endpoints: `/predict`, `/encode`, `/patients`, `/kernel`, `/health`, `/docs`
- **app.py** — Streamlit UI for local use (upload CSV, encode, diagnose, federate)
- **aggregator.py** — Federated learning: weighted SVM aggregation across 3 clinics
- **clean_lepto_data.py** — Cleans raw leptospirosis dataset (1,734 rows → 498 patients)
- **Dockerfile** — Deploys api.py on Railway

### Frontend (React + TypeScript)
- **Web App/** — Vite + React 19 + Framer Motion landing page
- **LaunchCta.tsx** — Patient diagnosis form wired to Railway `/predict` endpoint
- Deployed on Vercel

## Key Technical Details

### Quantum Pipeline
1. 24 raw clinical features condensed into 8 organ-system composites:
   - Q0: cardiac (heart_rate, bp_systolic)
   - Q1: vascular (bp_diastolic, platelets inverted)
   - Q2: hematologic (wbc)
   - Q3: organ_damage (jaundice, oliguria, anuria)
   - Q4: systemic (fever, chills, rigors, conjunctival_suffusion)
   - Q5: gi_respiratory (nausea, vomiting, diarrhoea, cough)
   - Q6: musculoskeletal (muscle_pain, muscle_tenderness, prostration, headache)
   - Q7: demographics (age, sex, bleeding)
2. Each composite normalized to [0, π]
3. ZZFeatureMap with linear entanglement (depth=2) → 256-dim complex state vector
4. Fidelity kernel: F(ψ,φ) = |⟨ψ|φ⟩|²
5. Prediction via quantum risk score: mean(condensed_params) / π

### Prediction Model
The prediction uses a **quantum risk score** — the mean of the 8 condensed ZZFeatureMap circuit parameters divided by π. This approach is:
- **Quantum**: scores derived directly from quantum circuit parameters
- **Private**: raw symptoms destroyed after encoding; composites are one-way (can't recover individual symptoms from "organ_damage = 0.46")
- **Honest**: the underlying dataset has near-zero class separation (positive and negative leptospirosis patients present nearly identically, AUC 0.47), so no ML classifier can reliably discriminate. The risk score reflects clinical severity instead.

Sick preset → ~69% anomaly, Healthy preset → ~15% anomaly.

### CSV Column Mapping
The leptospirosis CSV uses clinical names mapped by `clean_lepto_data.py`:
- `Feverad` → `fever`, `Jaundicead` → `jaundice`, `Vomitingadmission` → `vomiting`
- `Confusionad` → `confusion`, `Musclepainad` → `muscle_pain`
- Plus 12 extra symptoms and vitals (heart_rate, bp_systolic, bp_diastolic, wbc, platelets, age, sex)

### Data Flow
1. CSV uploaded → columns mapped → quantum encoded → signatures.json saved → raw CSV shredded
2. Diagnose step rebuilds quantum circuits from stored normalized params (not just numpy)
3. Prediction: raw features → condense to 8 composites → quantum risk score

## Running Locally

```bash
# Backend API
uvicorn api:app --reload --port 8000

# Streamlit UI
streamlit run app.py

# Frontend
cd "Web App" && npm install && npm run dev

# Clean raw leptospirosis data (requires data/Leptospirosis clinical data.csv)
python clean_lepto_data.py

# Tests
pytest tests/ -v
```

## Deployment

- **Backend**: Railway auto-deploys from GitHub on push (Dockerfile)
- **Frontend**: `cd "Web App" && npx vercel --prod`

## What's Been Done

- [x] 8-qubit quantum engine with ZZFeatureMap encoding + fidelity kernel
- [x] Leptospirosis dataset: 498 patients from Kisumu County, 17 symptoms + vitals
- [x] Correct symptom column mapping (fever, jaundice, vomiting, confusion, muscle_pain)
- [x] Quantum risk score prediction (condensed circuit parameters)
- [x] Full quantum circuit simulation in Diagnose step
- [x] Streamlit UI with upload, encode, diagnose, federate workflow
- [x] Patient diagnosis form with healthy/sick/random presets
- [x] FastAPI REST API with CORS for frontend consumption
- [x] Frontend connected to Railway backend (LaunchCta.tsx → /predict)
- [x] Backend deployed on Railway, frontend deployed on Vercel
- [x] Protein-ligand binding simulation (VQE)
- [x] RNA secondary structure prediction (QAOA)
- [x] Tests passing (25/25)

## What Could Be Next

- [ ] Noise model simulation (Aer with shot-based measurement)
- [ ] Auth/rate limiting on the API
- [ ] Real-time WebSocket for streaming quantum simulation progress
- [ ] Better training data with stronger class separation for ML-based prediction
