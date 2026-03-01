import Reveal from "./Reveal";

const BENCHMARK = [
  { name: "Random Forest",        acc: 70.2, sens: 35.1, spec: 94.0, tp: 20, fn: 37, fp: 5,  tn: 79 },
  { name: "Gradient Boosting",    acc: 60.3, sens: 15.8, spec: 90.5, tp: 9,  fn: 48, fp: 8,  tn: 76 },
  { name: "SVM (RBF Kernel)",     acc: 56.0, sens: 100,  spec: 26.2, tp: 57, fn: 0,  fp: 62, tn: 22 },
];

const QUANTUM = { name: "Quantum Fidelity (16q)", acc: 78.7, sens: 59.6, spec: 91.7, tp: 34, fn: 23, fp: 7, tn: 77 };

function WhyQuantum() {
  return (
    <section
      id="why-quantum"
      style={{
        padding: "100px clamp(24px, 4vw, 48px) 80px",
        background: "var(--ink)",
        borderTop: "1px solid var(--gray-200)",
      }}
    >
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <Reveal>
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--gray-400)",
            }}
          >
            Classical ML Benchmark
          </span>
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              marginTop: 12,
              marginBottom: 8,
              color: "var(--paper)",
            }}
          >
            Why{" "}
            <span style={{ fontStyle: "italic", color: "var(--red)" }}>
              quantum?
            </span>
          </h2>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: "var(--gray-400)",
              maxWidth: 640,
              marginBottom: 48,
            }}
          >
            We trained four models on the same 30 clinical reference profiles and
            tested them on 141 real leptospirosis patients from Kisumu County, Kenya.
            In diagnostics, sensitivity matters most&mdash;missing a sick patient
            can be fatal.
          </p>
        </Reveal>

        {/* Comparison table */}
        <Reveal delay={0.1}>
          <div
            style={{
              overflowX: "auto",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--sans)",
                fontSize: 14,
                minWidth: 640,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {["Model", "Accuracy", "Sensitivity", "Specificity", "TP", "FN", "FP", "TN"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "14px 16px",
                          fontFamily: "var(--mono)",
                          fontSize: 11,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--gray-400)",
                          fontWeight: 500,
                          textAlign: h === "Model" ? "left" : "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {BENCHMARK.map((row) => (
                  <tr
                    key={row.name}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <td style={{ padding: "14px 16px", color: "var(--gray-400)", whiteSpace: "nowrap" }}>
                      {row.name}
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--gray-400)", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13 }}>
                      {row.acc.toFixed(1)}%
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--gray-400)", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13 }}>
                      {row.sens.toFixed(1)}%
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--gray-400)", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13 }}>
                      {row.spec.toFixed(1)}%
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--gray-400)", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13 }}>
                      {row.tp}
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--gray-400)", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13 }}>
                      {row.fn}
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--gray-400)", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13 }}>
                      {row.fp}
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--gray-400)", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13 }}>
                      {row.tn}
                    </td>
                  </tr>
                ))}

                {/* Quantum row — highlighted */}
                <tr
                  style={{
                    background: "rgba(199, 64, 45, 0.08)",
                    borderTop: "2px solid var(--red)",
                  }}
                >
                  <td
                    style={{
                      padding: "14px 16px",
                      color: "var(--paper)",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {QUANTUM.name}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--paper)", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600 }}>
                    {QUANTUM.acc.toFixed(1)}%
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--red)", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600 }}>
                    {QUANTUM.sens.toFixed(1)}%
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--paper)", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600 }}>
                    {QUANTUM.spec.toFixed(1)}%
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--paper)", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600 }}>
                    {QUANTUM.tp}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--paper)", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600 }}>
                    {QUANTUM.fn}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--paper)", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600 }}>
                    {QUANTUM.fp}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--paper)", textAlign: "right", fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600 }}>
                    {QUANTUM.tn}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* Key stat callouts */}
        <Reveal delay={0.2}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 24,
              marginTop: 48,
            }}
          >
            <div
              style={{
                padding: "28px 24px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 40,
                  fontStyle: "italic",
                  color: "var(--red)",
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                78.7%
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--gray-400)",
                }}
              >
                Quantum Accuracy
              </div>
            </div>

            <div
              style={{
                padding: "28px 24px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 40,
                  fontStyle: "italic",
                  color: "var(--red)",
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                14
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--gray-400)",
                }}
              >
                More cases caught vs best classical
              </div>
            </div>

            <div
              style={{
                padding: "28px 24px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 40,
                  fontStyle: "italic",
                  color: "var(--red)",
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                60%
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--gray-400)",
                }}
              >
                Sensitivity vs 35% classical best
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.7,
              color: "var(--gray-400)",
              maxWidth: 640,
              marginTop: 40,
            }}
          >
            Classical models either miss most sick patients or flag everyone as
            positive. The quantum fidelity kernel operates in a 65,536-dimensional
            Hilbert space, capturing nonlinear symptom interactions that classical
            feature vectors cannot represent.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default WhyQuantum;
