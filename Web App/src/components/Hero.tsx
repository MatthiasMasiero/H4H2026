import { motion } from "framer-motion";
import {
  ArrowRight,
} from "lucide-react";

function Hero() {
  return (
    <header
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        padding: "120px clamp(24px, 4vw, 48px) 80px",
      }}
    >
      <div
        className="hero-grid"
        style={{
          maxWidth: 1140,
          margin: "0 auto",
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 64,
          alignItems: "center",
        }}
      >
        {/* Left — editorial headline */}
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div
              style={{
                width: 48,
                height: 3,
                background: "var(--red)",
                marginBottom: 24,
                borderRadius: 2,
              }}
            />
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 12,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--gray-400)",
                display: "block",
                marginBottom: 20,
              }}
            >
              Privacy-First Quantum Diagnostics
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.45,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(52px, 7vw, 88px)",
              fontWeight: 400,
              lineHeight: 1,
              letterSpacing: "-0.025em",
              color: "var(--ink)",
              marginBottom: 28,
            }}
          >
            Diagnostics
            <br />
            <span style={{ fontStyle: "italic" }}>that forget.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              fontSize: 17,
              lineHeight: 1.7,
              color: "var(--gray-600)",
              maxWidth: 500,
              marginBottom: 36,
            }}
          >
            QuantumDx encodes patient vitals into quantum states, analyzes them
            with fidelity kernels, then permanently shreds the raw data. What
            remains is the diagnosis&mdash;never the patient.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}
          >
            <a
              href="#demo"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 28px",
                borderRadius: 10,
                background: "var(--ink)",
                color: "var(--paper)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              Try Our Demo <ArrowRight size={15} />
            </a>
            <a
              href="#process"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--gray-600)",
                borderBottom: "1px solid var(--gray-300)",
                paddingBottom: 2,
                transition: "color 0.2s",
              }}
            >
              See how it works
            </a>
          </motion.div>
        </div>

        {/* Right — system status card */}
        <motion.div
          className="hero-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          style={{
            background: "var(--white)",
            border: "1px solid var(--gray-200)",
            borderRadius: 14,
            padding: "28px 28px 24px",
            marginTop: 32,
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--gray-400)",
              marginBottom: 16,
            }}
          >
            System Status
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#34A853",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Operational</span>
          </div>

          {[
            ["Qubits", "4"],
            ["Feature Map", "ZZ"],
            ["Shred Level", "DoD-3"],
            ["Patients", "30"],
            ["Privacy", "100%"],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderTop: "1px solid var(--gray-100)",
                fontSize: 14,
              }}
            >
              <span style={{ color: "var(--gray-400)" }}>{k}</span>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 500,
                  color: "var(--ink)",
                }}
              >
                {v}
              </span>
            </div>
          ))}

          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid var(--gray-200)",
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--gray-400)",
            }}
          >
            H4H26 &middot; Feb 2026
          </div>
        </motion.div>
      </div>
    </header>
  );
}

export default Hero;