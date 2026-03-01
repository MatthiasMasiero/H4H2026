import Reveal from "./Reveal";

function Process() {
  const steps = [
    {
      title: "Capture Vitals",
      desc: "Healthcare providers can enter patient vitals (the results of a blood test) directly into QuantumDx.",
    },
    {
      title: "Quantum Encode",
      desc: "A ZZFeatureMap circuit with linear entanglement maps clinical features into a 65,536-dimensional quantum state vector.",
    },
    {
      title: "Shred Source Data",
      desc: "The original patient CSV is overwritten and then permanently deleted. Irreversible by design to protect patient privacy.",
    },
    {
      title: "Compute Fidelity Kernel",
      desc: "Quantum state overlap between all patient signatures produces a similarity matrix — the diagnostic fingerprint.",
    },
    {
      title: "Federate Globally",
      desc: "Local SVM weights are aggregated across clinics into a global decision boundary. Raw data never leaves the building.",
    },
  ];

  return (
    <section
      id="process"
      style={{
        maxWidth: 1140,
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
          The Process
        </span>
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: "clamp(32px, 4vw, 48px)",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            marginTop: 12,
            marginBottom: 8,
          }}
        >
          Five steps. Zero data left behind.
        </h2>
      </Reveal>

      <div
        style={{
          marginTop: 48,
          borderTop: "1px solid var(--gray-200)",
        }}
      >
        {steps.map((step, i) => (
          <Reveal key={i} delay={i * 0.07}>
            <div
              className="process-row"
              style={{
                borderBottom: "1px solid var(--gray-200)",
                padding: "28px 16px",
                cursor: "default",
                borderRadius: 2,
              }}
            >
              <div
                className="process-inner"
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 32,
                }}
              >
                <span
                  className="process-num"
                  style={{
                    fontFamily: "var(--serif)",
                    fontStyle: "italic",
                    fontSize: 32,
                    color: "var(--red)",
                    minWidth: 56,
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  0{i + 1}
                </span>
                <span
                  className="process-title"
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: "var(--ink)",
                    minWidth: 220,
                    flexShrink: 0,
                  }}
                >
                  {step.title}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    lineHeight: 1.65,
                    color: "var(--gray-600)",
                  }}
                >
                  {step.desc}
                </span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default Process;
