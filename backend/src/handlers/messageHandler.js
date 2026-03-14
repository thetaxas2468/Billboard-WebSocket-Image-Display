// Handles every message that arrives FROM Unity.
const logger = require("../logger");
const { sendJson, parseMessage } = require("../utils/socket");

/**
 * Called once when a new client connects.
 * Sends the HELLO handshake and sets up the message listener.
 *
 * @param {WebSocket} socket         - The connected client socket
 * @param {Function}  onHandshakeDone - Called when Unity replies HELLO_OK
 */

function handleConnection(socket, onHandshakeDone) {
  // Step 1: greet the client and ask it to authenticate
  sendJson(socket, {
    command: "HELLO",
    message: "Billboard server ready",
  });

  logger.info("Sent HELLO — waiting for HELLO_OK");

  // Step 2: listen for replies from Unity
  socket.on("message", function (rawMessage) {
    handleIncomingMessage(socket, rawMessage, onHandshakeDone);
  });
}

/**
 * Parses a raw WebSocket message and routes it to the right handler.
 *
 * @param {WebSocket} socket         - The socket the message came from
 * @param {Buffer}    rawMessage     - The raw bytes/string from the socket
 * @param {Function}  onHandshakeDone - Called when Unity sends HELLO_OK
 */

function handleIncomingMessage(socket, rawMessage, onHandshakeDone) {
  // Try to parse the JSON — parseMessage returns null if it fails
  const message = parseMessage(rawMessage);

  if (message === null) {
    logger.error(`Received invalid JSON: ${rawMessage.toString().slice(0, 100)}`);
    return; // Stop here — we can't process garbage data
  }

  if (!message.command) {
    logger.warn("Received message with no 'command' field — ignoring");
    return;
  }

  logger.info(`Received command: ${message.command}`);

  // Route to the right handler based on the command name
  switch (message.command) {
    case "HELLO_OK":
      onHandshakeDone(); // Tell the image loop it can start
      break;

    case "IMAGE_SHOWN":
      logger.info(`Unity confirmed image shown — id: ${message.imageId}`);
      break;

    default:
      logger.warn(`Unknown command received: "${message.command}"`);
      break;
  }
}

module.exports = { handleConnection, handleIncomingMessage };