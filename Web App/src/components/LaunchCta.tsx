import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Reveal from "./Reveal";

const API_URL = "https://h4h2026-production.up.railway.app";

interface PatientData {
    age_years: number;
    sex: string;
    height_cm: number;
    weight_kg: number;
    bmi: number;
    heart_rate_bpm: number;
    temperature_c: number;
    systolic_bp_mmHg: number;
    diastolic_bp_mmHg: number;
    oxygen_saturation_pct: number;
    fatigue: boolean;
    weight_loss: boolean;
    seizures: boolean;
    developmental_delay: boolean;
    muscle_weak: boolean;
}

interface PredictionResult {
    prediction: string;
    anomaly_probability: number;
    healthy_probability: number;
    model_used: string;
    quantum_signature_dim: number;
}

function PatientForm() {
    const [form, setForm] = useState<PatientData>({
        age_years: 0,
        sex: "",
        height_cm: 0,
        weight_kg: 0,
        bmi: 0,
        heart_rate_bpm: 0,
        temperature_c: 0,
        systolic_bp_mmHg: 0,
        diastolic_bp_mmHg: 0,
        oxygen_saturation_pct: 0,
        fatigue: false,
        weight_loss: false,
        seizures: false,
        developmental_delay: false,
        muscle_weak: false,
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                    temperature_c: form.temperature_c,
                    oxygen_saturation_pct: form.oxygen_saturation_pct,
                    age_years: form.age_years,
                    sex: form.sex === "male" ? "M" : form.sex === "female" ? "F" : undefined,
                    height_cm: form.height_cm || undefined,
                    weight_kg: form.weight_kg || undefined,
                    fatigue: form.fatigue,
                    weight_loss: form.weight_loss,
                    seizures: form.seizures,
                    developmental_delay: form.developmental_delay,
                    muscle_weakness: form.muscle_weak,
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
                            marginBottom: 32,
                        }}
                    >
                        Patient Diagnosis
                    </h2>
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
                        {[
                            { name: "age_years", label: "Age (years)" },
                            { name: "height_cm", label: "Height (cm)" },
                            { name: "weight_kg", label: "Weight (kg)" },
                            { name: "bmi", label: "BMI" },
                            { name: "heart_rate_bpm", label: "Heart Rate (bpm)" },
                            { name: "temperature_c", label: "Temperature (°C)" },
                            { name: "systolic_bp_mmHg", label: "Systolic BP (mmHg)" },
                            { name: "diastolic_bp_mmHg", label: "Diastolic BP (mmHg)" },
                            { name: "oxygen_saturation_pct", label: "Oxygen Saturation (%)" },
                        ].map((field) => (
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
                        {[
                            { name: "fatigue", label: "Fatigue" },
                            { name: "weight_loss", label: "Weight Loss" },
                            { name: "seizures", label: "Seizures" },
                            { name: "developmental_delay", label: "Developmental Delay" },
                            { name: "muscle_weak", label: "Muscle Weakness" },
                        ].map((field) => (
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
                                    checked={(form as any)[field.name]}
                                    onChange={handleChange}
                                    style={{ display: "none" }}
                                />
                                <span
                                    style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 6,
                                        border: "2px solid var(--gray-200)",
                                        background: (form as any)[field.name] ? "var(--red)" : "white",
                                        display: "inline-block",
                                        transition: "all 0.2s ease",
                                        position: "relative",
                                    }}
                                >
                                    {(form as any)[field.name] && (
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
                                            {result.prediction === "healthy" ? "Healthy" : "Anomaly Detected"}
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
                                            <span>Healthy</span>
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
                                            <span>Anomaly</span>
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
                                        { label: "Model", value: result.model_used === "federated_global_boundary" ? "Federated" : "Local SVM" },
                                        { label: "Qubits", value: "4" },
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
