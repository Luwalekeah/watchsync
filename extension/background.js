/**
 * WatchSync — Background Service Worker
 *
 * Flow:
 *   WatchSync web app → SYNC_REQUEST (externally_connectable)
 *     → open Netflix tab, navigate to /viewingactivity
 *     → scroll the page to load all items (infinite scroll)
 *     → scrape the rendered DOM for title + date
 *     → return collected results to WatchSync tab
 *
 * This approach avoids the HTTP 421 "Misdirected Request" that Netflix's
 * shakti API returns for all XHR/fetch/navigation methods from extensions.
 * Netflix renders /viewingactivity as a normal page — we just read the DOM.
 */

// ── Message from extension popup ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "POPUP_SYNC_REQUEST") {
    handleSyncRequest(null, (progress) => {
      chrome.runtime.sendMessage({ type: "POPUP_PROGRESS", ...progress }).catch(() => {});
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err)  => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});

// ── Message from WatchSync web app ───────────────────────────────────────────
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ ok: true });
    return;
  }
  if (message.type !== "SYNC_REQUEST") return;

  handleSyncRequest(sender.tab?.id)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err)  => sendResponse({ ok: false, error: err.message }));

  return true;
});

// ── Core logic ────────────────────────────────────────────────────────────────

async function handleSyncRequest(watchSyncTabId, onProgress = null) {
  const netflixTab = await findOrOpenNetflixTab();

  // Navigate to the official viewing activity page
  await chrome.tabs.update(netflixTab.id, { url: "https://www.netflix.com/viewingactivity" });
  await waitForTabComplete(netflixTab.id);
  await new Promise((r) => setTimeout(r, 3000)); // let React render the first batch

  // Confirm we're on the right page (not a login redirect)
  const [{ result: pageOk }] = await chrome.scripting.executeScript({
    target: { tabId: netflixTab.id },
    world: "MAIN",
    func: () => location.pathname.includes("viewingactivity"),
  });
  if (!pageOk) throw new Error("Netflix redirected to login. Please sign in to Netflix and try again.");

  // Scroll to the bottom repeatedly until no new items appear
  let lastCount = 0, noChange = 0;
  while (noChange < 3) {
    await chrome.scripting.executeScript({
      target: { tabId: netflixTab.id },
      world: "MAIN",
      func: () => window.scrollTo(0, document.body.scrollHeight),
    });
    await new Promise((r) => setTimeout(r, 2500));

    const [{ result: count }] = await chrome.scripting.executeScript({
      target: { tabId: netflixTab.id },
      world: "MAIN",
      func: () => document.querySelectorAll(".retableRow").length,
    });

    if (count === lastCount) {
      noChange++;
    } else {
      noChange = 0;
      lastCount = count;
      if (watchSyncTabId) {
        chrome.tabs.sendMessage(watchSyncTabId, {
          type: "SYNC_PROGRESS", current: count, total: 0,
          status: `Loading… ${count} items so far`,
        }).catch(() => {});
      }
      if (onProgress) onProgress({ current: count, total: 0 });
    }
  }

  // Scrape all rendered rows
  const [{ result: items }] = await chrome.scripting.executeScript({
    target: { tabId: netflixTab.id },
    world: "MAIN",
    func: () => {
      const results = [];
      document.querySelectorAll(".retableRow").forEach((row) => {
        const titleEl = row.querySelector("a");
        const dateEl  = row.querySelector(".date");
        if (!titleEl) return;

        const fullTitle = titleEl.textContent.trim();
        // Netflix formats TV episodes as "Series Title: Episode Title"
        const colon = fullTitle.indexOf(":");
        let title, seriesTitle;
        if (colon > -1) {
          seriesTitle = fullTitle.substring(0, colon).trim();
          title       = fullTitle.substring(colon + 1).trim();
        } else {
          title       = fullTitle;
          seriesTitle = null;
        }
        results.push({ title, seriesTitle, date: dateEl?.textContent?.trim() || null });
      });
      return results;
    },
  });

  // Restore browse page
  chrome.tabs.update(netflixTab.id, { url: "https://www.netflix.com/browse" }).catch(() => {});

  if (!items?.length) throw new Error("No viewing history found. Make sure you have watch history on this Netflix account.");
  return items;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function findOrOpenNetflixTab() {
  const tabs = await chrome.tabs.query({ url: "*://*.netflix.com/*" });
  const browseTab = tabs.find((t) => t.url?.includes("/browse"));
  if (browseTab) return browseTab;
  if (tabs.length > 0) return tabs[0];

  return new Promise((resolve) => {
    chrome.tabs.create({ url: "https://www.netflix.com/browse", active: false }, (tab) => {
      const listener = (tabId, info) => {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(tab);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

async function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    const poll = async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === "complete") { resolve(); return; }
      } catch { /* loading */ }
      setTimeout(poll, 300);
    };
    poll();
  });
}
