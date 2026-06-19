# Personal Text Typer

Personal Text Typer is a visible, user-initiated Chrome extension for saving text insertion settings and inserting saved text into a user-focused editable field.

Typing behavior is user-initiated from the popup and can be stopped by the user.

## Quick Start for Office Users

1. Clone the repo that your team uses:

   ```sh
   git clone <repo-url>
   cd <repo-folder>
   ```

   The folder may be named `Chaapo` or `fake-type-extension`, or  depending on which repo you cloned.

2. No install command is needed. This extension uses plain HTML, CSS, and JavaScript only.
3. Open Chrome and go to `chrome://extensions`.
4. Turn on **Developer mode**.
5. Select Load unpacked.
6. Choose the cloned project folder.
7. Pin or open Personal Text Typer from the Chrome toolbar.

After pulling new changes, return to `chrome://extensions` and click Reload on this extension.

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

## VDI Mode Workflow

Use VDI / active tab mode when the remote desktop is running inside a Chrome tab.

1. Open the VDI web client in Chrome and sign in to the remote machine.
2. Open Personal Text Typer from the Chrome toolbar.
3. Create or select a template with the text or command you want to type.
4. Set Mode to VDI / active tab.
5. Set Speed to Slow for long commands, punctuation-heavy text, or anything important.
6. Click inside the remote app first, such as VDI Notepad, Command Prompt, terminal, or a browser field.
7. Click Check Target.
   - In VDI mode, a ready status means the active Chrome tab can receive browser key events.
   - A red status means the current tab is not usable for VDI typing.
   - Check Target cannot prove that the remote Notepad or terminal has focus, so always click inside the remote app before starting.
8. Start typing with the keyboard shortcut after focus is inside VDI:
   - Mac: `Command` + `Shift` + `Y`
   - Windows/Linux: `Alt` + `Shift` + `Y`
9. Stop typing at any time:
   - Mac: `Command` + `Shift` + `U`
   - Windows/Linux: `Alt` + `Shift` + `U`

Chrome may show a debugging banner while VDI typing is active. That is expected for VDI mode because the extension temporarily attaches to the active tab to send key events. The extension detaches when typing completes or stops.

For important commands, test the template in VDI Notepad first, compare the output, then run it in the actual target.

## Typing Modes

- Page text field mode inserts text into normal web page fields, textareas, and contenteditable areas.
- VDI / active tab mode sends browser key events to the active tab. Use it when a VDI web client is open in Chrome and focus is inside the remote app.
- VDI mode uses Chrome's debugger permission only while typing, then detaches when typing finishes or is stopped.
- VDI mode supports ASCII command text, including letters, numbers, punctuation, spaces, tabs, and newlines on a US-style keyboard layout.
- VDI mode treats speed more conservatively than page text field mode. Use Slow for long commands with punctuation, and start after focus is already inside the remote app.
- A Chrome extension cannot type into a native Citrix, VMware, or RDP app outside Chrome without a separate native helper.

## Check Target Behavior

- Page text field mode checks for the last focused `input`, `textarea`, or `contenteditable` field on the current page.
- VDI / active tab mode checks whether the active Chrome tab can receive browser key events.
- A ready status means the selected mode has a usable target.
- A red status means the extension could not find a usable target for the selected mode.

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

## Checkpoint 7

- Retunes VDI mode with slower speed delays for remote-session reliability.
- Adds a startup delay before the first VDI key to avoid missing the first character.
- Adds a short key-hold delay between each VDI `keyDown` and `keyUp`.
- Adds extra VDI pauses after punctuation, shifted characters, tabs, and newlines.
