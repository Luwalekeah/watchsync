import { useState, useRef } from "react";
import { inferProfile } from "../api/index.js";

const TASTE_CHIPS = [
  "Slow-burn thrillers",
  "Prestige TV",
  "Dark comedy",
  "True crime",
  "Sci-fi epics",
  "Feel-good romcoms",
  "Foreign cinema",
  "Anime",
  "90s nostalgia",
  "Documentaries",
  "Horror",
  "Action blockbusters",
];

export default function ManualProfile({ onDone, onBack }) {
  const [description, setDescription] = useState("");
  const [titleInput,  setTitleInput]  = useState("");
  const [titles,      setTitles]      = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const abortRef = useRef(null);

  const addTitle = () => {
    const t = titleInput.trim();
    if (!t || titles.includes(t)) return;
    if (titles.length >= 20) return;
    setTitles((prev) => [...prev, t]);
    setTitleInput("");
  };

  const removeTitle = (t) => setTitles((prev) => prev.filter((x) => x !== t));

  const toggleChip = (chip) => {
    if (description.includes(chip)) {
      setDescription((d) => d.replace(chip, "").replace(/,\s*,/g, ",").replace(/^,\s*|,\s*$/g, "").trim());
    } else {
      setDescription((d) => (d ? `${d}, ${chip}` : chip));
    }
  };

  const canSubmit = description.trim().length >= 10 || titles.length >= 1;

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError("");
    abortRef.current = new AbortController();

    try {
      const profile = await inferProfile(
        description.trim(),
        titles,
        abortRef.current.signal,
      );
      onDone({ ...profile, platform: "manual" });
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="collect-wrapper anim-fade-up">
      <div className="card">
        <h2 className="card-title">Describe your taste</h2>
        <p className="card-sub">
          Tell us what you love watching and list some favorites. AI will build your taste profile.
        </p>

        {error && <div className="error-box">{error}</div>}

        {loading ? (
          <div className="loading-card">
            <div className="loading-row">
              <div className="spinner" />
              <span className="loading-text">Analyzing your taste and building profile...</span>
            </div>
            <div className="loading-sub">This takes a few seconds</div>
          </div>
        ) : (
          <>
            {/* ── Taste description ── */}
            <div style={{ marginBottom: 24 }}>
              <label className="form-label">What do you like to watch?</label>
              <textarea
                className="textarea"
                rows={4}
                placeholder="e.g. I love slow-burn thrillers, anything with a twist ending, prestige TV dramas. Not big on horror or musicals."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="chip-grid">
                {TASTE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    className={`taste-chip${description.includes(chip) ? " active" : ""}`}
                    onClick={() => toggleChip(chip)}
                  >
                    {description.includes(chip) ? "✓ " : "+ "}{chip}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Title list ── */}
            <div style={{ marginBottom: 24 }}>
              <label className="form-label">Shows &amp; movies you love</label>
              <div className="title-input-row">
                <input
                  className="sync-link-input"
                  type="text"
                  placeholder="Add a title (e.g. Breaking Bad)"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTitle(); } }}
                />
                <button className="btn" onClick={addTitle} disabled={!titleInput.trim()}>
                  Add
                </button>
              </div>
              {titles.length > 0 && (
                <div className="title-tags">
                  {titles.map((t) => (
                    <span key={t} className="title-tag">
                      {t}
                      <button className="title-tag-x" onClick={() => removeTitle(t)} aria-label={`Remove ${t}`}>
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                {titles.length}/20 titles added
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="card-footer space-between">
              <button className="btn-ghost" onClick={onBack}>← Back</button>
              <button className="btn btn-lg" onClick={handleSubmit} disabled={!canSubmit}>
                Build my taste profile →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
