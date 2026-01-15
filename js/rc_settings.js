// rc_settings.js
// Settings page: profile + notification prefs (local) + export

const RC_SETTINGS = (function () {
  const API_BASE = "";

  function getCurrentUserId() {
    return localStorage.getItem("rc_user_id") || "demo-user";
  }

  async function apiGet(path) {
    const res = await fetch(API_BASE + path);
    if (!res.ok) throw new Error("GET " + path + " failed");
    return res.json();
  }

  async function apiPost(path, body) {
    const res = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("POST " + path + " failed");
    return res.json();
  }

  async function loadProfile() {
    const userId = getCurrentUserId();
    try {
      const p = await apiGet(`/api/profile/${userId}`);
      document.getElementById("setName").value = p.name || "";
      document.getElementById("setUsername").value = p.username || "";
      document.getElementById("setBio").value = p.bio || "";
      document.getElementById("setDiscipline").value = p.discipline || "";
    } catch {
      // no profile yet
    }
  }

  async function saveProfile() {
    const userId = getCurrentUserId();
    const name = document.getElementById("setName").value.trim();
    const username = document.getElementById("setUsername").value.trim();
    const bio = document.getElementById("setBio").value.trim();
    const discipline = document.getElementById("setDiscipline").value.trim();

    await apiPost("/api/profile", {
      userId,
      name,
      username,
      bio,
      discipline
    });

    alert("Profile saved.");
  }

  function loadNotifSettings() {
    const raw = localStorage.getItem("rc_notif_settings");
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      document.getElementById("notifLikes").checked = !!s.likes;
      document.getElementById("notifComments").checked = !!s.comments;
      document.getElementById("notifMessages").checked = !!s.messages;
    } catch {}
  }

  function saveNotifSettings() {
    const s = {
      likes: document.getElementById("notifLikes").checked,
      comments: document.getElementById("notifComments").checked,
      messages: document.getElementById("notifMessages").checked
    };
    localStorage.setItem("rc_notif_settings", JSON.stringify(s));
    alert("Notification settings saved.");
  }

  async function exportData() {
    const userId = getCurrentUserId();
    const bundle = { userId };

    try {
      bundle.profile = await apiGet(`/api/profile/${userId}`);
    } catch {
      bundle.profile = null;
    }

    try {
      bundle.posts = await apiGet(`/api/posts?userId=${encodeURIComponent(userId)}`);
    } catch {
      bundle.posts = [];
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bundle, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `rollnconnect_${userId}_export.json`;
    a.click();
  }

  function init() {
    loadProfile();
    loadNotifSettings();

    document.getElementById("saveProfileBtn").onclick = saveProfile;
    document.getElementById("saveNotifBtn").onclick = saveNotifSettings;
    document.getElementById("exportDataBtn").onclick = exportData;
  }

  return { init };
})();
