
import { Github } from "lucide-react";

function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--gray-200)",
        padding: "56px clamp(24px, 4vw, 48px) 32px",
      }}
    >
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <div
          className="footer-top"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 64,
          }}
        >
          {/* Brand */}
          <div style={{ maxWidth: 260 }}>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: 22,
                fontStyle: "italic",
                marginBottom: 12,
              }}
            >
              QuantumDx
            </div>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: "var(--gray-600)",
              }}
            >
              Privacy-first federated quantum diagnostics. Built for H4H26
              Hackathon 2026.
            </p>
          </div>

          {/* Columns */}
          <div
            className="footer-cols"
            style={{
              display: "flex",
              gap: 56,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--ink)",
                  marginBottom: 4,
                }}
              >
                Platform
              </span>
              <a href="#process" className="footer-link">How It Works</a>
              <a href="#privacy" className="footer-link">Privacy</a>
              <a href="#stack" className="footer-link">Architecture</a>
              <a href="#launch" className="footer-link">Launch App</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--ink)",
                  marginBottom: 4,
                }}
              >
                Connect
              </span>
              <a href="https://github.com/MatthiasMasiero/H4H2026" className="footer-link">
                <Github size={13} /> GitHub
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid var(--gray-200)",
            marginTop: 48,
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "var(--gray-400)",
            }}
          >
            2026 QuantumDx
          </span>
          <div style={{ display: "flex", gap: 16 }}>
            {["Privacy-First", "Quantum-Powered", "Solution Driven"].map((b) => (
              <span
                key={b}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--gray-400)",
                  padding: "4px 10px",
                  borderRadius: 5,
                  border: "1px solid var(--gray-200)",
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;