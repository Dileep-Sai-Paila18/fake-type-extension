const DEFAULT_OPTIONS = {
  maxTextLength: 5000
};

const STORAGE_KEYS = {
  options: "options",
  selectedTemplateId: "selectedTemplateId",
  speed: "speed",
  templates: "templates"
};

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.options]: DEFAULT_OPTIONS,
  [STORAGE_KEYS.selectedTemplateId]: "",
  [STORAGE_KEYS.speed]: "medium",
  [STORAGE_KEYS.templates]: []
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

function getMaxTextLength(options) {
  const maxTextLength = Number(options && options.maxTextLength);

  if (!Number.isInteger(maxTextLength) || maxTextLength < 1) {
    return DEFAULT_OPTIONS.maxTextLength;
  }

  return maxTextLength;
}

function getSelectedTemplate(settings) {
  const templates = Array.isArray(settings[STORAGE_KEYS.templates])
    ? settings[STORAGE_KEYS.templates]
    : [];
  const selectedTemplateId = settings[STORAGE_KEYS.selectedTemplateId];

  return templates.find((template) => {
    return template && template.id === selectedTemplateId;
  }) || null;
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
    if (getRuntimeError()) {
      return;
    }

    const template = getSelectedTemplate(settings);

    if (!template || typeof template.text !== "string" || !template.text) {
      return;
    }

    sendMessageToActiveTab({
      type: MESSAGE_TYPES.startInsertion,
      text: template.text.slice(0, getMaxTextLength(settings[STORAGE_KEYS.options])),
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
