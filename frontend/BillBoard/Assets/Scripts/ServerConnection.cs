// This script connects to the Node.js server over WebSocket.
//
// What it does:
//   1. On Start(), connects to ws://localhost:8080
//   2. Receives the HELLO command from the server
//   3. Replies with HELLO_OK to complete the handshake
//   4. When a SHOW_IMAGE command arrives, passes the URL to the Billboard
//   5. Sends IMAGE_SHOWN back so the server knows it worked

using System;
using System.Collections;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

public class ServerConnection : MonoBehaviour
{
    [Header("Server Settings")]
    // The address of your Node.js server. Change this if running on another machine.
    public string serverUrl = "ws://localhost:8080";

    [Header("Scene References")]
    // Drag your Billboard GameObject here in the Unity Inspector
    public Billboard billboard;


    private ClientWebSocket _socket;       // The actual WebSocket connection
    private bool _handshakeDone = false;   // Did we finish the HELLO / HELLO_OK step?
    private CancellationTokenSource _cts;  // Used to stop the receive loop cleanly

    // Unity is NOT thread-safe. We can't call Unity functions from a background thread.
    // So we queue up actions here and run them on the main thread in Update().
    private ConcurrentQueue<Action> _mainThreadQueue = new ConcurrentQueue<Action>();


    void Awake()
    {
        // If you forgot to drag the Billboard in the Inspector,
        // this finds it automatically by searching the scene.
        if (billboard == null)
        {
            billboard = FindObjectOfType<Billboard>();

            if (billboard == null)
                Debug.LogError("[Network] No Billboard script found in the scene! " +
                               "Make sure Billboard.cs is attached to your Quad.");
            else
                Debug.Log("[Network] Billboard found automatically.");
        }
    }

    void Start()
    {
        // Connect as soon as the scene loads
        ConnectToServer();
    }

    void Update()
    {
        // Run any queued actions on the main thread (e.g. loading a texture)
        Action action;
        while (_mainThreadQueue.TryDequeue(out action))
        {
            action();
        }
    }

    void OnDestroy()
    {
        // Clean up when the scene closes
        _cts?.Cancel();
        _socket?.Dispose();
    }

    //Connect

    async void ConnectToServer()
    {
        _cts = new CancellationTokenSource();
        _socket = new ClientWebSocket();

        try
        {
            Debug.Log("[Network] Connecting to " + serverUrl);
            await _socket.ConnectAsync(new Uri(serverUrl), _cts.Token);
            Debug.Log("[Network] Connected!");

            // Start listening for messages in the background
            _ = Task.Run(ReceiveLoop);
        }
        catch (Exception e)
        {
            Debug.LogError("[Network] Could not connect: " + e.Message);
            Debug.LogError("[Network] Make sure the server is running: cd server && npm start");
        }
    }

    //Receive loop (runs in background)
    // This loop keeps reading messages from the server forever.
    // It runs on a background thread so it doesn't freeze Unity.

    async Task ReceiveLoop()
    {
        var buffer = new byte[4096]; // 4KB is enough for a URL message

        while (_socket.State == WebSocketState.Open)
        {
            try
            {
                var result = await _socket.ReceiveAsync(new ArraySegment<byte>(buffer), _cts.Token);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    _mainThreadQueue.Enqueue(() => Debug.Log("[Network] Server closed the connection."));
                    break;
                }

                // Decode the bytes to a string
                string json = Encoding.UTF8.GetString(buffer, 0, result.Count);

                // Queue processing on the main thread (Unity requirement)
                _mainThreadQueue.Enqueue(() => HandleMessage(json));
            }
            catch (OperationCanceledException)
            {
                break; // Normal — happens when we call _cts.Cancel() on quit
            }
            catch (Exception e)
            {
                _mainThreadQueue.Enqueue(() => Debug.LogError("[Network] Receive error: " + e.Message));
                break;
            }
        }
    }

    //Handle an incoming message (runs on main thread)

    void HandleMessage(string json)
    {
        // Parse the JSON into a simple object
        ServerMessage msg;
        try
        {
            msg = JsonUtility.FromJson<ServerMessage>(json);
        }
        catch (Exception e)
        {
            Debug.LogError("[Network] Could not parse message: " + e.Message);
            return;
        }

        Debug.Log("[Network] Received command: " + msg.command);

        // React based on which command arrived
        if (msg.command == "HELLO")
        {
            // Server is saying hello — we reply to complete the handshake
            Debug.Log("[Network] Handshake received. Replying HELLO_OK.");
            _handshakeDone = true;
            SendMessage_("{\"command\":\"HELLO_OK\"}");
        }
        else if (msg.command == "SHOW_IMAGE")
        {
            // Server wants us to display a new image
            if (billboard == null)
            {
                Debug.LogError("[Network] Billboard is not assigned in the Inspector!");
                return;
            }

            Debug.Log("[Network] Loading image: " + msg.imageUrl);

            // Tell the billboard to load and display the image,
            // then call our callback when it's done
            billboard.ShowImage(msg.imageUrl, () =>
            {
                // Let the server know we successfully showed the image
                string response = "{\"command\":\"IMAGE_SHOWN\",\"imageId\":" + msg.imageId + "}";
                SendMessage_(response);
                Debug.Log("[Network] Sent IMAGE_SHOWN for id: " + msg.imageId);
            });
        }
        else
        {
            Debug.LogWarning("[Network] Unknown command: " + msg.command);
        }
    }

    //Send a message to the server
    // Named SendMessage_ with underscore to avoid clashing with Unity's built-in SendMessage()

    async void SendMessage_(string json)
    {
        if (_socket == null || _socket.State != WebSocketState.Open)
        {
            Debug.LogWarning("[Network] Cannot send — not connected.");
            return;
        }

        try
        {
            byte[] bytes = Encoding.UTF8.GetBytes(json);
            await _socket.SendAsync(new ArraySegment<byte>(bytes),
                WebSocketMessageType.Text,
                endOfMessage: true,
                cancellationToken: _cts.Token);
        }
        catch (Exception e)
        {
            Debug.LogError("[Network] Send failed: " + e.Message);
        }
    }
}

//Data class for parsing server messages
// JsonUtility.FromJson needs a class that matches the JSON shape.
// Fields must be public for the serializer to see them.
[Serializable]
public class ServerMessage
{
    public string command;   // e.g. "HELLO", "SHOW_IMAGE"
    public string message;   // Optional text (used in HELLO)
    public int imageId;      // Which image this is
    public string imageUrl;  // URL to download from picsum.photos
}