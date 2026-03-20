const statusEl = document.getElementById("status");
const syncBtn  = document.getElementById("syncBtn");

function setStatus(type, text, progress = null) {
  statusEl.className = `status ${type}`;
  statusEl.innerHTML = text;
  if (progress !== null) {
    statusEl.innerHTML += `
      <div class="progress-bar">
        <div class="progress-fill" style="width:${progress}%"></div>
      </div>`;
  }
}

syncBtn.addEventListener("click", async () => {
  syncBtn.disabled = true;
  setStatus("running", "Finding your Netflix tab…");

  try {
    // Ask background to run the extraction
    const response = await chrome.runtime.sendMessage({ type: "POPUP_SYNC_REQUEST" });

    if (response?.ok) {
      // Store extracted data so WatchSync can pick it up
      await chrome.storage.local.set({
        watchsync_data:      JSON.stringify(response.data),
        watchsync_timestamp: Date.now(),
      });
      setStatus("success", `✓ Synced ${response.data.length} items! Open WatchSync to continue.`);
    } else {
      setStatus("error", `❌ ${response?.error || "Unknown error"}`);
    }
  } catch (err) {
    setStatus("error", `❌ ${err.message}`);
  } finally {
    syncBtn.disabled = false;
  }
});

// Listen for progress updates from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "POPUP_PROGRESS") {
    const pct = msg.total ? Math.round((msg.current / msg.total) * 100) : 0;
    setStatus("running", `Loading history… ${msg.current} items`, pct);
  }
});
