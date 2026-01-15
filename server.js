// server.js
const path = require("path");
const http = require("http");
const express = require("express");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// Fallback to index or 404 as needed
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = http.createServer(app);

// --- WEBSOCKET SIGNALING SERVER ---
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

    // --- JOIN ROOM ---
    if (type === "join") {
      const { room, userId, username } = msg;
      if (!room || !userId) return;

      // Track client meta
      clientMeta.set(ws, { roomId: room, userId, username });

      // Add to room set
      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room).add(ws);

      // Broadcast presence
      const users = getRoomPresence(room);
      broadcastToRoom(room, {
        type: "presence",
        room,
        users
      });

      return;
    }

    // --- LEAVE ROOM ---
    if (type === "leave") {
      const { room, userId } = msg;
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

    // --- TEXT MESSAGE BROADCAST ---
    if (type === "message") {
      const { room, userId, username, text } = msg;
      if (!room || !text) return;

      broadcastToRoom(room, {
        type: "message",
        room,
        userId,
        username,
        text,
        ts: Date.now()
      });

      return;
    }

    // --- WEBRTC OFFER / ANSWER / ICE ---
    if (type === "offer" || type === "answer" || type === "ice") {
      const { room, from, to } = msg;
      if (!room || !to) return;

      // Relay only to target user in the same room
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
