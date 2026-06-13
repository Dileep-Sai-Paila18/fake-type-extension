(() => {
  const TEXT_INPUT_TYPES = new Set([
    "email",
    "search",
    "tel",
    "text",
    "url"
  ]);

  const MESSAGE_TYPES = {
    checkTarget: "CHECK_TARGET",
    startInsertion: "START_INSERTION",
    stopInsertion: "STOP_INSERTION"
  };

  const SPEED_DELAYS = {
    slow: 120,
    medium: 60,
    fast: 25
  };

  let lastEditableTarget = null;
  let lastContentEditableRange = null;
  let insertionState = null;
  let insertionTimerId = null;

  function isVisibleElement(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    if (element.hidden) {
      return false;
    }

    const style = window.getComputedStyle(element);

    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false;
    }

    return Array.from(element.getClientRects()).some((rect) => {
      return rect.width > 0 && rect.height > 0;
    });
  }

  function hasRestrictedState(element) {
    return (
      element.getAttribute("aria-disabled") === "true" ||
      element.getAttribute("aria-readonly") === "true"
    );
  }

  function isEditableInput(element) {
    if (!(element instanceof HTMLInputElement)) {
      return false;
    }

    if (!TEXT_INPUT_TYPES.has(element.type)) {
      return false;
    }

    return !element.disabled && !element.readOnly && !hasRestrictedState(element);
  }

  function isEditableTextArea(element) {
    if (!(element instanceof HTMLTextAreaElement)) {
      return false;
    }

    return !element.disabled && !element.readOnly && !hasRestrictedState(element);
  }

  function isEditableTarget(element) {
    if (!(element instanceof HTMLElement) || !isVisibleElement(element)) {
      return false;
    }

    if (isEditableInput(element) || isEditableTextArea(element)) {
      return true;
    }

    return element.isContentEditable && !hasRestrictedState(element);
  }

  function getTargetDescription(element) {
    if (element instanceof HTMLTextAreaElement) {
      return "textarea";
    }

    if (element instanceof HTMLInputElement) {
      return "input";
    }

    if (element instanceof HTMLElement && element.isContentEditable) {
      return "contenteditable";
    }

    return "";
  }

  function getEditableTargetFromFocus(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }

    if (isEditableInput(element) || isEditableTextArea(element)) {
      return element;
    }

    const contentEditableTarget = element.closest("[contenteditable]");

    if (
      contentEditableTarget instanceof HTMLElement &&
      contentEditableTarget.isContentEditable
    ) {
      return contentEditableTarget;
    }

    return null;
  }

  function isRangeInsideElement(range, element) {
    return (
      element.contains(range.startContainer) &&
      element.contains(range.endContainer)
    );
  }

  function rememberContentEditableSelection() {
    if (
      !(lastEditableTarget instanceof HTMLElement) ||
      !lastEditableTarget.isContentEditable
    ) {
      return;
    }

    const selection = document.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (
      isEditableTarget(lastEditableTarget) &&
      isRangeInsideElement(range, lastEditableTarget)
    ) {
      lastContentEditableRange = range.cloneRange();
    }
  }

  function getDelayForSpeed(speed) {
    return SPEED_DELAYS[speed] || SPEED_DELAYS.medium;
  }

  function dispatchInputEvent(element, character) {
    let event;

    try {
      event = new InputEvent("input", {
        bubbles: true,
        data: character,
        inputType: "insertText"
      });
    } catch (_error) {
      event = new Event("input", { bubbles: true });
    }

    element.dispatchEvent(event);
  }

  function getTextControlSelection(element) {
    const fallbackPosition = element.value.length;

    try {
      const start = Number.isInteger(element.selectionStart)
        ? element.selectionStart
        : fallbackPosition;
      const end = Number.isInteger(element.selectionEnd)
        ? element.selectionEnd
        : fallbackPosition;

      return { start, end };
    } catch (_error) {
      return {
        start: fallbackPosition,
        end: fallbackPosition
      };
    }
  }

  function setTextControlSelection(element, position) {
    try {
      element.selectionStart = position;
      element.selectionEnd = position;
    } catch (_error) {
      // Some text-like input types do not expose selection APIs.
    }
  }

  function setTextControlValue(element, value) {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const valueDescriptor = Object.getOwnPropertyDescriptor(prototype, "value");

    // Use the native setter so apps listening for input can observe the change.
    if (valueDescriptor && valueDescriptor.set) {
      valueDescriptor.set.call(element, value);
      return;
    }

    element.value = value;
  }

  function insertIntoTextControl(element, character) {
    const selection = getTextControlSelection(element);
    const nextValue =
      element.value.slice(0, selection.start) +
      character +
      element.value.slice(selection.end);
    const nextPosition = selection.start + character.length;

    setTextControlValue(element, nextValue);
    setTextControlSelection(element, nextPosition);
    dispatchInputEvent(element, character);

    return true;
  }

  function getContentEditableRange(element) {
    if (
      lastContentEditableRange &&
      isRangeInsideElement(lastContentEditableRange, element)
    ) {
      return lastContentEditableRange.cloneRange();
    }

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);

    return range;
  }

  function insertIntoContentEditable(element, character) {
    const selection = document.getSelection();
    const range = getContentEditableRange(element);
    const textNode = document.createTextNode(character);

    range.deleteContents();
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);

    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    lastContentEditableRange = range.cloneRange();
    dispatchInputEvent(element, character);

    return true;
  }

  function insertCharacter(target, character) {
    if (isEditableInput(target) || isEditableTextArea(target)) {
      return insertIntoTextControl(target, character);
    }

    if (target instanceof HTMLElement && target.isContentEditable) {
      return insertIntoContentEditable(target, character);
    }

    return false;
  }

  function clearInsertionState() {
    if (insertionTimerId !== null) {
      window.clearTimeout(insertionTimerId);
    }

    insertionTimerId = null;
    insertionState = null;
  }

  function insertNextCharacter() {
    if (!insertionState) {
      return;
    }

    const { characters, delay, target } = insertionState;

    if (!isEditableTarget(target)) {
      clearInsertionState();
      return;
    }

    const character = characters[insertionState.index];

    if (!insertCharacter(target, character)) {
      clearInsertionState();
      return;
    }

    insertionState.index += 1;

    if (insertionState.index >= characters.length) {
      clearInsertionState();
      return;
    }

    insertionTimerId = window.setTimeout(insertNextCharacter, delay);
  }

  function startInsertion(text, speed) {
    if (typeof text !== "string" || text.length === 0) {
      return {
        ok: false,
        error: "No template text found. Select a template with text first."
      };
    }

    if (!isEditableTarget(lastEditableTarget)) {
      lastEditableTarget = null;
      return {
        ok: false,
        error: "No editable target found. Click into a text field first."
      };
    }

    clearInsertionState();

    insertionState = {
      characters: Array.from(text),
      delay: getDelayForSpeed(speed),
      index: 0,
      target: lastEditableTarget
    };

    insertNextCharacter();

    return { ok: true };
  }

  function stopInsertion() {
    const wasRunning = Boolean(insertionState || insertionTimerId !== null);

    clearInsertionState();

    return wasRunning;
  }

  document.addEventListener("focusin", (event) => {
    const target = getEditableTargetFromFocus(event.target);

    if (isEditableTarget(target)) {
      lastEditableTarget = target;
      lastContentEditableRange = null;

      if (target.isContentEditable) {
        rememberContentEditableSelection();
      }
    }
  });

  document.addEventListener("selectionchange", rememberContentEditableSelection);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) {
      return false;
    }

    if (message.type === MESSAGE_TYPES.checkTarget) {
      if (!isEditableTarget(lastEditableTarget)) {
        lastEditableTarget = null;
        sendResponse({ hasTarget: false });
        return false;
      }

      sendResponse({
        hasTarget: true,
        targetType: getTargetDescription(lastEditableTarget)
      });

      return false;
    }

    if (message.type === MESSAGE_TYPES.startInsertion) {
      sendResponse(startInsertion(message.text, message.speed));
      return false;
    }

    if (message.type === MESSAGE_TYPES.stopInsertion) {
      sendResponse({ stopped: stopInsertion() });
      return false;
    }

    return false;
  });
})();
