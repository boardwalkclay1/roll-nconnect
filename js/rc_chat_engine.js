// rc_chat_engine.js
// Roll ’n Connect — Realtime Chat Engine (with basic safety + WS hooks)

(function () {
  const params = new URLSearchParams(window.location.search);
  const discipline = params.get("discipline");
  const roomId = params.get("room");
  const roomType = params.get("type") || "public";

  const config = window.RC_CHATROOMS && window.RC_CHATROOMS[discipline];
  const profile = (window.RC && RC.getProfile) ? (RC.getProfile() || {}) : {};
  const userId = (window.RC && RC.getUserId) ? RC.getUserId() : ("rc-" + Math.random().toString(36).slice(2));
  const username = profile.username || ("skater_" + userId.slice(-4));

  const titleEl = document.getElementById("roomTitle");
  const metaEl = document.getElementById("roomMeta");
  const messagesEl = document.getElementById("messages");
  const inputEl = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const emojiBtn = document.getElementById("emojiBtn");
  const voiceBtn = document.getElementById("voiceBtn");

  if (!discipline || !roomId || !titleEl || !metaEl || !messagesEl || !inputEl || !sendBtn || !voiceBtn) {
    if (titleEl) titleEl.textContent = "Room not found";
    if (metaEl) metaEl.textContent = "Missing room parameters.";
    if (inputEl) inputEl.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    if (voiceBtn) voiceBtn.disabled = true;
    return;
  }

  // ---------------- SAFETY GUARDRAILS (client-side) ----------------
  function violatesChatRules(text) {
    if (!text) return true;
    const t = text.toLowerCase();

    // No racism, hate, or sexual content.
    const bannedPatterns = [
      "racist", "nazi", "kkk",
      "kill all", "go back to",
      "sex", "sexual", "nudes", "explicit"
    ];

    return bannedPatterns.some(p => t.includes(p));
  }

  // ---------------- ROOM LABEL / STORAGE KEY ----------------
  function getRoomLabel() {
    if (!config) return "Unknown room";
    if (roomType === "public") {
      const r = config.rooms && config.rooms.find(r => r.id === roomId);
      return r ? r.name : "Public room";
    }
    if (roomType === "voice") {
      const v = config.voice && config.voice.find(v => v.id === roomId);
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

  // ---------------- RENDERING ----------------
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
            <span class="rc-chat-profile-hover" onclick="location.href='profile.html?id=${encodeURIComponent(m.userId)}'">
              ${m.username}
            </span>
          </div>
          <div>${content}</div>
        </div>
      `;
    }).join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ---------------- LOCAL SEND ----------------
  function appendLocalMessage(msg) {
    const msgs = loadMessages();
    msgs.push(msg);
    saveMessages(msgs);
    renderMessages();
  }

  function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    if (violatesChatRules(text)) {
      alert("That message goes against our community rules.");
      return;
    }

    const msg = {
      id: "msg_" + Date.now(),
      userId,
      username,
      text,
      type: "text",
      ts: Date.now()
    };

    appendLocalMessage(msg);
    inputEl.value = "";
    sendOverSocket(msg);
  }

  // ---------------- VOICE MESSAGES ----------------
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
    const msg = {
      id: "msg_" + Date.now(),
      userId,
      username,
      text: url,
      type: "voice",
      ts: Date.now()
    };
    appendLocalMessage(msg);
    sendOverSocket(msg);
  }

  // ---------------- WEBSOCKET CHAT ----------------
  let chatSocket = null;

  function connectChatSocket() {
    const wsUrl = window.RC_CHAT_WS_URL; // e.g. "wss://yourserver.com/chat"
    if (!wsUrl) return;

    if (chatSocket) {
      try { chatSocket.close(); } catch {}
      chatSocket = null;
    }

    chatSocket = new WebSocket(
      wsUrl +
      `?userId=${encodeURIComponent(userId)}` +
      `&room=${encodeURIComponent(roomId)}` +
      `&discipline=${encodeURIComponent(discipline)}`
    );

    chatSocket.onopen = () => {
      // Optionally send a join event
      chatSocket.send(JSON.stringify({
        type: "join",
        userId,
        username,
        roomId,
        discipline
      }));
      if (window.RC && RC.sendPresenceUpdate) {
        RC.sendPresenceUpdate("in-chat");
      }
    };

    chatSocket.onclose = () => {
      // Auto-reconnect
      setTimeout(connectChatSocket, 5000);
    };

    chatSocket.onerror = (err) => {
      console.error("Chat socket error", err);
    };

    chatSocket.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === "message") {
          // Append remote message to local history
          appendRemoteMessage(data.payload);
        }
      } catch (e) {
        console.error("Bad chat WS message", e);
      }
    };
  }

  function sendOverSocket(msg) {
    if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) return;
    chatSocket.send(JSON.stringify({
      type: "message",
      roomId,
      discipline,
      payload: msg
    }));
  }

  function appendRemoteMessage(msg) {
    // Avoid duplicating our own messages if server echoes them
    if (msg.userId === userId) return;
    const msgs = loadMessages();
    // Skip if already present
    if (msgs.some(m => m.id === msg.id)) return;
    msgs.push(msg);
    saveMessages(msgs);
    renderMessages();
  }

  // ---------------- INIT HEADER + UI ----------------
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
  connectChatSocket();
})();
