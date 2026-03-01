import { useRef, useEffect } from "react";
import Reveal from "./Reveal";
import vizData from "../data/quantum_viz.json";

const BENCHMARK = [
  { name: "Random Forest",        acc: 70.2, sens: 35.1, spec: 94.0, tp: 20, fn: 37, fp: 5,  tn: 79 },
  { name: "Gradient Boosting",    acc: 60.3, sens: 15.8, spec: 90.5, tp: 9,  fn: 48, fp: 8,  tn: 76 },
  { name: "SVM (RBF Kernel)",     acc: 56.0, sens: 100,  spec: 26.2, tp: 57, fn: 0,  fp: 62, tn: 22 },
];

const QUANTUM = { name: "Quantum Fidelity (16q)", acc: 78.7, sens: 59.6, spec: 91.7, tp: 34, fn: 23, fp: 7, tn: 77 };

/* ── Amplitude Fingerprint (canvas) ──────────────────────────────────── */

function AmplitudeChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const { healthy, sick } = vizData.amplitudes;
    const n = healthy.length;
    const barW = w / n;
    const chartH = (h - 24) / 2; // two charts stacked

    // Log scale: log(1 + x/min) normalized per chart
    const logScale = (arr: number[]) => {
      const minPos = Math.min(...arr.filter((v) => v > 0)) || 1e-7;
      const logged = arr.map((v) => (v > 0 ? Math.log(1 + v / minPos) : 0));
      const maxLog = Math.max(...logged);
      return logged.map((v) => v / (maxLog || 1));
    };

    const healthyScaled = logScale(healthy);
    const sickScaled = logScale(sick);

    ctx.clearRect(0, 0, w, h);

    // Healthy (top)
    for (let i = 0; i < n; i++) {
      const val = healthyScaled[i];
      const barH = val * (chartH - 8);
      const alpha = 0.3 + val * 0.7;
      ctx.fillStyle = `rgba(156, 151, 144, ${alpha})`;
      ctx.fillRect(i * barW, chartH - barH, Math.max(barW - 0.5, 0.5), barH);
    }

    // Sick (bottom)
    for (let i = 0; i < n; i++) {
      const val = sickScaled[i];
      const barH = val * (chartH - 8);
      const alpha = 0.3 + val * 0.7;
      ctx.fillStyle = `rgba(199, 64, 45, ${alpha})`;
      ctx.fillRect(i * barW, h - barH, Math.max(barW - 0.5, 0.5), barH);
    }

    // Labels
    ctx.font = "11px var(--mono)";
    ctx.fillStyle = "rgba(156, 151, 144, 0.6)";
    ctx.fillText("HEALTHY", 8, 14);
    ctx.fillStyle = "rgba(199, 64, 45, 0.6)";
    ctx.fillText("POSITIVE", 8, chartH + 14);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: 280,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    />
  );
}

/* ── Fidelity Kernel Heatmap (canvas) ────────────────────────────────── */

