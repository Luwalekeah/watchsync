const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Deduplicate a raw Netflix item array into a title map,
 * then call the backend /api/enrich endpoint.
 *
 * @param {object[]} items      - validated Netflix history items
 * @param {AbortSignal} signal  - for request cancellation
 * @returns {{ genres, shows, total }}
 */
export async function enrichHistory(items, signal) {
  // Deduplicate episodes → unique title entries
  const uniq = new Map();
  items.forEach((item) => {
    const key = item.seriesTitle || item.title;
    if (!key) return;
    if (!uniq.has(key)) {
      uniq.set(key, { title: key, watchCount: 1, isShow: !!item.seriesTitle });
    } else {
      uniq.get(key).watchCount++;
    }
  });

  const titles = Array.from(uniq.values());

  const res = await fetch(`${API}/api/enrich`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ titles }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Enrichment failed (${res.status})`);
  }

  const data = await res.json();
  return { ...data, total: items.length };
}

/**
 * Infer a taste profile from a free-text description and/or title list.
 * Returns the same { genres, shows, total } shape as enrichHistory.
 */
export async function inferProfile(description, titles, signal) {
  const res = await fetch(`${API}/api/infer-profile`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ description, titles }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Profile inference failed (${res.status})`);
  }

  return res.json();
}

/**
 * Fetch AI-powered recommendations for two profiles.
 * Uses structured tool_use on the backend — response is always valid JSON.
 *
 * @param {object} profileA
 * @param {object} profileB
 * @param {number} score     - compatibility score (0–100)
 * @param {AbortSignal} signal
 * @returns {object[]}       - array of recommendation objects
 */
export async function fetchRecommendations(profileA, profileB, score, signal) {
  const res = await fetch(`${API}/api/recommend`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ profileA, profileB, score }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Recommendations failed (${res.status})`);
  }

  const data = await res.json();
  return data.recommendations || [];
}
