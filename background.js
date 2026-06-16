const DEFAULT_OPTIONS = {
  maxTextLength: 5000
};

const TYPING_MODES = {
  field: "field",
  tabKeystrokes: "tab-keystrokes"
};

const STORAGE_KEYS = {
  options: "options",
  selectedTemplateId: "selectedTemplateId",
  speed: "speed",
  templates: "templates",
  typingMode: "typingMode"
};

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.options]: DEFAULT_OPTIONS,
  [STORAGE_KEYS.selectedTemplateId]: "",
  [STORAGE_KEYS.speed]: "medium",
  [STORAGE_KEYS.templates]: [],
  [STORAGE_KEYS.typingMode]: TYPING_MODES.field
};

const COMMANDS = {
  startInsertion: "start-insertion",
  stopInsertion: "stop-insertion"
};

const MESSAGE_TYPES = {
  checkKeystrokeTarget: "CHECK_KEYSTROKE_TARGET",
  startInsertion: "START_INSERTION",
  startKeystrokeTyping: "START_KEYSTROKE_TYPING",
  stopInsertion: "STOP_INSERTION",
  stopKeystrokeTyping: "STOP_KEYSTROKE_TYPING"
};

const DEBUGGER_PROTOCOL_VERSION = "1.3";

const SPEED_DELAYS = {
  slow: 120,
  medium: 60,
  fast: 25
};

const SHIFT_MODIFIER = 8;

const LETTER_KEY_CODE_START = 65;

const DIGIT_KEYS = {
  "0": { code: "Digit0", keyCode: 48 },
  "1": { code: "Digit1", keyCode: 49 },
  "2": { code: "Digit2", keyCode: 50 },
  "3": { code: "Digit3", keyCode: 51 },
  "4": { code: "Digit4", keyCode: 52 },
  "5": { code: "Digit5", keyCode: 53 },
  "6": { code: "Digit6", keyCode: 54 },
  "7": { code: "Digit7", keyCode: 55 },
  "8": { code: "Digit8", keyCode: 56 },
  "9": { code: "Digit9", keyCode: 57 }
};

const SHIFTED_DIGIT_KEYS = {
  ")": "0",
  "!": "1",
  "@": "2",
  "#": "3",
  "$": "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9"
};

const PUNCTUATION_KEYS = {
  "`": { code: "Backquote", keyCode: 192 },
  "~": { code: "Backquote", keyCode: 192, shifted: true, baseCharacter: "`" },
  "-": { code: "Minus", keyCode: 189 },
  "_": { code: "Minus", keyCode: 189, shifted: true, baseCharacter: "-" },
  "=": { code: "Equal", keyCode: 187 },
  "+": { code: "Equal", keyCode: 187, shifted: true, baseCharacter: "=" },
  "[": { code: "BracketLeft", keyCode: 219 },
  "{": { code: "BracketLeft", keyCode: 219, shifted: true, baseCharacter: "[" },
  "]": { code: "BracketRight", keyCode: 221 },
  "}": { code: "BracketRight", keyCode: 221, shifted: true, baseCharacter: "]" },
  "\\": { code: "Backslash", keyCode: 220 },
  "|": { code: "Backslash", keyCode: 220, shifted: true, baseCharacter: "\\" },
  ";": { code: "Semicolon", keyCode: 186 },
  ":": { code: "Semicolon", keyCode: 186, shifted: true, baseCharacter: ";" },
  "'": { code: "Quote", keyCode: 222 },
  "\"": { code: "Quote", keyCode: 222, shifted: true, baseCharacter: "'" },
  ",": { code: "Comma", keyCode: 188 },
  "<": { code: "Comma", keyCode: 188, shifted: true, baseCharacter: "," },
  ".": { code: "Period", keyCode: 190 },
  ">": { code: "Period", keyCode: 190, shifted: true, baseCharacter: "." },
  "/": { code: "Slash", keyCode: 191 },
  "?": { code: "Slash", keyCode: 191, shifted: true, baseCharacter: "/" }
};

let keystrokeState = null;

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

function normalizeTypingMode(mode) {
  if (mode === TYPING_MODES.tabKeystrokes) {
    return TYPING_MODES.tabKeystrokes;
  }

  return TYPING_MODES.field;
}

function getDelayForSpeed(speed) {
  return SPEED_DELAYS[speed] || SPEED_DELAYS.medium;
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

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const error = getRuntimeError();

      if (error) {
        resolve({ error });
        return;
      }

      resolve({ tab: tabs[0] || null });
    });
  });
}

async function getCommandOrActiveTab(commandTab) {
  if (commandTab && typeof commandTab.id === "number") {
    return { tab: commandTab };
  }

  return getActiveTab();
}

