// rc_core.js
// Roll ’n Connect — Global App Core (with social, notifications, presence)

window.RC = (function () {

  // ============================================================
  // 1. USER IDENTITY
  // ============================================================
  function getUserId() {
    let id = localStorage.getItem("rc_user_id");
    if (!id) {
      id = "user-" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("rc_user_id", id);
    }
    return id;
  }

  // ============================================================
  // 2. GLOBAL API WRAPPER
  // ============================================================
  const API_BASE = "";

  async function apiGet(path) {
    const res = await fetch(API_BASE + path, { credentials: "include" });
    if (!res.ok) throw new Error("GET " + path + " failed");
    return res.json();
  }

  async function apiPost(path, body) {
    const res = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("POST " + path + " failed");
    return res.json();
  }

  // ============================================================
  // 3. LOCAL STORAGE ENGINE
  // ============================================================
  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function load(key, fallback = null) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  // ============================================================
  // 4. PROFILE ENGINE
  // ============================================================
  function getProfile() {
    return load("rc_profile", {
      name: "Unnamed Skater",
      username: "skater",
      bio: "",
      avatarUrl: "",
      city: "",
      level: "",
      style: ""
    });
  }

  function saveProfile(p) {
    save("rc_profile", p);
  }

  // ============================================================
  // 5. CALENDAR ENGINE
  // ============================================================
  function getCalendar() {
    return load("rc_calendar", []);
  }

  function saveCalendar(events) {
    save("rc_calendar", events);
  }

  function addCalendarEvent(ev) {
    const events = getCalendar();
    events.push(ev);
    saveCalendar(events);
  }

  // ============================================================
  // 6. ANNOUNCEMENTS ENGINE
  // ============================================================
  async function createAnnouncement(text, attachment = null) {
    const body = {
      userId: getUserId(),
      text,
      ts: Date.now(),
      ...attachment
    };
    return apiPost("/api/announcements", body);
  }

  async function getAnnouncements() {
    return apiGet("/api/announcements");
  }

  // ============================================================
  // 7. SPOT / EVENT / LESSON HELPERS
  // ============================================================
  async function getSpot(id) {
    return apiGet(`/api/spots/${id}`);
  }

  async function getEvent(id) {
    return apiGet(`/api/events/${id}`);
  }

  async function getLesson(id) {
    return apiGet(`/api/lessons/${id}`);
  }

  // ============================================================
  // 8. SOCIAL: FOLLOWERS
  // ============================================================
  async function follow(userIdToFollow) {
    return apiPost("/api/follow", {
      followerId: getUserId(),
      followedId: userIdToFollow
    });
  }

  async function unfollow(userIdToUnfollow) {
    return apiPost("/api/unfollow", {
      followerId: getUserId(),
      followedId: userIdToUnfollow
    });
  }

  async function getFollowers(userId) {
    return apiGet(`/api/followers/${userId}`);
  }

  async function getFollowing(userId) {
    return apiGet(`/api/following/${userId}`);
  }

  // ============================================================
  // 9. SOCIAL: COMMENTS (with client guardrails)
  // ============================================================
  function violatesClientRules(text) {
    if (!text) return true;
    const t = text.toLowerCase();

    // Basic guardrails: no hate, racism, or sexual content.
    const bannedPatterns = [
      "racist", "nazi", "kkk",
      "kill all", "go back to", // you can expand this server-side
      "sex", "sexual", "nudes", "explicit"
    ];

    return bannedPatterns.some(p => t.includes(p));
  }

  async function addComment(targetType, targetId, text) {
    if (violatesClientRules(text)) {
      alert("That comment goes against our community rules.");
      return;
    }

    return apiPost("/api/comments", {
      userId: getUserId(),
      targetType,
      targetId,
      text
    });
  }

  async function getComments(targetType, targetId) {
    return apiGet(`/api/comments?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`);
  }

  // ============================================================
  // 10. SOCIAL: REACTIONS
  // ============================================================
  async function react(targetType, targetId, reactionType) {
    return apiPost("/api/reactions", {
      userId: getUserId(),
      targetType,
      targetId,
      reactionType
    });
  }

  async function getReactions(targetType, targetId) {
    return apiGet(`/api/reactions?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`);
  }

  // ============================================================
  // 11. NOTIFICATIONS
  // ============================================================
  async function getNotifications() {
    return apiGet("/api/notifications");
  }

  async function markNotificationRead(id) {
    return apiPost("/api/notifications/read", { id });
  }

  // Simple polling hook you can call from notifications page
  function startNotificationPolling(callback, intervalMs = 15000) {
    let timer = setInterval(async () => {
      try {
        const notifs = await getNotifications();
        callback(notifs);
      } catch (e) {
        console.error("Notification polling failed", e);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }

  // ============================================================
  // 12. WEBSOCKET PRESENCE
  // ============================================================
  let presenceSocket = null;
  let presenceHandlers = {
    onOpen: null,
    onClose: null,
    onError: null,
    onPresenceUpdate: null,
    onNotification: null
  };

  function connectPresence(wsUrl) {
    if (presenceSocket) {
      try { presenceSocket.close(); } catch {}
      presenceSocket = null;
    }

    presenceSocket = new WebSocket(wsUrl + `?userId=${encodeURIComponent(getUserId())}`);

    presenceSocket.onopen = () => {
      if (presenceHandlers.onOpen) presenceHandlers.onOpen();
    };

    presenceSocket.onclose = () => {
      if (presenceHandlers.onClose) presenceHandlers.onClose();
      // Optional: auto-reconnect
      setTimeout(() => connectPresence(wsUrl), 5000);
    };

    presenceSocket.onerror = (err) => {
      console.error("Presence socket error", err);
      if (presenceHandlers.onError) presenceHandlers.onError(err);
    };

    presenceSocket.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === "presence" && presenceHandlers.onPresenceUpdate) {
          presenceHandlers.onPresenceUpdate(data.payload);
        }
        if (data.type === "notification" && presenceHandlers.onNotification) {
          presenceHandlers.onNotification(data.payload);
        }
      } catch (e) {
        console.error("Bad WS message", e);
      }
    };
  }

  function setPresenceHandlers(handlers) {
    presenceHandlers = { ...presenceHandlers, ...handlers };
  }

  function sendPresenceUpdate(status) {
    if (!presenceSocket || presenceSocket.readyState !== WebSocket.OPEN) return;
    presenceSocket.send(JSON.stringify({
      type: "presence",
      userId: getUserId(),
      status // e.g. "online", "in-session", "offline"
    }));
  }

  // ============================================================
  // 13. UTILITY FUNCTIONS
  // ============================================================
  function distanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  function formatDistance(km) {
    if (km == null) return "";
    if (km < 1) return `${(km * 1000).toFixed(0)} m`;
    return `${km.toFixed(1)} km`;
  }

  function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString();
  }

  // ============================================================
  // 14. DEEP LINK HELPERS
  // ============================================================
  function openSpotOnMap(spotId) {
    location.href = `find-spots.html?spot=${encodeURIComponent(spotId)}`;
  }

  function openEventOnMap(eventId) {
    location.href = `find-spots.html?event=${encodeURIComponent(eventId)}`;
  }

  function openProfile(userId) {
    location.href = `profile.html?id=${encodeURIComponent(userId)}`;
  }

  // ============================================================
  // 15. PUBLIC API
  // ============================================================
  return {
    // identity
    getUserId,

    // api
    apiGet,
    apiPost,

    // storage
    save,
    load,

    // profile
    getProfile,
    saveProfile,

    // calendar
    getCalendar,
    saveCalendar,
    addCalendarEvent,

    // announcements
    createAnnouncement,
    getAnnouncements,

    // spots/events/lessons
    getSpot,
    getEvent,
    getLesson,

    // followers
    follow,
    unfollow,
    getFollowers,
    getFollowing,

    // comments
    addComment,
    getComments,

    // reactions
    react,
    getReactions,

    // notifications
    getNotifications,
    markNotificationRead,
    startNotificationPolling,

    // presence
    connectPresence,
    setPresenceHandlers,
    sendPresenceUpdate,

    // utils
    distanceKm,
    formatDistance,
    formatDateTime,

    // deep links
    openSpotOnMap,
    openEventOnMap,
    openProfile
  };
})();
