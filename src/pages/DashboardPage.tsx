import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  ChartOptions
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar, Line } from "react-chartjs-2";
import "../styles/stats.css";

// Register Chart.js components + datalabels plugin
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  ChartDataLabels
);

// Types
type EngagementMetrics = {
  like_count: number;
  reply_count: number;
  views_count: number;
  retweet_count: number;
};

type TweetItem = {
  replyTweetId:      string;
  originalTweetId:   string;
  originalTweetText: string;
  responseComment:   string | null;
  createdAt:         string;
  engagement?:       EngagementMetrics & { fetchedAt?: string };
};

type AgendaDetail = {
  _id:       string;
  title:     string;
  prompt:    string;
  createdAt: string;
  tweets:    TweetItem[];
};

export default function DashboardPage() {
  const { agendaId } = useParams<{ agendaId: string }>();
  const [agenda, setAgenda]       = useState<AgendaDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "replies">("overview");
  const [filter, setFilter]       = useState<"all" | "replies" | "views">("all");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedTweet, setExpandedTweet] = useState<{ replyId: string; originalId?: string } | null>(null);
  const navigate = useNavigate();

  // Safe derivations used by pagination/effects regardless of loading state
  const tweetsAll: TweetItem[] = agenda?.tweets ?? [];
  const tweetsAllNewFirst = tweetsAll
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const repliedTweetsAll = tweetsAll.filter((t) => !!t.replyTweetId);
  const repliedTweetsAllByDate = repliedTweetsAll
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const sortedByRepliesAll = repliedTweetsAll
    .slice()
    .sort((a, b) => (b.engagement?.reply_count || 0) - (a.engagement?.reply_count || 0))
    .slice(0, 5);
  const sortedByViewsAll = repliedTweetsAll
    .slice()
    .sort((a, b) => (b.engagement?.views_count || 0) - (a.engagement?.views_count || 0))
    .slice(0, 5);

  let displayedTweets: TweetItem[];
  if (filter === "replies") {
    displayedTweets = sortedByRepliesAll;
  } else if (filter === "views") {
    displayedTweets = sortedByViewsAll;
  } else {
    // Show All: only items with a reply, newest first
    displayedTweets = repliedTweetsAllByDate;
  }

  // Pagination calculations (safe during loading)
  const isPaged = filter === "all";
  const totalItems = displayedTweets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const clampedCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (clampedCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pagedTweets = isPaged
    ? displayedTweets.slice(startIndex, endIndex)
    : displayedTweets;

  // Fetch agenda data
  useEffect(() => {
    if (!agendaId) return;
    fetch(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"}/agendas/${agendaId}`
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data: AgendaDetail) => setAgenda(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [agendaId]);

  // Inject Twitter widgets (for “Replies History” tab)
  function tryLoadWidgets() {
    const tw = (window as any).twttr;
    if (tw?.widgets?.load) {
      const container = document.querySelector(".replies-carousel");
      tw.widgets.load(container as HTMLElement | null);
    }
  }

  // Programmatic embed rendering ensures tweets show without requiring @username in URL
  function renderTweetEmbeds() {
    const tw = (window as any).twttr;
    if (!tw?.widgets?.createTweet) return;

    const create = (tweetId: string, container: HTMLElement, opts: any) =>
      new Promise<boolean>((resolve) => {
        let settled = false;
        const done = (ok: boolean) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };
        try {
          const p = tw.widgets.createTweet(tweetId, container, opts);
          if (p && typeof p.then === 'function') {
            p.then(() => done(true)).catch(() => done(false));
          } else {
            // Fallback: assume success, but still set a short timeout
            setTimeout(() => done(true), 0);
          }
        } catch {
          done(false);
        }
        // Guard against hanging promises
        setTimeout(() => done(false), 2000);
      });

    const nodes = document.querySelectorAll('.tweet-embed[data-tweet-id]');
    nodes.forEach(async (node) => {
      const el = node as HTMLElement;
      const id = el.dataset.tweetId!;
      const originalId = undefined;
      if (!id) return;
      if (el.getAttribute('data-rendered') === '1' || el.getAttribute('data-rendering') === '1') return;
      el.setAttribute('data-rendering', '1');

      const baseOptions = { align: 'center', dnt: true, theme: 'light' } as const;
      const origOptions = { ...baseOptions, conversation: 'none' } as const;
      const replyWithParent = { ...baseOptions, conversation: 'none' } as const;
      const replySinglePref = { ...baseOptions, conversation: 'all' } as const;
      const replySingleAlt = { ...baseOptions } as const; // let platform decide

      el.innerHTML = '';
      const container = document.createElement('div');
      el.appendChild(container);

      let replyOk = false;

      if (originalId) {
        // Create a two-row layout: parent on top, reply beneath
        el.innerHTML = '';
        const origEl = document.createElement('div');
        const replyEl = document.createElement('div');
        el.appendChild(origEl);
        el.appendChild(replyEl);
        // Render parent in background; don't block reply
        create(originalId, origEl, origOptions);
        // Render reply; try conversation none first, then all
        replyOk = await create(id, replyEl, replyWithParent);
        if (!replyOk) replyOk = await create(id, replyEl, replySinglePref);
        if (!replyOk) {
          // Fallback to blockquote
          replyEl.innerHTML = `<blockquote class="twitter-tweet"><a href="https://twitter.com/i/web/status/${id}"></a></blockquote>`;
          try { tw.widgets.load(replyEl); replyOk = true; } catch { replyOk = false; }
        }
      } else {
        // Single reply (no parent)
        replyOk = await create(id, container, replySinglePref);
        if (!replyOk) replyOk = await create(id, container, replySingleAlt);
        if (!replyOk) {
          container.innerHTML = `<blockquote class="twitter-tweet"><a href="https://twitter.com/i/web/status/${id}"></a></blockquote>`;
          try { tw.widgets.load(container); replyOk = true; } catch { replyOk = false; }
        }
      }

      el.removeAttribute('data-rendering');
      if (replyOk) {
        el.setAttribute('data-rendered', '1');
        el.removeAttribute('data-error');
      } else {
        el.removeAttribute('data-rendered');
        el.setAttribute('data-error', '1');
      }
      // Defer alignment check to next frame
      requestAnimationFrame(() => adjustEmbedAlignment());
    });
  }

  // Center short tweets vertically; top-align overflowing ones
  function adjustEmbedAlignment() {
    const containers = document.querySelectorAll<HTMLElement>('.reply-embed');
    containers.forEach((c) => {
      // Measure the inner tweet block if present
      const inner = c.querySelector<HTMLElement>('.tweet-embed, .twitter-tweet, .twitter-tweet-rendered');
      const contentHeight = inner?.offsetHeight ?? c.scrollHeight;
      const containerHeight = c.clientHeight;
      if (contentHeight > containerHeight - 8) {
        c.classList.add('overflowing');
      } else {
        c.classList.remove('overflowing');
      }
    });
  }

  function renderOneTweetEmbed(id: string, container: HTMLElement, originalId?: string) {
    const tw = (window as any).twttr;
    if (!tw?.widgets?.createTweet) return;
    container.innerHTML = "";
    const baseOptions = { align: 'center', dnt: true, theme: 'light' } as const;
    const origOptions = { ...baseOptions, conversation: 'none' } as const;
    const replyOptionsWithParent = { ...baseOptions, conversation: 'none' } as const;
    const replyOptionsSingle = { ...baseOptions, conversation: 'all' } as const;
    if (false) {
      const orig = document.createElement('div');
      const rep = document.createElement('div');
      container.appendChild(orig);
      container.appendChild(rep);
      tw.widgets
        .createTweet(originalId, orig, origOptions)
        .catch(() => null)
        .finally(() => {
          tw.widgets.createTweet(id, rep, replyOptionsWithParent).catch(() => null);
        });
    } else {
      tw.widgets.createTweet(id, container, replyOptionsSingle).catch(() => null);
    }
  }

  // Ensure the Twitter widgets.js script is present and ready
  function ensureTwitterScript(): Promise<void> {
    return new Promise((resolve) => {
      const existing = document.getElementById("twitter-wjs") as HTMLScriptElement | null;
      const ready = () => {
        const tw = (window as any).twttr;
        if (tw?.widgets?.createTweet) {
          // Give it a tick to fully initialize
          setTimeout(() => resolve(), 0);
          return true;
        }
        return false;
      };
      if (ready()) return; // already loaded
      if (!existing) {
        const script = document.createElement("script");
        script.id = "twitter-wjs";
        script.src = "https://platform.twitter.com/widgets.js";
        script.async = true;
        script.charset = "utf-8";
        script.onload = () => {
          // Some builds expose twttr.ready
          const tw = (window as any).twttr;
          if (tw?.ready) {
            tw.ready(() => ready() || resolve());
          } else {
            // Fallback poll until createTweet exists
            const int = setInterval(() => {
              if (ready()) {
                clearInterval(int);
              }
            }, 50);
            setTimeout(() => {
              clearInterval(int);
              resolve();
            }, 1500);
          }
        };
        document.body.appendChild(script);
      }
      // If script tag exists but not ready yet, poll briefly
      const int = setInterval(() => {
        if (ready()) clearInterval(int);
      }, 50);
      setTimeout(() => {
        clearInterval(int);
        resolve();
      }, 1500);
    });
  }

  useEffect(() => {
    if (activeTab === "replies" && agenda) {
      setCurrentSlide(0);
      if (!document.getElementById("twitter-wjs")) {
        const script = document.createElement("script");
        script.id = "twitter-wjs";
        script.src = "https://platform.twitter.com/widgets.js";
        script.async = true;
        script.charset = "utf-8";
        document.body.appendChild(script);
      }
      const initPoll = setTimeout(() => {
        tryLoadWidgets();
        const interval = setInterval(() => {
          const iframe = document.querySelector(".replies-carousel iframe");
          if (iframe) {
            clearInterval(interval);
          } else {
            tryLoadWidgets();
          }
        }, 200);
        return () => clearInterval(interval);
      }, 50);

      return () => clearTimeout(initPoll);
    }
  }, [activeTab, agenda]);

  useEffect(() => {
    if (activeTab === "replies") {
      const slidePoller = setTimeout(() => {
        tryLoadWidgets();
        const interval = setInterval(() => {
          const iframe = document.querySelector(".replies-carousel iframe");
          if (iframe) {
            clearInterval(interval);
          } else {
            tryLoadWidgets();
          }
        }, 200);
        return () => clearInterval(interval);
      }, 50);

      return () => clearTimeout(slidePoller);
    }
  }, [currentSlide, activeTab]);

  // Ensure page stays in bounds when filters or sizes change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, activeTab]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(displayedTweets.length / pageSize));
    setCurrentPage((cp) => Math.min(cp, tp));
  }, [displayedTweets.length, pageSize]);

  // Re-run Twitter widgets when the replies content changes; ensure script first
  useEffect(() => {
    if (activeTab !== "replies") return;
    let cancelled = false;
    (async () => {
      await ensureTwitterScript();
      if (cancelled) return;
      tryLoadWidgets();
      renderTweetEmbeds();
      // Allow some time for iframes to size, then adjust alignment
      setTimeout(() => adjustEmbedAlignment(), 300);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, clampedCurrentPage, pageSize, filter, displayedTweets.length]);

  // Render embed in modal when expanded
  useEffect(() => {
    if (!expandedTweet) return;
    let cancelled = false;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedTweet(null);
      } else if (e.key === 'Tab') {
        // Basic focus trap inside modal
        const dialog = document.querySelector('.modal-dialog') as HTMLElement | null;
        if (!dialog) return;
        const focusables = dialog.querySelectorAll<HTMLElement>(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !dialog.contains(active)) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (active === last || !dialog.contains(active)) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };
    (async () => {
      await ensureTwitterScript();
      if (cancelled) return;
      const el = document.querySelector('.tweet-embed-modal') as HTMLElement | null;
      if (el) {
        renderOneTweetEmbed(expandedTweet.replyId, el, expandedTweet.originalId);
      }
      // prevent background scroll and init focus
      document.body.classList.add('modal-open');
      // focus the close button
      setTimeout(() => {
        const closeBtn = document.querySelector('.modal-close') as HTMLButtonElement | null;
        closeBtn?.focus();
      }, 0);
      window.addEventListener('keydown', onKeyDown);
    })();
    return () => {
      cancelled = true;
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [expandedTweet]);

  if (loading) return <p>Loading dashboard…</p>;
  if (error)   return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!agenda) return <p>Agenda not found.</p>;

  const title = agenda.title;
  const createdAt = agenda.createdAt;
  const tweets = tweetsAll;

  // Compute KPI Metrics
  const totalReplies = tweets.filter((t) => !!t.replyTweetId).length;

  let engagedTweetsCount = 0;
  let untouchedCount      = 0;
  let totalLikes          = 0;
  let totalViews          = 0;
  let totalRetweets       = 0;

  tweets.forEach((t) => {
    const em = t.engagement;
    if (!t.replyTweetId) {
      untouchedCount++;
      return;
    }
    const likes     = em?.like_count     || 0;
    const replies   = em?.reply_count    || 0;
    const views     = em?.views_count    || 0;
    const retweets  = em?.retweet_count  || 0;
    totalLikes    += likes;
    totalViews    += views;
    totalRetweets += retweets;
    if (likes > 0 || replies > 0 || views > 0 || retweets > 0) {
      engagedTweetsCount++;
    } else {
      untouchedCount++;
    }
  });

  const engagementRatePercent = tweets.length
    ? Math.round((engagedTweetsCount / tweets.length) * 100)
    : 0;

  // “Replies You Posted” Over Time (vertical bar)
  const repliedTweets = tweets.filter((t) => !!t.replyTweetId);
  const repliesByDay: { [day: string]: number } = {};
  repliedTweets.forEach((t) => {
    const day = new Date(t.createdAt).toLocaleDateString();
    repliesByDay[day] = (repliesByDay[day] || 0) + 1;
  });
  const barData = {
    labels: Object.keys(repliesByDay),
    datasets: [
      {
        label: "Replies per Day",
        data: Object.values(repliesByDay),
        backgroundColor: "#b19cd9",
        borderRadius: 6,
        maxBarThickness: 40,
      },
    ],
  };
  const barOptions: ChartOptions<"bar"> = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title:  { display: false },
    },
    scales: {
      x: {
        grid: { color: "#ece9f6" },
        ticks: {
          color: "#7b809a",
          font: { size: 13, weight: "bold" },
        },
      },
      y: {
        grid: { color: "#ece9f6" },
        beginAtZero: true,
        ticks: {
          color: "#7b809a",
          font: { size: 13, weight: "bold" },
          stepSize: 1,
        },
      },
    },
  };

  // Engagement Timeline (line chart)
  const engagementByDay: {
    [date: string]: { replies: number; likes: number; views: number };
  } = {};
  let earliestReply: Date | null = null;

  tweets.forEach((t) => {
    if (!t.replyTweetId) return;
    const replyDate = new Date(t.createdAt);
    if (!earliestReply || replyDate < earliestReply) {
      earliestReply = replyDate;
    }
    const day = replyDate.toLocaleDateString();
    if (!engagementByDay[day]) {
      engagementByDay[day] = { replies: 0, likes: 0, views: 0 };
    }
    engagementByDay[day].replies += t.engagement?.reply_count || 0;
    engagementByDay[day].likes   += t.engagement?.like_count  || 0;
    engagementByDay[day].views   += t.engagement?.views_count || 0;
  });

  const today = new Date();
  const dates: string[] = [];
  if (earliestReply) {
    const cur = new Date(earliestReply);
    while (cur <= today) {
      dates.push(cur.toLocaleDateString());
      cur.setDate(cur.getDate() + 1);
    }
  }
  const repliesArray = dates.map((d) => engagementByDay[d]?.replies || 0);
  const likesArray   = dates.map((d) => engagementByDay[d]?.likes   || 0);
  const viewsArray   = dates.map((d) => engagementByDay[d]?.views   || 0);

  const engagementTimelineData = {
    labels: dates,
    datasets: [
      {
        label: "Replies to Your Replies",
        data: repliesArray,
        borderColor: "#4a90e2",
        backgroundColor: "rgba(74,144,226,0.08)",
        tension: 0.3,
        fill: false,
        pointRadius: 3,
      },
      {
        label: "Likes",
        data: likesArray,
        borderColor: "#f7b731",
        backgroundColor: "rgba(247,183,49,0.08)",
        tension: 0.3,
        fill: false,
        pointRadius: 3,
      },
      {
        label: "Views",
        data: viewsArray,
        borderColor: "#F1C40F",
        backgroundColor: "rgba(241,196,15,0.08)",
        tension: 0.3,
        fill: false,
        pointRadius: 3,
      },
    ],
  };
  const engagementTimelineOptions: ChartOptions<"line"> = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top" },
    },
    scales: {
      x: {
        title: { display: true, text: "Date" },
        grid: { color: "#ece9f6" },
        ticks: { color: "#7b809a", font: { size: 13, weight: "bold" } },
      },
      y: {
        title: { display: true, text: "Count" },
        beginAtZero: true,
        grid: { color: "#ece9f6" },
        ticks: { color: "#7b809a", font: { size: 13, weight: "bold" } },
      },
    },
  };

  // Top 5 Replies by Replies & Views are already computed above

  // Build counts
  const countViewedReplies = repliedTweets.filter(
    (t) => (t.engagement?.views_count || 0) > 0
  ).length;
  const countRepliesOnMyReply = repliedTweets.filter(
    (t) => (t.engagement?.reply_count || 0) > 0
  ).length;
  const countLikedReplies = repliedTweets.filter(
    (t) => (t.engagement?.like_count || 0) > 0
  ).length;
  const countRetweetedReplies = repliedTweets.filter(
    (t) => (t.engagement?.retweet_count || 0) > 0
  ).length;

  // Horizontal Bar chart
  const histogramData = {
    labels: [
      "Total Replies",
      "Viewed Replies",
      "Replies on My Reply",
      "Liked",
      "Retweeted",
    ],
    datasets: [
      {
        label: "Count",
        data: [
          totalReplies,
          countViewedReplies,
          countRepliesOnMyReply,
          countLikedReplies,
          countRetweetedReplies,
        ],
        backgroundColor: [
          "#b19cd9", // lavender, for Total Replies
          "#b3d8fd", // light blue, for Viewed Replies
          "#27ae60", // green, for Replies on My Reply
          "#e74c3c", // red, for Liked
          "#F1C40F", // yellow, for Retweeted
        ],
        borderRadius: 6,
        barThickness: 30,
      },
    ],
  };

  const histogramOptions: ChartOptions<"bar"> = {
    indexAxis: "y",
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: false,
        grid: { display: false },
        display: false,
      },
      y: {
        stacked: false,
        grid: { display: false },
        beginAtZero: true,
        ticks: {
          color: "#34495e",
          font: { size: 14 },
        },
      },
    },
    plugins: {
      legend: { display: false },
      datalabels: {
        anchor: "end",
        align: "end",
        color: "#2c3e50",
        font: { weight: "bold" },
        formatter: (value: number) => value,
        offset: 6,
      },
      tooltip: {
        callbacks: {
          label: function(tooltipItem) {
            // Defensive label extraction
            const label = tooltipItem.dataset.label ?? "";
            const value = tooltipItem.raw as number;
            const totalFive =
              totalReplies +
              countViewedReplies +
              countRepliesOnMyReply +
              countLikedReplies +
              countRetweetedReplies;
            const pct = ((value / totalFive) * 100).toFixed(1);
            return `${label}: ${value} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="dashboard-layout">
      <div className="dashboard-main">
        {/* Top Bar */}
        <header className="dashboard-header">
          <div className="agenda-title">
            <h1 className="agenda-heading">{title}</h1>
            <div className="agenda-meta">
              <span className="chip">Started {new Date(createdAt).toLocaleDateString()}</span>
              <span className="chip">{totalReplies} replies</span>
              <span className="chip">{engagementRatePercent}% engagement</span>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="btn-promote"
              onClick={() =>
                navigate(`/agendas/${agendaId}/promote`, {
                  state: { agendaId, agendaTitle: title },
                })
              }
              type="button"
            >
              Promote More
            </button>
          </div>
        </header>

        {/* Tab Buttons */}
        <div className="dashboard-tabs">
          <button
            className={activeTab === "overview" ? "tab active" : "tab"}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={activeTab === "replies" ? "tab active" : "tab"}
            onClick={() => setActiveTab("replies")}
          >
            Replies History
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* KPI Cards */}
            <section className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon kpi-red">📅</div>
                <div className="kpi-info">
                  <div className="kpi-label">Start Date</div>
                  <div className="kpi-value">
                    {new Date(createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon kpi-yellow">💬</div>
                <div className="kpi-info">
                  <div className="kpi-label">Total Replies</div>
                  <div className="kpi-value">{totalReplies}</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon kpi-green">👀</div>
                <div className="kpi-info">
                  <div className="kpi-label">Total Views</div>
                  <div className="kpi-value">{totalViews.toLocaleString()}</div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon kpi-blue">📈</div>
                <div className="kpi-info">
                  <div className="kpi-label">Engagement Rate</div>
                  <div className="kpi-value">{engagementRatePercent}%</div>
                </div>
              </div>
            </section>

            {/* Charts: Histograma & Replies Over Time */}
            <section className="chart-grid">
              {/* Histograma (five horizontal bars) */}
              <div className="chart-card">
                <h3>Reply Engagement Breakdown</h3>
                <div style={{ height: "240px" }}>
                  <Bar
                    key="histograma-chart"
                    data={histogramData}
                    options={histogramOptions}
                  />
                </div>
              </div>

              {/* Replies Over Time (vertical bar) */}
              <div className="chart-card">
                <h3>Replies Over Time</h3>
                <div
                  className="bar-wrapper"
                  style={{ width: "100%", height: "340px" }}
                >
                  <Bar
                    key="replies-over-time"
                    data={barData}
                    options={barOptions}
                  />
                </div>
              </div>
            </section>

            {/* Engagement Timeline (line) */}
            <section className="top-section">
              <div className="top-card engagement-timeline-card">
                <h3>Engagement Timeline</h3>
                <div
                  className="timeline-chart-container"
                  style={{ width: "100%", height: "340px" }}
                >
                  <Line
                    key="engagement-line"
                    data={engagementTimelineData}
                    options={engagementTimelineOptions}
                  />
                </div>
              </div>
            </section>
          </>
        )}

        {/* Replies History Tab */}
        {activeTab === "replies" && (
          <>
            {/* Three Filter Buttons */}
            <div className="sub-tabs">
              <button
                className={filter === "all" ? "tab active" : "tab"}
                onClick={() => setFilter("all")}
              >
                Show All
              </button>
              <button
                className={filter === "replies" ? "tab active" : "tab"}
                onClick={() => setFilter("replies")}
              >
                Top 5 by Replies
              </button>
              <button
                className={filter === "views" ? "tab active" : "tab"}
                onClick={() => setFilter("views")}
              >
                Top 5 by Views
              </button>
            </div>

            {/* Replies Cards Container */}
            <section className="top-section">
              <div className="top-card replies-history-card">
                {/* Controls (only for Show All) */}
                {isPaged && (
                <div className="table-toolbar">
                  <div className="table-meta">
                    {totalItems > 0
                      ? `Showing ${startIndex + 1}–${endIndex} of ${totalItems}`
                      : "No entries"}
                  </div>
                  <div className="table-actions">
                    <label className="rows-select">
                      Rows per page
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          const size = parseInt(e.target.value, 10);
                          setPageSize(size);
                          setCurrentPage(1);
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </label>
                    <div className="pagination">
                      <button
                        className="page-btn"
                        disabled={clampedCurrentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        aria-label="First page"
                      >
                        «
                      </button>
                      <button
                        className="page-btn"
                        disabled={clampedCurrentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      {/* Page numbers (windowed) */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => {
                          const pageWindow = 2; // show current ±2
                          if (totalPages <= 7) return true;
                          if (p === 1 || p === totalPages) return true;
                          return (
                            p >= clampedCurrentPage - pageWindow &&
                            p <= clampedCurrentPage + pageWindow
                          );
                        })
                        .map((p, idx, arr) => {
                          const isEllipsisBefore =
                            idx > 0 && p > arr[idx - 1] + 1;
                          return (
                            <span key={p} className="page-number-wrap">
                              {isEllipsisBefore && <span className="ellipsis">…</span>}
                              <button
                                className={
                                  p === clampedCurrentPage ? "page-btn active" : "page-btn"
                                }
                                onClick={() => setCurrentPage(p)}
                              >
                                {p}
                              </button>
                            </span>
                          );
                        })}
                      <button
                        className="page-btn"
                        disabled={clampedCurrentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        aria-label="Next page"
                      >
                        ›
                      </button>
                      <button
                        className="page-btn"
                        disabled={clampedCurrentPage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        aria-label="Last page"
                      >
                        »
                      </button>
                    </div>
                  </div>
                </div>
                )}
                <div className="replies-grid replies-carousel">
                  {pagedTweets.map((t, i) => (
                    <article key={t.replyTweetId} className="reply-card">
                      <header className="reply-card-header">
                        <span className="reply-index">#{(isPaged ? startIndex : 0) + i + 1}</span>
                        <time className="reply-date" dateTime={t.createdAt}>
                          {new Date(t.createdAt).toLocaleString()}
                        </time>
                        <button
                          className="reply-expand-btn"
                          onClick={() => setExpandedTweet({ replyId: t.replyTweetId, originalId: t.originalTweetId })}
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
                      </header>
                      <div className="reply-embed">
                        <div className="tweet-embed" data-tweet-id={t.replyTweetId} data-original-id={t.originalTweetId || undefined}></div>
                      </div>
                      <footer className="reply-metrics">
                        <span title="Likes">❤️ {t.engagement?.like_count ?? 0}</span>
                        <span title="Replies">💬 {t.engagement?.reply_count ?? 0}</span>
                        <span title="Views">👀 {t.engagement?.views_count ?? 0}</span>
                        <span title="Retweets">🔁 {t.engagement?.retweet_count ?? 0}</span>
                      </footer>
                    </article>
                  ))}
                </div>
                {/* Bottom Pagination (duplicate) only for paged view */}
                {isPaged && (
                  <div className="table-footer">
                    <div className="table-meta">
                      {totalItems > 0
                        ? `Showing ${startIndex + 1}–${endIndex} of ${totalItems}`
                        : "No entries"}
                    </div>
                    <div className="pagination">
                      <button
                        className="page-btn"
                        disabled={clampedCurrentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        aria-label="First page"
                      >
                        «
                      </button>
                      <button
                        className="page-btn"
                        disabled={clampedCurrentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      <span className="page-status">Page {clampedCurrentPage} of {totalPages}</span>
                      <button
                        className="page-btn"
                        disabled={clampedCurrentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        aria-label="Next page"
                      >
                        ›
                      </button>
                      <button
                        className="page-btn"
                        disabled={clampedCurrentPage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        aria-label="Last page"
                      >
                        »
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
            {/* Tweet Modal */}
            {expandedTweet && (
              <div className="modal-backdrop" onClick={() => setExpandedTweet(null)}>
                <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" type="button" onClick={() => setExpandedTweet(null)}>
                    ×
                  </button>
                  <div className="modal-body">
                    <div className="tweet-embed-modal"></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
