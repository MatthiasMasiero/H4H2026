import { useEffect, useState } from "react";
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

const isMobile = window.innerWidth < 768;

const SYMPTOM_LABELS: Record<string, string> = {
  fever: "Fever", muscle_pain: "Muscle Pain", jaundice: "Jaundice",
  vomiting: "Vomiting", confusion: "Confusion", headache: "Headache",
  chills: "Chills", rigors: "Rigors", nausea: "Nausea",
  diarrhea: "Diarrhea", cough: "Cough", bleeding: "Bleeding",
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
      transition={{ delay: index * 0.03, duration: 0.3 }}
      style={{
        display: "grid",
        gridTemplateColumns: "80px 70px 60px 1fr 80px 40px",
        gap: 12,
        alignItems: "center",
        padding: "10px 20px",
        background: index % 2 === 0 ? "var(--white)" : "var(--gray-100)",
        borderRadius: 8,
        fontSize: 13,
        fontFamily: "var(--mono)",
        width: isMobile ? "150vw" : 'auto',
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
      <span style={{ fontSize: 11, fontWeight: 600, color: r.diagnosis === 1 ? "var(--red)" : "#228B22" }}>
        {r.diagnosis === 1 ? "POS" : "NEG"}
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

function ConfusionMatrix({ tp, fn, fp, tn }: { tp: number; fn: number; fp: number; tn: number }) {
  const total = tp + fn + fp + tn;
  const accuracy = total > 0 ? ((tp + tn) / total * 100).toFixed(0) : "0";
  const sensitivity = (tp + fn) > 0 ? (tp / (tp + fn) * 100).toFixed(0) : "0";
  const specificity = (tn + fp) > 0 ? (tn / (tn + fp) * 100).toFixed(0) : "0";

  const cellStyle = (value: number, isCorrect: boolean): React.CSSProperties => ({
    padding: "20px 16px",
    textAlign: "center",
    borderRadius: 8,
    background: isCorrect
      ? value > 0 ? "rgba(34, 139, 34, 0.08)" : "var(--gray-100)"
      : value > 0 ? "rgba(199, 64, 45, 0.08)" : "var(--gray-100)",
    border: `1px solid ${isCorrect
      ? value > 0 ? "rgba(34, 139, 34, 0.2)" : "var(--gray-200)"
      : value > 0 ? "rgba(199, 64, 45, 0.2)" : "var(--gray-200)"}`,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      style={{ marginBottom: 48 }}
    >
      <h3
        style={{
          fontFamily: "var(--serif)",
          fontSize: 22,
          fontWeight: 400,
          marginBottom: 20,
        }}
      >
        Confusion Matrix
      </h3>

      <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 120px 120px",
              gridTemplateRows: "40px 120px 120px",
              gap: 4,
            }}
          >
            <div />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Pred. Positive
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Pred. Negative
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
              Actual Positive
            </div>
            <div style={cellStyle(tp, true)}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", color: "#228B22" }}>{tp}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-500)", marginTop: 4 }}>True Pos</div>
            </div>
            <div style={cellStyle(fn, false)}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", color: "var(--red)" }}>{fn}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-500)", marginTop: 4 }}>False Neg</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
              Actual Negative
            </div>
            <div style={cellStyle(fp, false)}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", color: "var(--red)" }}>{fp}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-500)", marginTop: 4 }}>False Pos</div>
            </div>
            <div style={cellStyle(tn, true)}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 32, fontStyle: "italic", color: "#228B22" }}>{tn}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-500)", marginTop: 4 }}>True Neg</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 180 }}>
          <div style={{ padding: "16px 20px", borderRadius: 8, background: "var(--gray-100)", border: "1px solid var(--gray-200)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic" }}>{accuracy}%</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-500)" }}>Accuracy</div>
          </div>
          <div style={{ padding: "16px 20px", borderRadius: 8, background: "var(--gray-100)", border: "1px solid var(--gray-200)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic" }}>{sensitivity}%</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-500)" }}>Sensitivity</div>
          </div>
          <div style={{ padding: "16px 20px", borderRadius: 8, background: "var(--gray-100)", border: "1px solid var(--gray-200)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 28, fontStyle: "italic" }}>{specificity}%</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-500)" }}>Specificity</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const SAMPLE_SIZE = 20;

