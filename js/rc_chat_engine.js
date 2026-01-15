// rc_chat_engine.js
(function () {
  const params = new URLSearchParams(window.location.search);
  const discipline = params.get("discipline");
  const roomId = params.get("room");
  const roomType = params.get("type") || "public";

  const config = window.RC_CHATROOMS && window.RC_CHATROOMS[discipline];
  const profile = RC.getProfile ? RC.getProfile() || {} : {};
  const userId = (RC.getUserId && RC.getUserId()) || ("rc-" + Math.random().toString(36).slice(2));
  const username = profile.username || ("skater_" + userId.slice(-4));

  const titleEl = document.getElementById("roomTitle");
  const metaEl = document.getElementById("roomMeta");
  const messagesEl = document.getElementById("messages");
  const inputEl = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const emojiBtn = document.getElementById("emojiBtn");
  const voiceBtn = document.getElementById("voiceBtn");

  if (!discipline || !roomId) {
    titleEl.textContent = "Room not found";
    metaEl.textContent = "Missing room parameters.";
    inputEl.disabled = true;
    sendBtn.disabled = true;
    voiceBtn.disabled = true;
    return;
  }

  function getRoomLabel() {
    if (!config) return "Unknown room";
    if (roomType === "public") {
      const r = config.rooms.find(r => r.id === roomId);
      return r ? r.name : "Public room";
    }
    if (roomType === "voice") {
      const v = config.voice.find(v => v.id === roomId);
      return v ? v.name : "Voice room";
    }
    if (roomType === "user") {
      const all = JSON.parse(localStorage.getItem("rc_user_rooms") || "{}");
      const list = all[discipline] || [];
      const r = list.find(r => r.id === roomId);
      return r ? r.name : "User room";
    }
    return "Chatroom";
  }

  function getStorageKey() {
    return `rc_chat_${discipline}_${roomId}`;
  }

  function loadMessages() {
    try {
      return JSON.parse(localStorage.getItem(getStorageKey()) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveMessages(msgs) {
    localStorage.setItem(getStorageKey(), JSON.stringify(msgs || []));
  }

  function renderMessages() {
    const msgs = loadMessages();
    if (!msgs.length) {
      messagesEl.innerHTML = "<p class='rc-muted'>No messages yet. Start the conversation.</p>";
      return;
    }
    messagesEl.innerHTML = msgs.map(m => {
      const isMe = m.userId === userId;
      const content = m.type === "voice"
        ? `<audio controls src="${m.text}" style="width:100%;"></audio>`
        : m.text;
      return `
        <div class="rc-chat-message ${isMe ? "me" : ""}"
             title="Sent by ${m.username} at ${new Date(m.ts).toLocaleString()}">
          <div class="rc-chat-message-header">
            <span class="rc-chat-profile-hover" onclick="location.href='../../profile.html'">
              ${m.username}
            </span>
          </div>
          <div>${content}</div>
        </div>
      `;
    }).join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    const msgs = loadMessages();
    msgs.push({
      id: "msg_" + Date.now(),
      userId,
      username,
      text,
      type: "text",
      ts: Date.now()
    });
    saveMessages(msgs);
    inputEl.value = "";
    renderMessages();
    // TODO: send over WebSocket/WebRTC signaling
  }

  let mediaRecorder = null;
  let chunks = [];
  let isRecording = false;

  async function toggleVoice() {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];
        mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          sendVoice(url);
        };
        mediaRecorder.start();
        isRecording = true;
        voiceBtn.classList.add("recording");
        voiceBtn.textContent = "Stop";
      } catch (err) {
        console.error("Mic error:", err);
      }
    } else {
      mediaRecorder.stop();
      isRecording = false;
      voiceBtn.classList.remove("recording");
      voiceBtn.textContent = "Voice";
    }
  }

  function sendVoice(url) {
    const msgs = loadMessages();
    msgs.push({
      id: "msg_" + Date.now(),
      userId,
      username,
      text: url,
      type: "voice",
      ts: Date.now()
    });
    saveMessages(msgs);
    renderMessages();
    // TODO: send voice URL/blob reference via signaling
  }

  function initHeader() {
    titleEl.textContent = getRoomLabel();
    metaEl.textContent = `${config ? config.name : "Unknown"} • ${roomType === "voice" ? "Live voice" : "Chat room"}`;
  }

  emojiBtn.addEventListener("click", () => {
    inputEl.value += " 😊";
    inputEl.focus();
  });

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
  });
  voiceBtn.addEventListener("click", toggleVoice);

  initHeader();
  renderMessages();
})();
