/**
 * WatchSync Content Script
 * Runs on every netflix.com page at document_idle.
 * Lightweight — just announces the tab is ready.
 * Heavy lifting is done by extractor.js which is injected on demand.
 */
chrome.runtime.sendMessage({ type: "NETFLIX_TAB_READY", url: window.location.href });
