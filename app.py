"""
app.py — Streamlit UI for Privacy-First Quantum Diagnostic MVP
===============================================================
Run with:  streamlit run app.py
"""

import os
import json
import random
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from quantum_engine import (
    generate_mock_dataset,
    get_quantum_signature,
    compute_kernel,
    compute_kernel_from_params,
    compute_kernel_from_signatures,
    shred_data,
    signature_to_dict,
    signature_from_dict,
    normalize_features,
    FEATURE_COLS,
)
from sklearn.svm import SVC
from aggregator import FederatedAggregator
from quantum_therapeutics.protein_data import DISEASE_TO_PROTEIN, get_protein_for_disease
from quantum_therapeutics.molecule_engine import simulate_binding
from quantum_therapeutics.rna_data import SAMPLE_SEQUENCES
from quantum_therapeutics.rna_engine import predict_structure


# ── Paths & Constants ───────────────────────────────────────────────────────

DATA_DIR = "data"
DATA_PATH = os.path.join(DATA_DIR, "patients.csv")
SIGS_PATH = os.path.join(DATA_DIR, "signatures.json")
CLINICS_DIR = "clinics"
CLINIC_NAMES = ["Clinic_A", "Clinic_B", "Clinic_C"]

# Map alternate CSV column names to the internal names the engine expects
COLUMN_ALIASES = {
    "heart_rate_bpm": "heart_rate",
    "systolic_bp_mmHg": "bp_systolic",
    "temperature_c": "temperature",
    "oxygen_saturation_pct": "spo2",
    "has_target_disease": "diagnosis",
}


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Rename known alternate column names to internal engine names."""
    rename = {k: v for k, v in COLUMN_ALIASES.items() if k in df.columns}
    if rename:
        df = df.rename(columns=rename)
    return df


# ── Page Config ─────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Quantum Diagnostic MVP",
    layout="wide",
)


# ── Session State Defaults ──────────────────────────────────────────────────

_defaults = {
    "signatures": {},
    "labels": {},
    "params": {},
    "data_shredded": False,
    "kernel_matrix": None,
    "global_boundary": None,
    "binding_result": None,
    "rna_result": None,
}
for key, val in _defaults.items():
    if key not in st.session_state:
        st.session_state[key] = val


# ── Recover State From Disk (handles page refreshes) ───────────────────────

if not st.session_state["signatures"] and os.path.exists(SIGS_PATH):
    with open(SIGS_PATH) as f:
        stored = json.load(f)
    st.session_state["signatures"] = stored["signatures"]
    st.session_state["labels"] = stored.get("labels", {})
    st.session_state["params"] = stored.get("params", {})
    if not os.path.exists(DATA_PATH):
        st.session_state["data_shredded"] = True


# ── Sidebar ─────────────────────────────────────────────────────────────────

with st.sidebar:
    st.header("System Status")

    # Privacy indicator
    if st.session_state["data_shredded"]:
        st.success("Privacy Status: Raw Data Deleted")
    else:
        st.warning("Privacy Status: Raw Data Present")

    st.divider()

    n_sigs = len(st.session_state["signatures"])
    st.metric("Patients Processed", n_sigs)
    st.metric("Kernel Computed", "Yes" if st.session_state["kernel_matrix"] is not None else "No")
    st.metric("Global Model", "Synced" if st.session_state["global_boundary"] is not None else "Pending")

    st.divider()
    st.subheader("Architecture")
    st.markdown(
        """
        1. **Encode** — ZZFeatureMap (4 qubits)
        2. **Extract** — Quantum state vectors
        3. **Shred** — 3-pass secure delete
        4. **Diagnose** — Fidelity kernel matrix
        5. **Federate** — Weighted SVM aggregation
        """
    )

    st.divider()
    if st.button("Reset Demo"):
        for key, val in _defaults.items():
            st.session_state[key] = val
        # Clean up saved signatures
        if os.path.exists(SIGS_PATH):
            os.remove(SIGS_PATH)
        # Regenerate mock data
        generate_mock_dataset(DATA_PATH)
        st.rerun()


# ── Header ──────────────────────────────────────────────────────────────────

st.title("Privacy-First Federated Quantum Diagnostic")
st.caption(
    "Hackathon MVP — Quantum-encoded patient diagnostics with "
    "federated learning and secure data shredding."
)


# ── Ensure Mock Data Exists on First Run ────────────────────────────────────

if not os.path.exists(DATA_PATH) and not st.session_state["data_shredded"]:
    generate_mock_dataset(DATA_PATH)


# ── CSV Upload ─────────────────────────────────────────────────────────────

REQUIRED_COLS = {"patient_id", "heart_rate", "bp_systolic", "temperature", "spo2", "diagnosis"}

uploaded_file = st.file_uploader("Upload a custom patient CSV", type=["csv"])
if uploaded_file is not None:
    # Only process the upload once (avoid re-clearing state on every rerun)
    if st.session_state.get("_uploaded_file_name") != uploaded_file.name:
        try:
            uploaded_df = _normalize_columns(pd.read_csv(uploaded_file))
            missing = REQUIRED_COLS - set(uploaded_df.columns)
            if missing:
                st.error(f"CSV is missing required columns: {', '.join(sorted(missing))}")
            else:
                os.makedirs(DATA_DIR, exist_ok=True)
                uploaded_df.to_csv(DATA_PATH, index=False)
                # Reset processing state so Step 1 picks up the new file
                st.session_state["signatures"] = {}
                st.session_state["labels"] = {}
                st.session_state["data_shredded"] = False
                if os.path.exists(SIGS_PATH):
                    os.remove(SIGS_PATH)
                st.session_state["_uploaded_file_name"] = uploaded_file.name
                st.success(f"Uploaded {len(uploaded_df)} patients. Click **Process Local Patient** to encode.")
        except Exception as e:
            st.error(f"Failed to read CSV: {e}")


# ── Action Buttons ──────────────────────────────────────────────────────────

col1, col2, col3 = st.columns(3)


# ── Button 1: Process Local Patient ─────────────────────────────────────────

with col1:
    st.subheader("1. Encode")
    if st.button("Process Local Patient", use_container_width=True, type="primary"):
        if not os.path.exists(DATA_PATH):
            st.error("No patient data found. Click **Reset Demo** to regenerate.")
        else:
            df = _normalize_columns(pd.read_csv(DATA_PATH))
            signatures = {}
            labels = {}
            params = {}  # normalized circuit parameters for quantum kernel simulation

            progress = st.progress(0, text="Encoding patients into quantum states...")
            for idx, row in df.iterrows():
                features = row[FEATURE_COLS].values.astype(float)
                sig = get_quantum_signature(features)
                pid = row["patient_id"]
                signatures[pid] = signature_to_dict(sig)
                labels[pid] = int(row["diagnosis"])
                params[pid] = normalize_features(features).tolist()
                progress.progress((idx + 1) / len(df))

            # Save quantum signatures + circuit parameters to JSON
            os.makedirs(DATA_DIR, exist_ok=True)
            with open(SIGS_PATH, "w") as f:
                json.dump({"signatures": signatures, "labels": labels, "params": params}, f)

            # Securely shred raw patient CSV
            shred_data(DATA_PATH)

            # Update session state
            st.session_state["signatures"] = signatures
            st.session_state["labels"] = labels
            st.session_state["params"] = params
            st.session_state["data_shredded"] = True

            progress.empty()
            st.success(f"Processed {len(signatures)} patients. Raw data securely shredded.")


# ── Button 2: Run Quantum Diagnostic ────────────────────────────────────────

with col2:
    st.subheader("2. Diagnose")
    if st.button("Run Quantum Diagnostic", use_container_width=True):
        sigs = st.session_state["signatures"]
        params = st.session_state["params"]

        if not sigs:
            st.error("No signatures found. Process patients first.")
        elif params:
            # Full quantum circuit simulation — rebuild circuits from stored
            # parameters and compute fidelity kernel via Qiskit simulation
            n = len(params)
            param_matrix = np.array(list(params.values()))
            progress = st.progress(0, text=f"Simulating quantum kernel ({n}x{n} circuit evaluations)...")
            K = compute_kernel_from_params(param_matrix)
            progress.progress(1.0)
            st.session_state["kernel_matrix"] = K
            progress.empty()
            st.success(f"Quantum kernel computed via circuit simulation ({K.shape[0]}x{K.shape[1]}).")
        else:
            # Fallback for old signatures without stored params
            with st.spinner("Computing quantum kernel matrix..."):
                vectors = [signature_from_dict(s) for s in sigs.values()]
                K = compute_kernel_from_signatures(vectors)
                st.session_state["kernel_matrix"] = K
            st.success(f"Kernel matrix computed ({K.shape[0]}x{K.shape[1]}).")


# ── Button 3: Sync Global Boundary ─────────────────────────────────────────

with col3:
    st.subheader("3. Federate")
    if st.button("Sync Global Boundary", use_container_width=True):
        sigs = st.session_state["signatures"]
        labs = st.session_state["labels"]

        if not sigs:
            st.error("No signatures available. Process patients first.")
        else:
            with st.spinner("Training local clinic models and aggregating..."):
                pids = list(sigs.keys())
                chunk = len(pids) // len(CLINIC_NAMES)

                aggregator = FederatedAggregator(CLINIC_NAMES)
                clinic_details = []

                for i, clinic in enumerate(CLINIC_NAMES):
                    start = i * chunk
                    end = start + chunk if i < len(CLINIC_NAMES) - 1 else len(pids)
                    clinic_pids = pids[start:end]

                    # Build feature matrix from signature amplitudes
                    X = np.array([np.abs(signature_from_dict(sigs[p])) for p in clinic_pids])
                    y = np.array([labs[p] for p in clinic_pids])

                    # Skip SVM training if clinic has only one class
                    if len(np.unique(y)) < 2:
                        st.warning(f"{clinic} has only one class — skipping local SVM training.")
                        clinic_details.append({
                            "Clinic": clinic,
                            "Patients": len(clinic_pids),
                            "Weight Norm": "N/A (single class)",
                        })
                        continue

                    coef, intercept = FederatedAggregator.train_local_svm(X, y)
                    aggregator.accept_weights(clinic, coef, intercept, len(clinic_pids))

                    # Persist local model to clinic folder
                    clinic_dir = os.path.join(CLINICS_DIR, clinic)
                    os.makedirs(clinic_dir, exist_ok=True)
                    with open(os.path.join(clinic_dir, "local_model.json"), "w") as f:
                        json.dump({
                            "coef": coef.tolist(),
                            "intercept": float(intercept),
                            "n_samples": len(clinic_pids),
                        }, f)

                    clinic_details.append({
                        "Clinic": clinic,
                        "Patients": len(clinic_pids),
                        "Weight Norm": round(float(np.linalg.norm(coef)), 4),
                    })

                global_w, global_b = aggregator.compute_global_boundary()
                st.session_state["global_boundary"] = {
                    "weights": global_w.tolist(),
                    "intercept": global_b,
                    "clinics": clinic_details,
                }

            st.success("Global decision boundary synced from 3 clinics.")


# ── Add New Patient — Local Prediction ──────────────────────────────────────

st.divider()
st.subheader("Local Patient Diagnosis")


def _randomize_patient():
    """Generate random but realistic patient values into session state."""
    st.session_state["rp_age"] = random.randint(0, 65)
    st.session_state["rp_sex"] = random.choice(["M", "F"])
    st.session_state["rp_care"] = random.choice([
        "community_health_post", "district_hospital", "regional_hospital", "clinic",
    ])
    st.session_state["rp_height"] = float(random.randint(60, 195))
    st.session_state["rp_weight"] = round(random.uniform(8.0, 120.0), 1)
    st.session_state["rp_hr"] = float(random.randint(55, 130))
    st.session_state["rp_bp_sys"] = float(random.randint(85, 180))
    st.session_state["rp_bp_dia"] = float(random.randint(40, 120))
    st.session_state["rp_temp"] = round(random.uniform(35.5, 39.5), 1)
    st.session_state["rp_spo2"] = round(random.uniform(88.0, 100.0), 1)
    st.session_state["rp_fatigue"] = random.random() < 0.2
    st.session_state["rp_weight_loss"] = random.random() < 0.2
    st.session_state["rp_seizures"] = random.random() < 0.1
    st.session_state["rp_dev_delay"] = random.random() < 0.1
    st.session_state["rp_muscle_weak"] = random.random() < 0.2


st.button("Randomize Patient", on_click=_randomize_patient, use_container_width=True)

with st.form("new_patient_form"):
    st.markdown("Enter patient data to get a quantum-powered diagnostic prediction.")

    # Demographics
    st.markdown("**Demographics**")
    demo1, demo2, demo3 = st.columns(3)
    with demo1:
        inp_age = st.number_input("Age (years)", min_value=0, max_value=120,
                                  value=st.session_state.get("rp_age", 25), step=1)
    with demo2:
        sex_opts = ["M", "F"]
        inp_sex = st.selectbox("Sex", sex_opts,
                               index=sex_opts.index(st.session_state.get("rp_sex", "M")))
    with demo3:
        care_opts = ["community_health_post", "district_hospital", "regional_hospital", "clinic"]
        inp_care = st.selectbox("Care Setting", care_opts,
                                index=care_opts.index(st.session_state.get("rp_care", "community_health_post")))

    # Body measurements
    st.markdown("**Body Measurements**")
    body1, body2, body3 = st.columns(3)
    with body1:
        inp_height = st.number_input("Height (cm)", min_value=40.0, max_value=220.0,
                                     value=st.session_state.get("rp_height", 170.0), step=1.0)
    with body2:
        inp_weight = st.number_input("Weight (kg)", min_value=1.0, max_value=300.0,
                                     value=st.session_state.get("rp_weight", 70.0), step=0.5)
    with body3:
        inp_bmi = round(inp_weight / (inp_height / 100) ** 2, 1)
        st.metric("BMI (auto)", inp_bmi)

    # Vitals (these feed the quantum encoder)
    st.markdown("**Vitals** *(used for quantum encoding)*")
    v1, v2, v3, v4, v5 = st.columns(5)
    with v1:
        inp_hr = st.number_input("Heart Rate (bpm)", min_value=40.0, max_value=140.0,
                                 value=st.session_state.get("rp_hr", 75.0), step=1.0)
    with v2:
        inp_bp_sys = st.number_input("Systolic BP (mmHg)", min_value=80.0, max_value=200.0,
                                     value=st.session_state.get("rp_bp_sys", 120.0), step=1.0)
    with v3:
        inp_bp_dia = st.number_input("Diastolic BP (mmHg)", min_value=30.0, max_value=130.0,
                                     value=st.session_state.get("rp_bp_dia", 80.0), step=1.0)
    with v4:
        inp_temp = st.number_input("Temperature (C)", min_value=35.0, max_value=40.0,
                                   value=st.session_state.get("rp_temp", 37.0), step=0.1)
    with v5:
        inp_spo2 = st.number_input("SpO2 (%)", min_value=85.0, max_value=100.0,
                                   value=st.session_state.get("rp_spo2", 97.0), step=0.5)

    # Clinical symptoms
    st.markdown("**Clinical Symptoms**")
    sym1, sym2, sym3, sym4, sym5 = st.columns(5)
    with sym1:
        inp_fatigue = st.checkbox("Fatigue", value=st.session_state.get("rp_fatigue", False))
    with sym2:
        inp_weight_loss = st.checkbox("Weight Loss", value=st.session_state.get("rp_weight_loss", False))
    with sym3:
        inp_seizures = st.checkbox("Seizures", value=st.session_state.get("rp_seizures", False))
    with sym4:
        inp_dev_delay = st.checkbox("Developmental Delay", value=st.session_state.get("rp_dev_delay", False))
    with sym5:
        inp_muscle_weak = st.checkbox("Muscle Weakness", value=st.session_state.get("rp_muscle_weak", False))

    predict_clicked = st.form_submit_button("Predict Diagnosis", use_container_width=True, type="primary")

if predict_clicked:
    sigs = st.session_state["signatures"]
    labs = st.session_state["labels"]

    if not sigs or not labs:
        st.error("No training data available. Process patients first (Step 1).")
    else:
        # Encode the new patient into a quantum signature (4 vitals)
        new_sig = get_quantum_signature([inp_hr, inp_bp_sys, inp_temp, inp_spo2])
        new_X = np.abs(new_sig).reshape(1, -1)

        gb = st.session_state["global_boundary"]
        if gb is not None:
            # Use the federated global decision boundary
            w = np.array(gb["weights"])
            b = gb["intercept"]
            decision = float(new_X @ w + b)
            anomaly_prob = 1.0 / (1.0 + np.exp(-decision))
            healthy_prob = 1.0 - anomaly_prob
            pred = 1 if anomaly_prob > 0.5 else 0
            model_label = "Federated Global Boundary"
        else:
            # Fallback: train local SVM when federation hasn't run yet
            X_train = np.array([np.abs(signature_from_dict(s)) for s in sigs.values()])
            y_train = np.array(list(labs.values()))

            model = SVC(kernel="linear", probability=True, C=1.0, random_state=42)
            model.fit(X_train, y_train)

            proba = model.predict_proba(new_X)[0]
            pred = model.predict(new_X)[0]

            class_order = model.classes_
            healthy_prob = float(proba[class_order == 0][0]) if 0 in class_order else 0.0
            anomaly_prob = float(proba[class_order == 1][0]) if 1 in class_order else 0.0
            model_label = "Local SVM (run Step 3 to use federated model)"

        # Collect symptom flags for display
        symptoms = []
        if inp_fatigue:
            symptoms.append("Fatigue")
        if inp_weight_loss:
            symptoms.append("Weight Loss")
        if inp_seizures:
            symptoms.append("Seizures")
        if inp_dev_delay:
            symptoms.append("Dev. Delay")
        if inp_muscle_weak:
            symptoms.append("Muscle Weakness")

        # Display results
        res_left, res_gauge, res_right = st.columns([1, 2, 1])

        with res_left:
            st.markdown("**Patient Profile**")
            st.markdown(f"- Age: **{inp_age}** yrs &nbsp; Sex: **{inp_sex}**")
            st.markdown(f"- Height: **{inp_height}** cm &nbsp; Weight: **{inp_weight}** kg &nbsp; BMI: **{inp_bmi}**")
            st.markdown("**Quantum-Encoded Vitals**")
            st.markdown(f"- HR: **{inp_hr}** bpm &nbsp; BP: **{inp_bp_sys}/{inp_bp_dia}** mmHg")
            st.markdown(f"- Temp: **{inp_temp}** C &nbsp; SpO2: **{inp_spo2}** %")
            if symptoms:
                st.markdown(f"**Symptoms:** {', '.join(symptoms)}")
            else:
                st.markdown("**Symptoms:** None reported")

        with res_gauge:
            fig = go.Figure(go.Indicator(
                mode="gauge+number",
                value=anomaly_prob * 100,
                number={"suffix": "%"},
                title={"text": "Anomaly Probability"},
                gauge={
                    "axis": {"range": [0, 100]},
                    "bar": {"color": "#EF553B" if anomaly_prob > 0.5 else "#636EFA"},
                    "steps": [
                        {"range": [0, 30], "color": "#d4edda"},
                        {"range": [30, 70], "color": "#fff3cd"},
                        {"range": [70, 100], "color": "#f8d7da"},
                    ],
                    "threshold": {
                        "line": {"color": "black", "width": 3},
                        "thickness": 0.8,
                        "value": 50,
                    },
                },
            ))
            fig.update_layout(height=300)
            st.plotly_chart(fig, use_container_width=True)

        with res_right:
            st.markdown("**Prediction**")
            if pred == 1:
                st.error(f"ANOMALY DETECTED ({anomaly_prob:.1%})")
            else:
                st.success(f"HEALTHY ({healthy_prob:.1%})")
            st.caption(
                f"Confidence breakdown: "
                f"Healthy {healthy_prob:.1%} / Anomaly {anomaly_prob:.1%}"
            )
            st.caption(f"Model: {model_label}")


# ── Results Display ─────────────────────────────────────────────────────────

st.divider()

# ── Kernel Heatmap ──────────────────────────────────────────────────────────

if st.session_state["kernel_matrix"] is not None:
    st.subheader("Quantum Similarity Matrix (Fidelity Kernel)")

    K = st.session_state["kernel_matrix"]
    pids = list(st.session_state["signatures"].keys())

    fig = px.imshow(
        K,
        x=pids,
        y=pids,
        color_continuous_scale="Viridis",
        labels=dict(color="Fidelity"),
        title="Patient-to-Patient Quantum State Fidelity",
    )
    fig.update_layout(width=700, height=600)
    st.plotly_chart(fig, use_container_width=True)


# ── Global Boundary Visualization ───────────────────────────────────────────

if st.session_state["global_boundary"] is not None:
    st.subheader("Federated Global Decision Boundary")

    gb = st.session_state["global_boundary"]
    col_a, col_b = st.columns(2)

    with col_a:
        st.markdown("**Clinic Contributions**")
        clinic_df = pd.DataFrame(gb["clinics"])
        st.dataframe(clinic_df, use_container_width=True, hide_index=True)

    with col_b:
        st.markdown("**Global Weight Vector**")
        w = np.array(gb["weights"])
        fig = go.Figure(go.Bar(
            x=[f"dim_{i}" for i in range(len(w))],
            y=w,
            marker_color=["#636EFA" if v >= 0 else "#EF553B" for v in w],
        ))
        fig.update_layout(
            xaxis_title="Quantum State Dimension",
            yaxis_title="Weight",
            title=f"Global SVM Weights (intercept = {gb['intercept']:.4f})",
            height=400,
        )
        st.plotly_chart(fig, use_container_width=True)

# ── Molecular Binding Simulation ──────────────────────────────────────────

st.divider()
st.subheader("Molecular Binding Simulation (VQE)")
st.caption(
    "Select a disease signature to simulate protein-ligand binding energy "
    "using the Variational Quantum Eigensolver."
)

sim_col1, sim_col2 = st.columns([1, 2])

with sim_col1:
    disease_options = list(DISEASE_TO_PROTEIN.keys())
    selected_disease = st.selectbox("Disease Signature", disease_options)

    if selected_disease:
        info = get_protein_for_disease(selected_disease)
        st.markdown(f"**Protein:** {info['name']}")
        st.markdown(f"**PDB ID:** `{info['pdb_id']}`")
        st.markdown(f"**Molecule Proxy:** {info['molecule']}")
        st.caption(info["description"])

    if st.button("Simulate Molecular Binding", type="primary", use_container_width=True):
        info = get_protein_for_disease(selected_disease)
        with st.spinner(f"Running VQE for {info['molecule']} (protein {info['pdb_id']})..."):
            result = simulate_binding(info["pdb_id"])
            st.session_state["binding_result"] = result

with sim_col2:
    if st.session_state["binding_result"] is not None:
        br = st.session_state["binding_result"]

        # Energy convergence chart
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=list(range(1, len(br["convergence_data"]) + 1)),
            y=br["convergence_data"],
            mode="lines+markers",
            name="VQE Energy",
            line=dict(color="#636EFA", width=2),
            marker=dict(size=4),
        ))
        fig.add_hline(
            y=br["binding_energy"],
            line_dash="dash",
            line_color="#EF553B",
            annotation_text=f"Ground State: {br['binding_energy']:.6f} Ha",
        )
        fig.update_layout(
            title=f"VQE Energy Convergence — {br['molecule']} (Protein {br['protein_id']})",
            xaxis_title="Iteration",
            yaxis_title="Energy (Hartree)",
            height=400,
        )
        st.plotly_chart(fig, use_container_width=True)

        # Result metrics
        m1, m2, m3 = st.columns(3)
        with m1:
            st.metric("Binding Energy", f"{br['binding_energy']:.6f} Ha")
        with m2:
            st.metric("Molecule", br["molecule"])
        with m3:
            st.metric("VQE Iterations", br["iterations"])

# ── RNA Secondary Structure Prediction ────────────────────────────────────

st.divider()
st.subheader("RNA Secondary Structure Prediction (QAOA)")
st.caption(
    "Select a sample RNA sequence or enter your own to predict secondary "
    "structure using the Quantum Approximate Optimization Algorithm."
)

rna_col1, rna_col2 = st.columns([1, 2])

with rna_col1:
    seq_choice = st.selectbox(
        "Sample Sequence",
        ["Custom"] + list(SAMPLE_SEQUENCES.keys()),
    )

    if seq_choice == "Custom":
        rna_input = st.text_input(
            "RNA Sequence (AUGC, max 12 bases)",
            value="GGGCCC",
            max_chars=12,
        )
    else:
        rna_input = SAMPLE_SEQUENCES[seq_choice]["sequence"]
        st.caption(SAMPLE_SEQUENCES[seq_choice]["description"])

    st.code(rna_input, language=None)

    if st.button("Predict Structure", type="primary", use_container_width=True):
        seq_clean = rna_input.upper().strip()
        if not seq_clean or not set(seq_clean).issubset({"A", "U", "G", "C"}):
            st.error("Invalid sequence. Use only A, U, G, C characters.")
        elif len(seq_clean) > 12:
            st.error("Sequence too long. Maximum 12 bases for quantum simulation.")
        else:
            with st.spinner(f"Running QAOA on {len(seq_clean)}-base sequence..."):
                try:
                    result = predict_structure(seq_clean)
                    st.session_state["rna_result"] = result
                except ValueError as e:
                    st.error(str(e))

with rna_col2:
    if st.session_state["rna_result"] is not None:
        rr = st.session_state["rna_result"]

        # Structure display
        st.markdown("**Predicted Structure (dot-bracket):**")
        st.code(f"{rr['sequence']}\n{rr['structure']}", language=None)

        if rr["pairs"]:
            st.markdown(f"**Base pairs found:** {len(rr['pairs'])}")
            for i, j in rr["pairs"]:
                st.markdown(
                    f"  {rr['sequence'][i]}({i+1}) — {rr['sequence'][j]}({j+1})"
                )
        else:
            st.markdown("**No base pairs predicted** (sequence may be too short or lack complementary bases)")

        # Convergence chart
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=list(range(1, len(rr["convergence_data"]) + 1)),
            y=rr["convergence_data"],
            mode="lines+markers",
            name="QAOA Energy",
            line=dict(color="#00CC96", width=2),
            marker=dict(size=4),
        ))
        fig.add_hline(
            y=rr["energy"],
            line_dash="dash",
            line_color="#EF553B",
            annotation_text=f"Optimized: {rr['energy']:.4f}",
        )
        fig.update_layout(
            title="QAOA Energy Convergence — RNA Folding",
            xaxis_title="Iteration",
            yaxis_title="Cost Energy",
            height=350,
        )
        st.plotly_chart(fig, use_container_width=True)

        # Metrics
        rm1, rm2, rm3 = st.columns(3)
        with rm1:
            st.metric("Qubits Used", rr["num_qubits"])
        with rm2:
            st.metric("QAOA Iterations", rr["iterations"])
        with rm3:
            st.metric("Pairs Found", len(rr["pairs"]))
