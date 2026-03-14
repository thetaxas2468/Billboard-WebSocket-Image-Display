// This script controls the 512x512 billboard quad in the scene.
//
// What it does:
//   1. Receives an image URL from ServerConnection
//   2. Downloads the image from the internet
//   3. Fades OUT the current image
//   4. Swaps to the new image
//   5. Fades IN the new image
//   6. Calls back so ServerConnection can tell the server it worked


using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking; // For downloading images

public class Billboard : MonoBehaviour
{
    [Header("Fade Settings")]
    // How long the fade in / fade out takes (in seconds)
    public float fadeDuration = 0.5f;


    private Renderer _renderer;   // The mesh renderer on this GameObject
    private bool _isBusy = false; // True while a fade is happening (don't interrupt)

    //Unity lifecycle

    void Awake()
    {
        // Get the renderer component attached to this same GameObject
        _renderer = GetComponent<Renderer>();

        if (_renderer == null)
        {
            Debug.LogError("[Billboard] No Renderer found! Make sure this script is on a Quad.");
        }

        // Start fully transparent — we'll fade in with the first image
        SetAlpha(0f);
    }

    //Public method called by ServerConnection

    // ShowImage is called when a SHOW_IMAGE command arrives.
    // imageUrl  = the URL to download (from picsum.photos)
    // onDone    = a callback we call after the image is displayed
    public void ShowImage(string imageUrl, Action onDone)
    {
        if (_isBusy)
        {
            Debug.Log("[Billboard] Still busy fading — queuing new image.");
            // Wait until not busy, then try again
            StartCoroutine(WaitThenShow(imageUrl, onDone));
            return;
        }

        StartCoroutine(DownloadAndShow(imageUrl, onDone));
    }

    //Coroutines
    // Coroutines let us "wait" without freezing the game.
    // "yield return" pauses here and resumes next frame (or after a delay).

    // Waits until the billboard is free, then shows the image
    IEnumerator WaitThenShow(string imageUrl, Action onDone)
    {
        while (_isBusy)
            yield return null; // Wait one frame and check again

        StartCoroutine(DownloadAndShow(imageUrl, onDone));
    }

    // Downloads the image and crossfades to it
    IEnumerator DownloadAndShow(string imageUrl, Action onDone)
    {
        _isBusy = true;

        //Step 1: Download the image
        Debug.Log("[Billboard] Downloading: " + imageUrl);

        UnityWebRequest request = UnityWebRequestTexture.GetTexture(imageUrl);
        yield return request.SendWebRequest(); // Wait for download to finish

        if (request.isNetworkError || request.isHttpError)
        {
            Debug.LogError("[Billboard] Download failed: " + request.error);
            _isBusy = false;
            onDone?.Invoke(); // Still call onDone so the server gets a reply
            yield break;      // Stop this coroutine
        }

        // Get the texture from the completed request
        Texture2D newTexture = DownloadHandlerTexture.GetContent(request);
        Debug.Log("[Billboard] Download complete. Size: " + newTexture.width + "x" + newTexture.height);

        //Step 2: Fade OUT the current image
        yield return StartCoroutine(Fade(from: GetAlpha(), to: 0f));

        //Step 3: Swap to the new texture
        _renderer.material.mainTexture = newTexture;

        //Step 4: Fade IN the new image
        yield return StartCoroutine(Fade(from: 0f, to: 1f));

        Debug.Log("[Billboard] Image displayed.");
        _isBusy = false;

        // Tell the caller (ServerConnection) we're done
        onDone?.Invoke();
    }

    // Animates the material's alpha from one value to another
    IEnumerator Fade(float from, float to)
    {
        float elapsed = 0f;

        while (elapsed < fadeDuration)
        {
            elapsed += Time.deltaTime;
            float t = elapsed / fadeDuration; // Goes from 0.0 to 1.0

            // Clamp so it never goes above 1
            t = Mathf.Clamp01(t);

            // Lerp = Linear interpolation: smoothly moves from "from" to "to"
            SetAlpha(Mathf.Lerp(from, to, t));

            yield return null; // Wait one frame
        }

        // Make sure we land exactly on the target value
        SetAlpha(to);
    }

    //Helpers

    // Sets the transparency of the billboard material
    // alpha: 0.0 = invisible, 1.0 = fully visible
    void SetAlpha(float alpha)
    {
        if (_renderer == null) return;

        Color color = _renderer.material.color;
        color.a = alpha;
        _renderer.material.color = color;
    }

    // Gets the current alpha (transparency) value
    float GetAlpha()
    {
        if (_renderer == null) return 0f;
        return _renderer.material.color.a;
    }
}