function getKeystrokeTargetError(tab) {
  if (!tab || typeof tab.id !== "number") {
    return "No active tab found for VDI typing.";
  }

  const url = typeof tab.url === "string" ? tab.url : "";

  if (!url) {
    return "";
  }

  const blockedSchemes = [
    "about:",
    "chrome:",
    "chrome-extension:",
    "devtools:",
    "edge:"
  ];
  let protocol = "";

  try {
    protocol = new URL(url).protocol;
  } catch (_error) {
    return "";
  }

  if (blockedSchemes.includes(protocol)) {
    return "VDI mode works only on normal browser tabs.";
  }

  return "";
}

function normalizeKeystrokeText(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function createPrintableKeySpec(character, keyInfo, shifted, baseCharacter) {
  return {
    code: keyInfo.code,
    key: character,
    keyCode: keyInfo.keyCode,
    modifiers: shifted ? SHIFT_MODIFIER : 0,
    text: character,
    unmodifiedText: baseCharacter || character
  };
}

function createControlKeySpec(key, code, keyCode) {
  return {
    code,
    key,
    keyCode,
    modifiers: 0,
    text: "",
    unmodifiedText: ""
  };
}

function getKeySpecForCharacter(character) {
  if (character === "\n") {
    return createControlKeySpec("Enter", "Enter", 13);
  }

  if (character === "\t") {
    return createControlKeySpec("Tab", "Tab", 9);
  }

  if (character === " ") {
    return createPrintableKeySpec(" ", { code: "Space", keyCode: 32 }, false);
  }

  if (character >= "a" && character <= "z") {
    return createPrintableKeySpec(
      character,
      {
        code: `Key${character.toUpperCase()}`,
        keyCode: LETTER_KEY_CODE_START + character.charCodeAt(0) - 97
      },
      false
    );
  }

  if (character >= "A" && character <= "Z") {
    const lowerCharacter = character.toLowerCase();

    return createPrintableKeySpec(
      character,
      {
        code: `Key${character}`,
        keyCode: LETTER_KEY_CODE_START + lowerCharacter.charCodeAt(0) - 97
      },
      true,
      lowerCharacter
    );
  }

  if (DIGIT_KEYS[character]) {
    return createPrintableKeySpec(character, DIGIT_KEYS[character], false);
  }

  if (SHIFTED_DIGIT_KEYS[character]) {
    const digit = SHIFTED_DIGIT_KEYS[character];

    return createPrintableKeySpec(character, DIGIT_KEYS[digit], true, digit);
  }

  if (PUNCTUATION_KEYS[character]) {
    const keyInfo = PUNCTUATION_KEYS[character];

    return createPrintableKeySpec(
      character,
      keyInfo,
      Boolean(keyInfo.shifted),
      keyInfo.baseCharacter
    );
  }

  return null;
}

function describeCharacter(character) {
  if (character === "\n") {
    return "newline";
  }

  if (character === "\t") {
    return "tab";
  }

  if (character === " ") {
    return "space";
  }

  const codePoint = character.codePointAt(0).toString(16).toUpperCase();

  return `${character} (U+${codePoint.padStart(4, "0")})`;
}

function createKeySpecs(text) {
  const characters = Array.from(normalizeKeystrokeText(text));
  const keySpecs = [];

  for (let index = 0; index < characters.length; index += 1) {
    const keySpec = getKeySpecForCharacter(characters[index]);

    if (!keySpec) {
      return {
        error: `Unsupported character at position ${index + 1}: ${describeCharacter(characters[index])}. VDI mode supports ASCII command text only.`
      };
    }

    keySpecs.push(keySpec);
  }

  return { keySpecs };
}

function attachDebugger(debuggee) {
  return new Promise((resolve) => {
    chrome.debugger.attach(debuggee, DEBUGGER_PROTOCOL_VERSION, () => {
      resolve(getRuntimeError());
    });
  });
}

function detachDebugger(debuggee) {
  return new Promise((resolve) => {
    chrome.debugger.detach(debuggee, () => {
      getRuntimeError();
      resolve();
    });
  });
}

function sendDebuggerCommand(debuggee, method, params) {
  return new Promise((resolve) => {
    chrome.debugger.sendCommand(debuggee, method, params, () => {
      resolve(getRuntimeError());
    });
  });
}

function createDispatchParams(type, keySpec) {
  const params = {
    type,
    code: keySpec.code,
    key: keySpec.key,
    modifiers: keySpec.modifiers,
    windowsVirtualKeyCode: keySpec.keyCode
  };

  if (type === "keyDown" && keySpec.text) {
    params.text = keySpec.text;
    params.unmodifiedText = keySpec.unmodifiedText;
  }

  return params;
}

async function dispatchKeySpec(debuggee, keySpec) {
  const keyDownError = await sendDebuggerCommand(
    debuggee,
    "Input.dispatchKeyEvent",
    createDispatchParams("keyDown", keySpec)
  );

  if (keyDownError) {
    return keyDownError;
  }

  return sendDebuggerCommand(
    debuggee,
    "Input.dispatchKeyEvent",
    createDispatchParams("keyUp", keySpec)
  );
}

async function finishKeystrokeTyping() {
  const state = keystrokeState;

  if (!state) {
    return false;
  }

  if (state.timerId !== null) {
    clearTimeout(state.timerId);
  }

  keystrokeState = null;
  await detachDebugger(state.debuggee);

  return true;
}

function scheduleNextKeystroke(state) {
  state.timerId = setTimeout(() => {
    state.timerId = null;
    typeNextKeystroke(state);
  }, state.delay);
}

async function typeNextKeystroke(state) {
  if (keystrokeState !== state) {
    return;
  }

  if (state.index >= state.keySpecs.length) {
    await finishKeystrokeTyping();
    return;
  }

  const error = await dispatchKeySpec(state.debuggee, state.keySpecs[state.index]);

  if (keystrokeState !== state) {
    return;
  }

  if (error) {
    await finishKeystrokeTyping();
    return;
  }

  state.index += 1;

  if (state.index >= state.keySpecs.length) {
    await finishKeystrokeTyping();
    return;
  }

  scheduleNextKeystroke(state);
}

async function startKeystrokeTypingOnTab(tab, text, speed) {
  if (keystrokeState) {
    return {
      ok: false,
      error: "VDI typing is already running."
    };
  }

  if (typeof text !== "string" || text.length === 0) {
    return {
      ok: false,
      error: "No template text found. Select a template with text first."
    };
  }

  const targetError = getKeystrokeTargetError(tab);

  if (targetError) {
    return { ok: false, error: targetError };
  }

  const keySpecResult = createKeySpecs(text);

  if (keySpecResult.error) {
    return { ok: false, error: keySpecResult.error };
  }

  const debuggee = { tabId: tab.id };
  const attachError = await attachDebugger(debuggee);

  if (attachError) {
    return {
      ok: false,
      error: `Debugger attach failed: ${attachError}`
    };
  }

  keystrokeState = {
    debuggee,
    delay: getDelayForSpeed(speed),
    index: 0,
    keySpecs: keySpecResult.keySpecs,
    tabId: tab.id,
    timerId: null
  };

  typeNextKeystroke(keystrokeState);

  return { ok: true };
}

async function checkKeystrokeTarget() {
  const tabResult = await getActiveTab();

  if (tabResult.error) {
    return { ready: false, error: tabResult.error };
  }

  const targetError = getKeystrokeTargetError(tabResult.tab);

  if (targetError) {
    return { ready: false, error: targetError };
  }

  return { ready: true };
}

async function startKeystrokeTypingFromMessage(message) {
  const tabResult = await getActiveTab();

  if (tabResult.error) {
    return { ok: false, error: tabResult.error };
  }

  return startKeystrokeTypingOnTab(tabResult.tab, message.text, message.speed);
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

    const text = template.text.slice(
      0,
      getMaxTextLength(settings[STORAGE_KEYS.options])
    );

    if (normalizeTypingMode(settings[STORAGE_KEYS.typingMode]) === TYPING_MODES.tabKeystrokes) {
      getCommandOrActiveTab(commandTab).then((tabResult) => {
        if (tabResult.error) {
          return;
        }

        startKeystrokeTypingOnTab(tabResult.tab, text, settings[STORAGE_KEYS.speed]);
      });
      return;
    }

    sendMessageToActiveTab({
      type: MESSAGE_TYPES.startInsertion,
      text,
      speed: settings[STORAGE_KEYS.speed]
    }, commandTab);
  });
}

function stopInsertionFromCommand(commandTab) {
  finishKeystrokeTyping().then((stoppedKeystrokes) => {
    if (stoppedKeystrokes) {
      return;
    }

    sendMessageToActiveTab({
      type: MESSAGE_TYPES.stopInsertion
    }, commandTab);
  });
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message) {
    return false;
  }

  if (message.type === MESSAGE_TYPES.checkKeystrokeTarget) {
    checkKeystrokeTarget().then(sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.startKeystrokeTyping) {
    startKeystrokeTypingFromMessage(message).then(sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.stopKeystrokeTyping) {
    finishKeystrokeTyping().then((stopped) => {
      sendResponse({ stopped });
    });
    return true;
  }

  return false;
});

chrome.debugger.onDetach.addListener((source) => {
  if (!keystrokeState || source.tabId !== keystrokeState.tabId) {
    return;
  }

  if (keystrokeState.timerId !== null) {
    clearTimeout(keystrokeState.timerId);
  }

  keystrokeState = null;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (!keystrokeState || keystrokeState.tabId !== tabId) {
    return;
  }

  finishKeystrokeTyping();
});