export default function Validation() {

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [results, setResults] = useState<PatientResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalDataset, setTotalDataset] = useState(498);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const runValidation = async () => {
    setRunning(true);
    setResults([]);
    setProgress(0);
    setFetchError(null);

    let sample: RealPatient[];
    try {
      const sampleRes = await fetch(`${API_URL}/patients/sample?n=${SAMPLE_SIZE}`);
      if (!sampleRes.ok) throw new Error(`API returned ${sampleRes.status}`);
      const sampleData = await sampleRes.json();
      sample = sampleData.patients as RealPatient[];
      setTotalDataset(sampleData.total_dataset);
    } catch (err) {
      setFetchError(`Failed to fetch patients: ${err instanceof Error ? err.message : err}`);
      setRunning(false);
      return;
    }

    const newResults: PatientResult[] = [];

    for (let i = 0; i < sample.length; i++) {
      const p = sample[i];
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

  const correctCount = results.filter((r) => r.correct).length;

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
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
            Testing the 16-qubit quantum fidelity kernel on a random sample of{" "}
            <strong>20 real leptospirosis patients</strong> from Kisumu County, Kenya.
            Each patient is encoded into a 65,536-dimensional quantum state and
            classified via fidelity clustering against 30 reference patients.
          </p>

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
              { label: "Training", value: "30 patients" },
              { label: "Kernel", value: "Quantum Fidelity" },
              { label: "Dataset", value: `${totalDataset} patients` },
              { label: "Sample", value: `${SAMPLE_SIZE} random` },
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

          <div style={{
            borderBottom: "1px solid var(--gray-200)",
            padding: "0px",
          }} />

          <h3
            style={{
              fontFamily: "var(--serif)",
              fontSize: 22,
              fontWeight: 400,
              marginBottom: 8,
              marginTop: 40
            }}
          >
            Full Dataset Results
            <span style={{ fontSize: 14, color: "var(--gray-400)", fontFamily: "var(--mono)", marginLeft: 12 }}>
              141 patients from Kisumu County, Kenya
            </span>
          </h3>
          <p
            style={{
              fontSize: 14,
              color: "var(--gray-600)",
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            Confusion matrix from running all 141 patients through the 16-qubit quantum fidelity kernel.
          </p>
          <ConfusionMatrix tp={34} fn={23} fp={7} tn={77} />

          <div style={{
            borderBottom: "1px solid var(--gray-200)",
            padding: "0px",
          }} />

          <h3
            style={{
              fontFamily: "var(--serif)",
              fontSize: 22,
              fontWeight: 400,
              marginBottom: 8,
              marginTop: 40
            }}
          >
            Test on random sample of patients:
          </h3>

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
              marginTop: 40
            }}
          >
            {running ? (
              <>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                Running {progress}/{SAMPLE_SIZE}...
              </>
            ) : (
              <>
                <FlaskConical size={18} />
                {results.length > 0 ? "Run Again" : "Run Validation"}
              </>
            )}
          </button>

          {fetchError && (
            <div style={{
              padding: "12px 20px",
              background: "rgba(199, 64, 45, 0.08)",
              border: "1px solid rgba(199, 64, 45, 0.2)",
              borderRadius: 8,
              fontSize: 14,
              color: "var(--red)",
              fontFamily: "var(--mono)",
              marginBottom: 16,
            }}>
              {fetchError}
            </div>
          )}

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
                animate={{ width: `${(progress / SAMPLE_SIZE) * 100}%` }}
                style={{
                  height: "100%",
                  background: "var(--red)",
                  borderRadius: 2,
                }}
              />
            </div>
          )}

          <AnimatePresence>
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {!running && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                      background: "rgba(34, 139, 34, 0.06)",
                      border: "1px solid rgba(34, 139, 34, 0.2)",
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
                          color: "#228B22",
                        }}
                      >
                        {correctCount}/{SAMPLE_SIZE}
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--gray-600)" }}>
                        Sample Correct
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontStyle: "italic" }}>
                        {Math.round((correctCount / SAMPLE_SIZE) * 100)}%
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--gray-600)" }}>
                        Sample Accuracy
                      </div>
                    </div>
                  </motion.div>
                )}

                <div style={{ marginBottom: 40 }}>
                  <h3
                    style={{
                      fontFamily: "var(--serif)",
                      fontSize: 22,
                      fontWeight: 400,
                      marginBottom: 16,
                    }}
                  >
                    Live Predictions
                    <span style={{ fontSize: 14, color: "var(--gray-400)", fontFamily: "var(--mono)", marginLeft: 12 }}>
                      {results.length} random patients
                    </span>
                  </h3>
                  <div style={{overflowX: 'scroll'}}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 70px 60px 1fr 80px 40px",
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
                    <span>Actual</span>
                    <span>Symptoms</span>
                    <span>Platelets</span>
                    <span></span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2}}>
                    {results.map((r, i) => (
                      <PatientRow key={r.id} r={r} index={i} />
                    ))}
                  </div>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 13,
                    color: "var(--gray-400)",
                    fontFamily: "var(--mono)",
                    textAlign: "center",
                  }}
                >
                  Data from 498-patient leptospirosis dataset (Kisumu County, Kenya).
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
