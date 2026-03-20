/**
 * Compute the full comparison between two taste profiles.
 * Pure function — no side effects, easy to unit test.
 *
 * @param {object} A - profileA { genres, shows }
 * @param {object} B - profileB { genres, shows }
 * @returns {{ score, sharedGenres, sharedShows, radarData }}
 */
export function computeComparison(A, B) {
  // ── Genre overlap ──────────────────────────────────────────────────────────
  const gmA = Object.fromEntries(A.genres.map((g) => [g.name, g.value]));
  const gmB = Object.fromEntries(B.genres.map((g) => [g.name, g.value]));
  const allGenres = [...new Set([...Object.keys(gmA), ...Object.keys(gmB)])];

  const sharedGenres = allGenres
    .filter((g) => gmA[g] && gmB[g])
    .map((g) => ({ name: g, A: gmA[g] || 0, B: gmB[g] || 0 }))
    .sort((a, b) => b.A + b.B - (a.A + a.B));

  const genreScore = sharedGenres.length / Math.max(allGenres.length, 1);

  // ── Show overlap ───────────────────────────────────────────────────────────
  const titlesA = new Map(
    A.shows.map((s) => [s.title.toLowerCase().trim(), s])
  );
  const sharedShows = B.shows
    .filter((s) => titlesA.has(s.title.toLowerCase().trim()))
    .map((s) => ({
      ...s,
      watchCountA: titlesA.get(s.title.toLowerCase().trim()).watchCount,
    }))
    .sort(
      (a, b) =>
        b.watchCount + b.watchCountA - (a.watchCount + a.watchCountA)
    );

  const showScore = Math.min(
    sharedShows.length /
      Math.max(Math.min(A.shows.length, B.shows.length), 1) * 3,
    1
  );

  // ── Rating similarity ──────────────────────────────────────────────────────
  const avgA =
    A.shows.reduce((s, x) => s + (x.rating || 0), 0) /
    Math.max(A.shows.length, 1);
  const avgB =
    B.shows.reduce((s, x) => s + (x.rating || 0), 0) /
    Math.max(B.shows.length, 1);
  const ratingSim = 1 - Math.min(Math.abs(avgA - avgB) / 5, 1);

  // ── Final score ────────────────────────────────────────────────────────────
  const score = Math.round(
    (genreScore * 0.4 + showScore * 0.4 + ratingSim * 0.2) * 100
  );

  // ── Radar data (top 7 genres across both users, not just shared) ──────────
  const radarData = allGenres
    .map((g) => ({ name: g, A: gmA[g] || 0, B: gmB[g] || 0 }))
    .sort((a, b) => b.A + b.B - (a.A + a.B))
    .slice(0, 7)
    .map((g) => ({
      genre: g.name.length > 11 ? g.name.slice(0, 10) + "…" : g.name,
      A: g.A,
      B: g.B,
    }));

  return { score, sharedGenres, sharedShows, radarData };
}

/**
 * Human-readable label for a compatibility score.
 * @param {number} n - 0–100
 */
export function scoreLabel(n) {
  if (n >= 85) return { title: "Streaming Soulmates",  sub: "You two were made for the same couch." };
  if (n >= 70) return { title: "Highly Compatible",    sub: "Movie night will rarely disappoint." };
  if (n >= 55) return { title: "Good Overlap",         sub: "You'll find plenty to agree on." };
  if (n >= 40) return { title: "Some Common Ground",   sub: "Compromise a little, enjoy a lot." };
  return             { title: "Opposites Attract",     sub: "This could be an adventure." };
}
