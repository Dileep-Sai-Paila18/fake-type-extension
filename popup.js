const TEMPLATE_LIMIT = 20;
const DEFAULT_OPTIONS = {
  maxTextLength: 5000
};

const STORAGE_KEYS = {
  legacyText: "textToInsert",
  options: "options",
  selectedTemplateId: "selectedTemplateId",
  speed: "speed",
  templates: "templates"
};

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.legacyText]: "",
  [STORAGE_KEYS.options]: DEFAULT_OPTIONS,
  [STORAGE_KEYS.selectedTemplateId]: "",
  [STORAGE_KEYS.speed]: "medium",
  [STORAGE_KEYS.templates]: []
};

const MESSAGE_TYPES = {
  checkTarget: "CHECK_TARGET",
  startInsertion: "START_INSERTION",
  stopInsertion: "STOP_INSERTION"
};

const form = document.getElementById("settingsForm");
const templateSelect = document.getElementById("templateSelect");
const templateNameField = document.getElementById("templateName");
const templateTextField = document.getElementById("templateText");
const templateMeta = document.getElementById("templateMeta");
const speedField = document.getElementById("speed");
const createTemplateButton = document.getElementById("createTemplateButton");
const renameTemplateButton = document.getElementById("renameTemplateButton");
const updateTemplateButton = document.getElementById("updateTemplateButton");
const deleteTemplateButton = document.getElementById("deleteTemplateButton");
const checkTargetButton = document.getElementById("checkTargetButton");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const statusField = document.getElementById("status");

let templates = [];
let selectedTemplateId = "";
let options = { ...DEFAULT_OPTIONS };

function setStatus(message, isError = false) {
  statusField.textContent = message;
  statusField.classList.toggle("status--error", isError);
}

function getRuntimeError() {
  return chrome.runtime.lastError ? chrome.runtime.lastError.message : "";
}

function normalizeOptions(rawOptions) {
  const maxTextLength = Number(rawOptions && rawOptions.maxTextLength);

  if (!Number.isInteger(maxTextLength) || maxTextLength < 1) {
    return { ...DEFAULT_OPTIONS };
  }

  return { maxTextLength };
}

function getMaxTextLength() {
  return options.maxTextLength;
}

function limitTemplateText(text) {
  return String(text || "").slice(0, getMaxTextLength());
}

function createTimestamp() {
  return new Date().toISOString();
}

