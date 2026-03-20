export default function Docs({ onBack }) {
  return (
    <div className="docs-page">

      {/* Header */}
      <div className="docs-header anim-fade-up">
        <div className="section-eyebrow">DOCUMENTATION</div>
        <h1 className="docs-title">How to use WatchSync</h1>
        <p className="docs-lead">
          WatchSync compares two people's streaming histories and surfaces what you'll both enjoy.
          Everything runs in the browser — no account, no server, no stored data.
        </p>
      </div>

      {/* TOC */}
      <nav className="docs-toc card anim-fade-up-2" aria-label="On this page">
        <div className="docs-toc-label">ON THIS PAGE</div>
        <ol className="docs-toc-list">
          {[
            ["#overview",   "Overview"],
            ["#user-a",     "Step 1 — Build your profile (User A)"],
            ["#extension",  "Option A — WatchSync Extension (recommended)"],
            ["#csv",        "Option B — Official Netflix CSV"],
            ["#share",      "Step 2 — Share your sync link"],
            ["#user-b",     "Step 3 — User B joins the comparison"],
            ["#dashboard",  "Step 4 — The Dashboard"],
            ["#privacy",    "Privacy & Data"],
            ["#faq",        "FAQ"],
          ].map(([href, label]) => (
            <li key={href}><a className="docs-toc-link" href={href}>{label}</a></li>
          ))}
        </ol>
      </nav>

      {/* ── Overview ── */}
      <section className="docs-section anim-fade-up-2" id="overview">
        <h2 className="docs-h2">Overview</h2>
        <p className="docs-p">
          WatchSync is a two-person tool. <strong>User A</strong> imports their Netflix history,
          gets a shareable link, and sends it to <strong>User B</strong>. User B opens the link,
          imports their own history, and both people instantly see a compatibility score, shared
          genres, shows they've both watched, and AI-curated recommendations for what to watch next.
        </p>
        <div className="docs-flow-row">
          {[
            { step: "01", title: "User A imports history",   desc: "Via extension or CSV export" },
            { step: "02", title: "User A shares a link",     desc: "One click — profile encoded in the URL" },
            { step: "03", title: "User B opens the link",    desc: "Or pastes it on the home page" },
            { step: "04", title: "User B imports history",   desc: "Same process, their own account" },
            { step: "05", title: "Dashboard appears",        desc: "Score, genres, shows, AI picks" },
          ].map((s) => (
            <div key={s.step} className="docs-flow-card">
              <div className="docs-flow-num">{s.step}</div>
              <div className="docs-flow-title">{s.title}</div>
              <div className="docs-flow-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── User A ── */}
      <section className="docs-section" id="user-a">
        <h2 className="docs-h2">Step 1 — Build your profile (User A)</h2>
        <p className="docs-p">
          Click <strong>Build my taste profile</strong> on the home page. You'll pick Netflix as
          your platform, then choose how to import your history.
        </p>
        <div className="docs-callout info">
          Two import methods are available. The extension is instant; the CSV takes 2–3 days
          to arrive from Netflix. Use the extension if you can.
        </div>
      </section>

      {/* ── Extension ── */}
      <section className="docs-section" id="extension">
        <h2 className="docs-h2">Option A — WatchSync Extension <span className="docs-badge cyan">Recommended</span></h2>
        <p className="docs-p">
          The Chrome extension opens your Netflix tab, scrolls through your viewing history
          automatically, and returns all the data — no copy-paste required.
        </p>

        <h3 className="docs-h3">Install the extension</h3>
        <ol className="docs-ol">
          <li>Download the extension folder from the project repository.</li>
          <li>Open Chrome and go to <code className="docs-code">chrome://extensions</code>.</li>
          <li>Enable <strong>Developer mode</strong> (toggle in the top-right corner).</li>
          <li>Click <strong>Load unpacked</strong> and select the <code className="docs-code">extension/</code> folder.</li>
          <li>The WatchSync icon will appear in your Chrome toolbar.</li>
        </ol>

        <h3 className="docs-h3">Configure the extension ID</h3>
        <ol className="docs-ol">
          <li>On the <code className="docs-code">chrome://extensions</code> page, copy the ID shown under the WatchSync extension (a 32-character string like <code className="docs-code">abcdefghijklmnopabcdefghijklmnop</code>).</li>
          <li>In the project root, open (or create) the <code className="docs-code">.env</code> file.</li>
          <li>Set <code className="docs-code">VITE_EXTENSION_ID=your_id_here</code> and save.</li>
          <li>Restart the dev server (<code className="docs-code">npm run dev</code>).</li>
        </ol>

        <h3 className="docs-h3">Sync your history</h3>
        <ol className="docs-ol">
          <li>Make sure you are signed in to Netflix in Chrome.</li>
          <li>Return to WatchSync and select <strong>WatchSync Extension</strong> as your method.</li>
          <li>Click <strong>Sync with Netflix</strong>. The extension will open Netflix's viewing activity page, scroll through your full history, and return the data automatically.</li>
          <li>A progress bar shows how many items have been loaded.</li>
          <li>Once complete, click <strong>Sync my profile</strong> to process the data.</li>
        </ol>

        <div className="docs-callout warning">
          If you see <em>"WatchSync Extension not detected"</em>, make sure the extension is
          enabled and the <code className="docs-code">VITE_EXTENSION_ID</code> in your <code className="docs-code">.env</code> matches
          the ID on <code className="docs-code">chrome://extensions</code>. Restart the dev server after any
          change to <code className="docs-code">.env</code>.
        </div>
      </section>

      {/* ── CSV ── */}
      <section className="docs-section" id="csv">
        <h2 className="docs-h2">Option B — Official Netflix CSV <span className="docs-badge muted">Takes 2–3 days</span></h2>
        <p className="docs-p">
          Netflix lets you download your full viewing history as a CSV file from your
          account privacy settings. This is the fallback if you don't want to use the extension.
        </p>
        <ol className="docs-ol">
          <li>Go to your Netflix account → <strong>Account</strong>.</li>
          <li>Scroll to <strong>Security &amp; Privacy</strong> → <strong>Download your personal information</strong>.</li>
          <li>Request the data export. Netflix will email you a download link within 2–3 days.</li>
          <li>Download the ZIP, extract it, and find <code className="docs-code">ViewingActivity.csv</code>.</li>
          <li>Back on WatchSync, select <strong>Official CSV Export</strong>, then drag and drop (or click to browse) the CSV file.</li>
          <li>Click <strong>Sync my profile</strong> to process it.</li>
        </ol>
        <div className="docs-callout info">
          The CSV must have at least a <strong>Title</strong> column. WatchSync parses both
          Netflix's standard format and common variations automatically.
        </div>
      </section>

      {/* ── Share ── */}
      <section className="docs-section" id="share">
        <h2 className="docs-h2">Step 2 — Share your sync link</h2>
        <p className="docs-p">
          After your profile is built, WatchSync generates a <strong>sync link</strong>. This URL
          encodes your entire taste profile using lz-string compression — no server involved.
        </p>
        <ol className="docs-ol">
          <li>On the share screen, click <strong>Copy link</strong>.</li>
          <li>Send the URL to whoever you want to compare with — via iMessage, WhatsApp, email, etc.</li>
          <li>You can also click <strong>Preview comparison (demo)</strong> to see what the
          dashboard looks like before your friend joins.</li>
        </ol>
        <div className="docs-callout info">
          The link is self-contained. Anyone who opens it can see your profile summary and
          add their own data. It does not expire and does not require an account.
        </div>
      </section>

      {/* ── User B ── */}
      <section className="docs-section" id="user-b">
        <h2 className="docs-h2">Step 3 — User B joins the comparison</h2>
        <p className="docs-p">User B (the friend who received the link) has two ways to join:</p>

        <h3 className="docs-h3">Option 1 — Click the link directly</h3>
        <p className="docs-p">
          Open the sync URL in Chrome. WatchSync detects the <code className="docs-code">?sync=</code> parameter
          automatically and shows an invite banner with a summary of User A's profile.
          User B then goes through the same import flow (extension or CSV) for their own account.
        </p>

        <h3 className="docs-h3">Option 2 — Paste on the home page</h3>
        <p className="docs-p">
          If User B visits WatchSync directly (without the link in the URL), they can paste the
          sync URL into the <strong>"Got a link from a friend?"</strong> field on the home page
          and click <strong>Compare</strong>. This has the same effect as clicking the link.
        </p>

        <div className="docs-callout info">
          The comparison happens entirely in User B's browser. User A's profile data (encoded
          in the URL) is decoded locally — nothing is sent to any server.
        </div>
      </section>

      {/* ── Dashboard ── */}
      <section className="docs-section" id="dashboard">
        <h2 className="docs-h2">Step 4 — The Dashboard</h2>
        <p className="docs-p">
          Once User B submits their profile, the dashboard appears with four sections:
        </p>
        <div className="docs-def-list">
          {[
            { term: "Compatibility score",      def: "A 0–100% score based on genre overlap and watch volume. Higher = more aligned taste." },
            { term: "Genre Radar",               def: "A radar chart comparing how much each person watches each genre." },
            { term: "Shared Genres",             def: "Genres you both enjoy, shown side by side with watch counts." },
            { term: "Shows You've Both Watched", def: "Exact title matches, ranked by combined watch count." },
            { term: "AI Picks",                  def: "Titles neither of you has watched, curated by an AI model based on both taste profiles." },
          ].map(({ term, def }) => (
            <div key={term} className="docs-def-item">
              <dt className="docs-def-term">{term}</dt>
              <dd className="docs-def-desc">{def}</dd>
            </div>
          ))}
        </div>
        <p className="docs-p" style={{ marginTop: 16 }}>
          From the dashboard, User B can copy the sync link again to share the full comparison
          with anyone else, or click <strong>Start over</strong> to reset.
        </p>
      </section>

      {/* ── Privacy ── */}
      <section className="docs-section" id="privacy">
        <h2 className="docs-h2">Privacy &amp; Data</h2>
        <div className="docs-callout success">
          WatchSync does not store any of your data. Everything is processed locally in your
          browser and never leaves your device — except the titles sent to the AI
          recommendations endpoint, which receives only anonymised genre and show data.
        </div>
        <div className="docs-def-list">
          {[
            { term: "Your viewing history",  def: "Parsed and processed in your browser only. Never sent to WatchSync servers." },
            { term: "Sync link",             def: "Your profile is compressed into the URL itself using lz-string. No server stores it." },
            { term: "AI recommendations",    def: "The backend receives your top genres and show titles to generate picks. No account info or viewing timestamps are included." },
            { term: "Extension permissions", def: "The extension only accesses netflix.com. It reads your viewing history page and communicates with the WatchSync web app. It does not access any other sites or store data." },
          ].map(({ term, def }) => (
            <div key={term} className="docs-def-item">
              <dt className="docs-def-term">{term}</dt>
              <dd className="docs-def-desc">{def}</dd>
            </div>
          ))}
        </div>
        <p className="docs-p" style={{ marginTop: 16 }}>
          For the full policy, see our{" "}
          <a href="https://luwah-watchsync.onrender.com/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: "var(--cyan)" }}>
            Privacy Policy
          </a>.
        </p>
      </section>

      {/* ── FAQ ── */}
      <section className="docs-section" id="faq">
        <h2 className="docs-h2">FAQ</h2>
        <div className="docs-faq-list">
          {[
            {
              q: "The extension says 'not detected' even though it's installed.",
              a: "The VITE_EXTENSION_ID in your .env file must match the ID shown on chrome://extensions. After updating .env, you must restart the dev server (npm run dev) — env variables are baked in at build time.",
            },
            {
              q: "Syncing times out or shows an error.",
              a: "Make sure you are signed in to Netflix in Chrome and that your Netflix tab is open. If the error persists, try refreshing the Netflix tab and clicking Sync again.",
            },
            {
              q: "Can User A also see the comparison?",
              a: "Yes — from the dashboard, User B can copy the sync link. When User A opens it, they'll see a preview (demo mode). The full live comparison requires both people to be in the same browser session.",
            },
            {
              q: "Does the sync link expire?",
              a: "No. The link is self-contained and works indefinitely as long as the app is running at the same URL.",
            },
            {
              q: "Can I use this with Hulu, Max, or Disney+?",
              a: "Not yet. Support for additional platforms is in development. Only Netflix is live; other platforms show 'Coming Soon'.",
            },
            {
              q: "Why does the CSV take 2–3 days?",
              a: "Netflix processes data export requests on their end. Once your export is ready, you'll receive an email with a download link. The delay is on Netflix's side, not WatchSync's.",
            },
            {
              q: "My score seems low — is something wrong?",
              a: "A low score just means your genre preferences don't overlap much, not that the tool is broken. The AI picks section is specifically designed for this case — it finds things you'll both enjoy despite different tastes.",
            },
          ].map(({ q, a }) => (
            <details key={q} className="docs-faq-item">
              <summary className="docs-faq-q">{q}</summary>
              <p className="docs-faq-a">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="docs-back">
        <button className="btn-ghost" onClick={onBack}>← Back to WatchSync</button>
      </div>
    </div>
  );
}
