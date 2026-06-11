const STORAGE_KEYS = {
  text: "textToInsert",
  speed: "speed"
};

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.text]: "",
  [STORAGE_KEYS.speed]: "medium"
};

const form = document.getElementById("settingsForm");
const textField = document.getElementById("textToInsert");
const speedField = document.getElementById("speed");
const statusField = document.getElementById("status");

function setStatus(message, isError = false) {
  statusField.textContent = message;
  statusField.classList.toggle("status--error", isError);
}

function getStorageError() {
  return chrome.runtime.lastError ? chrome.runtime.lastError.message : "";
}

function loadSettings() {
  chrome.storage.local.get(DEFAULT_SETTINGS, (settings) => {
    const error = getStorageError();

    if (error) {
      setStatus(`Could not load settings: ${error}`, true);
      return;
    }

    textField.value = settings[STORAGE_KEYS.text];
    speedField.value = settings[STORAGE_KEYS.speed];
    setStatus("Settings loaded.");
  });
}

function saveSettings() {
  const settings = {
    [STORAGE_KEYS.text]: textField.value,
    [STORAGE_KEYS.speed]: speedField.value
  };

  chrome.storage.local.set(settings, () => {
    const error = getStorageError();

    if (error) {
      setStatus(`Could not save settings: ${error}`, true);
      return;
    }

    setStatus("Settings saved.");
  });
}

document.addEventListener("DOMContentLoaded", loadSettings);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveSettings();
});
