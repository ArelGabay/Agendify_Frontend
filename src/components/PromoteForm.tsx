// src/components/PromoteForm.tsx
import { useState, FormEvent } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "../styles/PromoteForm.css";

type LocationState = {
  agendaId?:    string;
  agendaTitle?: string;
};

export default function PromoteForm() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { agendaId: stateAgendaId, agendaTitle } = (state as LocationState) || {};

  // Read agendaId from URL params as well
  const { agendaId: paramAgendaId } = useParams<{ agendaId: string }>();

  // Use either the URL param or the location.state value
  const agendaId = stateAgendaId || paramAgendaId;
  const isAppend = Boolean(agendaId);

  const [prompt,     setPrompt]     = useState("");
  const [stance,     setStance]     = useState<"in_favor" | "opposed">("in_favor");
  const [tweetCount, setTweetCount] = useState(10);
  const [message,    setMessage]    = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setMessage("❌ Prompt cannot be empty.");
      return;
    }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user._id) {
      setMessage("❌ You must be logged in.");
      return;
    }

    setLoading(true);
    try {
      const body: any = {
        prompt:    prompt.trim(),
        stance,
        createdBy: user._id,
      };
      if (agendaId) {
        body.agendaId = agendaId;
      }

      const url = agendaId
        ? `${API_BASE}/agendas/${agendaId}/promote?count=${tweetCount}`
        : `${API_BASE}/twitter/promote?count=${tweetCount}`;

      const resp = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || resp.statusText);

      navigate(
        `/agendas/${agendaId || data.agendaId}/promote/results`,
        {
          state: {
            agendaId:    agendaId || data.agendaId,
            agendaTitle: agendaTitle || data.title,
            prompt:      prompt.trim(),
            tweets:      data.tweets,
          },
        }
      );
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="promote-form">
      <h2 className="promote-title">
        {isAppend
          ? `Add Replies to “${agendaTitle || agendaId}”`
          : "Start a New Promotion"}
      </h2>
      <p className="promote-subtitle">
        Craft targeted replies that align with your stance.
      </p>
      {message && <div className="message">{message}</div>}

      <fieldset className="section">
        <legend>Your Prompt</legend>
        <textarea
          className="prompt-input"
          rows={3}
          placeholder="Type what you want to promote…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </fieldset>

      <fieldset className="section">
        <legend>Stance</legend>
        <div className="segmented">
          <label className="segment">
            <input
              type="radio"
              name="stance"
              value="in_favor"
              checked={stance === "in_favor"}
              onChange={() => setStance("in_favor")}
            />
            <span className="segment-label">Support</span>
          </label>
          <label className="segment">
            <input
              type="radio"
              name="stance"
              value="opposed"
              checked={stance === "opposed"}
              onChange={() => setStance("opposed")}
            />
            <span className="segment-label">Oppose</span>
          </label>
        </div>
      </fieldset>

      <div className="section">
        <div className="count-header">
          <span className="count-label">Tweets</span>
          <span className="count-badge">{tweetCount}</span>
        </div>
        <input
          id="count"
          type="range"
          min={10}
          max={100}
          step={10}
          value={tweetCount}
          onChange={(e) => setTweetCount(+e.target.value)}
        />
      </div>

      <div className="submit-section">
        <button className="btn-primary" disabled={loading}>
          {loading ? "Working…" : isAppend ? "Generate Replies" : "Promote"}
        </button>
      </div>
    </form>
  );
}
