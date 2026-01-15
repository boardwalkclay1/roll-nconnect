// rc_profile_engine.js
// Profile engine: loads profile, posts, clips, lessons, calendar from Node JSON backend

const RC_PROFILE = (function () {
  const API_BASE = ""; // same origin

  function getCurrentUserId() {
    // Replace with your auth/user logic
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
      const profile = await apiGet(`/api/profile/${userId}`);
      renderProfile(profile);
      renderProfileClip(profile);
    } catch {
      renderProfile({
        userId,
        username: "unknown",
        name: "Unnamed Skater",
        bio: "",
        discipline: ""
      });
    }
  }

  function renderProfile(p) {
    document.getElementById("profileName").textContent = p.name || "Unnamed Skater";
    document.getElementById("profileUsername").textContent = "@" + (p.username || "unknown");
    document.getElementById("profileBio").textContent = p.bio || "";
    document.getElementById("profileDiscipline").textContent = p.discipline ? `Discipline: ${p.discipline}` : "";

    if (p.avatarUrl) {
      document.getElementById("profileAvatar").src = p.avatarUrl;
    } else {
      document.getElementById("profileAvatar").src = "img/default-avatar.png";
    }
  }

  function renderProfileClip(p) {
    const el = document.getElementById("profileClipContainer");
    if (!p.profileClipUrl) {
      el.innerHTML = "<p style='opacity:0.7;'>No profile clip uploaded.</p>";
      return;
    }
    el.innerHTML = `<video src="${p.profileClipUrl}" controls style="width:100%;border-radius:14px;"></video>`;
  }

  async function loadPosts() {
    const userId = getCurrentUserId();
    const posts = await apiGet(`/api/posts?userId=${encodeURIComponent(userId)}`);
    const el = document.getElementById("postsFeed");

    if (!posts.length) {
      el.innerHTML = "<p style='opacity:0.7;'>No posts yet. Share a clip or moment.</p>";
      return;
    }

    el.innerHTML = posts.map(p => `
      <div class="glass-card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong>@${p.userId}</strong>
          <span style="opacity:0.6;font-size:12px;">${new Date(p.ts).toLocaleString()}</span>
        </div>
        <div style="margin-bottom:8px;">${p.text}</div>
        <div style="display:flex;gap:10px;align-items:center;font-size:13px;">
          <button class="btn-ghost btn-like" data-post="${p.postId}">
            ❤️ <span>${(p.likes || []).length || p.likes || 0}</span>
          </button>
          <button class="btn-ghost btn-comments" data-post="${p.postId}">
            💬 Comments
          </button>
        </div>
        <div class="comments" id="comments-${p.postId}" style="margin-top:8px;display:none;"></div>
      </div>
    `).join("");

    el.querySelectorAll(".btn-like").forEach(btn => {
      btn.addEventListener("click", async () => {
        const postId = btn.dataset.post;
        const userId = getCurrentUserId();
        const res = await apiPost(`/api/posts/${postId}/like`, { userId });
        btn.querySelector("span").textContent = res.likes;
      });
    });

    el.querySelectorAll(".btn-comments").forEach(btn => {
      btn.addEventListener("click", () => toggleComments(btn.dataset.post));
    });
  }

  async function toggleComments(postId) {
    const container = document.getElementById(`comments-${postId}`);
    const visible = container.style.display === "block";
    if (visible) {
      container.style.display = "none";
      return;
    }

    const comments = await apiGet(`/api/posts/${postId}/comments`);
    container.innerHTML = `
      <div style="margin-bottom:6px;">
        ${comments.map(c => `
          <div style="margin-bottom:4px;font-size:13px;">
            <strong>@${c.userId}</strong> <span style="opacity:0.7;">${c.text}</span>
          </div>
        `).join("")}
      </div>
      <div style="display:flex;gap:6px;margin-top:4px;">
        <input type="text" placeholder="Add a comment…" style="flex:1;padding:6px 8px;border-radius:8px;border:none;background:rgba(255,255,255,0.08);color:#fff;font-size:13px;" id="comment-input-${postId}">
        <button class="btn-primary" style="padding:6px 10px;font-size:13px;" data-post="${postId}" id="comment-send-${postId}">Send</button>
      </div>
    `;
    container.style.display = "block";

    document.getElementById(`comment-send-${postId}`).onclick = async () => {
      const input = document.getElementById(`comment-input-${postId}`);
      const text = input.value.trim();
      if (!text) return;
      const userId = getCurrentUserId();
      await apiPost(`/api/posts/${postId}/comments`, { userId, text });
      input.value = "";
      toggleComments(postId);
      toggleComments(postId);
    };
  }

  async function loadClips() {
    const userId = getCurrentUserId();
    // For now, treat posts with a "clipUrl" field as clips, or use RC.getClips() if you prefer local
    // Here we assume clips are stored in profile JSON as array of URLs:
    const profile = await apiGet(`/api/profile/${userId}`).catch(() => null);
    const clips = (profile && profile.clips) || [];
    const el = document.getElementById("clipsFeed");

    if (!clips.length) {
      el.innerHTML = "<p style='opacity:0.7;'>No clips uploaded yet.</p>";
      return;
    }

    el.innerHTML = clips.map(url => `
      <video src="${url}" controls style="width:100%;border-radius:14px;margin-bottom:10px;"></video>
    `).join("");
  }

  async function loadLessons() {
    // For now, pull from RC.getLessons() (local) or later from /api/lessons
    const lessons = (window.RC && RC.getLessons) ? RC.getLessons() : [];
    const el = document.getElementById("lessonsList");

    if (!lessons.length) {
      el.innerHTML = "<p style='opacity:0.7;'>No lessons added yet.</p>";
      return;
    }

    el.innerHTML = lessons.map(ls => `
      <div class="glass-card" style="margin-bottom:10px;">
        <strong>${ls.title}</strong><br>
        ${(ls.price ? "$" + ls.price : "Free")} • ${ls.duration} min<br>
        <span style="opacity:0.8;">${ls.description}</span><br>
        <button class="btn-primary" style="margin-top:6px;">Purchase / Book</button>
      </div>
    `).join("");
  }

  async function loadCalendar() {
    const el = document.getElementById("miniCalendar");
    const events = (window.RC && RC.getCalendarItems) ? RC.getCalendarItems() : [];

    if (!events.length) {
      el.innerHTML = "<p style='opacity:0.7;'>No upcoming sessions.</p>";
      return;
    }

    const upcoming = events
      .slice()
      .sort((a,b)=> new Date(a.date) - new Date(b.date))
      .slice(0,5);

    el.innerHTML = upcoming.map(ev => `
      <div class="glass-card" style="margin-bottom:10px;">
        <strong>${ev.title || "Untitled"}</strong><br>
        <span style="opacity:0.8;">${ev.date} • ${ev.time || ""}</span><br>
        <span style="opacity:0.8;">${ev.location || ""}</span>
      </div>
    `).join("");

    const addBtn = document.getElementById("addCalendarItemBtn");
    if (addBtn) {
      addBtn.onclick = () => {
        const title = prompt("Session title?");
        if (!title) return;
        const date = prompt("Date? (YYYY-MM-DD)");
        if (!date) return;
        const time = prompt("Time? (e.g. 7:00 PM)") || "";
        const location = prompt("Location?") || "";
        if (window.RC && RC.addCalendarItem) {
          RC.addCalendarItem({ title, date, time, location });
          loadCalendar();
        }
      };
    }
  }

  async function init() {
    await loadProfile();
    await loadPosts();
    await loadClips();
    await loadLessons();
    await loadCalendar();
  }

  return { init };
})();
