# Billboard — WebSocket Image Display

A Node.js server that sends a new random image to a Unity billboard every 10 seconds.
Unity fades out the old image and fades in the new one.

---

## How it works

```
Node.js Server                        Unity Client
      |                                     |
      |  ──── HELLO ──────────────────────> |  "I'm ready, authenticate yourself"
      |  <─── HELLO_OK ──────────────────   |  "OK, I'm connected"
      |                                     |
      |  ──── SHOW_IMAGE ─────────────────> |  "Display this image URL"
      |  <─── IMAGE_SHOWN ───────────────   |  "Done, image is on screen"
      |                                     |
      |       (10 seconds later...)         |
      |  ──── SHOW_IMAGE ─────────────────> |  "Display the next image"
      |             ...                     |
```

---

## Requirements

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 16 or higher | https://nodejs.org |
| Unity | 2018.4.36f1 | https://unity.com/releases/editor/archive |

You also need an internet connection — images are fetched live from [picsum.photos](https://picsum.photos).

---

## Running the server

Open a terminal in the `backend/` folder and run:

```bash
npm install
npm start
```

You should see:
```
[2024-01-15 14:00:00] [INFO ] Server started on ws://localhost:8080
```

Logs are also saved to:
- `logs/app.log` — everything
- `logs/error.log` — errors only

To run the tests:
```bash
npm test
```

---

## Setting up Unity (first time only)

### 1 — Enable .NET 4.x

The WebSocket library requires .NET 4.x. Without this step the scripts will not compile.

```
Edit → Project Settings → Player → Configuration
  → Scripting Runtime Version → .NET 4.x Equivalent
  → click Restart when prompted
```

### 2 — Add the scripts

Copy `ServerConnection.cs` and `Billboard.cs` into your Unity project:

```
YourUnityProject/
└── Assets/
    └── Scripts/
        ├── ServerConnection.cs
        └── Billboard.cs
```

Unity will compile them automatically when you switch back to the editor.

### 3 — Build the scene

**Create the billboard quad:**
1. Hierarchy panel → right-click → **3D Object → Quad**
2. Rename it `Billboard`
3. Set its Scale to `X: 5, Y: 5, Z: 1`

**Give it a transparent material:**
1. Project panel → right-click → **Create → Material**, name it `BillboardMat`
2. In the Inspector, set **Rendering Mode** to **Fade**
3. Drag `BillboardMat` onto the `Billboard` quad in the scene

**Attach the Billboard script:**
1. Select the `Billboard` quad in the Hierarchy
2. Inspector → **Add Component** → search `Billboard` → click it

**Create the network manager:**
1. Hierarchy → right-click → **Create Empty**, name it `Network`
2. Inspector → **Add Component** → search `ServerConnection` → click it

The `ServerConnection` script will find the `Billboard` automatically — no manual wiring needed.

---

## Running the Unity client

1. Make sure the server is running (`npm start`)
2. Press the **Play ▶** button in Unity

You should see in the Unity Console:
```
[Network] Connecting to ws://localhost:8080
[Network] Connected!
[Network] Handshake received. Replying HELLO_OK.
[Network] Loading image: https://picsum.photos/512/512?random=1
[Billboard] Image displayed.
[Network] Sent IMAGE_SHOWN for id: 1
```

A new image will appear on the billboard every 10 seconds.

---

## Supported commands

| Command | Direction | Description |
|---------|-----------|-------------|
| `HELLO` | Server → Unity | Sent on connect. Tells Unity to authenticate. |
| `HELLO_OK` | Unity → Server | Handshake reply. Server starts sending images after this. |
| `SHOW_IMAGE` | Server → Unity | Contains the URL of the image to display. |
| `IMAGE_SHOWN` | Unity → Server | Confirms the image is on screen. |

### Message shapes

```json
// Server → Unity
{ "command": "HELLO", "message": "Billboard server ready" }

// Unity → Server
{ "command": "HELLO_OK" }

// Server → Unity
{ "command": "SHOW_IMAGE", "imageId": 1, "imageUrl": "https://picsum.photos/512/512?random=1" }

// Unity → Server
{ "command": "IMAGE_SHOWN", "imageId": 1 }
```

---

## Troubleshooting

**"Could not connect" in the Unity console**
→ The server is not running. Open a terminal in `server/` and run `npm start`.

**Images are not appearing on the billboard**
→ Make sure the material's **Rendering Mode** is set to **Fade** (not Opaque).
→ Make sure `Billboard.cs` is attached to the Quad, not to the Network object.

**Scripts won't compile in Unity**
→ Check that **Scripting Runtime Version** is set to **.NET 4.x Equivalent** (see Setup step 1).

**Running on a different machine / device**
→ In the `ServerConnection` component in the Inspector, change `serverUrl` from
`ws://localhost:8080` to `ws://YOUR_MACHINE_IP:8080`.

---

## Project structure

```
server/
├── src/
│   ├── index.js               Entry point — starts the server
│   ├── config/index.js        Port, interval, image URL settings
│   ├── logger/index.js        Logs to terminal + logs/ folder
│   ├── utils/socket.js        sendJson, parseMessage, buildImageUrl helpers
│   └── handlers/
│       ├── messageHandler.js  Handles messages from Unity
│       └── imageLoop.js       Repeating timer that sends images
├── tests/
│   ├── utils.test.js          Tests for helper functions
│   ├── messageHandler.test.js Tests for message handling
│   └── integration.test.js    Full end-to-end server tests
├── logs/                      Created automatically on first run
│   ├── app.log
│   └── error.log
└── package.json

unity/Assets/Scripts/
├── ServerConnection.cs        WebSocket connection + command handling
└── Billboard.cs               Image download + fade animation
```
