import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pLimit from "p-limit";
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Clients ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

// Global rate limit: 100 requests / 15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** TMDb fetch with exponential-backoff retry on 429 */
async function tmdbFetch(path, retries = 3) {
  const base = "https://api.themoviedb.org/3";
  const sep  = path.includes("?") ? "&" : "?";
  const url  = `${base}${path}${sep}api_key=${process.env.TMDB_API_KEY}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url);
    if (res.status === 429) {
      const wait = 1000 * Math.pow(2, attempt);
      console.warn(`TMDb 429 — waiting ${wait}ms (attempt ${attempt + 1})`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`TMDb ${res.status}: ${path}`);
    return res.json();
  }
  throw new Error(`TMDb rate limit exceeded after ${retries} retries`);
}

// ─── Route: /api/enrich ───────────────────────────────────────────────────────
/**
 * Body: { titles: [{ title, watchCount, isShow }] }
 * Returns: { genres, shows }
 * Handles all TMDb lookups server-side with p-limit(5) concurrency.
 */
app.post("/api/enrich", async (req, res) => {
  const { titles } = req.body;
  if (!Array.isArray(titles) || titles.length === 0) {
    return res.status(400).json({ error: "titles must be a non-empty array" });
  }
  if (titles.length > 2000) {
    return res.status(400).json({ error: "Too many titles (max 2000)" });
  }

  try {
    // Fetch genre maps once
    const [mvGenres, tvGenres] = await Promise.all([
      tmdbFetch("/genre/movie/list"),
      tmdbFetch("/genre/tv/list"),
    ]);
    const genreMap = {};
    [...(mvGenres.genres || []), ...(tvGenres.genres || [])].forEach(
      (g) => { genreMap[g.id] = g.name; }
    );

    // Enrich titles with p-limit(5) concurrency
    const limit   = pLimit(5);
    const genreCount = {};
    const shows   = [];

    await Promise.all(
      titles.map((item) =>
        limit(async () => {
          try {
            const data = await tmdbFetch(
              `/search/multi?query=${encodeURIComponent(item.title)}&page=1`
            );
            if (!data.results?.length) return;
            const match = data.results[0];
            shows.push({
              title:      item.title,
              watchCount: item.watchCount,
              isShow:     item.isShow,
              tmdbId:     match.id,
              mediaType:  match.media_type,
              genreIds:   match.genre_ids || [],
              rating:     match.vote_average || 0,
            });
            (match.genre_ids || []).forEach((id) => {
              genreCount[id] = (genreCount[id] || 0) + item.watchCount;
            });
          } catch (err) {
            console.warn(`TMDb lookup failed for "${item.title}": ${err.message}`);
          }
        })
      )
    );

    const genres = Object.entries(genreCount)
      .map(([id, value]) => ({ name: genreMap[id] || null, value }))
      .filter((g) => g.name)
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);

    res.json({ genres, shows: shows.sort((a, b) => b.watchCount - a.watchCount) });
  } catch (err) {
    console.error("/api/enrich error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Route: /api/recommend ────────────────────────────────────────────────────
/**
 * Body: { profileA, profileB, score }
 * Uses tool_use to guarantee structured JSON output — no regex needed.
 */
app.post("/api/recommend", async (req, res) => {
  const { profileA, profileB, score } = req.body;
  if (!profileA?.genres || !profileB?.genres) {
    return res.status(400).json({ error: "profileA and profileB are required" });
  }

  // Tight rate limit for AI endpoint: 10 req / 15 min per IP
  res.setHeader("X-RateLimit-Endpoint", "recommend");

  try {
    const prompt = `Two people want to watch something together.

Person A genres: ${profileA.genres.slice(0, 5).map((g) => g.name).join(", ")}
Person A top titles: ${profileA.shows.slice(0, 8).map((s) => s.title).join(", ")}

Person B genres: ${profileB.genres.slice(0, 5).map((g) => g.name).join(", ")}
Person B top titles: ${profileB.shows.slice(0, 8).map((s) => s.title).join(", ")}

Shared genres: ${
      profileA.genres
        .filter((g) => profileB.genres.find((bg) => bg.name === g.name))
        .slice(0, 4)
        .map((g) => g.name)
        .join(", ") || "few"
    }
Compatibility score: ${score}%

Call provide_recommendations with exactly 3 movies and exactly 3 TV shows — 6 total — that neither person has watched but both would enjoy.`;

    const message = await anthropic.messages.create({
      model:    "claude-sonnet-4-20250514",
      max_tokens: 1024,
      tools: [
        {
          name:        "provide_recommendations",
          description: "Return exactly 3 movies and 3 TV shows as structured data",
          input_schema: {
            type:       "object",
            properties: {
              movies: {
                type:     "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  required: ["title", "year", "genres", "reason", "matchScore"],
                  properties: {
                    title:      { type: "string" },
                    year:       { type: "string" },
                    genres:     { type: "array", items: { type: "string" } },
                    reason:     { type: "string", description: "Why BOTH users would enjoy this" },
                    matchScore: { type: "number", minimum: 0, maximum: 100 },
                  },
                },
              },
              shows: {
                type:     "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  required: ["title", "year", "genres", "reason", "matchScore"],
                  properties: {
                    title:      { type: "string" },
                    year:       { type: "string" },
                    genres:     { type: "array", items: { type: "string" } },
                    reason:     { type: "string", description: "Why BOTH users would enjoy this" },
                    matchScore: { type: "number", minimum: 0, maximum: 100 },
                  },
                },
              },
            },
            required: ["movies", "shows"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "provide_recommendations" },
      messages:    [{ role: "user", content: prompt }],
    });

    // With tool_choice forced, the response is always a tool_use block
    const toolUse = message.content.find((b) => b.type === "tool_use");
    if (!toolUse) throw new Error("No tool_use block in response");

    const { movies = [], shows = [] } = toolUse.input;
    const recommendations = [
      ...movies.map((r) => ({ ...r, type: "movie" })),
      ...shows.map((r)  => ({ ...r, type: "show"  })),
    ];
    res.json({ recommendations });
  } catch (err) {
    console.error("/api/recommend error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`WatchSync backend → http://localhost:${PORT}`));