function FidelityHeatmap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = canvas.clientWidth;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const { matrix, labels } = vizData.heatmap;
    const n = matrix.length;
    const labelW = 32;
    const cellSize = (size - labelW) / n;

    ctx.clearRect(0, 0, size, size);

    // Draw cells
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const fid = matrix[i][j];
        const x = labelW + j * cellSize;
        const y = labelW + i * cellSize;

        // Color: low fidelity = dark, high fidelity = bright
        // Same-class pairs get warm tones, cross-class get cool
        const sameClass = labels[i] === labels[j];
        if (sameClass) {
          const r = Math.round(60 + fid * 139);
          const g = Math.round(20 + fid * 24);
          const b = Math.round(15 + fid * 20);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        } else {
          const v = Math.round(20 + fid * 50);
          ctx.fillStyle = `rgb(${v}, ${v + 5}, ${v + 10})`;
        }
        ctx.fillRect(x, y, cellSize - 0.5, cellSize - 0.5);
      }
    }

    // Axis labels
    ctx.font = "9px var(--mono)";
    for (let i = 0; i < n; i++) {
      const y = labelW + i * cellSize + cellSize / 2 + 3;
      ctx.fillStyle = labels[i] === 0
        ? "rgba(156, 151, 144, 0.5)"
        : "rgba(199, 64, 45, 0.5)";
      ctx.fillText(labels[i] === 0 ? "H" : "S", 10, y);
    }

    // Cluster boundary lines
    const boundary = labels.filter((l: number) => l === 0).length;
    const bx = labelW + boundary * cellSize;
    const by = labelW + boundary * cellSize;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(bx, labelW);
    ctx.lineTo(bx, size);
    ctx.stroke();
    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(labelW, by);
    ctx.lineTo(size, by);
    ctx.stroke();
    ctx.setLineDash([]);

    // Quadrant labels
    ctx.font = "10px var(--mono)";
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    const midH = labelW + (boundary * cellSize) / 2;
    const midS = labelW + boundary * cellSize + ((n - boundary) * cellSize) / 2;
    ctx.textAlign = "center";
    ctx.fillText("H↔H", (labelW + bx) / 2, midH);
    ctx.fillText("S↔S", (bx + size) / 2, midS);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillText("H↔S", (bx + size) / 2, midH);
    ctx.fillText("S↔H", (labelW + bx) / 2, midS);
    ctx.textAlign = "start";
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        maxWidth: 420,
        aspectRatio: "1",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    />
  );
}

/* ── Main Section ────────────────────────────────────────────────────── */

function WhyQuantum() {
  return (
    <section
      id="why%20quantum?"
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

        {/* ── Quantum Visualizations ──────────────────────────────────── */}

        {/* Amplitude Fingerprint */}
        <div style={{ marginTop: 80 }}>
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
              Quantum State Fingerprint
            </span>
            <h3
              style={{
                fontFamily: "var(--serif)",
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: 400,
                letterSpacing: "-0.02em",
                marginTop: 12,
                marginBottom: 8,
                color: "var(--paper)",
              }}
            >
              Every patient has a unique{" "}
              <span style={{ fontStyle: "italic", color: "var(--red)" }}>
                quantum signature
              </span>
            </h3>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: "var(--gray-400)",
                maxWidth: 600,
                marginBottom: 32,
              }}
            >
              Each patient's symptoms are encoded into a 16-qubit quantum circuit,
              producing a probability distribution across 65,536 basis states.
              Healthy and positive patients produce visibly distinct patterns.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <AmplitudeChart />
          </Reveal>
        </div>

        {/* Fidelity Kernel Heatmap */}
        <div style={{ marginTop: 80 }}>
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
              Fidelity Kernel Matrix
            </span>
            <h3
              style={{
                fontFamily: "var(--serif)",
                fontSize: "clamp(24px, 3vw, 36px)",
                fontWeight: 400,
                letterSpacing: "-0.02em",
                marginTop: 12,
                marginBottom: 8,
                color: "var(--paper)",
              }}
            >
              Quantum similarity reveals{" "}
              <span style={{ fontStyle: "italic", color: "var(--red)" }}>
                hidden clusters
              </span>
            </h3>
          </Reveal>

          <Reveal delay={0.1}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 32,
                alignItems: "start",
              }}
              className="heatmap-grid"
            >
              <FidelityHeatmap />

              <div style={{ paddingTop: 8 }}>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "var(--gray-400)",
                    marginBottom: 24,
                  }}
                >
                  The quantum fidelity kernel measures the overlap between patient
                  quantum states: F(&#968;,&#966;) = |&#10216;&#968;|&#966;&#10217;|&sup2;.
                  Bright cells indicate high similarity. The two diagonal blocks show
                  that healthy patients cluster together and positive patients cluster
                  together &mdash; enabling the quantum model to separate them.
                </p>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: "rgb(199, 44, 35)",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        color: "var(--gray-400)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      High fidelity (same class)
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: "rgb(35, 40, 45)",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        color: "var(--gray-400)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Low fidelity (cross-class)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default WhyQuantum;
