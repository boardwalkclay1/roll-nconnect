// rc_core.js
// Roll ’n Connect — Global App Core (Full Architecture Version B)

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
  // 7. SPOT + EVENT HELPERS
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
  // 8. UTILITY FUNCTIONS
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
  // 9. DEEP LINK HELPERS
  // ============================================================
  function openSpotOnMap(spotId) {
    location.href = `find-spots.html?spot=${spotId}`;
  }

  function openEventOnMap(eventId) {
    location.href = `find-spots.html?event=${eventId}`;
  }

  function openProfile(userId) {
    location.href = `profile.html?id=${userId}`;
  }

  // ============================================================
  // 10. PUBLIC API
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
