# WatchSync

> **Stop scrolling. Start watching together.**

WatchSync solves the "streaming struggle" — the fact that 90% of couples spend more time picking a movie than watching one. It reads your streaming history, builds a taste profile, and finds what you and a partner will both enjoy — using real genre data and AI-powered recommendations.

---

## How it works

```
User A runs browser script on Netflix
        ↓
Viewing history JSON extracted (client-side, no server)
        ↓
Backend deduplicates + enriches via TMDb API
        ↓
Taste profile built (genres, top titles, watch patterns)
        ↓
lz-string compressed profile → shareable ?sync= URL
        ↓
User B opens link → adds their own history
        ↓
Comparison engine → compatibility score + radar + overlap
        ↓
Claude API (via tool_use) → 6 AI recommendations for both
```

---

## Tech stack

| Layer      | Technology                  | Why                                           |
|------------|-----------------------------|-----------------------------------------------|
| Frontend   | React + Vite                | Fast SPA, no framework overhead               |
| Styling    | Plain CSS (custom properties)| Cacheable, no runtime cost                   |
| Charts     | Recharts                    | Radar + bar charts for comparison             |
| Validation | Zod                         | Schema validation on pasted Netflix JSON      |
| Encoding   | lz-string                   | 60% smaller share URLs vs raw Base64          |
| Backend    | Express (Node.js)           | Thin proxy — keeps API keys server-side       |
| Enrichment | TMDb API                    | Genre, type, and rating metadata              |
| AI         | Anthropic Claude (tool_use) | Structured recommendations, no hallucinated JSON |
| Concurrency| p-limit                     | Controlled TMDb fetch batches with 429 retry  |
| Rate limit | express-rate-limit          | Protects both /enrich and /recommend          |
| CI/CD      | GitHub Actions              | Build + audit + Vercel deploy on merge        |
| Hosting    | Vercel (frontend) + Railway (backend) | Free tiers for MVP            |

---

## Project structure

```
watchwsync/
├── index.html                  # Vite entry
├── vercel.json                 # Frontend deploy config + security headers
├── vite.config.js              # Dev proxy → backend
├── package.json
├── .github/
│   └── workflows/ci.yml        # CI: build + audit + deploy
│
├── src/
│   ├── main.jsx                # React root
│   ├── App.jsx                 # Routing + state orchestration
│   ├── styles.css              # All styles via CSS custom properties
│   │
│   ├── components/
│   │   ├── Logo.jsx            # SVG logo with gradient
│   │   ├── Landing.jsx         # Hero + how-it-works + 90% stat
│   │   ├── Collect.jsx         # 3-step data collection flow
│   │   ├── ShareScreen.jsx     # Share link + profile preview
│   │   └── Dashboard.jsx       # Comparison results + AI recs
│   │
│   ├── api/
│   │   └── index.js            # All backend calls (enrichHistory, fetchRecommendations)
│   │
│   └── utils/
│       ├── validation.js       # Zod schema for Netflix JSON
│       ├── encoding.js         # lz-string profile encode/decode
│       └── comparison.js       # Pure comparison engine + score labels
│
└── backend/
    ├── server.js               # Express proxy (enrich + recommend routes)
    ├── package.json
    ├── railway.toml            # Backend deploy config
    └── .env.example
```

---

## Local setup

### Prerequisites
- Node.js 20+
- A free [TMDb API key](https://www.themoviedb.org/settings/api)
- An [Anthropic API key](https://console.anthropic.com)

### 1. Clone and install

```bash
git clone https://github.com/your-username/watchwsync.git
cd watchwsync

# Frontend deps
npm install

# Backend deps
cd backend && npm install && cd ..
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
TMDB_API_KEY=your_tmdb_v3_key_here
CLIENT_ORIGIN=http://localhost:5173
PORT=3001
```

### 3. Run both servers

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend (proxies /api → :3001 automatically)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Extract your Netflix history

1. Go to [netflix.com](https://netflix.com) while logged in
2. Open DevTools → Console (`F12` or `Cmd+Option+I`)
3. Paste the script shown in the app and press Enter
4. Your viewing history copies to clipboard automatically

The script calls Netflix's internal `/viewingactivity` endpoint using your existing browser session. **No data passes through WatchSync servers at this step** — it goes Netflix → your clipboard.

---

## Deployment

### Frontend → Vercel

```bash
npm install -g vercel
vercel --prod
```

Set environment variable in Vercel dashboard:
```
VITE_API_URL = https://your-backend.railway.app
```

### Backend → Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the `backend/` directory as the root
3. Add environment variables:
   ```
   ANTHROPIC_API_KEY = sk-ant-...
   TMDB_API_KEY      = your_tmdb_v3_key
   CLIENT_ORIGIN     = https://your-app.vercel.app
   PORT              = 3001
   ```
4. Railway auto-detects `railway.toml` and starts with `node server.js`

### GitHub Actions secrets (for auto-deploy on merge)

| Secret                | Where to find it                          |
|-----------------------|-------------------------------------------|
| `VERCEL_TOKEN`        | vercel.com → Account Settings → Tokens   |
| `VERCEL_ORG_ID`       | vercel.com → Settings → General          |
| `VERCEL_PROJECT_ID`   | Your Vercel project → Settings → General |

---

## Platform roadmap

| Phase | Platforms              | Status         |
|-------|------------------------|----------------|
| v1    | Netflix                | ✅ Live         |
| v2    | Crunchyroll, Hulu      | 🔜 In progress  |
| v3    | HBO Max, Disney+       | 📋 Planned      |
| v4    | Cross-platform compare | 📋 Planned      |

---

## Security notes

- API keys (`ANTHROPIC_API_KEY`, `TMDB_API_KEY`) never leave the backend
- Netflix JSON is validated with Zod before processing to prevent XSS/crashes
- `express-rate-limit` protects both routes (100 req/15min global, tighter on `/recommend`)
- Share links encode only your processed taste profile — never raw JSON or personal data
- The Netflix extraction script is entirely client-side and uses only your own session

---

## Contributing

Pull requests welcome. Open an issue first for significant changes.

```bash
# Run a build check before opening a PR
npm run build
cd backend && npm audit
```

---

## License

MIT
