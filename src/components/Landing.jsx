import { useState } from "react";

const HOW_IT_WORKS = [
  { n: "01", t: "Run a script",       d: "Extract your watch history from Netflix in seconds" },
  { n: "02", t: "Build your profile", d: "WatchSync maps your genres and taste fingerprint" },
  { n: "03", t: "Share a link",       d: "Send your sync link to a friend or partner" },
  { n: "04", t: "See your matches",   d: "AI picks what you'll both love — ready to watch" },
];

export default function Landing({ onStart, onSyncLink }) {
  const [syncInput, setSyncInput] = useState("");
  const [syncErr,   setSyncErr]   = useState("");
  return (
    <div className="landing">
      <div className="anim-fade-up landing-hero">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          <span className="hero-badge-text">SOLVING THE STREAMING STRUGGLE</span>
        </div>

        <h1 className="hero-headline">
          Stop scrolling.<br />
          <span className="hero-accent">Start watching</span> together.
        </h1>

        <p className="hero-sub">
          WatchSync reads your streaming history, maps your taste DNA, and finds
          what you'll both love — across every platform.
        </p>

        <div className="anim-fade-up-2 how-it-works">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.n} className="how-card">
              <div className="how-number">{s.n}</div>
              <div className="how-title">{s.t}</div>
              <div className="how-desc">{s.d}</div>
            </div>
          ))}
        </div>

        <div className="anim-fade-up-3 stat-block">
          <div className="stat-big">90%</div>
          <div>
            <p className="stat-headline">
              of couples spend more time picking a movie than watching it.
            </p>
            <p className="stat-body">
              WatchSync ends the scroll by understanding both of your taste profiles
              and surfacing what you'll actually both enjoy.
            </p>
          </div>
        </div>

        <div className="anim-fade-up-4 hero-cta">
          <button className="btn btn-lg" onClick={onStart}>
            Build my taste profile →
          </button>
        </div>

        {/* ── Got a sync link? ── */}
        <div className="anim-fade-up-4 sync-link-entry">
          <div className="sync-link-divider">
            <span>Got a link from a friend?</span>
          </div>
          <div className="sync-link-row">
            <input
              className="sync-link-input"
              type="text"
              placeholder="Paste your friend's sync link here…"
              value={syncInput}
              onChange={(e) => { setSyncInput(e.target.value); setSyncErr(""); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && syncInput.trim()) {
                  const err = onSyncLink(syncInput.trim());
                  if (err) setSyncErr(err);
                }
              }}
            />
            <button
              className="btn"
              disabled={!syncInput.trim()}
              onClick={() => {
                const err = onSyncLink(syncInput.trim());
                if (err) setSyncErr(err);
              }}
            >
              Compare →
            </button>
          </div>
          {syncErr && <div className="sync-link-err">{syncErr}</div>}
        </div>
      </div>
    </div>
  );
}
