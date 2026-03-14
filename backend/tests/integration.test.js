// tests/integration.test.js
// ─────────────────────────────────────────────────────────────────
// Integration tests — a real server, a real WebSocket client.
// These test the full flow end-to-end.
// ─────────────────────────────────────────────────────────────────

const WebSocket = require("ws");
const { WebSocketServer } = require("ws");
const { handleConnection } = require("../src/handlers/messageHandler");
const { startImageLoop, stopImageLoop } = require("../src/handlers/imageLoop");

jest.setTimeout(10000);

// ── Test server setup ─────────────────────────────────────────────────────────

let server;
let serverPort;

// Track all server-side sockets so afterAll can force-close them.
// server.close() waits for open sockets to finish — without this it hangs.
const openSockets = new Set();

beforeAll((done) => {
  server = new WebSocketServer({ port: 0 }); // port 0 = OS picks a free port

  server.on("connection", function (socket) {
    openSockets.add(socket);
    socket.on("close", () => openSockets.delete(socket));

    let imageTimer = null;

    handleConnection(socket, function () {
      imageTimer = startImageLoop(socket);
    });

    socket.on("close", function () {
      stopImageLoop(imageTimer);
    });
  });

  server.on("listening", function () {
    serverPort = server.address().port;
    done();
  });
});

afterAll((done) => {
  for (const socket of openSockets) {
    socket.terminate();
  }
  server.close(done);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Connects a test WebSocket client.
 * Starts buffering ALL messages immediately on open so none are missed
 * before waitForCommand attaches its listener.
 *
 * WHY THIS MATTERS:
 *   The server sends HELLO the instant the socket connects.
 *   If we call ws.on("message") even a millisecond after open,
 *   the HELLO message has already arrived and is gone forever.
 *   By collecting every message into an array from the very first moment,
 *   waitForCommand can check messages that already arrived AND future ones.
 *
 * @returns {{ ws: WebSocket, messages: Object[] }}
 */
function connectClient() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${serverPort}`);

    // Collect every message into this array immediately
    const messages = [];
    ws.on("message", function (raw) {
      messages.push(JSON.parse(raw.toString()));
    });

    ws.on("open", () => resolve({ ws, messages }));
    ws.on("error", reject);
  });
}

/**
 * Waits until the messages array contains a message with the given command.
 * Checks already-received messages first, then polls for new ones.
 * Rejects after 5 seconds.
 *
 * @param {Object[]} messages - The live array from connectClient()
 * @param {string}   command  - e.g. "HELLO", "SHOW_IMAGE"
 */
function waitForCommand(messages, command) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for command: "${command}"`));
    }, 5000);

    function check() {
      const found = messages.find((m) => m.command === command);
      if (found) {
        clearTimeout(timeout);
        resolve(found);
      } else {
        // Poll every 50ms — cheap and avoids complex event listener wiring
        setTimeout(check, 50);
      }
    }

    check(); // run immediately in case the message is already in the array
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("server sends HELLO on connect", async () => {
  const { ws, messages } = await connectClient();

  const msg = await waitForCommand(messages, "HELLO");
  expect(msg.command).toBe("HELLO");
  expect(msg.message).toBeDefined();

  ws.close();
});

test("server sends SHOW_IMAGE after HELLO_OK", async () => {
  const { ws, messages } = await connectClient();

  await waitForCommand(messages, "HELLO");
  ws.send(JSON.stringify({ command: "HELLO_OK" }));

  const msg = await waitForCommand(messages, "SHOW_IMAGE");
  expect(msg.command).toBe("SHOW_IMAGE");
  expect(msg.imageId).toBeDefined();
  expect(msg.imageUrl).toContain("picsum.photos");

  ws.close();
});

test("SHOW_IMAGE url contains 512x512", async () => {
  const { ws, messages } = await connectClient();

  await waitForCommand(messages, "HELLO");
  ws.send(JSON.stringify({ command: "HELLO_OK" }));

  const msg = await waitForCommand(messages, "SHOW_IMAGE");
  expect(msg.imageUrl).toContain("512/512");

  ws.close();
});

test("server survives receiving invalid JSON", async () => {
  const { ws } = await connectClient();

  // Send garbage — server must not crash
  ws.send("{{{{ not json");

  // Give the server a moment to process the bad message
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Socket should still be open — server survived
  expect(ws.readyState).toBe(WebSocket.OPEN);

  ws.close();
});