import LZString from "lz-string";

/**
 * Compress a taste profile into a URL-safe string.
 * lz-string reduces payload ~60% vs raw Base64, staying well within
 * browser URL limits even for large watch histories.
 *
 * @param {object} profile - { genres, shows, total, platform }
 * @returns {string|null}
 */
export function encodeProfile(profile) {
  try {
    const minimal = {
      g: profile.genres.slice(0, 12).map((g) => ({ n: g.name, v: g.value })),
      s: profile.shows.slice(0, 50).map((s) => ({
        t:  s.title,
        w:  s.watchCount,
        r:  Math.round((s.rating || 0) * 10),
        gi: (s.genreIds || []).slice(0, 5),
        m:  s.mediaType,
        is: s.isShow ? 1 : 0,
      })),
      total:    profile.total,
      platform: profile.platform,
    };
    return LZString.compressToEncodedURIComponent(JSON.stringify(minimal));
  } catch {
    return null;
  }
}

/**
 * Decompress a URL parameter back into a taste profile.
 * @param {string} encoded
 * @returns {object|null}
 */
export function decodeProfile(encoded) {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(encoded);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return {
      genres:   d.g.map((g) => ({ name: g.n, value: g.v })),
      shows:    d.s.map((s) => ({
        title:      s.t,
        watchCount: s.w,
        rating:     (s.r || 0) / 10,
        genreIds:   s.gi || [],
        mediaType:  s.m,
        isShow:     !!s.is,
      })),
      total:    d.total,
      platform: d.platform,
    };
  } catch {
    return null;
  }
}
