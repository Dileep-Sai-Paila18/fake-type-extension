const STORAGE_KEYS = {
  text: "textToInsert",
  speed: "speed"
};

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.text]: "",
  [STORAGE_KEYS.speed]: "medium"
};

const MESSAGE_TYPES = {
  checkTarget: "CHECK_TARGET",
  startInsertion: "START_INSERTION",
  stopInsertion: "STOP_INSERTION"
};

const form = document.getElementById("settingsForm");
const textField = document.getElementById("textToInsert");
const speedField = document.getElementById("speed");
const checkTargetButton = document.getElementById("checkTargetButton");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
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

function sendMessageToActiveTab(message, onResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const queryError = getRuntimeError();

    if (queryError) {
      onResponse(null, queryError);
      return;
    }

    const activeTab = tabs[0];

    if (!activeTab || typeof activeTab.id !== "number") {
      onResponse(null, "No active tab found.");
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, message, (response) => {
      const messageError = getRuntimeError();

      onResponse(response, messageError);
    });
  });
}

function checkTarget() {
  sendMessageToActiveTab({ type: MESSAGE_TYPES.checkTarget }, (response, error) => {
    if (error || !response || !response.hasTarget) {
      showNoTargetStatus();
      return;
    }

    setStatus(`Target ready: ${response.targetType}`);
  });
}

function startInsertion() {
  chrome.storage.local.get(DEFAULT_SETTINGS, (settings) => {
    const error = getRuntimeError();

    if (error) {
      setStatus(`Could not load settings: ${error}`, true);
      return;
    }

    if (!settings[STORAGE_KEYS.text]) {
      setStatus("No saved text found. Enter text and click Save first.", true);
      return;
    }

    sendMessageToActiveTab(
      {
        type: MESSAGE_TYPES.startInsertion,
        text: settings[STORAGE_KEYS.text],
        speed: settings[STORAGE_KEYS.speed]
      },
      (response, messageError) => {
        if (messageError || !response) {
          showNoTargetStatus();
          return;
        }

        if (!response.ok) {
          setStatus(response.error || "Could not start insertion.", true);
          return;
        }

        setStatus("Insertion started.");
      }
    );
  });
}

function stopInsertion() {
  sendMessageToActiveTab({ type: MESSAGE_TYPES.stopInsertion }, (response, error) => {
    if (error || !response) {
      setStatus("No active insertion found on this page.");
      return;
    }

    if (!response.stopped) {
      setStatus("No insertion is running.");
      return;
    }

    setStatus("Insertion stopped.");
  });
}

document.addEventListener("DOMContentLoaded", loadSettings);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveSettings();
});

checkTargetButton.addEventListener("click", checkTarget);
startButton.addEventListener("click", startInsertion);
stopButton.addEventListener("click", stopInsertion);
