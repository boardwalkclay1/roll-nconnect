// rc_profile_engine.js
// Profile engine: loads profile, posts, clips, lessons, calendar via RC core

const RC_PROFILE = (function () {

  function getCurrentUserId() {
    return (window.RC && RC.getUserId) ? RC.getUserId() : "demo-user";
  }

  async function apiGet(path) {
    if (window.RC && RC.apiGet) return RC.apiGet(path);
    const res = await fetch(path);
    if (!res.ok) throw new Error("GET " + path + " failed");
    return res.json();
  }

  async function apiPost(path, body) {
    if (window.RC && RC.apiPost) return RC.apiPost(path, body);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("POST " + path + " failed");
    return res.json();
  }

  // ---------------- PROFILE ----------------
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
    document.getElementById("profileDiscipline").textContent =
      p.discipline ? `Discipline: ${p.discipline}` : "";

    const avatarEl = document.getElementById("profileAvatar");
    avatarEl.src = p.avatarUrl || "img/default-avatar.png";
  }

  function renderProfileClip(p) {
    const el = document.getElementById("profileClipContainer");
    if (!el) return;
    if (!p.profileClipUrl) {
      el.innerHTML = "<p style='opacity:0.7;'>No profile clip uploaded.</p>";
      return;
    }
    el.innerHTML = `<video src="${p.profileClipUrl}" controls style="width:100%;border-radius:14px;"></video>`;
  }

  // ---------------- POSTS + REACTIONS + COMMENTS ----------------
  async function loadPosts() {
    const userId = getCurrentUserId();
    const posts = await apiGet(`/api/posts?userId=${encodeURIComponent(userId)}`);
    const el = document.getElementById("postsFeed");
    if (!el) return;

    if (!posts.length) {
      el.innerHTML = "<p style='opacity:0.7;'>No posts yet. Share a clip or moment.</p>";
      return;
    }

    el.innerHTML = posts.map(p => `
      <div class="glass-card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong>@${p.username || p.userId}</strong>
          <span style="opacity:0.6;font-size:12px;">${new Date(p.ts).toLocaleString()}</span>
        </div>
        <div style="margin-bottom:8px;">${p.text || ""}</div>

        ${p.mediaUrl ? `
          <video src="${p.mediaUrl}" controls style="width:100%;border-radius:14px;margin-bottom:8px;"></video>
        ` : ""}

        <div style="display:flex;gap:10px;align-items:center;font-size:13px;">
          <button class="btn-ghost btn-like" data-post="${p.postId}">
            ❤️ <span data-like-count="${p.postId}">${p.reactions?.heart || 0}</span>
          </button>
          <button class="btn-ghost btn-comments" data-post="${p.postId}">
            💬 Comments
          </button>
        </div>
        <div class="comments" id="comments-${p.postId}" style="margin-top:8px;display:none;"></div>
      </div>
    `).join("");

    // Like / react
    el.querySelectorAll(".btn-like").forEach(btn => {
      btn.addEventListener("click", async () => {
        const postId = btn.dataset.post;
        if (window.RC && RC.react) {
          await RC.react("post", postId, "heart");
          const counts = await RC.getReactions("post", postId);
          const span = el.querySelector(`span[data-like-count="${postId}"]`);
          if (span && counts && typeof counts.heart === "number") {
            span.textContent = counts.heart;
          }
        } else {
          await apiPost(`/api/posts/${postId}/like`, { userId: getCurrentUserId() });
        }
      });
    });

    // Comments
    el.querySelectorAll(".btn-comments").forEach(btn => {
      btn.addEventListener("click", () => toggleComments(btn.dataset.post));
    });
  }

  async function toggleComments(postId) {
    const container = document.getElementById(`comments-${postId}`);
    if (!container) return;

    const visible = container.style.display === "block";
    if (visible) {
      container.style.display = "none";
      return;
    }

    let comments = [];
    if (window.RC && RC.getComments) {
      comments = await RC.getComments("post", postId);
    } else {
      comments = await apiGet(`/api/posts/${postId}/comments`);
    }

    container.innerHTML = `
      <div style="margin-bottom:6px;">
        ${comments.map(c => `
          <div style="margin-bottom:4px;font-size:13px;">
            <strong>@${c.username || c.userId}</strong>
            <span style="opacity:0.7;"> ${c.text}</span>
          </div>
        `).join("")}
      </div>
      <div style="display:flex;gap:6px;margin-top:4px;">
        <input type="text"
               placeholder="Add a comment…"
               style="flex:1;padding:6px 8px;border-radius:8px;border:none;background:rgba(255,255,255,0.08);color:#fff;font-size:13px;"
               id="comment-input-${postId}">
        <button class="btn-primary"
                style="padding:6px 10px;font-size:13px;"
                data-post="${postId}"
                id="comment-send-${postId}">
          Send
        </button>
      </div>
    `;
    container.style.display = "block";

    document.getElementById(`comment-send-${postId}`).onclick = async () => {
      const input = document.getElementById(`comment-input-${postId}`);
      const text = input.value.trim();
      if (!text) return;

      if (window.RC && RC.addComment) {
        await RC.addComment("post", postId, text);
      } else {
        await apiPost(`/api/posts/${postId}/comments`, {
          userId: getCurrentUserId(),
          text
        });
      }

      input.value = "";
      // reload comments
      toggleComments(postId);
      toggleComments(postId);
    };
  }

  // ---------------- CLIPS ----------------
  async function loadClips() {
    const userId = getCurrentUserId();
    const profile = await apiGet(`/api/profile/${userId}`).catch(() => null);
    const clips = (profile && profile.clips) || [];
    const el = document.getElementById("clipsFeed");
    if (!el) return;

    if (!clips.length) {
      el.innerHTML = "<p style='opacity:0.7;'>No clips uploaded yet.</p>";
      return;
    }

    el.innerHTML = clips.map(url => `
      <video src="${url}" controls style="width:100%;border-radius:14px;margin-bottom:10px;"></video>
    `).join("");
  }

  // ---------------- LESSONS ----------------
  async function loadLessons() {
    const el = document.getElementById("lessonsList");
    if (!el) return;

    let lessons = [];
    if (window.RC && RC.getLessons) {
      lessons = RC.getLessons();
    } else {
      try {
        lessons = await apiGet("/api/lessons?mine=1");
      } catch {
        lessons = [];
      }
    }

    if (!lessons.length) {
      el.innerHTML = "<p style='opacity:0.7;'>No lessons added yet.</p>";
      return;
    }

    el.innerHTML = lessons.map(ls => `
      <div class="glass-card" style="margin-bottom:10px;">
        <strong>${ls.title}</strong><br>
        ${(ls.price ? "$" + ls.price : "Free")} • ${ls.duration} min<br>
        <span style="opacity:0.8;">${ls.description || ""}</span><br>
        <button class="btn-primary" style="margin-top:6px;"
                onclick="location.href='lessons.html?lesson=${encodeURIComponent(ls.id || ls.lessonId)}'">
          Purchase / Book
        </button>
      </div>
    `).join("");
  }

  // ---------------- MINI CALENDAR ----------------
  async function loadCalendar() {
    const el = document.getElementById("miniCalendar");
    if (!el) return;

    let events = [];
    if (window.RC && RC.getCalendar) {
      events = RC.getCalendar();
    }

    if (!events.length) {
      el.innerHTML = "<p style='opacity:0.7;'>No upcoming sessions.</p>";
      return;
    }

    const upcoming = events
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);

    el.innerHTML = upcoming.map(ev => `
      <div class="glass-card" style="margin-bottom:10px;">
        <strong>${ev.title || "Untitled Session"}</strong><br>
        <span style="opacity:0.8;">${ev.date || ""} ${ev.time || ""}</span><br>
        <span style="opacity:0.8;">${ev.location || ""}</span>
      </div>
    `).join("");

    const addBtn = document.getElementById("addCalendarItemBtn");
    if (addBtn && window.RC && RC.addCalendarEvent) {
      addBtn.onclick = () => {
        const title = prompt("Session title?");
        if (!title) return;
        const date = prompt("Date? (YYYY-MM-DD)");
        if (!date) return;
        const time = prompt("Time? (e.g. 7:00 PM)") || "";
        const location = prompt("Location?") || "";
        RC.addCalendarEvent({ title, date, time, location });
        loadCalendar();
      };
    }
  }

  // ---------------- INIT ----------------
  async function init() {
    await loadProfile();
    await loadPosts();
    await loadClips();
    await loadLessons();
    await loadCalendar();
  }

  return { init };
})();
