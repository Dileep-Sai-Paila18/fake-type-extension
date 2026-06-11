# Personal Text Typer

Personal Text Typer is a visible, user-initiated Chrome extension for saving text insertion settings. This checkpoint provides the Manifest V3 scaffold and a popup that stores text and speed preferences locally.

No typing behavior is implemented yet.

## Load the Extension

1. Open Chrome and go to `chrome://extensions`.
2. Turn on Developer mode.
3. Select Load unpacked.
4. Choose this project folder.
5. Open the extension popup from the Chrome toolbar.

## Safety Notes

This extension is intended as a personal productivity helper. It does not hide its activity, make network calls, collect page data, or bypass workplace auditing, monitoring, bot detection, CAPTCHAs, or other controls.

## Checkpoint 1

- Manifest V3 extension scaffold.
- Popup action with text and speed settings.
- Settings saved to `chrome.storage.local`.
- Placeholder background service worker.
- Placeholder content script loaded on normal `http` and `https` pages.
