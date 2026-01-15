// rc_clips_feed.js
// Global clips feed (pulls clips from profiles)

const RC_CLIPS = (function () {
  const API_BASE = "";

  async function apiGet(path) {
    const res = await fetch(API_BASE + path);
    if (!res.ok) throw new Error("GET " + path + " failed");
    return res.json();
  }

  async function loadAllProfiles() {
    // Simple scan of /data/users is not exposed via API yet,
    // so for now we treat clips as coming from the current user only
    // or from a local RC.getClipsFeed() if you define it.
    if (window.RC && RC.getClipsFeed) {
      return RC.getClipsFeed();
    }
    // fallback: just show current user's clips
    const userId = localStorage.getItem("rc_user_id") || "demo-user";
    try {
      const profile = await apiGet(`/api/profile/${userId}`);
      const clips = (profile && profile.clips) || [];
      return clips.map(url => ({ url, userId, username: profile.username || userId, ts: Date.now() }));
    } catch {
      return [];
    }
  }

  async function renderFeed() {
    const el = document.getElementById("clipsFeed");
    const clips = await loadAllProfiles();

    if (!clips.length) {
      el.innerHTML = "<p style='opacity:0.7;'>No clips in the feed yet.</p>";
      return;
    }

    el.innerHTML = clips.map(c => `
      <div class="glass-card" style="margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong>@${c.username || c.userId}</strong>
          <span style="opacity:0.6;font-size:12px;">${new Date(c.ts || Date.now()).toLocaleString()}</span>
        </div>
        <video src="${c.url}" controls style="width:100%;border-radius:14px;margin-bottom:6px;"></video>
        <div style="display:flex;gap:10px;font-size:13px;">
          <button class="btn-ghost">❤️ Like</button>
          <button class="btn-ghost" onclick="location.href='profile.html'">View Profile</button>
        </div>
      </div>
    `).join("");
  }

  async function init() {
    await renderFeed();
  }

  return { init };
})();
