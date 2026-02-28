import React from "react";
import "./App.css";

const App: React.FC = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>QuantumDx</h1>
        <p>
          A tool for doctors and patients to securely identify and diagnos potential rare diseases.
        </p>
      </header>

      <main className="app-main">
        <section className="input-section">
          <h2>Patient Symptoms</h2>
          {/* TODO: Add Patient Data input here */}
        </section>
      </main>

      <footer className="app-footer">
        <p>
          QuantumDx is an early prototype. Not for clinical use.
        </p>
      </footer>
    </div>
  );
};

export default App;