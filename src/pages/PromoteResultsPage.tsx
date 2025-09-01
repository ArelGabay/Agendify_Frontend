import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../styles/PromoteResults.css";
import "../styles/stats.css"; // reuse pagination/toolbar styles

declare global {
  interface Window {
    twttr?: { widgets?: { load?: () => void } };
  }
}

type TweetIn = {
  id: string;
  text: string;
  responseComment?: string | { comment?: string } | Record<string, unknown>;
};

export default function PromoteResultsPage() {
  const { state } = useLocation();
  const tweets: TweetIn[] = Array.isArray(state?.tweets) ? state!.tweets! : [];
  const agendaTitle = state?.agendaTitle ?? "";
  const prompt = state?.prompt ?? "";
  const agendaId = state?.agendaId ?? "";

  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editedTweets, setEditedTweets] = useState(
    [] as {
      id: string;
      text: string;
      editedComment: string;
      editing: boolean;
    }[]
  );
  const [message, setMessage] = useState<string | null>(null);
  const [expandedTweetId, setExpandedTweetId] = useState<string | null>(null);

  // Computed pagination
  const totalItems = editedTweets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const clampedCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (clampedCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pagedTweets = editedTweets.slice(startIndex, endIndex);

  function unwrap(
    r:
      | string
      | { comment?: unknown }
      | Record<string, unknown>
      | null
      | undefined
  ): string {
    if (!r) return "";
    if (typeof r === "string") return r;
    if (r.comment !== undefined) return unwrap(r.comment);
    const firstString = Object.values(r).find((v) => typeof v === "string");
    return unwrap(firstString);
  }

  // Ensure Twitter widgets script exists
  function ensureTwitterScript(): Promise<void> {
    return new Promise((resolve) => {
      const existing = document.getElementById("twitter-wjs") as HTMLScriptElement | null;
      const ready = () => {
        const tw = (window as any).twttr;
        if (tw?.widgets?.createTweet) {
          setTimeout(() => resolve(), 0);
          return true;
        }
        return false;
      };
      if (ready()) return;
      if (!existing) {
        const s = document.createElement("script");
        s.id = "twitter-wjs";
        s.src = "https://platform.twitter.com/widgets.js";
        s.async = true;
        s.charset = "utf-8";
        s.onload = () => ready() || resolve();
        document.body.appendChild(s);
      }
      const int = setInterval(() => { if (ready()) clearInterval(int); }, 50);
      setTimeout(() => { clearInterval(int); resolve(); }, 1500);
    });
  }

  useEffect(() => {
    setEditedTweets(
      tweets.map((t) => ({
        id: t.id,
        text: t.text,
        editedComment: unwrap(t.responseComment),
        editing: false,
      }))
    );
    setCurrentPage(1);
  }, [tweets]);

  // Programmatic embed rendering for reliability
  function renderTweetEmbeds() {
    const tw = (window as any).twttr;
    if (!tw?.widgets?.createTweet) return;
    const nodes = document.querySelectorAll('.tweet-embed[data-tweet-id]');
    nodes.forEach((node) => {
      const el = node as HTMLElement;
      const id = el.dataset.tweetId;
      if (!id) return;
      if (el.getAttribute('data-rendering') === '1' || el.getAttribute('data-rendered') === '1') return;
      el.setAttribute('data-rendering', '1');
      el.innerHTML = '';
      tw.widgets.createTweet(id, el, { align: 'center', conversation: 'all', dnt: true, theme: 'light' })
        .then(() => { el.setAttribute('data-rendered', '1'); el.removeAttribute('data-rendering'); })
        .catch(() => {
          el.removeAttribute('data-rendering');
          el.removeAttribute('data-rendered');
          // Fallback to blockquote
          el.innerHTML = `<blockquote class="twitter-tweet"><a href="https://twitter.com/i/web/status/${id}">Tweet</a></blockquote>`;
          try { tw.widgets.load(el); } catch {}
        });
    });
  }

  // Render a single tweet into a container (for modal)
  function renderOneTweetEmbed(id: string, container: HTMLElement) {
    const tw = (window as any).twttr;
    if (!tw?.widgets?.createTweet) return;
    container.innerHTML = "";
    tw.widgets
      .createTweet(id, container, { align: 'center', conversation: 'all', dnt: true, theme: 'light' })
      .catch(() => {
        container.innerHTML = `<blockquote class="twitter-tweet"><a href="https://twitter.com/i/web/status/${id}"></a></blockquote>`;
        try { tw.widgets.load(container); } catch {}
      });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureTwitterScript();
      if (cancelled) return;
      // Try multiple passes in case iframes resize late
      renderTweetEmbeds();
      setTimeout(() => { if (!cancelled) renderTweetEmbeds(); }, 300);
      setTimeout(() => { if (!cancelled) renderTweetEmbeds(); }, 1000);
    })();
    return () => { cancelled = true; };
  }, [clampedCurrentPage, pageSize, editedTweets.length]);

  // Modal embed effect
  useEffect(() => {
    if (!expandedTweetId) return;
    let cancelled = false;
    (async () => {
      await ensureTwitterScript();
      if (cancelled) return;
      const el = document.querySelector('.tweet-embed-modal') as HTMLElement | null;
      if (el && expandedTweetId) {
        renderOneTweetEmbed(expandedTweetId, el);
      }
    })();
    return () => { cancelled = true; };
  }, [expandedTweetId]);

  const handleEdit = (i: number) =>
    setEditedTweets((prev) => {
      const c = [...prev];
      c[i].editing = true;
      return c;
    });

  const handleSave = (i: number) =>
    setEditedTweets((prev) => {
      const c = [...prev];
      c[i].editing = false;
      return c;
    });

  const handleChange = (i: number, v: string) =>
    setEditedTweets((prev) => {
      const c = [...prev];
      c[i].editedComment = v;
      return c;
    });

  const goBack = () =>
    navigate(`/agendas/${agendaId}/promote`, {
      state: { agendaId, agendaTitle },
    });

  const handlePostAllReplies = async () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!agendaId || !user._id) {
      setMessage("❌ Missing agendaId or login.");
      return;
    }
    try {
      const payload = {
        agendaId,
        twitterUserId: user._id,
        tweets: editedTweets.map((t) => ({
          id: t.id,
          responseComment: t.editedComment,
        })),
      };
      const resp = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
        }/twitter/postToX`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || resp.statusText);
      }
      setMessage("✅ All replies posted! Redirecting…");
      setTimeout(() => navigate(`/agendas/${agendaId}/dashboard`), 800);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(`❌ ${err.message}`);
      } else {
        setMessage("❌ An unknown error occurred.");
      }
    }
  };

  if (!editedTweets.length) {
    return (
      <div className="results-container">
        <h2 className="results-title">No tweets found</h2>
        <button className="btn-ghost" onClick={goBack}>Start New Promotion</button>
      </div>
    );
  }

  return (
    <div className="results-container">
      <div className="results-hero">
        <div className="hero-text">
          <h1 className="hero-title">{agendaTitle}</h1>
          {prompt && <p className="hero-subtitle">{prompt}</p>}
        </div>
        <div className="hero-actions">
          <button
            className="btn-ghost icon-only"
            onClick={goBack}
            type="button"
            aria-label="Start New Promotion"
            title="Start New Promotion"
          >
            <svg className="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10"></path>
              <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14"></path>
            </svg>
          </button>
        </div>
        <div className="hero-meta">
          <span className="chip">Suggestions: {totalItems}</span>
        </div>
        <div className="hero-post">
          <button className="btn-primary" onClick={handlePostAllReplies} type="button">Post All Replies</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="table-meta">
          {totalItems > 0 ? `Showing ${startIndex + 1}–${endIndex} of ${totalItems}` : 'No entries'}
        </div>
        <div className="table-actions">
          <label className="rows-select">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1); }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <div className="pagination">
            <button className="page-btn" disabled={clampedCurrentPage === 1} onClick={() => setCurrentPage(1)} aria-label="First page">«</button>
            <button className="page-btn" disabled={clampedCurrentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} aria-label="Previous page">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                const pageWindow = 2;
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                return p >= clampedCurrentPage - pageWindow && p <= clampedCurrentPage + pageWindow;
              })
              .map((p, idx, arr) => {
                const isEllipsisBefore = idx > 0 && p > arr[idx - 1] + 1;
                return (
                  <span key={p} className="page-number-wrap">
                    {isEllipsisBefore && <span className="ellipsis">…</span>}
                    <button className={p === clampedCurrentPage ? 'page-btn active' : 'page-btn'} onClick={() => setCurrentPage(p)}>{p}</button>
                  </span>
                );
              })}
            <button className="page-btn" disabled={clampedCurrentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} aria-label="Next page">›</button>
            <button className="page-btn" disabled={clampedCurrentPage === totalPages} onClick={() => setCurrentPage(totalPages)} aria-label="Last page">»</button>
          </div>
        </div>
      </div>

      <div className="replies-grid">
        {pagedTweets.map((t, idx) => (
          <article key={`${t.id}-${idx}`} className="reply-card">
            <header className="reply-card-header">
              <span className="reply-index">#{startIndex + idx + 1}</span>
              <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                {!t.editing ? (
                  <button className="btn-outline" onClick={() => handleEdit(idx)}>Edit</button>
                ) : (
                  <button className="btn-outline" onClick={() => handleSave(idx)}>Save</button>
                )}
                <button
                  className="reply-expand-btn"
                  onClick={() => setExpandedTweetId(t.id)}
                  type="button"
                  aria-label="Expand tweet"
                  title="Expand"
                >
                  <svg className="icon-expand" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="14" y1="10" x2="21" y2="3"></line>
                    <polyline points="9 21 3 21 3 15"></polyline>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                </button>
              </div>
            </header>
            <div className="reply-embed">
              <div className="tweet-embed" data-tweet-id={t.id}></div>
            </div>
            <div className="result-reply">
              {(!t.editedComment?.trim()) && !t.editing ? (
                <em className="muted">No comment generated by the AI.</em>
              ) : t.editing ? (
                <textarea
                  className="reply-editor"
                  value={t.editedComment}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  rows={5}
                />
              ) : (
                <p className="reply-text">{t.editedComment}</p>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Tweet Modal */}
      {expandedTweetId && (
        <div className="modal-backdrop" onClick={() => setExpandedTweetId(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setExpandedTweetId(null)}>×</button>
            <div className="modal-body">
              <div className="tweet-embed-modal"></div>
            </div>
          </div>
        </div>
      )}

      <div className="post-replies-wrapper">
        {message && <p className="status">{message}</p>}
      </div>
    </div>
  );
}
