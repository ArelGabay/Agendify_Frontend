// src/pages/PromotionClusterPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../styles/PromotionClusterPage.css"; // create or adapt your CSS

type TweetItem = {
  replyTweetId:      string;
  originalTweetId:   string;
  originalTweetText: string;
  responseComment:   string;
  createdAt:         string;
};

type Cluster = {
  _id:    string;
  title:  string;
  prompt: string;
  tweets: TweetItem[];
};

export default function PromotionClusterPage() {
  const { agendaId } = useParams<{ agendaId: string }>();
  const navigate     = useNavigate();
  const [cluster, setCluster]   = useState<Cluster | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!agendaId) return;
    fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"}/clusters/${agendaId}`
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data: Cluster) => {
        setCluster(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [agendaId]);

  if (loading) return <p>Loading cluster…</p>;
  if (error)   return <p style={{ color: "red" }}>❌ {error}</p>;
  if (!cluster) return <p>Cluster not found.</p>;

  return (
    <div className="cluster-page">
      <header className="cluster-header">
        <h1>🎯 {cluster.title}</h1>
        <p className="prompt">Prompt: {cluster.prompt}</p>
        <button
          className="btn-promote-more"
          onClick={() =>
            navigate(`/clusters/${agendaId}/promote`, {
              state: { agendaId, agendaTitle: cluster.title },
            })
          }
        >
          + Promote More
        </button>
      </header>

      <section className="cluster-replies">
        <h2>Replies so far ({cluster.tweets.length})</h2>
        {cluster.tweets.length === 0 ? (
          <p>No replies generated yet. Click “Promote More” to start.</p>
        ) : (
          <table className="cluster-results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Original Tweet</th>
                <th>Your AI Reply</th>
                <th>Posted at</th>
                <th>View on X</th>
              </tr>
            </thead>
            <tbody>
              {cluster.tweets.map((t, i) => (
                <tr key={t.replyTweetId}>
                  <td>{i + 1}</td>
                  <td>{t.originalTweetText}</td>
                  <td>{t.responseComment}</td>
                  <td>{new Date(t.createdAt).toLocaleString()}</td>
                  <td>
                    <a
                      href={`https://twitter.com/i/web/status/${t.replyTweetId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on X
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
