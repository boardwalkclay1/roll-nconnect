// rc_settings.js
// Roll ’n Connect — Settings Engine (profile, notifications, export, presence)

const RC_SETTINGS = (function () {

  // -----------------------------
  // HELPERS
  // -----------------------------
  function userId() {
    return RC.getUserId();
  }

  async function apiGet(path) {
    return RC.apiGet(path);
  }

  async function apiPost(path, body) {
    return RC.apiPost(path, body);
  }

  // -----------------------------
  // LOAD PROFILE INTO FORM
  // -----------------------------
  async function loadProfile() {
    try {
      const p = await apiGet(`/api/profile/${userId()}`);

      document.getElementById("setName").value = p.name || "";
      document.getElementById("setUsername").value = p.username || "";
      document.getElementById("setBio").value = p.bio || "";
      document.getElementById("setDiscipline").value = p.discipline || "";

    } catch (err) {
      console.warn("No profile found yet.");
    }
  }

  // -----------------------------
  // SAVE PROFILE
  // -----------------------------
  async function saveProfile() {
    const body = {
      userId: userId(),
      name: document.getElementById("setName").value.trim(),
      username: document.getElementById("setUsername").value.trim(),
      bio: document.getElementById("setBio").value.trim(),
      discipline: document.getElementById("setDiscipline").value.trim()
    };

    // Client-side safety: no hate / no sexual content
    const text = (body.bio + " " + body.name + " " + body.username).toLowerCase();
    const banned = ["racist", "nazi", "kkk", "sex", "sexual", "explicit", "nudes"];
    if (banned.some(w => text.includes(w))) {
      alert("Profile contains disallowed content.");
      return;
    }

    await apiPost("/api/profile", body);
    alert("Profile saved.");
  }

  // -----------------------------
  // NOTIFICATION SETTINGS (LOCAL)
  // -----------------------------
  function loadNotifSettings() {
    const raw = localStorage.getItem("rc_notif_settings");
    if (!raw) return;

    try {
      const s = JSON.parse(raw);
      document.getElementById("notifLikes").checked = !!s.likes;
      document.getElementById("notifComments").checked = !!s.comments;
      document.getElementById("notifMessages").checked = !!s.messages;
      document.getElementById("notifFollows").checked = !!s.follows;
    } catch {}
  }

  function saveNotifSettings() {
    const s = {
      likes: document.getElementById("notifLikes").checked,
      comments: document.getElementById("notifComments").checked,
      messages: document.getElementById("notifMessages").checked,
      follows: document.getElementById("notifFollows").checked
    };

    localStorage.setItem("rc_notif_settings", JSON.stringify(s));
    alert("Notification settings saved.");
  }

  // -----------------------------
  // EXPORT USER DATA
  // -----------------------------
  async function exportData() {
    const uid = userId();
    const bundle = { userId: uid };

    try {
      bundle.profile = await apiGet(`/api/profile/${uid}`);
    } catch {
      bundle.profile = null;
    }

    try {
      bundle.posts = await apiGet(`/api/posts?userId=${encodeURIComponent(uid)}`);
    } catch {
      bundle.posts = [];
    }

    try {
      bundle.followers = await apiGet(`/api/followers/${uid}`);
      bundle.following = await apiGet(`/api/following/${uid}`);
    } catch {
      bundle.followers = [];
      bundle.following = [];
    }

    try {
      bundle.calendar = RC.getCalendar();
    } catch {
      bundle.calendar = [];
    }

    const dataStr = "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(bundle, null, 2));

    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `rollnconnect_${uid}_export.json`;
    a.click();
  }

  // -----------------------------
  // PRESENCE SETTINGS
  // -----------------------------
  function initPresence() {
    if (!window.RC || !RC.connectPresence) return;

    RC.setPresenceHandlers({
      onOpen: () => console.log("Presence connected."),
      onPresenceUpdate: (payload) => {
        console.log("Presence update:", payload);
      }
    });

    if (window.RC_PRESENCE_WS_URL) {
      RC.connectPresence(window.RC_PRESENCE_WS_URL);
      RC.sendPresenceUpdate("settings");
    }
  }

  // -----------------------------
  // INIT
  // -----------------------------
  function init() {
    loadProfile();
    loadNotifSettings();
    initPresence();

    document.getElementById("saveProfileBtn").onclick = saveProfile;
    document.getElementById("saveNotifBtn").onclick = saveNotifSettings;
    document.getElementById("exportDataBtn").onclick = exportData;
  }

  return { init };
})();
