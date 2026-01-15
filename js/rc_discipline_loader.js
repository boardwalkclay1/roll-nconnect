// rc_discipline_loader.js
(function () {

  const disciplineKey = document.querySelector("main").dataset.discipline;
  const config = window.RC_CHATROOMS[disciplineKey];

  const publicEl = document.getElementById("publicRooms");
  const userEl = document.getElementById("userRooms");
  const voiceEl = document.getElementById("voiceRooms");

  function getUserRooms() {
    try {
      const all = JSON.parse(localStorage.getItem("rc_user_rooms") || "{}");
      return all[disciplineKey] || [];
    } catch (e) {
      return [];
    }
  }

  function saveUserRooms(rooms) {
    const all = JSON.parse(localStorage.getItem("rc_user_rooms") || "{}");
    all[disciplineKey] = rooms;
    localStorage.setItem("rc_user_rooms", JSON.stringify(all));
  }

  function enterRoom(discipline, roomId, roomType) {
    const url = `rooms/room.html?discipline=${encodeURIComponent(discipline)}&room=${encodeURIComponent(roomId)}&type=${encodeURIComponent(roomType)}`;
    location.href = url;
  }

  function renderPublicRooms() {
    publicEl.innerHTML = config.rooms.map(r => `
      <button class="rc-list-item"
              title="Enter this room to chat, send emojis, and voice messages."
              onclick="location.href='rooms/room.html?discipline=${disciplineKey}&room=${r.id}&type=public'">
        <div>
          <div class="rc-list-title">${r.name}</div>
          <div class="rc-list-sub">Public • ${config.name}</div>
        </div>
      </button>
    `).join("");
  }

  function renderUserRooms() {
    const rooms = getUserRooms();
    if (!rooms.length) {
      userEl.innerHTML = "<p class='rc-muted'>No rooms yet. Create one.</p>";
      return;
    }
    userEl.innerHTML = rooms.map(r => `
      <button class="rc-list-item"
              title="Your custom room. Share the link so others can join."
              onclick="location.href='rooms/room.html?discipline=${disciplineKey}&room=${r.id}&type=user'">
        <div>
          <div class="rc-list-title">${r.name}</div>
          <div class="rc-list-sub">User-created • ${config.name}</div>
        </div>
      </button>
    `).join("");
  }

  function renderVoiceRooms() {
    voiceEl.innerHTML = config.voice.map(v => `
      <button class="rc-list-item"
              title="Join this live voice room to talk in real time."
              onclick="location.href='rooms/room.html?discipline=${disciplineKey}&room=${v.id}&type=voice'">
        <div>
          <div class="rc-list-title">${v.name}</div>
          <div class="rc-list-sub">Live voice • ${config.name}</div>
        </div>
      </button>
    `).join("");
  }

  function createRoom() {
    const name = prompt("Room name?");
    if (!name) return;
    const rooms = getUserRooms();
    const id = "user_room_" + Date.now();
    rooms.push({ id, name, type: "user" });
    saveUserRooms(rooms);
    renderUserRooms();
  }

  document.getElementById("createRoomBtn").onclick = createRoom;

  renderPublicRooms();
  renderUserRooms();
  renderVoiceRooms();

})();
