const { WebSocketServer } = require("ws");

const config = require("./config");
const logger = require("./logger");
const { handleConnection } = require("./handlers/messageHandler");
const { startImageLoop, stopImageLoop } = require("./handlers/imageLoop");

// Create the WebSocket server 
const wss = new WebSocketServer({ port: config.PORT });
logger.info(`Server started on ws://localhost:${config.PORT}`);

//Handle each new client connection
wss.on("connection", function (socket) {
  logger.info("Client connected");

  // Each client gets its own timer reference so we can cancel it on disconnect
  let imageTimer = null;

  // Start the handshake.
  // The second argument is the callback for when Unity replies HELLO_OK.
  handleConnection(socket, function onHandshakeDone() {
    imageTimer = startImageLoop(socket);
  });

  //Clean up when the client disconnects
  socket.on("close", function () {
    logger.info("Client disconnected — stopping image loop");
    stopImageLoop(imageTimer);
    imageTimer = null;
  });

  //Log socket-level errors (e.g. network drops) 
  socket.on("error", function (err) {
    logger.error(`Socket error: ${err.message}`);
  });
});

// Export for integration tests
module.exports = { wss };