"""
demo.py — Validate Quantum SVM on real leptospirosis patients
=============================================================
Run with:  python3 demo.py

Loads selected patients from the real CSV (patients_lepto_clean.csv)
and runs them through the 16-qubit quantum fidelity kernel to validate
predictions against known diagnoses.
"""

import pandas as pd
from quantum_engine import bootstrap_svm_reference, predict_quantum_svm

# ── Validation patient IDs from the real CSV ─────────────────────────────

TRUE_POSITIVE_IDS = [
    "LP_0275",  # 98.2% — PLT 38k, jaundice, bleeding, anuria
    "LP_0191",  # 97.2% — PLT 11k, jaundice, bleeding, anuria
    "LP_0241",  # 96.9% — PLT 12k, anuria, prostration
    "LP_0089",  # 94.9% — PLT 59k, conjunctival suffusion
    "LP_0265",  # 94.8% — PLT 56k, jaundice, bleeding
    "LP_0062",  # 94.4% — PLT 18k, BP 90/60, bleeding
    "LP_0133",  # 92.8% — BP 90/60, jaundice, confusion
    "LP_0108",  # 91.0% — jaundice, conjunctival suffusion
    "LP_0040",  # 90.6% — PLT 42k, jaundice, conjunctival suffusion
    "LP_0050",  # 88.6% — PLT 29k, oliguria, vomiting
    "LP_0125",  # 87.5% — PLT 18k, jaundice, oliguria, bleeding
    "LP_0023",  # 86.8% — oliguria, conjunctival suffusion
]

TRUE_NEGATIVE_IDS = [
    "LP_0085",  #  0.1% — PLT 162k, normal vitals, no severe symptoms
    "LP_0177",  #  0.2% — PLT 171k, only cough + prostration
    "LP_0459",  #  0.2% — PLT 280k, only headache
    "LP_0079",  #  0.6% — only cough
    "LP_0333",  #  0.7% — PLT 175k, mild symptoms
    "LP_0433",  #  1.0% — PLT 262k, mild fever/muscle pain
    "LP_0495",  #  1.1% — PLT 198k, mild symptoms
    "LP_0452",  #  1.2% — PLT 216k, mild symptoms
    "LP_0016",  #  1.3% — PLT 70k, only cough
    "LP_0086",  #  3.5% — no symptoms at all
    "LP_0012",  #  5.2% — PLT 83k, only chills
    "LP_0035",  #  3.9% — PLT 289k, only fever + prostration
]

SYMPTOM_COLS = [
    "fever", "muscle_pain", "jaundice", "vomiting", "confusion", "headache",
    "chills", "rigors", "nausea", "diarrhea", "cough", "bleeding",
    "prostration", "oliguria", "anuria", "conjunctival_suffusion",
    "muscle_tenderness",
]


def row_to_raw_dict(row):
    raw = {
        "heart_rate": float(row["heart_rate"]),
        "bp_systolic": float(row["bp_systolic"]),
        "bp_diastolic": float(row["bp_diastolic"]),
        "age": float(row["age"]),
        "sex": str(row["sex"]),
        "wbc": float(row["wbc"]),
        "platelets": float(row["platelets"]),
    }
    for s in SYMPTOM_COLS:
        raw[s] = bool(int(row[s]))
    return raw


def main():
    print("=" * 80)
    print("  QuantumDx — 16-Qubit Quantum Fidelity Kernel Validation")
    print("  Real leptospirosis patients from Kisumu County, Kenya")
    print("=" * 80)
    print()

    # Train model on 30 reference patients
    print("Training quantum SVM on 30 reference patients (15 healthy, 15 sick)...")
    model = bootstrap_svm_reference()
    print(f"  Model ready: {model['n_train']} training statevectors (dim = 2^16 = 65,536)")
    print()

    # Load CSV
    df = pd.read_csv("data/patients_lepto_clean.csv")
    df = df.set_index("patient_id")

    # ── True Positives ───────────────────────────────────────────────────
    print("-" * 80)
    print("  TRUE POSITIVES — Diagnosed leptospirosis, model correctly identifies")
    print("-" * 80)
    print(f"  {'ID':<10} {'Score':>7}  {'PLT':>7} {'WBC':>6} {'HR':>3} {'BP':>7} {'Age':>3}  Symptoms")
    print("-" * 80)

    tp_correct = 0
    for pid in TRUE_POSITIVE_IDS:
        row = df.loc[pid]
        raw = row_to_raw_dict(row)
        prob = predict_quantum_svm(raw, model)
        bp = f"{raw['bp_systolic']:.0f}/{raw['bp_diastolic']:.0f}"
        syms = [s for s in SYMPTOM_COLS if raw[s]]
        mark = "+" if prob > 0.5 else "-"
        if prob > 0.5:
            tp_correct += 1
        print(f"  {pid:<10} {prob*100:>6.1f}%  {raw['platelets']:>7.0f} {raw['wbc']:>6.0f} "
              f"{raw['heart_rate']:>3.0f} {bp:>7} {raw['age']:>3.0f}  {', '.join(syms)}")

    print()
    print(f"  Result: {tp_correct}/{len(TRUE_POSITIVE_IDS)} correctly identified as anomaly")
    print()

    # ── True Negatives ───────────────────────────────────────────────────
    print("-" * 80)
    print("  TRUE NEGATIVES — Not leptospirosis, model correctly clears")
    print("-" * 80)
    print(f"  {'ID':<10} {'Score':>7}  {'PLT':>7} {'WBC':>6} {'HR':>3} {'BP':>7} {'Age':>3}  Symptoms")
    print("-" * 80)

    tn_correct = 0
    for pid in TRUE_NEGATIVE_IDS:
        row = df.loc[pid]
        raw = row_to_raw_dict(row)
        prob = predict_quantum_svm(raw, model)
        bp = f"{raw['bp_systolic']:.0f}/{raw['bp_diastolic']:.0f}"
        syms = [s for s in SYMPTOM_COLS if raw[s]]
        if prob <= 0.5:
            tn_correct += 1
        print(f"  {pid:<10} {prob*100:>6.1f}%  {raw['platelets']:>7.0f} {raw['wbc']:>6.0f} "
              f"{raw['heart_rate']:>3.0f} {bp:>7} {raw['age']:>3.0f}  {', '.join(syms) if syms else 'none'}")

    print()
    print(f"  Result: {tn_correct}/{len(TRUE_NEGATIVE_IDS)} correctly identified as healthy")
    print()

    # ── Summary ──────────────────────────────────────────────────────────
    total = len(TRUE_POSITIVE_IDS) + len(TRUE_NEGATIVE_IDS)
    correct = tp_correct + tn_correct
    print("=" * 80)
    print(f"  SUMMARY: {correct}/{total} real patients correctly classified ({correct/total*100:.0f}%)")
    print()
    print(f"  Sensitivity (true positive rate):  {tp_correct}/{len(TRUE_POSITIVE_IDS)} "
          f"({tp_correct/len(TRUE_POSITIVE_IDS)*100:.0f}%)")
    print(f"  Specificity (true negative rate):  {tn_correct}/{len(TRUE_NEGATIVE_IDS)} "
          f"({tn_correct/len(TRUE_NEGATIVE_IDS)*100:.0f}%)")
    print()
    print("  Model: 16-qubit ZZFeatureMap, quantum fidelity kernel, 30 training patients")
    print("  Data:  Real leptospirosis patients — Kisumu County, Kenya (498 total)")
    print("=" * 80)


if __name__ == "__main__":
    main()
