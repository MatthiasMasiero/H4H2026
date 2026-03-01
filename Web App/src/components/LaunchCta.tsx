import React, { useState } from "react";
import Reveal from "./Reveal";

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Handle submitting input
    };

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
                                    //value={(form as any)[field.name]}
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
                                style={{
                                    padding: "14px 32px",
                                    fontSize: 16,
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    background: "var(--red)",
                                    color: "var(--white)",
                                    border: "none",
                                    cursor: "pointer",
                                }}
                            >
                                Run Diagnosis
                            </button>
                        </div>
                    </form>
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