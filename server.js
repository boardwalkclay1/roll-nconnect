// server.js
const path = require("path");
const fs = require("fs");
const http = require("http");
const express = require("express");
const WebSocket = require("ws");
const bodyParser = require("body-parser");
const { randomUUID } = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- DATA PATHS ----------
const DATA_DIR = path.join(__dirname, "data");
const USERS_DIR = path.join(DATA_DIR, "users");
const POSTS_DIR = path.join(DATA_DIR, "posts");
const COMMENTS_DIR = path.join(DATA_DIR, "comments");
const ROOMS_DIR = path.join(DATA_DIR, "rooms");
const CHAT_DIR = path.join(DATA_DIR, "chat");

// Ensure folders exist
[DATA_DIR, USERS_DIR, POSTS_DIR, COMMENTS_DIR, ROOMS_DIR, CHAT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ---------- HELPERS: JSON FILE IO (PRETTY PRINTED) ----------
function readJsonFile(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading JSON:", filePath, e);
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing JSON:", filePath, e);
  }
}

// ---------- EXPRESS MIDDLEWARE ----------
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- PROFILE API (users/<userId>.json) ----------

// Get profile
app.get("/api/profile/:userId", (req, res) => {
  const { userId } = req.params;
  const file = path.join(USERS_DIR, `${userId}.json`);
  const profile = readJsonFile(file);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json(profile);
});

// Create/update profile
app.post("/api/profile", (req, res) => {
  const { userId, username, bio, avatarUrl, discipline } = req.body;
  if (!userId || !username) {
    return res.status(400).json({ error: "userId and username required" });
  }
  const profile = {
    userId,
    username,
    bio: bio || "",
    avatarUrl: avatarUrl || "",
    discipline: discipline || ""
  };
  const file = path.join(USERS_DIR, `${userId}.json`);
  writeJsonFile(file, profile);
  res.json(profile);
});

// ---------- POSTS API (posts/<postId>.json) ----------

// Create post
app.post("/api/posts", (req, res) => {
  const { userId, text } = req.body;
  if (!userId || !text) return res.status(400).json({ error: "userId and text required" });

  const postId = randomUUID();
  const post = {
    postId,
    userId,
    text,
    ts: Date.now(),
    likes: [],
    comments: []
  };
  const file = path.join(POSTS_DIR, `${postId}.json`);
  writeJsonFile(file, post);
  res.json(post);
});

// Get posts (optionally by userId)
app.get("/api/posts", (req, res) => {
  const { userId } = req.query;
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith(".json"));
  let list = files.map(f => readJsonFile(path.join(POSTS_DIR, f))).filter(Boolean);
  if (userId) list = list.filter(p => p.userId === userId);
  list.sort((a, b) => b.ts - a.ts);
  res.json(list);
});

// Like/unlike post
app.post("/api/posts/:postId/like", (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const file = path.join(POSTS_DIR, `${postId}.json`);
  const post = readJsonFile(file);
  if (!post) return res.status(404).json({ error: "Post not found" });

  post.likes = post.likes || [];
  const idx = post.likes.indexOf(userId);
  if (idx === -1) post.likes.push(userId);
  else post.likes.splice(idx, 1);

  writeJsonFile(file, post);
  res.json({ postId, likes: post.likes.length });
});

// ---------- COMMENTS API (comments/<commentId>.json) ----------

// Add comment
app.post("/api/posts/:postId/comments", (req, res) => {
  const { postId } = req.params;
  const { userId, text } = req.body;
  if (!userId || !text) return res.status(400).json({ error: "userId and text required" });

  const postFile = path.join(POSTS_DIR, `${postId}.json`);
  const post = readJsonFile(postFile);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const commentId = randomUUID();
  const comment = {
    commentId,
    postId,
    userId,
    text,
    ts: Date.now()
  };
  const commentFile = path.join(COMMENTS_DIR, `${commentId}.json`);
  writeJsonFile(commentFile, comment);

  post.comments = post.comments || [];
  post.comments.push(commentId);
  writeJsonFile(postFile, post);

  res.json(comment);
});

// Get comments for a post
app.get("/api/posts/:postId/comments", (req, res) => {
  const { postId } = req.params;
  const postFile = path.join(POSTS_DIR, `${postId}.json`);
  const post = readJsonFile(postFile);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const list = (post.comments || [])
    .map(id => readJsonFile(path.join(COMMENTS_DIR, `${id}.json`)))
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts);

  res.json(list);
});

