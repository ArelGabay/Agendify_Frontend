// src/pages/NewClusterPage.tsx
import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export default function NewClusterPage() {
  const [topic, setTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError("❌ Please enter an agenda title (2–3 words).");
      return;
    }

    const stored = localStorage.getItem("user");
    const userId = stored ? JSON.parse(stored)._id : null;
    if (!userId) {
      setError("❌ You must be logged in to create an agenda.");
      return;
    }

    try {
      const resp = await fetch(
        `${API_BASE}/agendas`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, topic: topic.trim() }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || resp.statusText);

      // ← use the new `agendaId` field
      navigate(`/agendas/${data.agendaId}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`❌ ${err.message}`);
      } else {
        setError("❌ An unknown error occurred.");
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Create a new agenda</h2>
        <p className="auth-subtitle">Give your agenda a short, memorable title (2–3 words).</p>

        {error && <div className="alert-danger" style={{ marginBottom: ".5rem" }}>{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="auth-label">Agenda title</label>
            <input
              type="text"
              className="auth-input"
              placeholder="e.g. Gaza Aid Debate"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={60}
            />
          </div>

          <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
            <span className="chip">Public Health Policy</span>
            <span className="chip">Climate Action</span>
            <span className="chip">Israel Gaza</span>
          </div>

          <div className="auth-actions">
            <span style={{ color: "#7b809a", fontSize: ".9rem" }}>
              {Math.max(0, 60 - topic.length)} chars left
            </span>
            <button type="submit" className="btn-primary">Create Agenda</button>
          </div>
        </form>
      </div>
    </div>
  );
}
