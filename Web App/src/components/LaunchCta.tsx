import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import Reveal from "./Reveal";

const API_URL = import.meta.env.VITE_API_URL || "https://h4h2026-production.up.railway.app";

interface PatientData {
    age_years: number | "";
    sex: string | "";
    heart_rate_bpm: number | "";
    systolic_bp_mmHg: number | "";
    diastolic_bp_mmHg: number | "";
    wbc: number | "";
    platelets: number | "";
    fever: boolean | "";
    muscle_pain: boolean | "";
    jaundice: boolean | "";
    vomiting: boolean | "";
    confusion: boolean | "";
    headache: boolean | "";
    chills: boolean | "";
    rigors: boolean | "";
    nausea: boolean | "";
    diarrhea: boolean | "";
    cough: boolean | "";
    bleeding: boolean | "";
    prostration: boolean | "";
    oliguria: boolean | "";
    anuria: boolean | "";
    conjunctival_suffusion: boolean | "";
    muscle_tenderness: boolean | "";
}

interface PredictionResult {
    prediction: string;
    anomaly_probability: number;
    healthy_probability: number;
    model_used: string;
    quantum_signature_dim: number;
}

const HEALTHY_PRESET: PatientData = {
    age_years: 28,
    sex: "male",
    heart_rate_bpm: 68,
    systolic_bp_mmHg: 118,
    diastolic_bp_mmHg: 76,
    wbc: 7000,
    platelets: 250000,
    fever: false,
    muscle_pain: false,
    jaundice: false,
    vomiting: false,
    confusion: false,
    headache: false,
    chills: false,
    rigors: false,
    nausea: false,
    diarrhea: false,
    cough: false,
    bleeding: false,
    prostration: false,
    oliguria: false,
    anuria: false,
    conjunctival_suffusion: false,
    muscle_tenderness: false,
};

const SICK_PRESET: PatientData = {
    age_years: 38,
    sex: 'male',
    heart_rate_bpm: 105,
    systolic_bp_mmHg: 95,
    diastolic_bp_mmHg: 58,
    wbc: 18000,
    platelets: 60000,
    fever: true,
    muscle_pain: true,
    jaundice: true,
    vomiting: true,
    confusion: true,
    headache: true,
    chills: true,
    rigors: true,
    nausea: true,
    diarrhea: true,
    cough: true,
    bleeding: true,
    prostration: true,
    oliguria: true,
    anuria: false,
    conjunctival_suffusion: true,
    muscle_tenderness: true,
};

function randomBetween(min: number, max: number, decimals = 0): number {
    const val = Math.random() * (max - min) + min;
    return Number(val.toFixed(decimals));
}

function generateRandomPatient(): PatientData {
    return {
        age_years: randomBetween(5, 70),
        sex: Math.random() > 0.5 ? "male" : "female",
        heart_rate_bpm: randomBetween(50, 135),
        systolic_bp_mmHg: randomBetween(85, 185),
        diastolic_bp_mmHg: randomBetween(40, 120),
        wbc: randomBetween(2000, 30000),
        platelets: randomBetween(10000, 500000),
        fever: Math.random() < 0.3,
        muscle_pain: Math.random() < 0.3,
        jaundice: Math.random() < 0.2,
        vomiting: Math.random() < 0.05,
        confusion: Math.random() < 0.05,
        headache: Math.random() < 0.4,
        chills: Math.random() < 0.4,
        rigors: Math.random() < 0.3,
        nausea: Math.random() < 0.3,
        diarrhea: Math.random() < 0.2,
        cough: Math.random() < 0.2,
        bleeding: Math.random() < 0.15,
        prostration: Math.random() < 0.2,
        oliguria: Math.random() < 0.15,
        anuria: Math.random() < 0.1,
        conjunctival_suffusion: Math.random() < 0.2,
        muscle_tenderness: Math.random() < 0.3,
    };
}

