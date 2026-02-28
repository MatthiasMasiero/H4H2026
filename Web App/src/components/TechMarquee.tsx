function TechMarquee() {
  const items = [
    "QISKIT",
    "ZZFeatureMap",
    "FEDERATED LEARNING",
    "SCIKIT-LEARN",
    "STREAMLIT",
    "FIDELITY KERNEL",
    "PRIVACY BY DESIGN",
    "AerSimulator",
    "QUANTUM SVM",
    "STATEVECTOR",
  ];
  const doubled = [...items, ...items];

  return (
    <div
      style={{
        overflow: "hidden",
        borderTop: "1px solid var(--gray-200)",
        borderBottom: "1px solid var(--gray-200)",
        background: "var(--gray-100)",
        padding: "18px 0",
      }}
    >
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span
            key={i}
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              color: "var(--gray-400)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {item}
            <span
              style={{
                display: "inline-block",
                margin: "0 24px",
                color: "var(--gray-300)",
              }}
            >
              &middot;
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default TechMarquee;