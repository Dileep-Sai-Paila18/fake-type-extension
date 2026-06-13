const STORAGE_KEYS = {
  text: "textToInsert",
  speed: "speed"
};

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.text]: "",
  [STORAGE_KEYS.speed]: "medium"
};

const COMMANDS = {
  startInsertion: "start-insertion",
  stopInsertion: "stop-insertion"
};

const MESSAGE_TYPES = {
  startInsertion: "START_INSERTION",
  stopInsertion: "STOP_INSERTION"
};

function getRuntimeError() {
  return chrome.runtime.lastError ? chrome.runtime.lastError.message : "";
}

function sendMessageToTab(tab, message) {
  if (!tab || typeof tab.id !== "number") {
    return false;
  }

  chrome.tabs.sendMessage(tab.id, message, () => {
    getRuntimeError();
  });

  return true;
}

function sendMessageToActiveTab(message, commandTab) {
  if (sendMessageToTab(commandTab, message)) {
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (getRuntimeError()) {
      return;
    }

    sendMessageToTab(tabs[0], message);
  });
}

function startInsertionFromCommand(commandTab) {
  chrome.storage.local.get(DEFAULT_SETTINGS, (settings) => {
    if (getRuntimeError() || !settings[STORAGE_KEYS.text]) {
      return;
    }

    sendMessageToActiveTab({
      type: MESSAGE_TYPES.startInsertion,
      text: settings[STORAGE_KEYS.text],
      speed: settings[STORAGE_KEYS.speed]
    }, commandTab);
  });
}

function stopInsertionFromCommand(commandTab) {
  sendMessageToActiveTab({
    type: MESSAGE_TYPES.stopInsertion
  }, commandTab);
}

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === COMMANDS.startInsertion) {
    startInsertionFromCommand(tab);
    return;
  }

  if (command === COMMANDS.stopInsertion) {
    stopInsertionFromCommand(tab);
  }
});
