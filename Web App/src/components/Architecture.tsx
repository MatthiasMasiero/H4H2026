import Reveal from "./Reveal";
import {
  ArrowRight,
} from "lucide-react";

const isMobile = window.innerWidth < 768;

function Architecture() {
  const nodes = [
    { label: "Vitals CSV", tech: "4 Features" },
    { label: "Quantum Encoder", tech: "ZZFeatureMap" },
    { label: "Fidelity Kernel", tech: "Statevector" },
    { label: "Local SVM", tech: "scikit-learn" },
    { label: "Aggregator", tech: "FedAvg" },
    { label: "Global Boundary", tech: "Decision" },
  ];

  return (
    <section
      id="stack"
      style={{
        maxWidth: '80%',
        margin: "0 auto",
        padding: "100px clamp(24px, 4vw, 48px) 80px",
      }}
    >
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
          Architecture
        </span>
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(32px, 4vw, 48px)",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            marginTop: 12,
            marginBottom: 56,
          }}
        >
          The Stack
        </h2>
      </Reveal>

      <Reveal delay={0.1}>
        <div
          className="arch-pipeline"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: 'center',
            gap: '10',
            flexWrap: "wrap",
            paddingBottom: 8,
            maxWidth: '100vw',
          }}
        >
          {nodes.map((node, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
                flexDirection: (isMobile ? 'column' : 'row'),
              }}
            >
              <div
                className="arch-node"
                style={{
                  padding: "20px 24px",
                  background: "var(--white)",
                  border: "1px solid var(--gray-200)",
                  borderRadius: 10,
                  textAlign: "center",
                  minWidth: 140,
                  transition: "border-color 0.2s",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--ink)",
                    marginBottom: 4,
                  }}
                >
                  {node.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    color: "var(--gray-400)",
                  }}
                >
                  {node.tech}
                </div>
              </div>
              {i < nodes.length - 1 && (
                <div
                  className="arch-arrow"
                  style={{
                    padding: "0 8px",
                    color: "var(--gray-300)",
                    flexShrink: 0,
                  }}
                >
                  <ArrowRight size={16} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginTop: 56,
          }}
        >
          {[
            { name: "Qiskit", role: "Quantum circuits & simulation" },
            { name: "Streamlit", role: "Interactive diagnostic UI" },
            { name: "scikit-learn", role: "SVM classification" },
            { name: "NumPy", role: "Linear algebra engine" },
            { name: "Plotly", role: "Kernel visualizations" },
            { name: "React", role: "This website" },
          ].map((t) => (
            <div
              key={t.name}
              style={{
                padding: "20px",
                background: "var(--gray-100)",
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink)",
                  marginBottom: 4,
                }}
              >
                {t.name}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--gray-600)",
                }}
              >
                {t.role}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export default Architecture;