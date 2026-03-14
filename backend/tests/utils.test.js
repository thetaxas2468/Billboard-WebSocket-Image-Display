// Tests for the utility helper functions.

const { sendJson, parseMessage, buildImageUrl } = require("../src/utils/socket");

//sendJson 

describe("sendJson", () => {
  test("sends a JSON string when socket is open", () => {
    const sentMessages = [];
    const fakeSocket = {
      readyState: 1, // OPEN
      send: (data) => sentMessages.push(data),
    };

    sendJson(fakeSocket, { command: "HELLO" });

    expect(sentMessages.length).toBe(1);
    expect(JSON.parse(sentMessages[0])).toEqual({ command: "HELLO" });
  });

  test("does nothing when socket is closed", () => {
    const sentMessages = [];
    const fakeSocket = {
      readyState: 3, // CLOSED
      send: (data) => sentMessages.push(data),
    };

    sendJson(fakeSocket, { command: "HELLO" });

    expect(sentMessages.length).toBe(0);
  });
});

// parseMessage

describe("parseMessage", () => {
  test("parses valid JSON into an object", () => {
    const raw = JSON.stringify({ command: "HELLO_OK" });
    const result = parseMessage(raw);
    expect(result).toEqual({ command: "HELLO_OK" });
  });

  test("returns null for invalid JSON", () => {
    const result = parseMessage("not json at all");
    expect(result).toBeNull();
  });

  test("returns null for an empty string", () => {
    const result = parseMessage("");
    expect(result).toBeNull();
  });
});

buildImageUrl

describe("buildImageUrl", () => {
  test("appends the image ID as a query parameter", () => {
    const url = buildImageUrl("https://picsum.photos/512/512", 42);
    expect(url).toBe("https://picsum.photos/512/512?random=42");
  });

  test("each ID produces a different URL", () => {
    const url1 = buildImageUrl("https://picsum.photos/512/512", 1);
    const url2 = buildImageUrl("https://picsum.photos/512/512", 2);
    expect(url1).not.toBe(url2);
  });
});