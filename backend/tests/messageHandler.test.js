// Tests for the message handler.
// These tests do NOT need a running server.
// They test the handleIncomingMessage function directly by
// passing fake messages and checking what happens.

const { handleIncomingMessage } = require("../src/handlers/messageHandler");

//Fake socket
// We don't need a real WebSocket here — just something with a readyState and send()

function makeFakeSocket() {
  return {
    readyState: 1, // 1 = OPEN
    sentMessages: [],
    send: function (data) {
      this.sentMessages.push(JSON.parse(data));
    },
  };
}

//Tests

describe("handleIncomingMessage", () => {
  test("calls onHandshakeDone when command is HELLO_OK", () => {
    const socket = makeFakeSocket();
    let handshakeCalled = false;

    const rawMessage = JSON.stringify({ command: "HELLO_OK" });
    handleIncomingMessage(socket, rawMessage, () => {
      handshakeCalled = true;
    });

    expect(handshakeCalled).toBe(true);
  });

  test("does NOT call onHandshakeDone for IMAGE_SHOWN", () => {
    const socket = makeFakeSocket();
    let handshakeCalled = false;

    const rawMessage = JSON.stringify({ command: "IMAGE_SHOWN", imageId: 1 });
    handleIncomingMessage(socket, rawMessage, () => {
      handshakeCalled = true;
    });

    expect(handshakeCalled).toBe(false);
  });

  test("does not crash on invalid JSON", () => {
    const socket = makeFakeSocket();

    // This should NOT throw an error — it should log and return safely
    expect(() => {
      handleIncomingMessage(socket, "not valid json {{", () => {});
    }).not.toThrow();
  });

  test("does not crash on a message with no command field", () => {
    const socket = makeFakeSocket();

    expect(() => {
      handleIncomingMessage(socket, JSON.stringify({ foo: "bar" }), () => {});
    }).not.toThrow();
  });

  test("does not crash on unknown command", () => {
    const socket = makeFakeSocket();

    expect(() => {
      handleIncomingMessage(socket, JSON.stringify({ command: "SOMETHING_UNKNOWN" }), () => {});
    }).not.toThrow();
  });
});
