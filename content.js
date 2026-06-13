(() => {
  const TEXT_INPUT_TYPES = new Set([
    "email",
    "number",
    "search",
    "tel",
    "text",
    "url"
  ]);

  const MESSAGE_TYPES = {
    checkTarget: "CHECK_TARGET"
  };

  let lastEditableTarget = null;

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

  document.addEventListener("focusin", (event) => {
    const target = getEditableTargetFromFocus(event.target);

    if (isEditableTarget(target)) {
      lastEditableTarget = target;
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== MESSAGE_TYPES.checkTarget) {
      return false;
    }

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
  });
})();