function createTemplateId() {
  const baseId = `template-${Date.now()}`;
  let candidateId = baseId;
  let suffix = 2;

  while (templates.some((template) => template.id === candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

function normalizeTemplates(rawTemplates) {
  if (!Array.isArray(rawTemplates)) {
    return [];
  }

  const seenIds = new Set();

  return rawTemplates.slice(0, TEMPLATE_LIMIT).map((rawTemplate, index) => {
    const template = rawTemplate && typeof rawTemplate === "object" ? rawTemplate : {};
    const timestamp = createTimestamp();
    let id = typeof template.id === "string" && template.id
      ? template.id
      : `template-${Date.now()}-${index + 1}`;

    while (seenIds.has(id)) {
      id = `${id}-${index + 1}`;
    }

    seenIds.add(id);

    return {
      id,
      name: typeof template.name === "string" && template.name.trim()
        ? template.name.trim()
        : `Template ${index + 1}`,
      text: limitTemplateText(template.text),
      createdAt: typeof template.createdAt === "string" ? template.createdAt : timestamp,
      updatedAt: typeof template.updatedAt === "string" ? template.updatedAt : timestamp
    };
  });
}

function getSelectedTemplate() {
  return templates.find((template) => template.id === selectedTemplateId) || null;
}

function getSelectedTemplateIndex() {
  return templates.findIndex((template) => template.id === selectedTemplateId);
}

function getTemplateMetaText(template, textLengthOverride) {
  const textLength = Number.isInteger(textLengthOverride)
    ? textLengthOverride
    : template
      ? template.text.length
      : templateTextField.value.length;
  const parts = [
    `${templates.length}/${TEMPLATE_LIMIT} templates`,
    `${textLength}/${getMaxTextLength()} characters`
  ];

  if (template && template.updatedAt) {
    parts.push(`updated ${new Date(template.updatedAt).toLocaleString()}`);
  }

  return parts.join(" · ");
}

function setTemplateButtonsEnabled(hasSelectedTemplate) {
  renameTemplateButton.disabled = !hasSelectedTemplate;
  updateTemplateButton.disabled = !hasSelectedTemplate;
  deleteTemplateButton.disabled = !hasSelectedTemplate;
  createTemplateButton.disabled = templates.length >= TEMPLATE_LIMIT;
}

function renderTemplates() {
  const selectedTemplate = getSelectedTemplate();

  templateSelect.textContent = "";
  templateTextField.maxLength = String(getMaxTextLength());

  if (templates.length === 0) {
    const option = new Option("No templates yet", "");
    templateSelect.appendChild(option);
    templateSelect.disabled = true;
    templateNameField.value = "";
    templateTextField.value = "";
    templateMeta.textContent = getTemplateMetaText(null);
    setTemplateButtonsEnabled(false);
    return;
  }

  templates.forEach((template) => {
    templateSelect.appendChild(new Option(template.name, template.id));
  });

  templateSelect.disabled = false;

  if (!selectedTemplate) {
    selectedTemplateId = templates[0].id;
  }

  const nextSelectedTemplate = getSelectedTemplate();
  templateSelect.value = selectedTemplateId;
  templateNameField.value = nextSelectedTemplate.name;
  templateTextField.value = nextSelectedTemplate.text;
  templateMeta.textContent = getTemplateMetaText(nextSelectedTemplate);
  setTemplateButtonsEnabled(true);
}

function persistTemplateState(message, isError = false) {
  chrome.storage.local.set(
    {
      [STORAGE_KEYS.options]: options,
      [STORAGE_KEYS.selectedTemplateId]: selectedTemplateId,
      [STORAGE_KEYS.speed]: speedField.value,
      [STORAGE_KEYS.templates]: templates
    },
    () => {
      const error = getRuntimeError();

      if (error) {
        setStatus(`Could not save templates: ${error}`, true);
        return;
      }

      renderTemplates();
      setStatus(message, isError);
    }
  );
}

function migrateLegacyText(legacyText) {
  if (templates.length > 0 || typeof legacyText !== "string" || !legacyText) {
    return false;
  }

  const timestamp = createTimestamp();
  const template = {
    id: createTemplateId(),
    name: "Default template",
    text: limitTemplateText(legacyText),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  templates = [template];
  selectedTemplateId = template.id;

  return true;
}

function loadSettings() {
  chrome.storage.local.get(DEFAULT_SETTINGS, (settings) => {
    const error = getRuntimeError();

    if (error) {
      setStatus(`Could not load settings: ${error}`, true);
      return;
    }

    options = normalizeOptions(settings[STORAGE_KEYS.options]);
    templates = normalizeTemplates(settings[STORAGE_KEYS.templates]);
    selectedTemplateId = settings[STORAGE_KEYS.selectedTemplateId] || "";

    if (!templates.some((template) => template.id === selectedTemplateId)) {
      selectedTemplateId = templates.length > 0 ? templates[0].id : "";
    }

    const didMigrate = migrateLegacyText(settings[STORAGE_KEYS.legacyText]);

    speedField.value = settings[STORAGE_KEYS.speed];
    renderTemplates();

    if (didMigrate) {
      persistTemplateState("Imported your previous saved text as a template.");
      return;
    }

    setStatus("Templates loaded.");
  });
}

function createTemplate() {
  if (templates.length >= TEMPLATE_LIMIT) {
    setStatus(`Template limit reached. Delete one before adding another.`, true);
    return;
  }

  const timestamp = createTimestamp();
  const template = {
    id: createTemplateId(),
    name: templateNameField.value.trim() || `Template ${templates.length + 1}`,
    text: limitTemplateText(templateTextField.value),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  templates = [...templates, template];
  selectedTemplateId = template.id;
  persistTemplateState("Template created.");
}

function renameTemplate() {
  const template = getSelectedTemplate();
  const nextName = templateNameField.value.trim();

  if (!template) {
    setStatus("No template selected. Create or select a template first.", true);
    return;
  }

  if (!nextName) {
    setStatus("Template name cannot be empty.", true);
    return;
  }

  template.name = nextName;
  template.updatedAt = createTimestamp();
  persistTemplateState("Template renamed.");
}

function updateTemplateText() {
  const template = getSelectedTemplate();

  if (!template) {
    setStatus("No template selected. Create or select a template first.", true);
    return;
  }

  template.text = limitTemplateText(templateTextField.value);
  template.updatedAt = createTimestamp();
  persistTemplateState("Template text updated.");
}

function saveCurrentChanges() {
  const template = getSelectedTemplate();

  if (!template) {
    chrome.storage.local.set({ [STORAGE_KEYS.speed]: speedField.value }, () => {
      const error = getRuntimeError();

      if (error) {
        setStatus(`Could not save speed: ${error}`, true);
        return;
      }

      setStatus("Speed saved. Create a template before starting.");
    });
    return;
  }

  const nextName = templateNameField.value.trim();

  if (!nextName) {
    setStatus("Template name cannot be empty.", true);
    return;
  }

  template.name = nextName;
  template.text = limitTemplateText(templateTextField.value);
  template.updatedAt = createTimestamp();
  persistTemplateState("Template changes saved.");
}

function deleteTemplate() {
  const template = getSelectedTemplate();

  if (!template) {
    setStatus("No template selected. Create or select a template first.", true);
    return;
  }

  if (!window.confirm(`Delete template "${template.name}"?`)) {
    return;
  }

  const deletedIndex = getSelectedTemplateIndex();

  templates = templates.filter((item) => item.id !== template.id);

  if (templates.length === 0) {
    selectedTemplateId = "";
  } else {
    const nextIndex = deletedIndex >= templates.length ? templates.length - 1 : deletedIndex;
    selectedTemplateId = templates[nextIndex].id;
  }

  persistTemplateState("Template deleted.");
}

function selectTemplate() {
  selectedTemplateId = templateSelect.value;
  persistTemplateState("Template selected.");
}

function updateTemplateMeta() {
  templateMeta.textContent = getTemplateMetaText(
    getSelectedTemplate(),
    templateTextField.value.length
  );
}

function showNoTargetStatus() {
  setStatus("No editable target found. Click into a text field first.", true);
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
  const template = getSelectedTemplate();

  if (!template) {
    setStatus("No template selected. Create or select a template first.", true);
    return;
  }

  if (!template.text) {
    setStatus("Selected template is empty. Add text and click Update Text.", true);
    return;
  }

  chrome.storage.local.set({ [STORAGE_KEYS.speed]: speedField.value }, () => {
    const error = getRuntimeError();

    if (error) {
      setStatus(`Could not save speed: ${error}`, true);
      return;
    }

    sendMessageToActiveTab(
      {
        type: MESSAGE_TYPES.startInsertion,
        text: template.text,
        speed: speedField.value
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

        setStatus(`Insertion started: ${template.name}`);
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
  saveCurrentChanges();
});

templateSelect.addEventListener("change", selectTemplate);
templateTextField.addEventListener("input", updateTemplateMeta);
createTemplateButton.addEventListener("click", createTemplate);
renameTemplateButton.addEventListener("click", renameTemplate);
updateTemplateButton.addEventListener("click", updateTemplateText);
deleteTemplateButton.addEventListener("click", deleteTemplate);
checkTargetButton.addEventListener("click", checkTarget);
startButton.addEventListener("click", startInsertion);
stopButton.addEventListener("click", stopInsertion);
