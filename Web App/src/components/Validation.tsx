import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, FlaskConical, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "https://h4h2026-production.up.railway.app";

interface RealPatient {
  id: string;
  diagnosis: 0 | 1;
  age: number;
  sex: string;
  heart_rate: number;
  bp_systolic: number;
  bp_diastolic: number;
  wbc: number;
  platelets: number;
  symptoms: string[];
}

interface PatientResult extends RealPatient {
  score: number;
  correct: boolean;
}

const TRUE_POSITIVES: RealPatient[] = [
  { id: "LP_0275", diagnosis: 1, age: 29, sex: "M", heart_rate: 68, bp_systolic: 104, bp_diastolic: 63, wbc: 6680, platelets: 38000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "rigors", "bleeding", "anuria", "muscle_tenderness"] },
  { id: "LP_0191", diagnosis: 1, age: 38, sex: "M", heart_rate: 96, bp_systolic: 120, bp_diastolic: 80, wbc: 13900, platelets: 11000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "diarrhoea", "cough", "bleeding", "prostration", "anuria", "muscle_tenderness"] },
  { id: "LP_0241", diagnosis: 1, age: 61, sex: "M", heart_rate: 98, bp_systolic: 114, bp_diastolic: 62, wbc: 12120, platelets: 12000, symptoms: ["muscle_pain", "nausea", "cough", "prostration", "anuria", "muscle_tenderness"] },
  { id: "LP_0089", diagnosis: 1, age: 29, sex: "M", heart_rate: 78, bp_systolic: 100, bp_diastolic: 60, wbc: 8100, platelets: 59000, symptoms: ["fever", "headache", "chills", "rigors", "cough", "conjunctival_suffusion"] },
  { id: "LP_0265", diagnosis: 1, age: 41, sex: "M", heart_rate: 70, bp_systolic: 120, bp_diastolic: 70, wbc: 11500, platelets: 56000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "cough", "bleeding", "muscle_tenderness"] },
  { id: "LP_0062", diagnosis: 1, age: 43, sex: "M", heart_rate: 80, bp_systolic: 90, bp_diastolic: 60, wbc: 8500, platelets: 18000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "nausea", "cough", "bleeding", "muscle_tenderness"] },
  { id: "LP_0133", diagnosis: 1, age: 60, sex: "F", heart_rate: 78, bp_systolic: 90, bp_diastolic: 60, wbc: 9100, platelets: 79000, symptoms: ["fever", "jaundice", "confusion", "headache", "chills", "rigors", "nausea", "diarrhoea", "prostration"] },
  { id: "LP_0108", diagnosis: 1, age: 36, sex: "M", heart_rate: 76, bp_systolic: 100, bp_diastolic: 70, wbc: 8700, platelets: 86000, symptoms: ["fever", "muscle_pain", "jaundice", "vomiting", "headache", "chills", "rigors", "nausea", "cough", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0040", diagnosis: 1, age: 60, sex: "M", heart_rate: 74, bp_systolic: 90, bp_diastolic: 50, wbc: 15800, platelets: 42000, symptoms: ["fever", "muscle_pain", "jaundice", "confusion", "chills", "conjunctival_suffusion", "muscle_tenderness"] },
  { id: "LP_0050", diagnosis: 1, age: 35, sex: "M", heart_rate: 100, bp_systolic: 110, bp_diastolic: 90, wbc: 2500, platelets: 29000, symptoms: ["vomiting", "nausea", "oliguria"] },
  { id: "LP_0125", diagnosis: 1, age: 37, sex: "M", heart_rate: 74, bp_systolic: 100, bp_diastolic: 60, wbc: 4500, platelets: 18000, symptoms: ["jaundice", "vomiting", "nausea", "cough", "bleeding", "oliguria"] },
  { id: "LP_0023", diagnosis: 1, age: 61, sex: "M", heart_rate: 80, bp_systolic: 140, bp_diastolic: 70, wbc: 9200, platelets: 59000, symptoms: ["fever", "muscle_pain", "vomiting", "headache", "nausea", "oliguria", "conjunctival_suffusion", "muscle_tenderness"] },
];

const TRUE_NEGATIVES: RealPatient[] = [
  { id: "LP_0085", diagnosis: 0, age: 51, sex: "M", heart_rate: 78, bp_systolic: 110, bp_diastolic: 70, wbc: 3800, platelets: 162000, symptoms: ["fever", "muscle_pain", "jaundice", "headache", "chills", "rigors", "diarrhoea", "muscle_tenderness"] },
  { id: "LP_0177", diagnosis: 0, age: 25, sex: "M", heart_rate: 72, bp_systolic: 120, bp_diastolic: 80, wbc: 5500, platelets: 171000, symptoms: ["cough", "prostration"] },
  { id: "LP_0459", diagnosis: 0, age: 49, sex: "M", heart_rate: 92, bp_systolic: 160, bp_diastolic: 100, wbc: 11120, platelets: 280000, symptoms: ["headache"] },
  { id: "LP_0079", diagnosis: 0, age: 66, sex: "M", heart_rate: 80, bp_systolic: 100, bp_diastolic: 60, wbc: 6900, platelets: 108000, symptoms: ["cough"] },
  { id: "LP_0333", diagnosis: 0, age: 50, sex: "M", heart_rate: 72, bp_systolic: 120, bp_diastolic: 80, wbc: 5580, platelets: 175000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "diarrhoea", "cough", "muscle_tenderness"] },
  { id: "LP_0433", diagnosis: 0, age: 29, sex: "M", heart_rate: 88, bp_systolic: 120, bp_diastolic: 80, wbc: 6630, platelets: 262000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors", "nausea", "diarrhoea"] },
  { id: "LP_0495", diagnosis: 0, age: 41, sex: "M", heart_rate: 76, bp_systolic: 110, bp_diastolic: 70, wbc: 5350, platelets: 198000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors"] },
  { id: "LP_0452", diagnosis: 0, age: 48, sex: "M", heart_rate: 78, bp_systolic: 120, bp_diastolic: 80, wbc: 10090, platelets: 216000, symptoms: ["fever", "muscle_pain", "headache", "chills", "rigors"] },
  { id: "LP_0016", diagnosis: 0, age: 40, sex: "M", heart_rate: 80, bp_systolic: 110, bp_diastolic: 70, wbc: 2900, platelets: 70000, symptoms: ["cough"] },
  { id: "LP_0086", diagnosis: 0, age: 41, sex: "M", heart_rate: 82, bp_systolic: 100, bp_diastolic: 60, wbc: 6850, platelets: 19000, symptoms: [] },
  { id: "LP_0012", diagnosis: 0, age: 62, sex: "M", heart_rate: 74, bp_systolic: 120, bp_diastolic: 70, wbc: 6300, platelets: 83000, symptoms: ["chills"] },
  { id: "LP_0035", diagnosis: 0, age: 29, sex: "M", heart_rate: 76, bp_systolic: 110, bp_diastolic: 70, wbc: 6000, platelets: 289000, symptoms: ["fever", "prostration"] },
];

const SYMPTOM_LABELS: Record<string, string> = {
  fever: "Fever", muscle_pain: "Muscle Pain", jaundice: "Jaundice",
  vomiting: "Vomiting", confusion: "Confusion", headache: "Headache",
  chills: "Chills", rigors: "Rigors", nausea: "Nausea",
  diarrhoea: "Diarrhoea", cough: "Cough", bleeding: "Bleeding",
  prostration: "Prostration", oliguria: "Oliguria", anuria: "Anuria",
  conjunctival_suffusion: "Conj. Suffusion", muscle_tenderness: "Muscle Tend.",
};

function buildPayload(p: RealPatient) {
  const payload: Record<string, unknown> = {
    heart_rate_bpm: p.heart_rate,
    systolic_bp_mmHg: p.bp_systolic,
    diastolic_bp_mmHg: p.bp_diastolic,
    age_years: p.age,
    sex: p.sex,
    wbc: p.wbc,
    platelets: p.platelets,
  };
  for (const s of p.symptoms) {
    payload[s] = true;
  }
  return payload;
}

function PatientRow({ r, index }: { r: PatientResult; index: number }) {
  const scorePct = Math.round(r.score * 100);
  const isAnomaly = r.score > 0.5;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      style={{
        display: "grid",
        gridTemplateColumns: "80px 70px 1fr 80px 40px",
        gap: 12,
        alignItems: "center",
        padding: "14px 20px",
        background: index % 2 === 0 ? "var(--white)" : "var(--gray-100)",
        borderRadius: 8,
        fontSize: 13,
        fontFamily: "var(--mono)",
      }}
    >
      <span style={{ fontWeight: 700 }}>{r.id}</span>
      <span>
        <span
          style={{
            display: "inline-block",
            padding: "2px 10px",
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 700,
            background: isAnomaly ? "rgba(199, 64, 45, 0.1)" : "rgba(34, 139, 34, 0.1)",
            color: isAnomaly ? "var(--red)" : "#228B22",
          }}
        >
          {scorePct}%
        </span>
      </span>
      <span style={{ fontSize: 12, color: "var(--gray-600)", lineHeight: 1.5 }}>
        {r.symptoms.length > 0
          ? r.symptoms.map((s) => SYMPTOM_LABELS[s] || s).join(", ")
          : "No symptoms"}
      </span>
      <span style={{ fontSize: 11, color: "var(--gray-400)" }}>
        PLT {(r.platelets / 1000).toFixed(0)}k
      </span>
      <span>
        {r.correct
          ? <CheckCircle2 size={18} color="#228B22" />
          : <XCircle size={18} color="var(--red)" />}
      </span>
    </motion.div>
  );
}

export default function Validation() {
  const [results, setResults] = useState<PatientResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const total = TRUE_POSITIVES.length + TRUE_NEGATIVES.length;

  const runValidation = async () => {
    setRunning(true);
    setResults([]);
    setProgress(0);

    const allPatients = [...TRUE_POSITIVES, ...TRUE_NEGATIVES];
    const newResults: PatientResult[] = [];

    for (let i = 0; i < allPatients.length; i++) {
      const p = allPatients[i];
      try {
        const res = await fetch(`${API_URL}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(p)),
        });
        const data = await res.json();
        const score = data.anomaly_probability as number;
        const predicted = score > 0.5 ? 1 : 0;
        newResults.push({
          ...p,
          score,
          correct: predicted === p.diagnosis,
        });
      } catch {
        newResults.push({ ...p, score: -1, correct: false });
      }
      setProgress(i + 1);
      setResults([...newResults]);
    }

    setRunning(false);
  };

  const tpResults = results.filter((r) => r.diagnosis === 1);
  const tnResults = results.filter((r) => r.diagnosis === 0);
  const correctCount = results.filter((r) => r.correct).length;

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--gray-200)",
          padding: "16px clamp(24px, 4vw, 48px)",
        }}
      >
        <div
          style={{
            maxWidth: 1140,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontFamily: "var(--mono)",
              color: "var(--gray-600)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={16} /> Back to QuantumDx
          </Link>
          <span
            style={{
              fontFamily: "var(--serif)",
              fontSize: 18,
              fontStyle: "italic",
            }}
          >
            QuantumDx
          </span>
        </div>
      </header>

      {/* Content */}
      <main
        style={{
          maxWidth: 1140,
          margin: "0 auto",
          padding: "60px clamp(24px, 4vw, 48px) 120px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              marginBottom: 16,
            }}
          >
            Model Validation
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "var(--gray-600)",
              maxWidth: 700,
              lineHeight: 1.7,
              marginBottom: 12,
            }}
          >
            Testing the 16-qubit quantum fidelity kernel against{" "}
            <strong>24 real leptospirosis patients</strong> from Kisumu County, Kenya.
            Each patient is encoded into a 65,536-dimensional quantum state and
            classified via fidelity clustering.
          </p>

          {/* Model specs */}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 40,
            }}
          >
            {[
              { label: "Qubits", value: "16" },
              { label: "State Dim", value: "65,536" },
              { label: "Training", value: "30 synthetic" },
              { label: "Kernel", value: "Quantum Fidelity" },
              { label: "Data Source", value: "Kisumu County" },
            ].map((s) => (
              <span
                key={s.label}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "1px solid var(--gray-200)",
                  background: "var(--gray-100)",
                }}
              >
                <span style={{ color: "var(--gray-400)" }}>{s.label}:</span>{" "}
                <strong>{s.value}</strong>
              </span>
            ))}
          </div>

          {/* Run button */}
          <button
            onClick={runValidation}
            disabled={running}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 32px",
              fontSize: 16,
              borderRadius: 8,
              fontWeight: 600,
              fontFamily: "var(--mono)",
              background: running ? "var(--gray-400)" : "var(--red)",
              color: "var(--white)",
              border: "none",
              cursor: running ? "not-allowed" : "pointer",
              transition: "background 0.2s ease",
              marginBottom: 16,
            }}
          >
            {running ? (
              <>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                Running {progress}/{total}...
              </>
            ) : (
              <>
                <FlaskConical size={18} />
                {results.length > 0 ? "Run Again" : "Run Validation"}
              </>
            )}
          </button>

          {/* Progress bar */}
          {running && (
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: "var(--gray-200)",
                marginBottom: 40,
                overflow: "hidden",
              }}
            >
              <motion.div
                animate={{ width: `${(progress / total) * 100}%` }}
                style={{
                  height: "100%",
                  background: "var(--red)",
                  borderRadius: 2,
                }}
              />
            </div>
          )}

          {/* Results */}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* Summary card */}
                {!running && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                      background: correctCount === total
                        ? "rgba(34, 139, 34, 0.06)"
                        : "rgba(199, 64, 45, 0.06)",
                      border: `1px solid ${correctCount === total ? "rgba(34, 139, 34, 0.2)" : "rgba(199, 64, 45, 0.2)"}`,
                      borderRadius: 12,
                      padding: "24px 32px",
                      marginBottom: 40,
                      display: "flex",
                      justifyContent: "space-around",
                      flexWrap: "wrap",
                      gap: 24,
                      textAlign: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--serif)",
                          fontSize: 36,
                          fontStyle: "italic",
                          color: correctCount === total ? "#228B22" : "var(--red)",
                        }}
                      >
                        {correctCount}/{total}
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--gray-600)" }}>
                        Correctly Classified
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", color: "#228B22" }}>
                        {tpResults.filter((r) => r.correct).length}/{tpResults.length}
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--gray-600)" }}>
                        Sensitivity
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic", color: "#228B22" }}>
                        {tnResults.filter((r) => r.correct).length}/{tnResults.length}
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--gray-600)" }}>
                        Specificity
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* True Positives table */}
                {tpResults.length > 0 && (
                  <div style={{ marginBottom: 40 }}>
                    <h3
                      style={{
                        fontFamily: "var(--serif)",
                        fontSize: 22,
                        fontWeight: 400,
                        marginBottom: 16,
                      }}
                    >
                      Confirmed Positive Patients
                      <span style={{ fontSize: 14, color: "var(--gray-400)", fontFamily: "var(--mono)", marginLeft: 12 }}>
                        Diagnosed with leptospirosis
                      </span>
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 70px 1fr 80px 40px",
                        gap: 12,
                        padding: "8px 20px",
                        fontSize: 11,
                        fontFamily: "var(--mono)",
                        color: "var(--gray-400)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      <span>Patient</span>
                      <span>Score</span>
                      <span>Symptoms</span>
                      <span>Platelets</span>
                      <span></span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {tpResults.map((r, i) => (
                        <PatientRow key={r.id} r={r} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {/* True Negatives table */}
                {tnResults.length > 0 && (
                  <div style={{ marginBottom: 40 }}>
                    <h3
                      style={{
                        fontFamily: "var(--serif)",
                        fontSize: 22,
                        fontWeight: 400,
                        marginBottom: 16,
                      }}
                    >
                      Confirmed Negative Patients
                      <span style={{ fontSize: 14, color: "var(--gray-400)", fontFamily: "var(--mono)", marginLeft: 12 }}>
                        Not leptospirosis
                      </span>
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 70px 1fr 80px 40px",
                        gap: 12,
                        padding: "8px 20px",
                        fontSize: 11,
                        fontFamily: "var(--mono)",
                        color: "var(--gray-400)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      <span>Patient</span>
                      <span>Score</span>
                      <span>Symptoms</span>
                      <span>Platelets</span>
                      <span></span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {tnResults.map((r, i) => (
                        <PatientRow key={r.id} r={r} index={i + tpResults.length} />
                      ))}
                    </div>
                  </div>
                )}

                <p
                  style={{
                    fontSize: 13,
                    color: "var(--gray-400)",
                    fontFamily: "var(--mono)",
                    textAlign: "center",
                  }}
                >
                  Patients selected from 498-patient leptospirosis dataset (Kisumu County, Kenya).
                  Each prediction runs a live 16-qubit quantum circuit simulation.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
