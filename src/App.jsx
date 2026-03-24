import { useState, useEffect, useCallback } from "react";
import Logo from "./components/Logo.jsx";
import Landing from "./components/Landing.jsx";
import Collect from "./components/Collect.jsx";
import ShareScreen from "./components/ShareScreen.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Docs from "./components/Docs.jsx";
import ManualProfile from "./components/ManualProfile.jsx";
import { decodeProfile } from "./utils/encoding.js";
import { checkPassword } from "./api/index.js";
import "./styles.css";

/**
 * Phase states:
 *  landing  → Solo user hasn't started yet
 *  collect  → User is going through the data collection flow
 *  share    → User A finished; showing share link
 *  compare  → Both profiles available; showing dashboard
 *
 * Mode:
 *  solo     → Normal flow (User A)
 *  receiver → Arrived via ?sync= link (User B)
 */
export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("ws_auth") === "1");
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const handleLogin = async () => {
    setPwErr("");
    setPwLoading(true);
    try {
      const ok = await checkPassword(pw);
      if (ok) {
        sessionStorage.setItem("ws_auth", "1");
        setAuthed(true);
      } else {
        setPwErr("Wrong password");
      }
    } catch {
      setPwErr("Could not connect to server");
    }
    setPwLoading(false);
  };

  const [mode,  setMode]  = useState("detecting");
  const [phase, setPhase] = useState("landing");
  const [profileA, setProfileA] = useState(null);
  const [profileB, setProfileB] = useState(null);

  // ── Detect receiver mode from URL on mount ───────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sync   = params.get("sync");
    if (sync) {
      const decoded = decodeProfile(sync);
      if (decoded) {
        setProfileA(decoded);
        setMode("receiver");
        setPhase("collect");
        return;
      }
    }
    setMode("solo");
  }, []);

  const handleProfileA = useCallback((profile) => {
    setProfileA(profile);
    setPhase("share");
  }, []);

  const handleProfileB = useCallback((profile) => {
    setProfileB(profile);
    setPhase("compare");
  }, []);

  const handleDemoCompare = useCallback(() => {
    // Reverse profileA's arrays to simulate a different user for local testing
    setProfileB({
      ...profileA,
      genres: [...profileA.genres].reverse(),
      shows:  [...profileA.shows].reverse(),
    });
    setPhase("compare");
  }, [profileA]);

  const reset = useCallback(() => {
    setProfileA(null);
    setProfileB(null);
    setMode("solo");
    setPhase("landing");
    window.history.pushState({}, "", window.location.pathname);
  }, []);

  if (!authed) {
    return (
      <div className="gate">
        <div className="gate-card">
          <Logo size={36} />
          <h2 className="gate-title">Welcome to WatchSync</h2>
          <p className="gate-sub">Enter the access code to continue.</p>
          <div className="gate-row">
            <input
              className="gate-input"
              type="password"
              placeholder="Access code"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setPwErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && pw.trim() && handleLogin()}
              autoFocus
            />
            <button className="btn" onClick={handleLogin} disabled={!pw.trim() || pwLoading}>
              {pwLoading ? "…" : "Enter"}
            </button>
          </div>
          {pwErr && <div className="gate-err">{pwErr}</div>}
        </div>
      </div>
    );
  }

  if (mode === "detecting") {
    return (
      <div className="app-loading">
        <div className="spinner" aria-label="Loading…" />
      </div>
    );
  }

  return (
    <div className="app">
      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="nav" role="navigation" aria-label="Main">
        <button className="nav-logo-btn" onClick={reset} aria-label="WatchSync home">
          <Logo size={30} />
        </button>
        <div className="nav-right">
          {mode === "receiver" && (
            <span className="nav-badge amber">● Compare mode</span>
          )}
          <span className="nav-badge muted">
            {phase === "compare" ? "✓ Synced" : "Phase 1–2"}
          </span>
          <button className="nav-help-btn" onClick={() => setPhase(p => p === "docs" ? "landing" : "docs")}>
            Help
          </button>
        </div>
      </nav>

      {/* ── Main content ───────────────────────────────────────────── */}
      <main className="main-content">

        {phase === "docs" && (
          <Docs onBack={() => setPhase("landing")} />
        )}

        {phase === "landing" && mode === "solo" && (
          <Landing
            onStart={() => setPhase("collect")}
            onManual={() => setPhase("manual")}
            onSyncLink={(link) => {
              try {
                const url = new URL(link.includes("://") ? link : `https://x.com/?${link.replace(/^\?/, "")}`);
                const sync = url.searchParams.get("sync");
                if (!sync) return "No sync data found in that link.";
                const decoded = decodeProfile(sync);
                if (!decoded) return "Could not decode the sync link. Make sure you copied it fully.";
                setProfileA(decoded);
                setMode("receiver");
                setPhase("collect");
                return null;
              } catch {
                return "Invalid link. Paste the full URL your friend sent you.";
              }
            }}
          />
        )}

        {phase === "collect" && mode === "receiver" && (
          <div>
            {/* Invite banner */}
            <div className="invite-banner card">
              <span className="invite-icon" aria-hidden="true">🔗</span>
              <div>
                <div className="invite-eyebrow">SYNC INVITE</div>
                <h2 className="invite-title">Someone wants to find a show with you</h2>
                <p className="invite-desc">
                  They've synced their profile. Add yours to see your compatibility
                  score and get AI-powered recommendations for both of you.
                </p>
                <div className="invite-stats">
                  {[
                    { label: "Their top genre",   value: profileA?.genres?.[0]?.name || "—" },
                    { label: "Titles in profile", value: profileA?.shows?.length || 0 },
                    { label: "Platform",          value: profileA?.platform || "Netflix" },
                  ].map((s) => (
                    <div key={s.label} className="invite-stat">
                      <div className="invite-stat-label">{s.label}</div>
                      <div className="invite-stat-value">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Collect onDone={handleProfileB} onManual={() => setPhase("manual")} isUserB partnerPlatform={profileA?.platform} />
          </div>
        )}

        {phase === "collect" && mode === "solo" && (
          <Collect onDone={handleProfileA} onManual={() => setPhase("manual")} />
        )}

        {phase === "manual" && mode === "solo" && (
          <ManualProfile onDone={handleProfileA} onBack={() => setPhase("landing")} />
        )}

        {phase === "manual" && mode === "receiver" && (
          <ManualProfile onDone={handleProfileB} onBack={() => setPhase("collect")} />
        )}

        {phase === "share" && profileA && (
          <ShareScreen
            profile={profileA}
            onReset={reset}
            onDemoCompare={handleDemoCompare}
          />
        )}

        {phase === "compare" && profileA && profileB && (
          <Dashboard profileA={profileA} profileB={profileB} onReset={reset} />
        )}

      </main>
    </div>
  );
}
