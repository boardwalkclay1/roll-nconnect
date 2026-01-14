// rc_core.js
// Shared Roll 'n Connect core (profile + calendar + helpers)

// KEY NAMESPACE
window.RC = window.RC || {};

// ---------- PROFILE ----------
RC.getProfile = function () {
  try {
    return JSON.parse(localStorage.getItem("rc_profile") || "{}");
  } catch (e) {
    return {};
  }
};

RC.saveProfile = function (profile) {
  localStorage.setItem("rc_profile", JSON.stringify(profile || {}));
};

// ---------- CALENDAR ----------
RC.getCalendar = function () {
  try {
    return JSON.parse(localStorage.getItem("rc_calendar") || "[]");
  } catch (e) {
    return [];
  }
};

RC.saveCalendar = function (events) {
  localStorage.setItem("rc_calendar", JSON.stringify(events || []));
};

// ---------- SIMPLE ID HELPER ----------
RC.uuid = function () {
  return "rc-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
};
