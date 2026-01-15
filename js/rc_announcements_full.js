// rc_announcements_full.js
// Roll ’n Connect — Announcement Feed Engine
// Features:
// - Reactions (🔥 ❤️ 😮 😭)
// - Comments
// - Filters (all / spot / event / lesson)
// - Infinite scroll
// - Follow-aware feed (global / following)

const RC_ANNOUNCEMENTS = (function () {
  const API_BASE = "";
  const PAGE_SIZE = 15;

  let announcements = [];
  let offset = 0;
  let loading = false;
  let done = false;

  let currentFilter = "all";       // all | spot | event | lesson
  let currentMode = "global";      // global | following
  let followingList = [];

  function getUserId() {
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

  async function loadFollowing() {
    const userId = getUserId();
    try {
      const profile = await apiGet(`/api/profile/${userId}`);
      followingList = profile.following || [];
    } catch {
      followingList = [];
    }
  }

  async function loadMore() {
    if (loading || done) return;
    loading = true;
    showLoading(true);

    try {
      const batch = await apiGet(`/api/announcements?offset=${offset}&limit=${PAGE_SIZE}`);
      if (!batch.length) {
        done = true;
        showEnd(true);
      } else {
        offset += batch.length;
        announcements.push(...batch);
        renderAnnouncements();
      }
    } catch (e) {
      console.error(e);
    }

    showLoading(false);
    loading = false;
  }

  function showLoading(show) {
    const el = document.getElementById("feedLoading");
    if (!el) return;
    el.style.display = show ? "block" : "none";
  }

  function showEnd(show) {
    const el = document.getElementById("feedEnd");
    if (!el) return;
    el.style.display = show ? "block" : "none";
  }

  function applyFilterAndMode() {
    let list = announcements.slice();

    if (currentMode === "following" && followingList.length) {
      list = list.filter(a => followingList.includes(a.userId));
    }

    if (currentFilter !== "all") {
      list = list.filter(a => a.type === currentFilter);
    }

    return list;
  }

  function renderAnnouncements() {
    const feed = document.getElementById("announcementFeed");
    if (!feed) return;

    const list = applyFilterAndMode();

    if (!list.length) {
      feed.innerHTML = "<p style='opacity:0.7;'>No announcements yet.</p>";
      return;
    }

    feed.innerHTML = list.map(renderAnnouncementCard).join("");

    attachCardHandlers();
  }

  function renderAnnouncementCard(p) {
    const reactions = p.reactions || { fire: [], heart: [], wow: [], cry: [] };
    const commentsCount = (p.comments && p.comments.length) || 0;

    return `
      <div class="glass-card announcement" data-id="${p.id}" style="margin-bottom:20px;position:relative;">

        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div class="hover-profile" data-user="${p.userId}" style="cursor:pointer;">
            <strong>@${p.username || p.userId}</strong>
          </div>
          <span style="opacity:0.6;font-size:12px;">${new Date(p.ts).toLocaleString()}</span>
        </div>

        <div style="margin-bottom:10px;">${p.text || ""}</div>

        ${p.mediaUrl ? `
          <video src="${p.mediaUrl}" controls style="width:100%;border-radius:14px;margin-bottom:10px;"></video>
        ` : ""}

        ${renderAttachment(p)}

        <div class="reaction-row" style="display:flex;gap:8px;align-items:center;margin-top:10px;">
          <button class="btn-ghost react-btn" data-react="fire">🔥 <span>${reactions.fire.length}</span></button>
          <button class="btn-ghost react-btn" data-react="heart">❤️ <span>${reactions.heart.length}</span></button>
          <button class="btn-ghost react-btn" data-react="wow">😮 <span>${reactions.wow.length}</span></button>
          <button class="btn-ghost react-btn" data-react="cry">😭 <span>${reactions.cry.length}</span></button>

          <button class="btn-ghost toggle-comments-btn" style="margin-left:auto;">
            💬 Comments (${commentsCount})
          </button>
        </div>

        <div class="comments-container" style="margin-top:8px;display:none;">
          <div class="comments-list" style="margin-bottom:6px;"></div>
          <div style="display:flex;gap:6px;margin-top:4px;">
            <input type="text" class="comment-input" placeholder="Add a comment…" style="flex:1;padding:6px 8px;border-radius:8px;border:none;background:rgba(255,255,255,0.08);color:#fff;font-size:13px;">
            <button class="btn-primary comment-send" style="padding:6px 10px;font-size:13px;">Send</button>
          </div>
        </div>

      </div>
    `;
  }

  function renderAttachment(p) {
    if (p.type === "spot") {
      return `
        <div class="hover-spot" data-id="${p.spotId}" style="margin-top:10px;cursor:pointer;">
          <div class="glass-card" style="padding:10px;">
            <strong>📍 Spot: ${p.spotName || ""}</strong><br>
            <span style="opacity:0.8;">${p.spotLocation || ""}</span>
          </div>
        </div>
      `;
    }

    if (p.type === "event") {
      return `
        <div class="hover-event" data-id="${p.eventId}" style="margin-top:10px;cursor:pointer;">
          <div class="glass-card" style="padding:10px;">
            <strong>🎉 Event: ${p.eventName || ""}</strong><br>
            <span style="opacity:0.8;">${p.eventDate || ""} • ${p.eventLocation || ""}</span>
          </div>
        </div>
      `;
    }

    if (p.type === "lesson") {
      return `
        <div class="hover-lesson" data-id="${p.lessonId}" style="margin-top:10px;cursor:pointer;">
          <div class="glass-card" style="padding:10px;">
            <strong>📘 Lesson: ${p.lessonTitle || ""}</strong><br>
            <span style="opacity:0.8;">${p.lessonPrice ? "$" + p.lessonPrice : "Free"} • ${p.lessonDuration || ""} min</span><br>
            <button class="btn-primary" style="margin-top:6px;" onclick="location.href='lessons.html?lesson=${p.lessonId}'">Book Lesson</button>
          </div>
        </div>
      `;
    }

    return "";
  }

  function attachCardHandlers() {
    const feed = document.getElementById("announcementFeed");
    if (!feed) return;

    feed.querySelectorAll(".react-btn").forEach(btn => {
      btn.onclick = () => handleReactionClick(btn);
    });

    feed.querySelectorAll(".toggle-comments-btn").forEach(btn => {
      btn.onclick = () => toggleComments(btn.closest(".announcement"));
    });

    feed.querySelectorAll(".comment-send").forEach(btn => {
      btn.onclick = () => sendComment(btn.closest(".announcement"));
    });

    feed.querySelectorAll(".hover-profile").forEach(el => {
      el.addEventListener("mouseenter", () => showProfileHover(el));
      el.addEventListener("mouseleave", hideHover);
      el.onclick = () => {
        // later: open other user's profile
        location.href = "profile.html";
      };
    });

    feed.querySelectorAll(".hover-spot").forEach(el => {
      el.addEventListener("mouseenter", () => showSpotHover(el));
      el.addEventListener("mouseleave", hideHover);
    });

    feed.querySelectorAll(".hover-event").forEach(el => {
      el.addEventListener("mouseenter", () => showEventHover(el));
      el.addEventListener("mouseleave", hideHover);
    });

    feed.querySelectorAll(".hover-lesson").forEach(el => {
      el.addEventListener("mouseenter", () => showLessonHover(el));
      el.addEventListener("mouseleave", hideHover);
    });
  }

  async function handleReactionClick(btn) {
    const reaction = btn.dataset.react;
    const card = btn.closest(".announcement");
    const annId = card.dataset.id;
    const userId = getUserId();

    try {
      const res = await apiPost(`/api/announcements/${annId}/react`, {
        userId,
        reaction
      });

      const row = card.querySelector(".reaction-row");
      row.querySelectorAll(".react-btn").forEach(b => {
        const r = b.dataset.react;
        const span = b.querySelector("span");
        span.textContent = (res[r] || []).length;
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleComments(card) {
    const container = card.querySelector(".comments-container");
    const listEl = card.querySelector(".comments-list");
    const annId = card.dataset.id;

    if (container.style.display === "block") {
      container.style.display = "none";
      return;
    }

    try {
      const comments = await apiGet(`/api/announcements/${annId}/comments`);
      listEl.innerHTML = comments.map(c => `
        <div style="margin-bottom:4px;font-size:13px;">
          <strong>@${c.userId}</strong> <span style="opacity:0.7;">${c.text}</span>
        </div>
      `).join("");
    } catch (e) {
      console.error(e);
      listEl.innerHTML = "<p style='opacity:0.7;'>Failed to load comments.</p>";
    }

    container.style.display = "block";
  }

  async function sendComment(card) {
    const input = card.querySelector(".comment-input");
    const text = input.value.trim();
    if (!text) return;

    const annId = card.dataset.id;
    const userId = getUserId();

    try {
      await apiPost(`/api/announcements/${annId}/comments`, { userId, text });
      input.value = "";
      toggleComments(card);
      toggleComments(card);
    } catch (e) {
      console.error(e);
    }
  }

  let hoverBox = null;

  function showHover(html, anchor) {
    hideHover();
    hoverBox = document.createElement("div");
    hoverBox.className = "hover-box glass-card";
    hoverBox.style.position = "absolute";
    hoverBox.style.top = anchor.offsetTop + 24 + "px";
    hoverBox.style.left = anchor.offsetLeft + "px";
    hoverBox.style.padding = "10px";
    hoverBox.style.zIndex = "9999";
    hoverBox.innerHTML = html;
    anchor.parentElement.appendChild(hoverBox);
  }

  function hideHover() {
    if (hoverBox) hoverBox.remove();
    hoverBox = null;
  }

  async function showProfileHover(el) {
    const userId = el.dataset.user;
    try {
      const p = await apiGet(`/api/profile/${userId}`);
      showHover(`
        <strong>${p.name || "Unnamed"}</strong><br>
        @${p.username || userId}<br>
        <span style="opacity:0.8;">${p.bio || ""}</span>
      `, el);
    } catch (e) {
      console.error(e);
    }
  }

  async function showSpotHover(el) {
    const id = el.dataset.id;
    try {
      const s = await apiGet(`/api/spots/${id}`);
      showHover(`
        <strong>${s.name || "Spot"}</strong><br>
        <span style="opacity:0.8;">${s.location || ""}</span>
      `, el);
    } catch (e) {
      console.error(e);
    }
  }

  async function showEventHover(el) {
    const id = el.dataset.id;
    try {
      const ev = await apiGet(`/api/events/${id}`);
      showHover(`
        <strong>${ev.name || "Event"}</strong><br>
        ${ev.date || ""} • ${ev.location || ""}
      `, el);
    } catch (e) {
      console.error(e);
    }
  }

  async function showLessonHover(el) {
    const id = el.dataset.id;
    try {
      const l = await apiGet(`/api/lessons/${id}`);
      showHover(`
        <strong>${l.title || "Lesson"}</strong><br>
        ${(l.price ? "$" + l.price : "Free")} • ${l.duration || ""} min<br>
        <span style="opacity:0.8;">${l.description || ""}</span>
      `, el);
    } catch (e) {
      console.error(e);
    }
  }

  async function createAnnouncement() {
    const text = prompt("Write your announcement:");
    if (!text) return;

    const typeRaw = prompt("Attach something? (spot/event/lesson/none)").trim().toLowerCase();
    const type = ["spot", "event", "lesson"].includes(typeRaw) ? typeRaw : "none";

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

    try {
      await apiPost("/api/announcements", body);
      announcements = [];
      offset = 0;
      done = false;
      await loadMore();
    } catch (e) {
      console.error(e);
    }
  }

  function setupFilters() {
    document.querySelectorAll(".filter-btn").forEach(btn => {
      btn.onclick = () => {
        currentFilter = btn.dataset.filter;
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("tab-active"));
        btn.classList.add("tab-active");
        renderAnnouncements();
      };
    });

    document.querySelectorAll(".feed-mode-btn").forEach(btn => {
      btn.onclick = () => {
        currentMode = btn.dataset.mode;
        document.querySelectorAll(".feed-mode-btn").forEach(b => b.classList.remove("tab-active"));
        btn.classList.add("tab-active");
        renderAnnouncements();
      };
    });
  }

  function setupInfiniteScroll() {
    window.addEventListener("scroll", () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) {
        loadMore();
      }
    });
  }

  async function init() {
    const newPostBtn = document.getElementById("newPostBtn");
    if (newPostBtn) newPostBtn.onclick = createAnnouncement;

    setupFilters();
    setupInfiniteScroll();
    await loadFollowing();
    await loadMore();
  }

  return { init };
})();
