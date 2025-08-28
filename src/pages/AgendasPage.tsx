import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/agenda.css";

type AgendaSummary = {
  agendaId: string;
  title: string;
  tweetsCount: number;
  createdAt: string;
};

export default function AgendasPage() {
  const [agendas, setAgendas] = useState<AgendaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    fetch(`${API_BASE}/agendas?userId=${user._id}`)
      .then((r) => r.json())
      .then((data) => {
        setAgendas(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this agenda?")) return;
    const resp = await fetch(`${API_BASE}/agendas/${id}`, {
      method: "DELETE",
    });
    if (resp.ok) {
      setAgendas((prev) => prev.filter((a) => a.agendaId !== id));
    } else {
      alert("Could not delete agenda.");
    }
  };

  if (loading) {
    return <div className="agenda-loading">Loading your agendas…</div>;
  }

  return (
    <div className="agenda-page">
      <div className="agenda-header">
        <h1>Your Agendas</h1>
        <button
          className="btn primary new-agenda-btn"
          onClick={() => navigate("/agendas/new")}
        >
          + New Agenda
        </button>
      </div>

      {agendas.length === 0 ? (
        <div className="agenda-empty">
          <p>No agendas yet.</p>
          <button
            className="btn primary"
            onClick={() => navigate("/agendas/new")}
          >
            Create One
          </button>
        </div>
      ) : (
        <div className="agenda-list">
          {agendas.map((a) => (
            <div
              className="agenda-item"
              key={a.agendaId}
              onClick={() => navigate(`/agendas/${a.agendaId}/dashboard`)}
            >
              <button
                className="delete-btn"
                onClick={(e) => handleDelete(a.agendaId, e)}
                aria-label="Delete agenda"
              />
              <div className="agenda-info">
                <h2 className="agenda-title">{a.title}</h2>
                <p className="agenda-meta">
                  Created: {new Date(a.createdAt).toLocaleDateString()} •{" "}
                  {a.tweetsCount} tweets
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
