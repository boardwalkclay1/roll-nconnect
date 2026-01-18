// rc_announcements.js
// Roll ’n Connect — Global Announcement Feed (Skate-first, fully unified)

const RC_ANNOUNCEMENTS = (function () {
  const API_BASE = "";

  // -----------------------------
  // API HELPERS
  // -----------------------------
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

  function getUserId() {
    return localStorage.getItem("rc_user_id") || "demo-user";
  }

  // -----------------------------
  // LOAD FEED
  // -----------------------------
  async function loadAnnouncements() {
    const posts = await apiGet("/api/announcements");
    const feed = document.getElementById("announcementFeed");

    if (!posts.length) {
      feed.innerHTML = `<p style="opacity:0.7;">No announcements yet.</p>`;
      return;
    }

    feed.innerHTML = posts.map(renderAnnouncement).join("");
    attachHoverHandlers();
  }

  // -----------------------------
  // RENDER ANNOUNCEMENT CARD
  // -----------------------------
  function renderAnnouncement(p) {
    return `
      <div class="glass-card" style="margin-bottom:20px;position:relative;">

        <!-- USER HEADER -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div class="hover-profile" data-user="${p.userId}">
            <strong>@${p.username || p.userId}</strong>
          </div>
          <span style="opacity:0.6;font-size:12px;">
            ${new Date(p.ts).toLocaleString()}
          </span>
        </div>

        <!-- TEXT -->
        <div style="margin-bottom:10px;">${p.text || ""}</div>

        <!-- MEDIA -->
        ${p.mediaUrl ? `
          <video src="${p.mediaUrl}" controls
            style="width:100%;border-radius:14px;margin-bottom:10px;">
          </video>` : ""}

        <!-- ATTACHMENT -->
        ${renderAttachment(p)}

      </div>
    `;
  }

  // -----------------------------
  // ATTACHMENT TYPES
  // -----------------------------
  function renderAttachment(p) {
    if (p.type === "spot") {
      return `
        <div class="hover-spot" data-id="${p.spotId}">
          <div class="glass-card" style="padding:10px;margin-top:10px;cursor:pointer;">
            <strong>📍 Spot: ${p.spotName}</strong><br>
            <span style="opacity:0.8;">${p.spotLocation}</span>
          </div>
        </div>
      `;
    }

    if (p.type === "event") {
      return `
        <div class="hover-event" data-id="${p.eventId}">
          <div class="glass-card" style="padding:10px;margin-top:10px;cursor:pointer;">
            <strong>🎉 Event: ${p.eventName}</strong><br>
            <span style="opacity:0.8;">${p.eventDate} • ${p.eventLocation}</span>
          </div>
        </div>
      `;
    }

    if (p.type === "lesson") {
      return `
        <div class="hover-lesson" data-id="${p.lessonId}">
          <div class="glass-card" style="padding:10px;margin-top:10px;">
            <strong>📘 Lesson: ${p.lessonTitle}</strong><br>
            <span style="opacity:0.8;">
              ${p.lessonPrice ? "$" + p.lessonPrice : "Free"} • ${p.lessonDuration} min
            </span><br>
            <button class="btn-primary"
              onclick="location.href='lessons.html?lesson=${p.lessonId}'"
              style="margin-top:6px;">
              Book Lesson
            </button>
          </div>
        </div>
      `;
    }

    return "";
  }

  // -----------------------------
  // HOVER HANDLERS
  // -----------------------------
  function attachHoverHandlers() {
    bindHover(".hover-profile", showProfileHover);
    bindHover(".hover-spot", showSpotHover);
    bindHover(".hover-event", showEventHover);
    bindHover(".hover-lesson", showLessonHover);
  }

  function bindHover(selector, handler) {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener("mouseenter", () => handler(el));
      el.addEventListener("mouseleave", hideHover);
    });
  }

  let hoverBox = null;

  function showHover(html, anchor) {
    hideHover();
    hoverBox = document.createElement("div");
    hoverBox.className = "hover-box glass-card";
    hoverBox.style.position = "absolute";
    hoverBox.style.top = anchor.offsetTop + 20 + "px";
    hoverBox.style.left = anchor.offsetLeft + "px";
    hoverBox.style.padding = "12px";
    hoverBox.style.zIndex = "9999";
    hoverBox.innerHTML = html;
    anchor.parentElement.appendChild(hoverBox);
  }

  function hideHover() {
    if (hoverBox) hoverBox.remove();
    hoverBox = null;
  }

  // -----------------------------
  // HOVER CONTENT LOADERS
  // -----------------------------
  async function showProfileHover(el) {
    const userId = el.dataset.user;
    const p = await apiGet(`/api/profile/${userId}`);
    showHover(`
      <strong>${p.name || "Unnamed"}</strong><br>
      @${p.username}<br>
      <span style="opacity:0.8;">${p.bio || ""}</span>
    `, el);
  }

  async function showSpotHover(el) {
    const id = el.dataset.id;
    const s = await apiGet(`/api/spots/${id}`);
    showHover(`
      <strong>${s.name}</strong><br>
      <span style="opacity:0.8;">${s.location}</span>
    `, el);
  }

  async function showEventHover(el) {
    const id = el.dataset.id;
    const e = await apiGet(`/api/events/${id}`);
    showHover(`
      <strong>${e.name}</strong><br>
      ${e.date} • ${e.location}
    `, el);
  }

  async function showLessonHover(el) {
    const id = el.dataset.id;
    const l = await apiGet(`/api/lessons/${id}`);
    showHover(`
      <strong>${l.title}</strong><br>
      ${(l.price ? "$" + l.price : "Free")} • ${l.duration} min<br>
      <span style="opacity:0.8;">${l.description}</span>
    `, el);
  }

  // -----------------------------
  // CREATE ANNOUNCEMENT
  // -----------------------------
  async function createAnnouncement() {
    const text = prompt("Write your announcement:");
    if (!text) return;

    const type = prompt("Attach something? (spot/event/lesson/none)").toLowerCase();

    const body = {
      userId: getUserId(),
      text,
      ts: Date.now()
    };

    if (type === "spot") {
      body.type = "spot";
      body.spotId = prompt("Spot ID?");
    } else if (type === "event") {
      body.type = "event";
      body.eventId = prompt("Event ID?");
    } else if (type === "lesson") {
      body.type = "lesson";
      body.lessonId = prompt("Lesson ID?");
    }

    await apiPost("/api/announcements", body);
    loadAnnouncements();
  }

  // -----------------------------
  // INIT
  // -----------------------------
  function init() {
    const btn = document.getElementById("newPostBtn");
    if (btn) btn.onclick = createAnnouncement;
    loadAnnouncements();
  }

  return { init };
})();