function PatientForm() {
    const [form, setForm] = useState<PatientData>({
        age_years: 0,
        sex: "",
        heart_rate_bpm: 0,
        systolic_bp_mmHg: 0,
        diastolic_bp_mmHg: 0,
        wbc: 0,
        platelets: 0,
        fever: false,
        muscle_pain: false,
        jaundice: false,
        vomiting: false,
        confusion: false,
        headache: false,
        chills: false,
        rigors: false,
        nausea: false,
        diarrhea: false,
        cough: false,
        bleeding: false,
        prostration: false,
        oliguria: false,
        anuria: false,
        conjunctival_suffusion: false,
        muscle_tenderness: false,
    });

    const [result, setResult] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : Number(value),
        }));
    };

    const handleSexChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedSex = e.target.value;
        setForm((prev) => ({
            ...prev,
            sex: selectedSex,
        }));
    };

    const isFormValid = () => {
        const requiredNumericFields = [
            "age_years",
            "heart_rate_bpm",
            "systolic_bp_mmHg",
            "diastolic_bp_mmHg",
            "wbc",
            "platelets",
        ];

        for (const field of requiredNumericFields) {
            if (form[field as keyof PatientData] === "") {
                return false;
            }
        }

        if (!form.sex) return false;

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid()) {
            setError("Please complete all required fields before submitting.");
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch(`${API_URL}/predict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    heart_rate_bpm: form.heart_rate_bpm,
                    systolic_bp_mmHg: form.systolic_bp_mmHg,
                    diastolic_bp_mmHg: form.diastolic_bp_mmHg,
                    age_years: form.age_years,
                    sex: form.sex === "male" ? "M" : form.sex === "female" ? "F" : undefined,
                    wbc: form.wbc,
                    platelets: form.platelets,
                    fever: form.fever,
                    muscle_pain: form.muscle_pain,
                    jaundice: form.jaundice,
                    vomiting: form.vomiting,
                    confusion: form.confusion,
                    headache: form.headache,
                    chills: form.chills,
                    rigors: form.rigors,
                    nausea: form.nausea,
                    diarrhea: form.diarrhea,
                    cough: form.cough,
                    bleeding: form.bleeding,
                    prostration: form.prostration,
                    oliguria: form.oliguria,
                    anuria: form.anuria,
                    conjunctival_suffusion: form.conjunctival_suffusion,
                    muscle_tenderness: form.muscle_tenderness,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                const detail = err.detail;
                const message = Array.isArray(detail)
                    ? detail.map((e: any) => e.msg).join(", ")
                    : detail || "Prediction failed";
                throw new Error(message);
            }

            const data: PredictionResult = await res.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || "Failed to connect to quantum backend");
        } finally {
            setLoading(false);
        }
    };

    const anomalyPct = result ? Math.round(result.anomaly_probability * 100) : 0;
    const healthyPct = result ? Math.round(result.healthy_probability * 100) : 0;

    return (
        <section
            id="demo"
            style={{
                maxWidth: 1140,
                margin: "0 auto",
                padding: "80px clamp(24px, 4vw, 48px) 120px",
            }}
        >
            <Reveal>
                <div
                    style={{
                        background: "var(--gray-100)",
                        border: "1px solid var(--gray-200)",
                        borderRadius: 16,
                        padding: "clamp(48px, 6vw, 80px) clamp(24px, 4vw, 60px)",
                        textAlign: "center",
                    }}
                >
                    <h2
                        style={{
                            fontFamily: "var(--serif)",
                            fontSize: "clamp(28px, 4vw, 44px)",
                            fontWeight: 400,
                            letterSpacing: "-0.02em",
                            marginBottom: 8,
                        }}
                    >
                        Patient Diagnosis Demo
                    </h2>
                    <p style={{
                        fontFamily: "'EB Garamond', Georgia, 'Times New Roman', serif",
                        fontSize: "clamp(16px, 2.5vw, 22px)",
                        fontWeight: 400,
                        color: "#6b6b6b",
                        marginBottom: 32,
                    }}>
                        Run predictive diagnoses for leptospirosis
                    </p>
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 12,
                        marginBottom: 28,
                        flexWrap: "wrap",
                    }}>
                        {[
                            { label: "Healthy Patient", preset: HEALTHY_PRESET, color: "#228B22" },
                            { label: "Sick Patient", preset: SICK_PRESET, color: "var(--red)" },
                            { label: "Random Patient", preset: null as PatientData | null, color: "var(--gray-600, #555)" },
                        ].map((btn) => (
                            <button
                                key={btn.label}
                                type="button"
                                onClick={() => {
                                    setForm(btn.preset ?? generateRandomPatient());
                                    setResult(null);
                                    setError(null);
                                }}
                                style={{
                                    padding: "10px 20px",
                                    fontSize: 14,
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    fontFamily: "var(--mono)",
                                    background: "transparent",
                                    color: btn.color,
                                    border: `1.5px solid ${btn.color}`,
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                    <form
                        onSubmit={handleSubmit}
                        style={{
                            display: "grid",
                            gap: 16,
                            gridTemplateColumns: "1fr 1fr",
                            marginBottom: 32,
                            textAlign: "left",
                        }}
                    >
                        {/* Numeric inputs with labels */}
                        {([
                            { name: "age_years", label: "Age (years)" },
                            { name: "heart_rate_bpm", label: "Heart Rate (bpm)" },
                            { name: "systolic_bp_mmHg", label: "Systolic BP (mmHg)" },
                            { name: "diastolic_bp_mmHg", label: "Diastolic BP (mmHg)" },
                            { name: "wbc", label: "WBC (cells/uL)" },
                            { name: "platelets", label: "Platelets (cells/uL)" },
                        ] as { name: keyof PatientData; label: string }[]).map((field) => (
                            <div key={field.name} style={{ display: "flex", flexDirection: "column", maxWidth: '35vw' }}>
                                <label
                                    htmlFor={field.name}
                                    style={{ marginBottom: 4, fontFamily: "var(--mono)", fontSize: 14, fontWeight: "bold" }}
                                >
                                    {field.label}
                                </label>
                                <input
                                    id={field.name}
                                    type="number"
                                    name={field.name}
                                    value={form[field.name] as number || ""}
                                    onChange={handleChange}
                                    style={{
                                        padding: "12px 16px",
                                        borderRadius: 8,
                                        border: "1px solid var(--gray-200)",
                                        background: "var(--white)",
                                        fontFamily: "var(--mono)",
                                    }}
                                />
                            </div>
                        ))}

                        <div style={{ display: "flex", flexDirection: "column", gridColumn: "span 2" }}>
                            <label
                                htmlFor="sex"
                                style={{ marginBottom: 4, fontFamily: "var(--mono)", fontSize: 14, fontWeight: "bold" }}
                            >
                                Sex
                            </label>
                            <select
                                id="sex"
                                name="sex"
                                value={form.sex}
                                onChange={handleSexChange}
                                style={{
                                    padding: "12px 16px",
                                    borderRadius: 8,
                                    border: "1px solid var(--gray-200)",
                                    background: "var(--white)",
                                    fontFamily: "var(--mono)",
                                }}
                            >
                                {form.sex == "" && <option value="">Select sex</option>}
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Boolean checkboxes with labels */}
                        <label
                            htmlFor="sex"
                            style={{ marginBottom: 4, fontFamily: "var(--mono)", fontSize: 14, fontWeight: "bold" }}
                        >
                            Symptoms
                        </label>
                        {([
                            { name: "fever", label: "Fever" },
                            { name: "muscle_pain", label: "Muscle Pain" },
                            { name: "jaundice", label: "Jaundice" },
                            { name: "vomiting", label: "Vomiting" },
                            { name: "confusion", label: "Confusion" },
                            { name: "headache", label: "Headache" },
                            { name: "chills", label: "Chills" },
                            { name: "rigors", label: "Rigors" },
                            { name: "nausea", label: "Nausea" },
                            { name: "diarrhea", label: "Diarrhea" },
                            { name: "cough", label: "Cough" },
                            { name: "bleeding", label: "Bleeding" },
                            { name: "prostration", label: "Prostration" },
                            { name: "oliguria", label: "Oliguria" },
                            { name: "anuria", label: "Anuria" },
                            { name: "conjunctival_suffusion", label: "Conj. Suffusion" },
                            { name: "muscle_tenderness", label: "Muscle Tenderness" },
                        ] as { name: keyof PatientData; label: string }[]).map((field) => (
                            <label
                                key={field.name}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    fontFamily: "var(--mono)",
                                    fontWeight: "bold",
                                    fontSize: 14,
                                    cursor: "pointer",
                                    userSelect: "none",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    name={field.name}
                                    checked={!!form[field.name]}
                                    onChange={handleChange}
                                    style={{ display: "none" }}
                                />
                                <span
                                    style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 6,
                                        border: "2px solid var(--gray-200)",
                                        background: form[field.name] ? "var(--red)" : "white",
                                        display: "inline-block",
                                        transition: "all 0.2s ease",
                                        position: "relative",
                                    }}
                                >
                                    {form[field.name] && (
                                        <span
                                            style={{
                                                position: "absolute",
                                                top: 2,
                                                left: 6,
                                                width: 5,
                                                height: 10,
                                                border: "solid var(--white)",
                                                borderWidth: "0 2px 2px 0",
                                                transform: "rotate(45deg)",
                                            }}
                                        />
                                    )}
                                </span>
                                {field.label}
                            </label>
                        ))}

                        {/* Submit button */}
                        <div
                            style={{
                                gridColumn: "1 / -1",
                                textAlign: "center",
                                marginTop: 16,
                            }}
                        >
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    padding: "14px 32px",
                                    fontSize: 16,
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    background: loading ? "var(--gray-400)" : "var(--red)",
                                    color: "var(--white)",
                                    border: "none",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    transition: "background 0.2s ease",
                                }}
                            >
                                {loading ? "Simulating quantum circuits..." : "Run Diagnosis"}
                            </button>
                        </div>
                    </form>

                    {/* Error message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                style={{
                                    background: "rgba(199, 64, 45, 0.08)",
                                    border: "1px solid var(--red)",
                                    borderRadius: 12,
                                    padding: "16px 24px",
                                    marginBottom: 24,
                                    fontFamily: "var(--mono)",
                                    fontSize: 14,
                                    color: "var(--red)",
                                }}
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Results panel */}
                    <AnimatePresence>
                        {result && (
                            <motion.div
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                                style={{
                                    background: "var(--paper)",
                                    border: "1px solid var(--gray-200)",
                                    borderRadius: 12,
                                    padding: "clamp(32px, 4vw, 48px)",
                                    marginBottom: 24,
                                    textAlign: "left",
                                }}
                            >
                                {/* Prediction header */}
                                <div style={{ textAlign: "center", marginBottom: 32 }}>
                                    <motion.div
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                        style={{
                                            display: "inline-block",
                                            padding: "12px 28px",
                                            borderRadius: 100,
                                            background: result.prediction === "healthy"
                                                ? "rgba(34, 139, 34, 0.1)"
                                                : "rgba(199, 64, 45, 0.1)",
                                            border: `1px solid ${result.prediction === "healthy" ? "rgba(34, 139, 34, 0.3)" : "rgba(199, 64, 45, 0.3)"}`,
                                            marginBottom: 16,
                                        }}
                                    >
                                        <span style={{
                                            fontFamily: "var(--serif)",
                                            fontSize: "clamp(24px, 3vw, 36px)",
                                            fontWeight: 400,
                                            fontStyle: "italic",
                                            color: result.prediction === "healthy" ? "#228B22" : "var(--red)",
                                        }}>
                                            {result.prediction === "healthy" ? "Likely Negative" : "Potentially Positive"}
                                        </span>
                                    </motion.div>
                                </div>

                                {/* Probability bars */}
                                <div style={{ display: "grid", gap: 16, maxWidth: 500, margin: "0 auto 32px" }}>
                                    <div>
                                        <div style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: 6,
                                            fontFamily: "var(--mono)",
                                            fontSize: 13,
                                        }}>
                                            <span>Negative</span>
                                            <span style={{ fontWeight: 700 }}>{healthyPct}%</span>
                                        </div>
                                        <div style={{
                                            height: 8,
                                            borderRadius: 4,
                                            background: "var(--gray-200)",
                                            overflow: "hidden",
                                        }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${healthyPct}%` }}
                                                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                                                style={{
                                                    height: "100%",
                                                    borderRadius: 4,
                                                    background: "#228B22",
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: 6,
                                            fontFamily: "var(--mono)",
                                            fontSize: 13,
                                        }}>
                                            <span>Positive</span>
                                            <span style={{ fontWeight: 700 }}>{anomalyPct}%</span>
                                        </div>
                                        <div style={{
                                            height: 8,
                                            borderRadius: 4,
                                            background: "var(--gray-200)",
                                            overflow: "hidden",
                                        }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${anomalyPct}%` }}
                                                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                                                style={{
                                                    height: "100%",
                                                    borderRadius: 4,
                                                    background: "var(--red)",
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Technical details */}
                                <div style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    gap: 24,
                                    flexWrap: "wrap",
                                }}>
                                    {[
                                        { label: "Model", value: result.model_used === "quantum_kernel_svm_16q" ? "Quantum SVM" : result.model_used === "federated_global_boundary" ? "Federated" : "Risk Score" },
                                        { label: "Qubits", value: "16" },
                                        { label: "State Dim", value: String(result.quantum_signature_dim) },
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            style={{
                                                padding: "8px 16px",
                                                borderRadius: 8,
                                                border: "1px solid var(--gray-200)",
                                                fontFamily: "var(--mono)",
                                                fontSize: 12,
                                                textAlign: "center",
                                            }}
                                        >
                                            <div style={{ color: "var(--gray-400)", marginBottom: 2 }}>{item.label}</div>
                                            <div style={{ fontWeight: 700 }}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                        <Link
                            to="/validation"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "12px 24px",
                                fontSize: 14,
                                borderRadius: 8,
                                fontWeight: 600,
                                fontFamily: "var(--mono)",
                                background: "transparent",
                                color: "var(--gray-600)",
                                border: "1.5px solid var(--gray-300)",
                                textDecoration: "none",
                                transition: "all 0.2s ease",
                            }}
                        >
                            <FlaskConical size={16} />
                            Test with Real Patients
                        </Link>
                    </div>

                    <p
                        style={{
                            fontSize: 13,
                            color: "var(--gray-400)",
                            fontFamily: "var(--mono)",
                            textAlign: "center",
                        }}
                    >
                        QuantumDx is a research prototype. Not for clinical use.
                    </p>
                </div>
            </Reveal>
        </section>
    );
};

export default PatientForm;
