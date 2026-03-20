import { useState } from "react";
import { encodeProfile } from "../utils/encoding.js";

export default function ShareScreen({ profile, onReset, onDemoCompare }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = (() => {
    const enc = encodeProfile(profile);
    return enc
      ? `${window.location.origin}${window.location.pathname}?sync=${enc}`
      : null;
  })();

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="share-screen" style={{ maxWidth: 660, margin: "0 auto" }}>
      {/* Confirmation */}
      <div className="anim-fade-up share-confirm">
        <div className="share-check-icon" aria-hidden="true">✓</div>
        <h2 className="share-title">Your profile is ready!</h2>
        <p className="share-sub">
          Send your sync link to whoever you want to watch with. When they open it
          and add their data, you'll both see your compatibility score and AI recommendations.
        </p>
      </div>

      {/* Profile preview */}
      <div className="card anim-fade-up-2" style={{ marginBottom: 16 }}>
        <div className="section-eyebrow">YOUR PROFILE SUMMARY</div>
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-label">Total Plays</div>
            <div className="profile-stat-value">{profile.total?.toLocaleString()}</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-label">Top Genre</div>
            <div className="profile-stat-value">{profile.genres?.[0]?.name || "—"}</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-label">Unique Titles</div>
            <div className="profile-stat-value">{profile.shows?.length}</div>
          </div>
        </div>
        <div className="genre-tags">
          {profile.genres?.slice(0, 6).map((g) => (
            <span key={g.name} className="genre-tag">{g.name}</span>
          ))}
        </div>
      </div>

      {/* Share link */}
      <div className="card anim-fade-up-3" style={{ marginBottom: 16 }}>
        <div className="section-eyebrow">YOUR SYNC LINK</div>
        {shareUrl ? (
          <>
            <div className="share-link-row">
              <div className="share-link-display" title={shareUrl}>{shareUrl}</div>
              <button className="btn btn-amber" onClick={copyLink} style={{ flexShrink: 0 }}>
                {copied ? "✓ Copied!" : "Copy link"}
              </button>
            </div>
            <p className="share-link-note">
              This link encodes your taste profile using lz-string compression. When your
              friend opens it and adds their data, the comparison happens entirely in the
              browser — no server stores your data.
            </p>
          </>
        ) : (
          <div className="error-box">Could not generate share link. Please try again.</div>
        )}
      </div>

      <div className="anim-fade-up-4 share-footer">
        <button className="btn-ghost" onClick={onReset}>Start over</button>
        <button className="btn" onClick={onDemoCompare}>
          Preview comparison (demo) →
        </button>
      </div>
    </div>
  );
}
