import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const links = ["Process", "Privacy", "Stack", "Why Quantum?"];

  return (
    <>
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "0 clamp(24px, 4vw, 48px)",
          background: scrolled ? "rgba(254,252,249,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled
            ? "1px solid var(--gray-200)"
            : "1px solid transparent",
          transition: "background 0.3s, border-color 0.3s, backdrop-filter 0.3s",
        }}
      >
        <div
          style={{
            maxWidth: 1140,
            margin: "0 auto",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <a
            href="#"
            style={{
              fontFamily: "var(--serif)",
              fontSize: 24,
              fontStyle: "italic",
              color: "var(--ink)",
              letterSpacing: "-0.01em",
            }}
          >
            QuantumDx
          </a>

          <div
            className="desktop-nav"
            style={{ display: "flex", gap: 36, alignItems: "center" }}
          >
            {links.map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase()}`}
                className="nav-link"
              >
                {l}
              </a>
            ))}
            <a
              href="#demo"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--red)",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              Try It Out <ArrowUpRight size={13} />
            </a>
          </div>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            style={{
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              color: "var(--ink)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            {mobileOpen ? <X size={22}/> : <Menu size={22} />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              background: "rgba(26, 23, 21, 0.2)",
              backdropFilter: "blur(4px)",
            }}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: 72,
                right: 24,
                background: "var(--white)",
                border: "1px solid var(--gray-200)",
                borderRadius: 12,
                padding: "8px 0",
                minWidth: 180,
                boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
              }}
            >
              {links.map((l) => (
                <a
                  key={l}
                  href={`#${l.toLowerCase()}`}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "block",
                    padding: "12px 24px",
                    fontSize: 15,
                    color: "var(--ink)",
                  }}
                >
                  {l}
                </a>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Nav;