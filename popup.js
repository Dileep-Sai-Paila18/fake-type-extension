const STORAGE_KEYS = {
  text: "textToInsert",
  speed: "speed"
};

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.text]: "",
  [STORAGE_KEYS.speed]: "medium"
};

const MESSAGE_TYPES = {
  checkTarget: "CHECK_TARGET"
};

const form = document.getElementById("settingsForm");
const textField = document.getElementById("textToInsert");
const speedField = document.getElementById("speed");
const checkTargetButton = document.getElementById("checkTargetButton");
const statusField = document.getElementById("status");

function setStatus(message, isError = false) {
  statusField.textContent = message;
  statusField.classList.toggle("status--error", isError);
}

function getRuntimeError() {
  return chrome.runtime.lastError ? chrome.runtime.lastError.message : "";
}

function loadSettings() {
  chrome.storage.local.get(DEFAULT_SETTINGS, (settings) => {
    const error = getRuntimeError();

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
    const error = getRuntimeError();

    if (error) {
      setStatus(`Could not save settings: ${error}`, true);
      return;
    }

    setStatus("Settings saved.");
  });
}

function showNoTargetStatus() {
  setStatus("No editable target found. Click into a text field first.");
}

function checkTarget() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const queryError = getRuntimeError();

    if (queryError) {
      setStatus(`Could not check target: ${queryError}`, true);
      return;
    }

    const activeTab = tabs[0];

    if (!activeTab || typeof activeTab.id !== "number") {
      showNoTargetStatus();
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, { type: MESSAGE_TYPES.checkTarget }, (response) => {
      const messageError = getRuntimeError();

      if (messageError || !response || !response.hasTarget) {
        showNoTargetStatus();
        return;
      }

      setStatus(`Target ready: ${response.targetType}`);
    });
  });
}

document.addEventListener("DOMContentLoaded", loadSettings);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveSettings();
});

checkTargetButton.addEventListener("click", checkTarget);
