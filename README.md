# Personal Text Typer

Personal Text Typer is a visible, user-initiated Chrome extension for saving text insertion settings and inserting saved text into a user-focused editable field.

Typing behavior is user-initiated from the popup and can be stopped by the user.

## Load the Extension

1. Open Chrome and go to `chrome://extensions`.
2. Turn on Developer mode.
3. Select Load unpacked.
4. Choose this project folder.
5. Open the extension popup from the Chrome toolbar.

Chrome lets users review or change extension shortcuts at `chrome://extensions/shortcuts`.

## Use Templates

1. Open the popup.
2. Enter a template name and reusable text.
3. Click Create New to save it.
4. Use the Template dropdown to select saved text.
5. Use Rename, Update Text, or Delete to manage the selected template.
6. Click into a page text field, then click Start or use the start shortcut.

## Typing Modes

- Page text field mode inserts text into normal web page fields, textareas, and contenteditable areas.
- VDI / active tab mode sends browser key events to the active tab. Use it when a VDI web client is open in Chrome and focus is inside the remote app.
- VDI mode uses Chrome's debugger permission only while typing, then detaches when typing finishes or is stopped.
- VDI mode supports ASCII command text, including letters, numbers, punctuation, spaces, tabs, and newlines on a US-style keyboard layout.
- A Chrome extension cannot type into a native Citrix, VMware, or RDP app outside Chrome without a separate native helper.

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

## Checkpoint 4

- Adds keyboard commands for user-initiated start and stop.
- Start shortcut on Mac: `Command+Shift+Y`.
- Stop shortcut on Mac: `Command+Shift+U`.
- Start shortcut on other platforms: `Alt+Shift+Y`.
- Stop shortcut on other platforms: `Alt+Shift+U`.
- Background service worker handles shortcut commands by messaging the active tab.
- Popup buttons continue to use the same insertion messages.

## Checkpoint 5

- Adds saved templates in `chrome.storage.local`.
- Each template stores a name, text, created timestamp, and updated timestamp.
- Supports creating, selecting, renaming, updating, and deleting templates.
- Keeps the selected template saved between popup sessions.
- Limits templates to 20 and text length to the configured maximum, defaulting to 5000 characters.
- Start inserts the selected template text only.

## Checkpoint 6

- Adds a typing mode selector for page fields or VDI / active tab keystrokes.
- Adds Chrome debugger permission for user-initiated VDI typing.
- Sends VDI mode keystrokes from the background service worker with `Input.dispatchKeyEvent`.
- Validates VDI mode text before typing so unsupported characters fail without partial insertion.
- Detaches the debugger when VDI typing completes, stops, errors, or the tab closes.
