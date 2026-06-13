# Personal Text Typer

Personal Text Typer is a visible, user-initiated Chrome extension for saving text insertion settings and inserting saved text into a user-focused editable field.

Typing behavior is user-initiated from the popup and can be stopped by the user.

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

## Checkpoint 2

- Tracks the last user-focused editable target in the content script.
- Supports text inputs, textareas, and contenteditable elements.
- Ignores password, hidden, disabled, readonly, and non-editable targets.
- Adds a Check Target button in the popup.
- Reports whether the last focused target is ready without typing or filling anything.

## Checkpoint 3

- Adds Start and Stop buttons in the popup.
- Starts insertion only after the user clicks Start.
- Inserts saved text into the last focused editable target one character at a time.
- Uses deterministic delays: Slow around 120ms, Medium around 60ms, Fast around 25ms.
- Dispatches input events so web apps can notice visible value changes.
- Cancels an active insertion when the user clicks Stop.
