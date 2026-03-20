import { useState, useRef, useEffect } from "react";
import { parseNetflixHistory } from "../utils/validation.js";
import { parseNetflixCSV } from "../utils/csvParser.js";
import { enrichHistory } from "../api/index.js";

// Published extension ID — update this after uploading to Chrome Web Store
// For local dev: find it at chrome://extensions after loading unpacked
export const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID || "YOUR_EXTENSION_ID_HERE";

const PLATFORMS = [
  { id: "netflix",     name: "Netflix",     emoji: "🔴", status: "live" },
  { id: "hulu",        name: "Hulu",        emoji: "🟢", status: "soon" },
  { id: "hbo",         name: "Max",         emoji: "🔵", status: "soon" },
  { id: "disney",      name: "Disney+",     emoji: "🏰", status: "soon" },
  { id: "crunchyroll", name: "Crunchyroll", emoji: "🟠", status: "soon" },
  { id: "prime",       name: "Prime Video", emoji: "📦", status: "csv"  },
];

// ── Extension communication ───────────────────────────────────────────────────

function detectExtension() {
  return new Promise((resolve) => {
    if (!window.chrome?.runtime) return resolve(false);
    const timer = setTimeout(() => resolve(false), 1000);
    try {
      chrome.runtime.sendMessage(EXTENSION_ID, { type: "PING" }, (res) => {
        clearTimeout(timer);
        resolve(!chrome.runtime.lastError && res?.ok === true);
      });
    } catch {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

function syncViaExtension(onProgress) {
  return new Promise((resolve, reject) => {
    if (!window.chrome?.runtime) return reject(new Error("Extension not available"));

    // Listen for progress updates
    const progressListener = (event) => {
      if (event.data?.type === "SYNC_PROGRESS") {
        onProgress?.(event.data.current, event.data.total);
      }
    };
    window.addEventListener("message", progressListener);

    chrome.runtime.sendMessage(EXTENSION_ID, { type: "SYNC_REQUEST" }, (response) => {
      window.removeEventListener("message", progressListener);
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (response?.ok) {
        resolve(response.data);
      } else {
        reject(new Error(response?.error || "Extension sync failed"));
      }
    });
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Collect({ onDone, isUserB = false, partnerPlatform = null }) {
  const [step,          setStep]         = useState(1);
  const [plat,          setPlat]         = useState("netflix");
  const [method,        setMethod]       = useState(null);    // "extension" | "csv"
  const [extInstalled,  setExtInstalled] = useState(false);
  const [extChecking,   setExtChecking]  = useState(true);
  const [json,          setJson]         = useState("");
  const [csvFile,       setCsvFile]      = useState(null);
  const [csvName,       setCsvName]      = useState("");
  const [loading,       setLoad]         = useState(false);
  const [syncProgress,  setSyncProgress] = useState({ current: 0, total: 0 });
  const [err,           setErr]          = useState("");
  const [dragging,      setDragging]     = useState(false);
  const fileInputRef = useRef();

  // Detect extension on mount
  useEffect(() => {
    detectExtension().then((installed) => {
      setExtInstalled(installed);
      setExtChecking(false);
      // Auto-select extension method if available
      if (installed) setMethod("extension");
    });
  }, []);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setErr("Please upload a .csv file (ViewingActivity.csv from your Netflix export).");
      return;
    }
    setCsvFile(file);
    setCsvName(file.name);
    setErr("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleProcess = async () => {
    setErr("");
    setLoad(true);
    try {
      let items;

      if (method === "extension") {
        // One-click: extension injects extractor into Netflix tab
        const rawData = await syncViaExtension((current, total) => {
          setSyncProgress({ current, total });
        });
        items = parseNetflixHistory(JSON.stringify(rawData));

      } else if (method === "csv") {
        const text = await csvFile.text();
        const csvItems = parseNetflixCSV(text);
        items = parseNetflixHistory(JSON.stringify(csvItems));

      } else {
        throw new Error("Please select a sync method.");
      }

      const profile = await enrichHistory(items);
      onDone({ ...profile, platform: plat });

    } catch (e) {
      setErr(e.message);
    }
    setLoad(false);
  };

  const canSubmit =
    method === "extension" ? true :
    method === "csv"       ? !!csvFile :
    false;

  const STEPS = ["Platform", "Get Data", "Process"];
  const progressPct = syncProgress.total
    ? Math.round((syncProgress.current / syncProgress.total) * 100)
    : 0;

  return (
    <div className="collect-wrapper">

      {/* Step indicator */}
      <div className="step-indicator">
        {STEPS.map((label, i) => (
          <div key={label} className="step-indicator-item">
            <div className={`step-pill${step === i + 1 ? " active" : ""}`}>
              <div className={`step-dot${step > i + 1 ? " done" : step === i + 1 ? " current" : ""}`}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span className={`step-label${step === i + 1 ? " active" : ""}`}>{label}</span>
            </div>
            {i < 2 && <div className="step-connector" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Platform ── */}
      {step === 1 && (
        <div className="card anim-fade-up">
          <h3 className="card-title">
            {isUserB ? "Which platform do you use?" : "Select your platform"}
          </h3>
          <p className="card-sub">
            {isUserB
              ? `Your friend used ${partnerPlatform || "Netflix"}. You can use a different platform.`
              : "Choose where your watch history lives."}
          </p>
          <div className="platform-grid">
            {PLATFORMS.map((p) => (
              <button key={p.id} disabled={p.status !== "live"} onClick={() => setPlat(p.id)}
                className={`platform-pill${plat === p.id ? " selected" : ""}`} aria-pressed={plat === p.id}>
                <span className="platform-emoji">{p.emoji}</span>
                <div>
                  <div className={`platform-name${plat === p.id ? " selected" : ""}`}>{p.name}</div>
                  <div className={`platform-status${p.status === "live" ? " live" : ""}`}>
                    {p.status === "live" ? "● Live" : p.status === "csv" ? "CSV" : "○ Soon"}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="card-footer">
            <button className="btn" onClick={() => setStep(2)}>Continue →</button>
          </div>
        </div>
      )}

      {/* ── Step 2: Choose method ── */}
      {step === 2 && (
        <div className="card anim-fade-up">
          <h3 className="card-title">How do you want to sync?</h3>
          <p className="card-sub">Choose the method that works for you.</p>

          <div className="method-grid">

            {/* Extension option */}
            <button
              className={`method-card${method === "extension" ? " selected" : ""}${!extInstalled ? " disabled" : ""}`}
              onClick={() => extInstalled && setMethod("extension")}
              disabled={extChecking}
            >
              {extChecking ? (
                <div className="method-icon">⏳</div>
              ) : extInstalled ? (
                <div className="method-icon">⚡</div>
              ) : (
                <div className="method-icon" style={{ opacity: 0.4 }}>🔌</div>
              )}
              <div className="method-title">
                WatchSync Extension
                {extInstalled && <span className="method-installed-dot" />}
              </div>
              <div className="method-desc">
                {extChecking
                  ? "Checking for extension…"
                  : extInstalled
                  ? "One click — no DevTools, no copy-paste. The extension syncs Netflix directly."
                  : "Install the WatchSync Chrome extension for one-click sync. No DevTools needed."}
              </div>
              {!extChecking && (
                extInstalled
                  ? <div className="method-badge instant">✓ Installed — One click</div>
                  : <div className="method-badge not-installed">
                      <a href="#install" onClick={(e) => { e.stopPropagation(); document.getElementById("ext-install")?.scrollIntoView(); }}
                        style={{ color: "inherit", textDecoration: "none" }}>
                        Install extension →
                      </a>
                    </div>
              )}
            </button>

            {/* CSV option */}
            <button className={`method-card${method === "csv" ? " selected" : ""}`} onClick={() => setMethod("csv")}>
              <div className="method-icon">📄</div>
              <div className="method-title">Official CSV Export</div>
              <div className="method-desc">
                Download your data from Netflix's privacy page and upload ViewingActivity.csv.
              </div>
              <div className="method-badge days">Takes 2–3 days</div>
            </button>
          </div>

          {/* CSV upload area (shown inline when csv selected) */}
          {method === "csv" && (
            <div className="method-detail anim-fade-up">
              <div className="steps-grid" style={{ marginBottom: 0 }}>
                {[
                  { n: "01", t: "Go to Account",      d: "Account → Security & Privacy" },
                  { n: "02", t: "Request your data",  d: 'Click "Download your personal information"' },
                  { n: "03", t: "Wait for email",     d: "Netflix sends a download link in 2–3 days" },
                  { n: "04", t: "Find the CSV",       d: "Unzip the file → ViewingActivity.csv" },
                ].map((s) => (
                  <div key={s.n} className="step-card">
                    <div className="step-number">{s.n}</div>
                    <div className="step-title">{s.t}</div>
                    <div className="step-desc">{s.d}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extension not detected notice */}
          {!extInstalled && !extChecking && (
            <div className="ext-install-banner anim-fade-up">
              <div className="ext-install-left">
                <div className="ext-install-title">WatchSync Extension not detected</div>
                <div className="ext-install-desc">
                  Make sure the extension is enabled in Chrome, then refresh this page.
                </div>
              </div>
              <button className="btn-ghost" style={{ flexShrink: 0, fontSize: 12 }}
                onClick={() => { setExtChecking(true); detectExtension().then(v => { setExtInstalled(v); setExtChecking(false); if (v) setMethod("extension"); }); }}>
                ↺ Retry detection
              </button>
            </div>
          )}

          <div className="card-footer space-between" style={{ marginTop: 20 }}>
            <button className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn" onClick={() => setStep(3)} disabled={!method}>
              {method === "extension" ? "Sync with extension →"
               : method === "csv"    ? "I have my CSV →"
               : "Continue →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Go ── */}
      {step === 3 && (
        <div className="anim-fade-up">
          <div className="card" style={{ marginBottom: 14 }}>

            {/* Extension sync */}
            {method === "extension" && (
              <>
                <h3 className="card-title">One-click Netflix sync</h3>
                <p className="card-sub">
                  WatchSync will open your Netflix tab, extract your history, and return the data
                  automatically. You don't need to do anything else.
                </p>
                <div className="ext-sync-preview">
                  <div className="ext-sync-step">
                    <span className="ext-sync-num">1</span>
                    <span>Extension opens your Netflix tab</span>
                  </div>
                  <div className="ext-sync-arrow">→</div>
                  <div className="ext-sync-step">
                    <span className="ext-sync-num">2</span>
                    <span>Extracts your viewing history</span>
                  </div>
                  <div className="ext-sync-arrow">→</div>
                  <div className="ext-sync-step">
                    <span className="ext-sync-num">3</span>
                    <span>Data lands here automatically</span>
                  </div>
                </div>
              </>
            )}

            {/* CSV upload */}
            {method === "csv" && (
              <>
                <h3 className="card-title">Upload your CSV</h3>
                <p className="card-sub">
                  Upload the <strong>ViewingActivity.csv</strong> file from your Netflix export.
                </p>
                <div
                  className={`csv-dropzone${dragging ? " dragging" : ""}${csvFile ? " has-file" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }}
                    onChange={(e) => handleFile(e.target.files[0])} />
                  {csvFile ? (
                    <div className="dropzone-success">
                      <div className="dropzone-icon">✓</div>
                      <div className="dropzone-filename">{csvName}</div>
                      <div className="dropzone-change">Click to change file</div>
                    </div>
                  ) : (
                    <div className="dropzone-empty">
                      <div className="dropzone-icon">📄</div>
                      <div className="dropzone-text">Drop <strong>ViewingActivity.csv</strong> here</div>
                      <div className="dropzone-sub">or click to browse</div>
                    </div>
                  )}
                </div>
                <div className="csv-format-note">
                  Found inside the ZIP Netflix emails you. Should have Title and Start Time columns.
                </div>
              </>
            )}
          </div>

          {err && <div className="error-box" role="alert">⚠ {err}</div>}

          {loading && (
            <div className="card loading-card">
              <div className="loading-row">
                <div className="spinner" />
                <span className="loading-text">
                  {method === "extension" && syncProgress.total > 0
                    ? `Extracting… ${syncProgress.current} / ${syncProgress.total} items`
                    : method === "extension"
                    ? "Connecting to Netflix…"
                    : "Parsing CSV and enriching via TMDb…"}
                </span>
              </div>
              {syncProgress.total > 0 && (
                <div className="pbar" style={{ marginTop: 10 }}>
                  <div className="pbar-f" style={{ width: `${progressPct}%` }} />
                </div>
              )}
              <p className="loading-sub" style={{ marginTop: 8 }}>
                {method === "extension"
                  ? "Fetching genre data from TMDb…"
                  : "Deduplicating → fetching TMDb metadata → mapping genres…"}
              </p>
            </div>
          )}

          <div className="card-footer space-between">
            <button className="btn-ghost" onClick={() => setStep(2)}>← Back</button>
            <button className="btn" onClick={handleProcess} disabled={!canSubmit || loading}>
              {loading ? "Syncing…"
               : isUserB ? "Find our matches →"
               : method === "extension" ? "⚡ Sync with Netflix →"
               : "Sync my profile →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}