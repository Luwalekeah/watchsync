/**
 * WatchSync Relay Content Script
 * Injected into the WatchSync web app page.
 * Listens for SYNC_PROGRESS messages from the background service worker
 * and forwards them to the page via window.postMessage so the React app
 * can update the progress bar.
 */
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SYNC_PROGRESS") {
    window.postMessage(message, "*");
  }
});
