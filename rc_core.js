<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your Profile — Roll ’n Connect</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="rc_global.css">
</head>

<body>

  <!-- OPTIONAL BACKGROUND LAYERS -->
  <div class="stars1"></div>
  <div class="stars2"></div>
  <div class="stars3"></div>

  <div class="rc-app">

    <!-- SIDEBAR -->
    <aside class="rc-sidebar">
      <div class="rc-logo">Roll ’n Connect</div>

      <nav class="rc-nav">
        <button onclick="location.href='dashboard.html'">Dashboard</button>
        <button onclick="location.href='events.html'">Events</button>
        <button onclick="location.href='find-spots.html'">Find Spots</button>
        <button onclick="location.href='chatrooms.html'">Chatrooms</button>
        <button class="rc-active">Your Profile</button>
        <button onclick="location.href='profile-edit.html'">Edit Profile</button>
        <button onclick="location.href='calendar.html'">Calendar</button>
      </nav>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="rc-content">

      <!-- PROFILE SECTION -->
      <section class="rc-section rc-active" id="profileSection">

        <!-- PROFILE HEADER -->
        <div class="rc-card profile-header">
          <div class="profile-header-inner">

            <div class="profile-avatar">
              <img id="profileAvatar" alt="Profile avatar">
            </div>

            <div class="profile-info">
              <h2 id="profileName"></h2>
              <div id="profileUsername" class="profile-username"></div>
              <p id="profileBio" class="profile-bio"></p>

              <div class="profile-actions">
                <button class="rc-btn" onclick="location.href='profile-edit.html'">Edit Profile</button>
                <button class="rc-btn-secondary" onclick="location.href='chatrooms.html'">Open Chatrooms</button>
              </div>
            </div>

          </div>
        </div>

        <!-- PROFILE META (OPTIONAL STATS) -->
        <div class="rc-card">
          <h3>Profile Details</h3>
          <div id="profileDetails"></div>
        </div>

        <!-- MINI CALENDAR -->
        <div class="rc-card">
          <h3>Upcoming Sessions</h3>
          <div id="miniCalendar"></div>
          <button class="rc-btn" style="margin-top:12px;" onclick="location.href='calendar.html'">
            Open Full Calendar
          </button>
        </div>

      </section>

    </main>

  </div>

  <script src="rc_core.js"></script>

  <script>
    // -------- PROFILE RENDERING --------
    function renderProfile() {
      const p = RC.getProfile() || {};

      document.getElementById("profileName").textContent =
        p.name || "Unnamed Skater";

      document.getElementById("profileUsername").textContent =
        p.username ? "@" + p.username : "@unknown";

      document.getElementById("profileBio").textContent =
        p.bio || "No bio added yet.";

      const avatarEl = document.getElementById("profileAvatar");
      if (p.avatarUrl) {
        avatarEl.src = p.avatarUrl;
      } else {
        avatarEl.src = "https://via.placeholder.com/200x200?text=Skater";
      }

      const detailsEl = document.getElementById("profileDetails");
      const city = p.city || "Unknown city";
      const level = p.level || "Skill level not set";
      const style = p.style || "Style not set";

      detailsEl.innerHTML = `
        <p><strong>City:</strong> ${city}</p>
        <p><strong>Level:</strong> ${level}</p>
        <p><strong>Style:</strong> ${style}</p>
      `;
    }

    // -------- MINI CALENDAR --------
    function renderMiniCalendar() {
      const events = RC.getCalendar() || [];
      const el = document.getElementById("miniCalendar");

      if (!events.length) {
        el.innerHTML = "<p class='rc-muted'>No upcoming sessions.</p>";
        return;
      }

      const upcoming = events
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);

      el.innerHTML = upcoming.map(ev => `
        <div class="rc-card">
          <strong>${ev.title || "Untitled Session"}</strong><br>
          <span class="rc-muted">${ev.date || ""} ${ev.time || ""}</span><br>
          <span class="rc-muted">${ev.location || ""}</span>
        </div>
      `).join("");
    }

    // INIT
    renderProfile();
    renderMiniCalendar();
  </script>

</body>
</html>
