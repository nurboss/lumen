// Standalone WebRTC signaling server (WebSocket mesh relay).
// Run alongside Next.js:  node server/signaling.mjs   (or: npm run dev:signal)
//
// Protocol (JSON messages):
//   client → server: { type: "join", room, peerId, name }
//   client → server: { type: "signal", to, data }        // relay SDP/ICE
//   client → server: { type: "leave" }
//   server → client: { type: "peers", peers: [{peerId,name}] }   // existing peers on join
//   server → client: { type: "peer-joined", peerId, name }
//   server → client: { type: "peer-left", peerId }
//   server → client: { type: "signal", from, data }

import { WebSocketServer } from "ws";

const PORT = process.env.SIGNAL_PORT ? Number(process.env.SIGNAL_PORT) : 3001;
const wss = new WebSocketServer({ port: PORT });

/** room -> Map(peerId -> { ws, name }) */
const rooms = new Map();

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

wss.on("connection", (ws) => {
  ws.meta = { room: null, peerId: null };

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "join") {
      const { room, peerId, name } = msg;
      ws.meta = { room, peerId };
      if (!rooms.has(room)) rooms.set(room, new Map());
      const peers = rooms.get(room);

      // Tell the newcomer about existing peers.
      send(ws, {
        type: "peers",
        peers: [...peers.entries()].map(([id, v]) => ({ peerId: id, name: v.name })),
      });

      // Announce the newcomer to everyone else.
      for (const [, v] of peers) {
        send(v.ws, { type: "peer-joined", peerId, name });
      }

      peers.set(peerId, { ws, name });
      return;
    }

    if (msg.type === "signal") {
      const { room, peerId } = ws.meta;
      const peers = rooms.get(room);
      const target = peers?.get(msg.to);
      if (target) send(target.ws, { type: "signal", from: peerId, data: msg.data });
      return;
    }

    if (msg.type === "leave") {
      cleanup();
    }
  });

  ws.on("close", cleanup);

  function cleanup() {
    const { room, peerId } = ws.meta;
    if (!room || !peerId) return;
    const peers = rooms.get(room);
    if (!peers) return;
    peers.delete(peerId);
    for (const [, v] of peers) send(v.ws, { type: "peer-left", peerId });
    if (peers.size === 0) rooms.delete(room);
    ws.meta = { room: null, peerId: null };
  }
});

console.log(`[signaling] WebSocket server listening on ws://localhost:${PORT}`);
