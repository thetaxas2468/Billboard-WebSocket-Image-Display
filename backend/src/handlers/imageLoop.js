// Controls the repeating timer that sends images to Unity.
//
// This file answers the question: "How does the server keep sending images?"
//
// It does NOT know about message parsing or the handshake.
// It only knows about: start the timer, send an image, stop the timer.

const logger = require("../logger");
const config = require("../config");
const { sendJson, buildImageUrl } = require("../utils/socket");

// A shared counter so every image across all connections gets a unique ID.
let imageCounter = 0;

/**
 * Starts sending a new image to Unity every 10 seconds.
 * Sends the first image immediately, then repeats on the interval.
 *
 * @param {WebSocket} socket - The Unity client to send images to
 * @returns {NodeJS.Timeout} The timer handle — pass this to stopImageLoop() to cancel
 */

function startImageLoop(socket) {
  logger.info("Handshake complete — starting image loop");

  // Send the first image right away (don't make Unity wait 10 seconds)
  sendImage(socket);

  // Then send a new one every IMAGE_INTERVAL_MS milliseconds
  const timer = setInterval(function () {
    sendImage(socket);
  }, config.IMAGE_INTERVAL_MS);
   timer.unref(); // Allow the timer to exit if it's the only thing left
  return timer;
}

/**
 * Stops the image loop.
 * Called when the client disconnects so we don't keep sending to a dead socket.
 *
 * @param {NodeJS.Timeout} timer - The value returned by startImageLoop()
 */

function stopImageLoop(timer) {
  if (timer) {
    clearInterval(timer);
    logger.info("Image loop stopped");
  }
}

/**
 * Sends a single SHOW_IMAGE command to Unity.
 * Increments the counter so each image has a unique ID.
 *
 * @param {WebSocket} socket
 */

function sendImage(socket) {
  imageCounter++;

  const imageUrl = buildImageUrl(config.IMAGE_BASE_URL, imageCounter);

  sendJson(socket, {
    command: "SHOW_IMAGE",
    imageId: imageCounter,
    imageUrl: imageUrl,
  });

  logger.info(`Sent image ${imageCounter}: ${imageUrl}`);
}

module.exports = { startImageLoop, stopImageLoop };