// ---------- ROOMS API (rooms/<roomId>.json) ----------

// Optional: store metadata for user-created rooms
app.post("/api/rooms", (req, res) => {
  const { roomId, discipline, name, createdBy } = req.body;
  if (!roomId || !discipline || !name) {
    return res.status(400).json({ error: "roomId, discipline, name required" });
  }
  const room = {
    roomId,
    discipline,
    name,
    createdBy: createdBy || null,
    ts: Date.now()
  };
  const file = path.join(ROOMS_DIR, `${roomId}.json`);
  writeJsonFile(file, room);
  res.json(room);
});

// ---------- CHAT STORAGE (chat/<roomId>.json) ----------

function getChatFile(roomId) {
  return path.join(CHAT_DIR, `${roomId}.json`);
}

function loadChat(roomId) {
  return readJsonFile(getChatFile(roomId), []);
}

function saveChat(roomId, messages) {
  writeJsonFile(getChatFile(roomId), messages || []);
}

// Optional REST endpoint to fetch chat history
app.get("/api/chat/:roomId", (req, res) => {
  const { roomId } = req.params;
  const msgs = loadChat(roomId);
  res.json(msgs);
});

// ---------- FALLBACK ROUTE ----------
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = http.createServer(app);

// ---------- WEBSOCKET SIGNALING SERVER ----------
const wss = new WebSocket.Server({ server });

// roomId -> Set of clients
const rooms = new Map();
// client -> { userId, username, roomId }
const clientMeta = new Map();

function broadcastToRoom(roomId, payload, exceptClient = null) {
  const set = rooms.get(roomId);
  if (!set) return;
  const data = JSON.stringify(payload);
  for (const client of set) {
    if (client.readyState === WebSocket.OPEN && client !== exceptClient) {
      client.send(data);
    }
  }
}

function getRoomPresence(roomId) {
  const set = rooms.get(roomId);
  if (!set) return [];
  const users = [];
  for (const client of set) {
    const meta = clientMeta.get(client);
    if (meta) {
      users.push({
        userId: meta.userId,
        username: meta.username
      });
    }
  }
  return users;
}

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    let msg;
    try {
      msg = JSON.parse(message.toString());
    } catch (e) {
      console.warn("Invalid JSON:", message.toString());
      return;
    }

    const type = msg.type;

    // JOIN ROOM
    if (type === "join") {
      const { room, userId, username } = msg;
      if (!room || !userId) return;

      clientMeta.set(ws, { roomId: room, userId, username });

      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room).add(ws);

      const users = getRoomPresence(room);
      broadcastToRoom(room, {
        type: "presence",
        room,
        users
      });

      return;
    }

    // LEAVE ROOM
    if (type === "leave") {
      const { room } = msg;
      if (!room) return;

      const set = rooms.get(room);
      if (set) {
        set.delete(ws);
        if (!set.size) rooms.delete(room);
      }
      clientMeta.delete(ws);

      const users = getRoomPresence(room);
      broadcastToRoom(room, {
        type: "presence",
        room,
        users
      });

      return;
    }

    // TEXT MESSAGE
    if (type === "message") {
      const { room, userId, username, text } = msg;
      if (!room || !text) return;

      const entry = {
        id: "msg_" + Date.now(),
        room,
        userId,
        username,
        text,
        type: "text",
        ts: Date.now()
      };

      const history = loadChat(room);
      history.push(entry);
      saveChat(room, history);

      broadcastToRoom(room, {
        type: "message",
        ...entry
      });

      return;
    }

    // WEBRTC OFFER / ANSWER / ICE
    if (type === "offer" || type === "answer" || type === "ice") {
      const { room, to } = msg;
      if (!room || !to) return;

      const set = rooms.get(room);
      if (!set) return;

      for (const client of set) {
        const meta = clientMeta.get(client);
        if (meta && meta.userId === to && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(msg));
        }
      }

      return;
    }
  });

  ws.on("close", () => {
    const meta = clientMeta.get(ws);
    if (meta) {
      const { roomId } = meta;
      const set = rooms.get(roomId);
      if (set) {
        set.delete(ws);
        if (!set.size) rooms.delete(roomId);
      }
      clientMeta.delete(ws);

      const users = getRoomPresence(roomId);
      broadcastToRoom(roomId, {
        type: "presence",
        room: roomId,
        users
      });
    }
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Roll ’n Connect server running on http://localhost:${PORT}`);
});
