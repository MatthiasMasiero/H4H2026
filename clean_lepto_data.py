"""
clean_lepto_data.py — Clean leptospirosis clinical data for quantum engine
==========================================================================
Reads the raw 1,734-row dataset, replaces 99 sentinels with NaN,
drops incomplete rows, remaps columns to quantum engine format,
and outputs a clean CSV ready for condense_features().

Usage:  python clean_lepto_data.py
Output: data/patients_lepto_clean.csv
"""

import pandas as pd
import numpy as np
import os

RAW_PATH = os.path.join("data", "Leptospirosis clinical data.csv")
OUT_PATH = os.path.join("data", "patients_lepto_clean.csv")

# ── Columns we keep and their sentinel handling ──────────────────────────────

# All columns where 99 means missing
SENTINEL_COLS = [
    "Age", "Sex", "PRad", "SBPadd", "DBPadd",
    "Feverad", "Headachead", "Musclepainad", "Chillsad", "Rigorsad",
    "Nauseaad", "Vomitingadmission", "Diarrhoeaad", "Jaundicead",
    "Coughad", "Confusionad", "Bleedingad", "Prostrationad",
    "OliguriaAd", "Anuriaad", "Cnsuffusionad", "Muscletendernessad",
    "WBCcount", "Plateletcount",
]

# Columns required to keep a row (demographics + symptoms + vitals + basic labs)
REQUIRED_COLS = [
    "Age", "Sex",
    "PRad", "SBPadd", "DBPadd",
    "Feverad", "Headachead", "Musclepainad", "Chillsad", "Rigorsad",
    "Nauseaad", "Vomitingadmission", "Diarrhoeaad", "Jaundicead",
    "Coughad", "Confusionad", "Bleedingad",
    "WBCcount", "Plateletcount",
]

# ── Column mapping: raw CSV name → quantum engine key ────────────────────────
# Symptoms use 1=yes, 2=no in the raw data → converted to 1/0
# Sex uses 1=male, 2=female → converted to "M"/"F"
# Label uses 1=positive, 2=negative → converted to 1/0

COLUMN_MAP = {
    "Age":                "age",
    "Sex":                "sex",
    "PRad":               "heart_rate",
    "SBPadd":             "bp_systolic",
    "DBPadd":             "bp_diastolic",
    "Feverad":            "fever",
    "Musclepainad":       "muscle_pain",
    "Jaundicead":         "jaundice",
    "Vomitingadmission":  "vomiting",
    "Confusionad":        "confusion",
    "Final":              "diagnosis",
}

# Extra symptom columns kept for reference (not mapped to engine slots)
EXTRA_SYMPTOM_MAP = {
    "Headachead":         "headache",
    "Chillsad":           "chills",
    "Rigorsad":           "rigors",
    "Nauseaad":           "nausea",
    "Diarrhoeaad":        "diarrhea",
    "Coughad":            "cough",
    "Bleedingad":         "bleeding",
    "Prostrationad":      "prostration",
    "OliguriaAd":         "oliguria",
    "Anuriaad":           "anuria",
    "Cnsuffusionad":      "conjunctival_suffusion",
    "Muscletendernessad": "muscle_tenderness",
}


def clean():
    print(f"Reading {RAW_PATH}...")
    df = pd.read_csv(RAW_PATH, encoding="utf-8-sig", low_memory=False)
    print(f"  Raw: {len(df)} rows, {len(df.columns)} columns")

    # Replace 99 sentinels with NaN
    for col in SENTINEL_COLS:
        if col in df.columns:
            df.loc[df[col] == 99, col] = np.nan

    # Drop rows missing any required column
    before = len(df)
    df = df.dropna(subset=REQUIRED_COLS)
    print(f"  After dropping incomplete rows: {len(df)} rows (removed {before - len(df)})")

    # Build output dataframe with engine-ready columns
    out = pd.DataFrame()

    # Patient ID
    out["patient_id"] = [f"LP_{i:04d}" for i in range(len(df))]

    # Demographics
    out["age"] = df["Age"].values.astype(float)
    out["sex"] = df["Sex"].map({1: "M", 2: "F"}).values

    # Vitals
    out["heart_rate"] = df["PRad"].values.astype(float)
    out["bp_systolic"] = df["SBPadd"].values.astype(float)
    out["bp_diastolic"] = df["DBPadd"].values.astype(float)

    # Labs
    out["wbc"] = df["WBCcount"].values.astype(float)
    out["platelets"] = df["Plateletcount"].values.astype(float)

    # Symptoms: 1=yes, 2=no → 1/0
    symptom_map = {
        "Feverad":            "fever",
        "Musclepainad":       "muscle_pain",
        "Jaundicead":         "jaundice",
        "Vomitingadmission":  "vomiting",
        "Confusionad":        "confusion",
    }
    for raw_col, engine_col in symptom_map.items():
        out[engine_col] = (df[raw_col].values == 1).astype(int)

    # Extra symptoms (not mapped to engine slots, but preserved)
    for raw_col, clean_col in EXTRA_SYMPTOM_MAP.items():
        if raw_col in df.columns:
            vals = df[raw_col].values
            out[clean_col] = np.where(np.isnan(vals.astype(float)), 0, (vals == 1).astype(int))

    # Label: 1=positive, 2=negative → 1/0
    out["diagnosis"] = (df["Final"].values == 1).astype(int)

    # Save
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    out.to_csv(OUT_PATH, index=False)

    # Summary
    pos = out["diagnosis"].sum()
    neg = len(out) - pos
    print(f"\nSaved {len(out)} patients to {OUT_PATH}")
    print(f"  Positive: {pos} ({100*pos/len(out):.1f}%)")
    print(f"  Negative: {neg} ({100*neg/len(out):.1f}%)")
    print(f"  Columns:  {list(out.columns)}")


if __name__ == "__main__":
    clean()
