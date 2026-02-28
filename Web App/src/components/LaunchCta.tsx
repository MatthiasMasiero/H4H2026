import Reveal from "./Reveal";

function LaunchCta() {
  return (
    <section
      id="launch"
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
              marginBottom: 16,
            }}
          >
            Run it locally.
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "var(--gray-600)",
              marginBottom: 32,
              maxWidth: 420,
              margin: "0 auto 32px",
              lineHeight: 1.65,
            }}
          >
            Process your first quantum patient signature in under a second.
          </p>
          <div
            style={{
              display: "inline-block",
              fontFamily: "var(--mono)",
              fontSize: 15,
              color: "var(--red)",
              background: "var(--white)",
              border: "1px solid var(--gray-200)",
              borderRadius: 8,
              padding: "14px 32px",
              marginBottom: 32,
            }}
          >
            streamlit run app.py
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--gray-400)",
              fontFamily: "var(--mono)",
            }}
          >
            Requires Python 3.10+ &middot; pip install -r requirements.txt
          </p>
        </div>
      </Reveal>
    </section>
  );
}

export default LaunchCta;