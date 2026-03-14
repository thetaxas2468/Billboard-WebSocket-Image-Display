// Small helper functions for working with WebSocket connections.
//
// Why put these in a utils file?
//   These are tiny, reusable pieces of logic that don't belong
//   to any one handler. Putting them here keeps the handlers clean.

// WebSocket readyState values (defined by the WebSocket spec)
const SOCKET_OPEN = 1;

/**
 * Safely sends a JavaScript object as JSON over a WebSocket.
 * Checks the socket is open before sending to avoid errors.
 *
 * @param {WebSocket} socket - The WebSocket connection to send to
 * @param {Object}    data   - The object to send (will be JSON.stringify'd)
 */

function sendJson(socket, data) {
  if (socket.readyState !== SOCKET_OPEN) {
    return; // Socket is closed or closing — silently skip
  }

  socket.send(JSON.stringify(data));
}

/**
 * Parses a raw WebSocket message buffer into a JavaScript object.
 * Returns null if the message is not valid JSON.
 *
 * @param {Buffer|string} rawMessage - The raw data from the "message" event
 * @returns {Object|null}
 */

function parseMessage(rawMessage) {
  try {
    return JSON.parse(rawMessage.toString());
  } catch (e) {
    return null; // Caller will check for null and handle the error
  }
}

/**
 * Builds the image URL for a given image ID.
 * Adding ?random=ID stops browsers / Unity from caching the same URL.
 *
 * @param {string} baseUrl  - e.g. "https://picsum.photos/512/512"
 * @param {number} imageId  - A unique counter value
 * @returns {string}
 */

function buildImageUrl(baseUrl, imageId) {
  return `${baseUrl}?random=${imageId}`;
}

module.exports = { sendJson, parseMessage, buildImageUrl };