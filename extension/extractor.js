/**
 * WatchSync Extractor
 * Injected into netflix.com/browse by the background service worker.
 * Extracts viewing history and reports back via chrome.runtime.sendMessage.
 */
(async () => {
  const report = (type, payload) => chrome.runtime.sendMessage({ type, ...payload });

  try {
    // ── 1. Extract buildId + authURL from the page ────────────────────────────
    // Netflix embeds these in inline <script> tags as JSON, and also exposes
    // them on window.netflix.reactContext. We try both sources.
    const extractFromPage = (key) => {
      // Source A: window.netflix.reactContext (scan all model keys)
      const ctx = window?.netflix?.reactContext;
      if (ctx?.models) {
        for (const k of Object.keys(ctx.models)) {
          const val = ctx.models[k]?.data?.[key];
          if (val) return val;
        }
      }
      // Source B: inline <script> JSON blobs
      for (const s of document.querySelectorAll('script:not([src])')) {
        const m = s.textContent.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));
        if (m?.[1]) return m[1];
      }
      // Source C: external script src paths containing /shakti/ (buildId only)
      if (key === "BUILD_IDENTIFIER") {
        for (const s of document.querySelectorAll('script[src*="/shakti/"]')) {
          const m = s.src.match(/\/shakti\/([a-zA-Z0-9]+)\//);
          if (m?.[1]) return m[1];
        }
      }
      return null;
    };

    const tryExtract = () => ({
      buildId: extractFromPage("BUILD_IDENTIFIER"),
      authURL: extractFromPage("authURL"),
    });

    let { buildId, authURL } = tryExtract();

    if (!buildId || !authURL) {
      // Poll every 500ms for up to 10 seconds for reactContext to hydrate
      const result = await new Promise((resolve) => {
        let attempts = 0;
        const interval = setInterval(() => {
          const r = tryExtract();
          if (r.buildId && r.authURL) { clearInterval(interval); resolve(r); return; }
          if (++attempts >= 20) { clearInterval(interval); resolve(r); }
        }, 500);
      });
      buildId = result.buildId || buildId;
      authURL = result.authURL || authURL;
    }

    if (!buildId) {
      report("EXTRACTION_ERROR", { error: "Could not find Netflix build ID. Make sure you are logged in and on netflix.com/browse." });
      return;
    }
    if (!authURL) {
      report("EXTRACTION_ERROR", { error: "Could not find Netflix auth token. Please refresh Netflix and try again." });
      return;
    }

    // ── 3. XHR helper (avoids 421 Misdirected Request from fetch()) ─────────
    const xhrGet = (url) => new Promise((resolve, reject) => {
      const fullUrl = authURL ? `${url}&authURL=${encodeURIComponent(authURL)}` : url;
      const xhr = new XMLHttpRequest();
      xhr.open("GET", fullUrl, true);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Accept", "application/json");
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { reject(new Error("Invalid JSON response from Netflix")); }
        } else {
          reject(new Error(`Netflix returned HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send();
    });

    // ── 4. Paginate through full viewing history ──────────────────────────
    let page = 0, size = 100, results = [];

    while (true) {
      const data = await xhrGet(
        `/api/shakti/${buildId}/viewingactivity?pg=${page}&pgSize=${size}&includeEpisodes=1`
      );

      if (!data.viewedItems?.length) break;
      results.push(...data.viewedItems);

      report("EXTRACTION_PROGRESS", {
        current: results.length,
        total:   data.viewedItemsSize || results.length,
        status:  `Loaded ${results.length} items…`,
      });

      if (data.viewedItems.length < size) break;
      page++;
    }

    if (!results.length) {
      report("EXTRACTION_ERROR", { error: "No viewing history found. Make sure you have watch history on this Netflix account." });
      return;
    }

    report("EXTRACTION_COMPLETE", { data: results });

  } catch (err) {
    report("EXTRACTION_ERROR", { error: err.message });
  }
})();
