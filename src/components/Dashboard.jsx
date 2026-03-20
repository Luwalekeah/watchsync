import { useState, useEffect } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import { computeComparison, scoreLabel } from "../utils/comparison.js";
import { fetchRecommendations } from "../api/index.js";
import { encodeProfile } from "../utils/encoding.js";

/**
 * Full comparison dashboard shown once both users have submitted their profiles.
 * Uses AbortController to cancel the AI fetch if the component unmounts before
 * the request completes (e.g., user clicks "Start over").
 */
export default function Dashboard({ profileA, profileB, onReset }) {
  const [recs,      setRecs]     = useState([]);
  const [recsLoad,  setRecsLoad] = useState(true);
  const [recsErr,   setRecsErr]  = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const comparison = computeComparison(profileA, profileB);
  const { score, sharedGenres, sharedShows, radarData } = comparison;
  const label = scoreLabel(score);
  const maxGV = Math.max(...sharedGenres.flatMap((g) => [g.A, g.B]), 1);
  const circumference = 2 * Math.PI * 76; // r=76

  // ── AbortController: cancel AI fetch on unmount ──────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    fetchRecommendations(profileA, profileB, score, controller.signal)
      .then((r) => setRecs(r))
      .catch((e) => {
        if (e.name !== "AbortError") {
          setRecsErr("Couldn't load AI recommendations — check API access.");
        }
      })
      .finally(() => setRecsLoad(false));

    return () => controller.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copyLink = () => {
    const enc = encodeProfile(profileA);
    const url = `${window.location.origin}${window.location.pathname}?sync=${enc}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  return (
    <div className="dashboard">

      {/* ── Score hero ───────────────────────────────────────────────── */}
      <div className="score-hero anim-fade-up">
        <div className="score-ring-label">● COMPARISON COMPLETE</div>

        <div className="score-ring anim-score-pop">
          <svg width={176} height={176} viewBox="0 0 176 176" aria-label={`${score}% compatibility`}>
            <circle cx="88" cy="88" r="76" fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle
              cx="88" cy="88" r="76" fill="none"
              stroke="url(#score-grad)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
              transform="rotate(-90 88 88)"
            />
            <defs>
              <linearGradient id="score-grad" x1="0" y1="0" x2="1" y2="0">
                <stop stopColor="#06b6d4" />
                <stop offset="1" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            <text x="88" y="73" textAnchor="middle" dominantBaseline="central" fill="var(--text)"
              fontFamily="'Syne',sans-serif" fontSize="38" fontWeight="800">
              {score}%
            </text>
            <text x="88" y="103" textAnchor="middle" dominantBaseline="central" fill="var(--muted-2)"
              fontFamily="'DM Sans',sans-serif" fontSize="13">
              compatible
            </text>
          </svg>
        </div>

        <h2 className="score-title anim-fade-up-2">{label.title}</h2>
        <p className="score-sub anim-fade-up-3">{label.sub}</p>

        <div className="score-actions anim-fade-up-4">
          <button className="btn btn-amber" onClick={copyLink}>
            {linkCopied ? "✓ Copied!" : "🔗 Copy sync link"}
          </button>
          <button className="btn-ghost" onClick={onReset}>Start over</button>
        </div>
      </div>

      {/* ── Stat row ─────────────────────────────────────────────────── */}
      <div className="stat-row">
        {[
          { label: "Shared Genres",   value: sharedGenres.length, sub: "genres you both love",       accent: "var(--cyan)"  },
          { label: "Shows in Common", value: sharedShows.length,  sub: "exact title matches",        accent: "var(--amber)" },
          { label: "AI Picks",        value: recs.length || "…",  sub: "curated for you two",        accent: "var(--green)" },
        ].map((s, i) => (
          <div key={s.label} className="stat-card card anim-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.accent }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Radar + Genre bars ────────────────────────────────────────── */}
      <div className="two-col anim-fade-up-2">
        <div className="card">
          <h3 className="section-title">Genre Radar</h3>
          <p className="section-sub">
            <span style={{ color: "var(--cyan)" }}>■</span> You &nbsp;
            <span style={{ color: "var(--amber)" }}>■</span> Friend
          </p>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} cx="50%" cy="50%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="genre" tick={{ fill: "var(--muted-2)", fontSize: 11 }} />
                <Radar name="You"    dataKey="A" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                <Radar name="Friend" dataKey="B" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">Not enough shared genres for radar</div>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">Shared Genres</h3>
          <p className="section-sub">Watch volume compared side by side</p>
          {sharedGenres.length === 0 ? (
            <div className="empty-state">No shared genres detected.</div>
          ) : (
            <div className="genre-bars">
              {sharedGenres.slice(0, 7).map((g) => (
                <div key={g.name} className="genre-bar-group">
                  <div className="genre-bar-name">{g.name}</div>
                  {[
                    { label: "You",  val: g.A, color: "var(--cyan)"  },
                    { label: "Them", val: g.B, color: "var(--amber)" },
                  ].map((row) => (
                    <div key={row.label} className="genre-bar-row">
                      <span className="genre-bar-label" style={{ color: row.color }}>{row.label}</span>
                      <div className="genre-bar-track">
                        <div className="genre-bar-fill" style={{ width: `${(row.val / maxGV) * 100}%`, background: row.color }} />
                      </div>
                      <span className="genre-bar-count">{row.val}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Show overlap ─────────────────────────────────────────────── */}
      {sharedShows.length > 0 && (
        <div className="card anim-fade-up-3">
          <h3 className="section-title">Shows You've Both Watched</h3>
          <p className="section-sub">Exact title matches — ranked by combined watch count</p>
          <div className="show-overlap-grid">
            {sharedShows.slice(0, 10).map((s, i) => (
              <div key={s.title} className="show-overlap-item">
                <span className="show-rank">{String(i + 1).padStart(2, "0")}</span>
                <div className="show-info">
                  <div className="show-title">{s.title}</div>
                  <div className="show-counts">You: {s.watchCountA}× · Them: {s.watchCount}×</div>
                </div>
                <div className="match-dot" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Recommendations ───────────────────────────────────────── */}
      <div className="card anim-fade-up-4">
        <div className="recs-header">
          <div>
            <h3 className="section-title">AI Picks — Just for You Two</h3>
            <p className="section-sub">Titles neither of you has watched, curated for your combined taste profile</p>
          </div>
          {recsLoad && (
            <div className="loading-row">
              <div className="spinner" aria-hidden="true" />
              <span className="loading-text">Thinking…</span>
            </div>
          )}
        </div>

        {recsErr && <div className="error-box" role="alert">⚠ {recsErr}</div>}

        {recsLoad && !recsErr && (
          <div className="recs-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rec-card skeleton" style={{ height: 130 }} />
            ))}
          </div>
        )}

        {recs.length > 0 && (() => {
          const movies = recs.filter((r) => r.type === "movie");
          const shows  = recs.filter((r) => r.type === "show");
          const RecCard = ({ r, i }) => (
            <div key={i} className="rec-card">
              <div className="rec-header">
                <div className="rec-title">{r.title}</div>
                {r.matchScore != null && (
                  <span className="rec-match-score">{r.matchScore}%</span>
                )}
              </div>
              <span className={`rec-type-badge${r.type === "movie" ? " movie" : ""}`}>
                {r.type === "movie" ? "🎬 Movie" : "📺 Show"}
              </span>
              <div className="rec-meta">{r.year} · {(r.genres || []).slice(0, 2).join(", ")}</div>
              <div className="rec-reason">"{r.reason}"</div>
            </div>
          );
          return (
            <div className="recs-grid">
              {recs.map((r, i) => <RecCard key={i} r={r} i={i} />)}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
