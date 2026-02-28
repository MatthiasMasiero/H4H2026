import Reveal from "./Reveal";

function PrivacyStatement() {
  return (
    <section
      id="privacy"
      style={{
        padding: "100px clamp(24px, 4vw, 48px)",
        borderTop: "1px solid var(--gray-200)",
        borderBottom: "1px solid var(--gray-200)",
        background: "var(--ink)",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <div
            style={{
              width: 48,
              height: 3,
              background: "var(--red)",
              margin: "0 auto 32px",
              borderRadius: 2,
            }}
          />
          <blockquote
            className="privacy-quote"
            style={{
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              fontSize: "clamp(32px, 4.5vw, 52px)",
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
              color: "var(--paper)",
              marginBottom: 36,
            }}
          >
            &ldquo;We don't encrypt your data.
            <br />
            We don't anonymize it.
            <br />
            We{" "}
            <span style={{ color: "var(--red)" }}>
              destroy
            </span>{" "}
            it.&rdquo;
          </blockquote>
        </Reveal>
        <Reveal delay={0.15}>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: "var(--gray-400)",
              maxWidth: 580,
              margin: "0 auto",
            }}
          >
            After quantum encoding, the raw patient file is overwritten and permanently deleted. The quantum
            signature cannot be reversed by design. This isn't a privacy policy&mdash;it's
            physics.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default PrivacyStatement;