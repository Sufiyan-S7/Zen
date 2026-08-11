const version = window.zen?.version ?? 'development';
const mode = window.zen?.mode ?? 'local-first';
const storageKey = 'zen-local-conversations-v2';
const legacyStorageKey = 'zen-local-conversation-v1';
const settingsStorageKey = 'zen-local-settings-v1';
const activityStorageKey = 'zen-local-activity-v1';
const memoryStorageKey = 'zen-local-memories-v1';
const welcomeText = 'Hello, I’m Zen. I’m running locally on your computer. What would you like to work on?';
let conversations = loadConversations();
let activeConversationId = conversations[0].id;
let settings = loadSettings();
let activityLog = loadActivityLog();
let memories = loadMemories();
let editingMemoryId = '';

document.querySelector('#version').textContent = `v${version}`;
document.querySelector('#mode').textContent = mode;

const messagesElement = document.querySelector('#messages');
const form = document.querySelector('#composer');
const input = document.querySelector('#message-input');
const sendButton = document.querySelector('#send-button');
const stopButton = document.querySelector('#stop-button');
const historyElement = document.querySelector('#conversation-history');
const titleElement = document.querySelector('#conversation-title');
const metaElement = document.querySelector('#conversation-meta');
const conversationCountElement = document.querySelector('#conversation-count');
const chatPage = document.querySelector('#home');
const settingsPage = document.querySelector('#settings-page');
const activityPage = document.querySelector('#activity-page');
const memoryPage = document.querySelector('#memory-page');
const documentsPage = document.querySelector('#documents-page');
const chatButton = document.querySelector('#chat-button');
const settingsButton = document.querySelector('#settings-button');
const activityButton = document.querySelector('#activity-button');
const memoryButton = document.querySelector('#memory-button');
const documentsButton = document.querySelector('#documents-button');
const memoryForm = document.querySelector('#memory-form');
const memoryText = document.querySelector('#memory-text');
const memoryHelp = document.querySelector('#memory-help');
const memoryList = document.querySelector('#memory-list');
const chooseDocumentsButton = document.querySelector('#choose-documents');
const documentsHelp = document.querySelector('#documents-help');
const documentList = document.querySelector('#document-list');
const documentSearchForm = document.querySelector('#document-search-form');
const documentSearchInput = document.querySelector('#document-search-input');
const documentSearchHelp = document.querySelector('#document-search-help');
const documentSearchResults = document.querySelector('#document-search-results');
const documentQaCard = document.querySelector('#document-qa-card');
const documentQaForm = document.querySelector('#document-qa-form');
const documentQuestionInput = document.querySelector('#document-question-input');
const documentQaHelp = document.querySelector('#document-qa-help');
let activeDocumentPreview = null;
let activeDocumentSearchQuery = '';
const websiteForm = document.querySelector('#website-form');
const websiteInput = document.querySelector('#website-input');
const websiteHelp = document.querySelector('#website-help');
const folderSearchForm = document.querySelector('#folder-search-form');
const folderSearchInput = document.querySelector('#folder-search-input');
const folderSearchHelp = document.querySelector('#folder-search-help');
const folderSearchResults = document.querySelector('#folder-search-results');
const chooseApprovedAppButton = document.querySelector('#choose-approved-app');
const browserWebAppForm = document.querySelector('#browser-web-app-form');
const browserWebAppName = document.querySelector('#browser-web-app-name');
const browserWebAppUrl = document.querySelector('#browser-web-app-url');
const approvedAppsHelp = document.querySelector('#approved-apps-help');
const approvedAppList = document.querySelector('#approved-app-list');
const commandBuilderForm = document.querySelector('#command-builder-form');
const commandNameInput = document.querySelector('#command-name-input');
const commandStepType = document.querySelector('#command-step-type');
const commandStepApp = document.querySelector('#command-step-app');
const commandStepUrl = document.querySelector('#command-step-url');
const addCommandStepButton = document.querySelector('#add-command-step');
const stagedCommandStepsElement = document.querySelector('#staged-command-steps');
const commandBuilderHelp = document.querySelector('#command-builder-help');
const commandListElement = document.querySelector('#command-list');
let stagedCommandSteps = [];
let approvedAppsCache = [];
const workflowBuilderForm = document.querySelector('#workflow-builder-form');
const workflowNameInput = document.querySelector('#workflow-name-input');
const workflowStepType = document.querySelector('#workflow-step-type');
const workflowStepApp = document.querySelector('#workflow-step-app');
const workflowStepUrl = document.querySelector('#workflow-step-url');
const workflowStepCommand = document.querySelector('#workflow-step-command');
const addWorkflowStepButton = document.querySelector('#add-workflow-step');
const stagedWorkflowStepsElement = document.querySelector('#staged-workflow-steps');
const workflowBuilderHelp = document.querySelector('#workflow-builder-help');
const workflowListElement = document.querySelector('#workflow-list');
let stagedWorkflowSteps = [];
let commandsCache = [];
const toolStatusList = document.querySelector('#tool-status-list');
const activityLogElement = document.querySelector('#activity-log');
const clearActivityLogButton = document.querySelector('#clear-activity-log');
const confirmationModal = document.querySelector('#action-confirmation');
const confirmationTitle = document.querySelector('#confirmation-title');
const confirmationDescription = document.querySelector('#confirmation-description');
const confirmationDestination = document.querySelector('#confirmation-destination');
const confirmationCancelButton = document.querySelector('#confirmation-cancel');
const confirmationApproveButton = document.querySelector('#confirmation-approve');
const appShellElement = document.querySelector('#app-shell');
const modelSelect = document.querySelector('#model-select');
const modelHelp = document.querySelector('#model-help');
const themeSelect = document.querySelector('#theme-select');
const accentSelect = document.querySelector('#accent-select');
const customAccentInput = document.querySelector('#custom-accent-input');
const customAccentValue = document.querySelector('#custom-accent-value');
const textSizeSelect = document.querySelector('#text-size-select');
const densitySelect = document.querySelector('#density-select');
const fontSelect = document.querySelector('#font-select');
const bubbleStyleSelect = document.querySelector('#bubble-style-select');
const resetAppearanceButton = document.querySelector('#reset-appearance');
const setAppearanceShortcutButton = document.querySelector('#set-appearance-shortcut');
const clearAppearanceShortcutButton = document.querySelector('#clear-appearance-shortcut');
const appearanceHelp = document.querySelector('#appearance-help');
const appearancePreviewName = document.querySelector('#appearance-preview-name');
const themePreviewButtons = document.querySelectorAll('[data-theme-preview]');
const clearConversationsButton = document.querySelector('#clear-conversations');
const voiceInputButton = document.querySelector('#voice-input-button');
const voiceStatusElement = document.querySelector('#voice-status');
const stopSpeakingButton = document.querySelector('#stop-speaking-button');
const voiceSelect = document.querySelector('#voice-select');
const voiceHelp = document.querySelector('#voice-help');
const voiceSpeedSelect = document.querySelector('#voice-speed-select');
const voiceSpeedHelp = document.querySelector('#voice-speed-help');
const voiceInputSelect = document.querySelector('#voice-input-select');
const refreshVoiceInputsButton = document.querySelector('#refresh-voice-inputs');
const voiceDeviceHelp = document.querySelector('#voice-device-help');
const generations = new Map();
let streamingMessageBody = null;
let voiceRecording = null;
let voiceKeyboardHeld = false;
let voiceStartPending = false;
let voiceLocked = false;
let voiceOutputReady = false;
let activeSpeechAudio = null;
let capturingAppearanceShortcut = false;
let pendingWebsiteConfirmation = null;
let confirmationReturnFocus = null;

function createConversation() {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), title: 'New conversation', createdAt: now, updatedAt: now, messages: [{ role: 'assistant', content: welcomeText, createdAt: now }] };
}

function normaliseMessage(message, fallbackTime) {
  return { role: message.role, content: message.content, createdAt: typeof message.createdAt === 'string' ? message.createdAt : fallbackTime, documentSources: Array.isArray(message.documentSources) ? message.documentSources.filter((name) => typeof name === 'string' && name).slice(0, 3) : undefined };
}

function titleFromMessages(conversationMessages) {
  const firstUserMessage = conversationMessages.find((message) => message.role === 'user');
  return firstUserMessage ? firstUserMessage.content.replace(/\s+/g, ' ').slice(0, 42) : 'New conversation';
}

function loadConversations() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(stored) && stored.length) return stored.map((conversation) => ({ ...conversation, messages: conversation.messages.map((message) => normaliseMessage(message, conversation.updatedAt)) }));
    const legacyMessages = JSON.parse(localStorage.getItem(legacyStorageKey));
    if (Array.isArray(legacyMessages) && legacyMessages.length) {
      const conversation = createConversation();
      conversation.messages = legacyMessages.map((message) => normaliseMessage(message, conversation.createdAt));
      conversation.title = titleFromMessages(conversation.messages);
      return [conversation];
    }
  } catch { }
  return [createConversation()];
}

function loadActivityLog() {
  try {
    const stored = JSON.parse(localStorage.getItem(activityStorageKey));
    return Array.isArray(stored) ? stored.filter((entry) => entry && typeof entry.id === 'string' && typeof entry.action === 'string' && typeof entry.status === 'string').slice(0, 200) : [];
  } catch { return []; }
}

function loadMemories() {
  try {
    const stored = JSON.parse(localStorage.getItem(memoryStorageKey));
    if (!Array.isArray(stored)) return [];
    return stored.filter((memory) => memory && typeof memory.id === 'string' && typeof memory.text === 'string' && memory.text.trim() && memory.text.length <= 500 && typeof memory.createdAt === 'string').map((memory) => ({ id: memory.id, text: memory.text.trim(), createdAt: memory.createdAt, updatedAt: typeof memory.updatedAt === 'string' ? memory.updatedAt : memory.createdAt }));
  } catch { return []; }
}

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(settingsStorageKey));
    const theme = stored?.theme === 'light' ? 'lavender-light' : stored?.theme === 'dark' ? 'deep-violet' : stored?.theme;
    const voiceSpeeds = Object.fromEntries(Object.entries(stored?.voiceSpeeds && typeof stored.voiceSpeeds === 'object' ? stored.voiceSpeeds : {}).filter(([, speed]) => ['0.8', '1', '1.2', '1.4'].includes(String(speed))).map(([voiceId, speed]) => [voiceId, Number(speed)]));
    if (typeof stored?.voiceOutputVoice === 'string' && ['0.8', '1', '1.2', '1.4'].includes(String(stored?.voiceSpeed)) && !voiceSpeeds[stored.voiceOutputVoice]) voiceSpeeds[stored.voiceOutputVoice] = Number(stored.voiceSpeed);
    return {
      model: typeof stored?.model === 'string' ? stored.model : '',
      theme: ['deep-violet', 'lavender-light', 'true-black'].includes(theme) ? theme : 'deep-violet',
      accent: ['lavender', 'periwinkle', 'plum', 'custom'].includes(stored?.accent) ? stored.accent : 'lavender',
      customAccent: typeof stored?.customAccent === 'string' && /^#[0-9a-f]{6}$/i.test(stored.customAccent) ? stored.customAccent : '#a78bfa',
      textSize: ['small', 'default', 'large'].includes(stored?.textSize) ? stored.textSize : 'default',
      density: ['compact', 'comfortable', 'spacious'].includes(stored?.density) ? stored.density : 'comfortable',
      font: ['modern', 'rounded', 'serif'].includes(stored?.font) ? stored.font : 'modern',
      bubbleStyle: ['rounded', 'square'].includes(stored?.bubbleStyle) ? stored.bubbleStyle : 'rounded',
      appearanceShortcut: typeof stored?.appearanceShortcut === 'string' ? stored.appearanceShortcut : '',
      voiceInputId: typeof stored?.voiceInputId === 'string' ? stored.voiceInputId : '',
      voiceOutputVoice: typeof stored?.voiceOutputVoice === 'string' ? stored.voiceOutputVoice : '',
      voiceSpeeds
    };
  } catch { return { model: '', theme: 'deep-violet', accent: 'lavender', customAccent: '#a78bfa', textSize: 'default', density: 'comfortable', font: 'modern', bubbleStyle: 'rounded', appearanceShortcut: '', voiceInputId: '', voiceOutputVoice: '', voiceSpeeds: {} }; }
}

function saveConversations() { localStorage.setItem(storageKey, JSON.stringify(conversations)); }
function saveSettings() { localStorage.setItem(settingsStorageKey, JSON.stringify(settings)); }
function saveActivityLog() { localStorage.setItem(activityStorageKey, JSON.stringify(activityLog.slice(0, 200))); }
function saveMemories() { localStorage.setItem(memoryStorageKey, JSON.stringify(memories)); }
function renderMemories() {
  memoryList.innerHTML = '';
  if (!memories.length) {
    const empty = document.createElement('p');
    empty.className = 'settings-help';
    empty.textContent = 'No memories saved yet. Zen will not retain chat details unless you add them here.';
    memoryList.append(empty);
    return;
  }
  memories.forEach((memory) => {
    const item = document.createElement('article');
    item.className = 'memory-entry';
    const meta = document.createElement('span');
    meta.textContent = `Saved ${formatConversationDate(memory.createdAt)}`;
    if (editingMemoryId === memory.id) {
      const form = document.createElement('form');
      form.className = 'memory-edit-form';
      const label = document.createElement('label');
      label.className = 'sr-only';
      label.htmlFor = `memory-edit-${memory.id}`;
      label.textContent = 'Edit memory';
      const editor = document.createElement('textarea');
      editor.id = `memory-edit-${memory.id}`;
      editor.rows = 3;
      editor.maxLength = 500;
      editor.value = memory.text;
      const actions = document.createElement('div');
      actions.className = 'memory-actions';
      const save = document.createElement('button');
      save.className = 'primary-button';
      save.type = 'submit';
      save.textContent = 'Save changes';
      const cancel = document.createElement('button');
      cancel.className = 'secondary-button';
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => { editingMemoryId = ''; renderMemories(); memoryHelp.textContent = 'Memory edit cancelled.'; });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const text = editor.value.trim();
        if (!text || text.length > 500) { memoryHelp.textContent = 'A memory must contain 1–500 characters.'; editor.focus(); return; }
        memory.text = text;
        memory.updatedAt = new Date().toISOString();
        editingMemoryId = '';
        saveMemories();
        renderMemories();
        memoryHelp.textContent = 'Memory updated locally.';
      });
      form.append(label, editor, actions);
      actions.append(save, cancel);
      item.append(form, meta);
      requestAnimationFrame(() => editor.focus());
    } else {
      const text = document.createElement('p');
      text.textContent = memory.text;
      const actions = document.createElement('div');
      actions.className = 'memory-actions';
      const edit = document.createElement('button');
      edit.className = 'secondary-button';
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => editMemory(memory.id));
      const remove = document.createElement('button');
      remove.className = 'danger-button';
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => removeMemory(memory.id));
      actions.append(edit, remove);
      item.append(text, meta, actions);
    }
    memoryList.append(item);
  });
}
function formatBytes(bytes) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MiB`; }
function renderDocuments(items) {
  documentList.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'settings-help';
    empty.textContent = 'No documents have been imported into Zen.';
    documentList.append(empty);
    return;
  }
  items.forEach((itemRecord) => {
    const item = document.createElement('article');
    item.className = 'document-entry';
    const name = document.createElement('strong');
    name.textContent = itemRecord.displayName;
    const detail = document.createElement('span');
    detail.textContent = `${itemRecord.type} · ${formatBytes(itemRecord.sourceSize)} · Imported ${formatConversationDate(itemRecord.importedAt)}`;
    const remove = document.createElement('button');
    remove.className = 'danger-button';
    remove.type = 'button';
    remove.textContent = 'Remove from Zen';
    remove.addEventListener('click', () => removeImportedDocument(itemRecord));
    item.append(name, detail, remove);
    documentList.append(item);
  });
}
async function loadDocuments() {
  try { renderDocuments(await window.zen.listDocuments()); } catch { documentsHelp.textContent = 'Zen could not load its local document list.'; }
}
async function chooseDocuments() {
  documentsHelp.textContent = '';
  try {
    const selection = await window.zen.chooseDocuments();
    if (!selection) { documentsHelp.textContent = 'No documents were selected.'; return; }
    const names = selection.documents.map((document) => `${document.displayName} (${document.type}, ${formatBytes(document.size)})`).join('\n');
    const entry = createActivity('import-documents', `${selection.documents.length} selected document${selection.documents.length === 1 ? '' : 's'}`);
    const approved = await requestActionConfirmation({ title: 'Import these documents locally?', description: 'Zen will read these selected files on this computer and save extracted text for future local search. Nothing is uploaded or sent to the chat model.', destination: names, approveLabel: 'Import locally' });
    if (!approved) { updateActivity(entry, 'cancelled'); documentsHelp.textContent = 'Import cancelled. Zen did not read the selected files.'; return; }
    confirmationApproveButton.disabled = true;
    confirmationApproveButton.textContent = 'Importing…';
    try {
      const imported = await window.zen.importDocuments(selection.token);
      updateActivity(entry, 'completed', { result: `${imported.length} imported` });
      documentsHelp.textContent = `${imported.length} document${imported.length === 1 ? '' : 's'} imported locally. Search and chat recall remain off.`;
      await loadDocuments();
    } catch (error) {
      updateActivity(entry, 'failed', { errorCode: error.code || 'IMPORT_DOCUMENTS_FAILED' });
      documentsHelp.textContent = error.message || 'Zen could not import those documents.';
    } finally { confirmationApproveButton.disabled = false; confirmationApproveButton.textContent = 'Import locally'; }
  } catch (error) {
    const entry = createActivity('import-documents', 'Invalid document selection');
    updateActivity(entry, 'rejected', { errorCode: error.code || 'INVALID_DOCUMENT_SELECTION' });
    documentsHelp.textContent = error.message || 'Zen could not validate that document selection.';
  }
}
async function searchImportedDocuments(event) {
  event.preventDefault(); documentSearchResults.hidden = true; documentSearchHelp.textContent = ''; documentQaCard.hidden = true; activeDocumentSearchQuery = '';
  try {
    const result = await window.zen.searchDocuments(documentSearchInput.value);
    documentSearchResults.innerHTML = ''; documentSearchResults.hidden = false;
    if (!result.results.length) { documentSearchHelp.textContent = `No imported documents contain “${result.query}”.`; return; }
    activeDocumentSearchQuery = result.query;
    documentQaCard.hidden = false;
    documentSearchHelp.textContent = result.capped ? 'Showing the first 50 matching documents.' : `${result.results.length} imported document${result.results.length === 1 ? '' : 's'} matched.`;
    result.results.forEach((match) => { const row = document.createElement('article'); row.className = 'document-search-result'; const title = document.createElement('strong'); title.textContent = `${match.displayName} · ${match.matchCount} match${match.matchCount === 1 ? '' : 'es'}`; const snippet = document.createElement('p'); snippet.textContent = match.snippet; const preview = document.createElement('button'); preview.className = 'secondary-button'; preview.type = 'button'; preview.textContent = 'Preview locally'; preview.addEventListener('click', () => showDocumentPreview(match, result.query)); row.append(title, snippet, preview); documentSearchResults.append(row); });
  } catch (error) { documentSearchHelp.textContent = error.message || 'Zen could not search imported documents.'; }
}
async function askAboutDocumentResults(event) {
  event.preventDefault();
  if (!activeDocumentSearchQuery || generationForConversation()) return;
  documentQaHelp.textContent = '';
  let preview;
  try {
    preview = await window.zen.prepareDocumentQuestion(activeDocumentSearchQuery, documentQuestionInput.value);
  } catch (error) {
    const entry = createActivity('document-qa', 'Invalid document question');
    updateActivity(entry, 'rejected', { errorCode: error.code || 'INVALID_DOCUMENT_QUESTION' });
    documentQaHelp.textContent = error.message || 'Zen could not prepare that document question.';
    return;
  }
  const names = preview.excerpts.map((excerpt) => excerpt.displayName);
  const entry = createActivity('document-qa', `${names.join(', ')} · ${preview.characterCount} characters`);
  try {
    const excerptText = preview.excerpts.map((excerpt) => `Document: ${excerpt.displayName}\n\n${excerpt.text}`).join('\n\n---\n\n');
    const approved = await requestActionConfirmation({
      title: 'Ask Zen about these excerpts?',
      description: `Zen will send your question and these excerpts to your local model. Nothing leaves this computer.${preview.truncated ? ' The matching text was truncated to Zen’s 3-document / 4,000-character limit.' : ''}`,
      destination: `Question:\n${preview.question}\n\nApproved excerpts (${preview.characterCount} characters):\n${excerptText}`,
      approveLabel: 'Ask Zen'
    });
    if (!approved) { updateActivity(entry, 'cancelled'); documentQaHelp.textContent = 'Question cancelled. No document text was sent to the local model.'; return; }
    const conversation = activeConversation();
    conversation.messages.push({ role: 'user', content: preview.question, documentSources: names, createdAt: new Date().toISOString() });
    updateConversationMetadata(conversation);
    saveConversations();
    showPage('chat');
    render();
    const generation = { requestId: crypto.randomUUID(), conversationId: conversation.id, content: '', createdAt: new Date().toISOString(), documentQaActivity: entry };
    generations.set(generation.requestId, generation);
    setBusy();
    renderMessages();
    window.zen.startDocumentQuestion(preview.token, generation.requestId, messagePayload(), settings.model);
    documentQuestionInput.value = '';
  } catch (error) {
    updateActivity(entry, 'failed', { errorCode: error.code || 'DOCUMENT_QA_FAILED' });
    documentQaHelp.textContent = error.message || 'Zen could not prepare that document question.';
  } finally { confirmationApproveButton.textContent = 'Open website'; }
}
async function showDocumentPreview(match, query) {
  try {
    activeDocumentPreview = await window.zen.previewDocument(match.id, query, 0);
    const existing = documentSearchResults.querySelector('.document-preview');
    existing?.remove();
    const panel = document.createElement('article'); panel.className = 'document-preview';
    const title = document.createElement('strong'); title.textContent = `Local preview · ${activeDocumentPreview.displayName}`;
    const note = document.createElement('span'); note.textContent = 'This text is stored locally in Zen. The original source file was not reopened.';
    const text = document.createElement('p'); text.textContent = activeDocumentPreview.text;
    panel.append(title, note, text); documentSearchResults.prepend(panel);
  } catch (error) { documentSearchHelp.textContent = error.message || 'Zen could not show that local preview.'; }
}
async function removeImportedDocument(document) {
  const entry = createActivity('remove-document', document.displayName);
  try {
    const approved = await requestActionConfirmation({ title: `Remove ${document.displayName} from Zen?`, description: 'Zen will delete its local stored text for this document. The original file will not be changed.', destination: `${document.displayName} (${document.type})`, approveLabel: 'Remove from Zen' });
    if (!approved) { updateActivity(entry, 'cancelled'); documentsHelp.textContent = 'Removal cancelled.'; return; }
    await window.zen.removeDocument(document.id);
    updateActivity(entry, 'completed');
    documentsHelp.textContent = `${document.displayName} was removed from Zen. The original file is unchanged.`;
    await loadDocuments();
  } catch (error) { updateActivity(entry, 'failed', { errorCode: 'REMOVE_DOCUMENT_FAILED' }); documentsHelp.textContent = error.message || 'Zen could not remove that document.'; }
  finally { confirmationApproveButton.textContent = 'Open website'; }
}
function editMemory(id) {
  if (!memories.some((entry) => entry.id === id)) return;
  editingMemoryId = id;
  renderMemories();
  memoryHelp.textContent = 'Edit the memory below, then save or cancel.';
}
function removeMemory(id) {
  const memory = memories.find((entry) => entry.id === id);
  if (!memory || !window.confirm(`Remove this local memory?\n\n${memory.text}`)) return;
  memories = memories.filter((entry) => entry.id !== id);
  saveMemories();
  renderMemories();
  memoryHelp.textContent = 'Memory removed locally.';
}
function createActivity(action, preview) {
  const entry = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), action, preview, status: 'requested', decidedAt: '', completedAt: '', result: '', errorCode: '' };
  activityLog.unshift(entry);
  activityLog = activityLog.slice(0, 200);
  saveActivityLog();
  renderActivityLog();
  return entry;
}
function updateActivity(entry, status, updates = {}) {
  entry.status = status;
  const now = new Date().toISOString();
  if (['cancelled', 'rejected'].includes(status)) entry.decidedAt = now;
  if (['completed', 'failed'].includes(status)) entry.completedAt = now;
  Object.assign(entry, updates);
  saveActivityLog();
  renderActivityLog();
}
function renderActivityLog() {
  if (!activityLogElement) return;
  activityLogElement.innerHTML = '';
  if (!activityLog.length) {
    const empty = document.createElement('p');
    empty.className = 'settings-help';
    empty.textContent = 'No safe actions have been requested yet.';
    activityLogElement.append(empty);
    return;
  }
  activityLog.forEach((entry) => {
    const row = document.createElement('article');
    row.className = `activity-entry ${entry.status}`;
    const summary = document.createElement('strong');
    summary.textContent = ({
      'open-website': 'Open website',
      'open-approved-app': 'Open app',
      'approve-app': 'Approve app',
      'approve-browser-web-app': 'Approve browser web app',
      'remove-app-approval': 'Remove app approval',
      'search-folder': 'Search folder',
      'create-custom-command': 'Save custom command',
      'run-custom-command': 'Run custom command',
      'remove-custom-command': 'Remove custom command',
      'create-workflow': 'Save workflow',
      'run-workflow': 'Run workflow',
      'remove-workflow': 'Remove workflow'
    })[entry.action] || entry.action;
    const status = document.createElement('span');
    status.textContent = entry.status;
    const destination = document.createElement('p');
    destination.textContent = entry.preview;
    const time = document.createElement('time');
    time.dateTime = entry.createdAt;
    time.textContent = formatConversationDate(entry.completedAt || entry.decidedAt || entry.createdAt);
    row.append(summary, status, destination, time);
    activityLogElement.append(row);
  });
}
function renderToolStatus(tools = []) {
  toolStatusList.innerHTML = '';
  tools.forEach((tool) => {
    const row = document.createElement('div');
    row.className = `tool-status ${tool.enabled ? 'ready' : 'waiting'}`;
    const title = document.createElement('strong');
    title.textContent = tool.label;
    const detail = document.createElement('span');
    detail.textContent = tool.enabled ? 'Confirmation required every time' : tool.reason;
    row.append(title, detail);
    toolStatusList.append(row);
  });
}
function renderApprovedApps(apps = []) {
  approvedAppList.innerHTML = '';
  if (!apps.length) {
    const empty = document.createElement('p');
    empty.className = 'settings-help';
    empty.textContent = 'No apps are approved yet.';
    approvedAppList.append(empty);
    return;
  }
  apps.forEach((app) => {
    const row = document.createElement('article');
    row.className = 'approved-app';
    const label = document.createElement('strong');
    label.textContent = app.label;
    const path = document.createElement('p');
    path.textContent = app.executable;
    const destination = app.kind === 'browser-web-app' ? document.createElement('p') : null;
    if (destination) destination.textContent = app.url;
    const actions = document.createElement('div');
    actions.className = 'approved-app-actions';
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = 'Open';
    open.addEventListener('click', () => openApprovedApp(app));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary-button';
    remove.textContent = 'Remove approval';
    remove.addEventListener('click', () => removeApprovedApp(app));
    actions.append(open, remove);
    row.append(label, path, ...(destination ? [destination] : []), actions);
    approvedAppList.append(row);
  });
}
function hexToRgb(hex) { return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)); }
function relativeLuminance(hex) {
  return hexToRgb(hex).map((value) => value / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
}
function contrastRatio(first, second) {
  const [light, dark] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (light + .05) / (dark + .05);
}
function accentTextColor(hex) { return contrastRatio(hex, '#ffffff') >= contrastRatio(hex, '#09080d') ? '#ffffff' : '#09080d'; }
function accentHoverColor(hex) {
  const target = accentTextColor(hex) === '#ffffff' ? '#ffffff' : '#09080d';
  const [red, green, blue] = hexToRgb(hex);
  const [targetRed, targetGreen, targetBlue] = hexToRgb(target);
  const mix = (value, targetValue) => Math.round(value + (targetValue - value) * .16).toString(16).padStart(2, '0');
  return `#${mix(red, targetRed)}${mix(green, targetGreen)}${mix(blue, targetBlue)}`;
}
function selectedVoiceSpeed() { return settings.voiceSpeeds[settings.voiceOutputVoice] ?? 1; }
function updateVoiceSpeedControl() {
  const speed = selectedVoiceSpeed();
  const voiceName = voiceSelect.selectedOptions[0]?.text || 'Selected voice';
  voiceSpeedSelect.value = String(speed);
  voiceSpeedHelp.textContent = `${voiceName}: ${speed === 1 ? 'Normal' : speed < 1 ? 'Slower' : 'Faster'} speed is selected for local read aloud.`;
}
function displayThemeName(theme) { return ({ 'deep-violet': 'Deep violet', 'lavender-light': 'Lavender light', 'true-black': 'True black' })[theme]; }
function applyTheme() {
  document.body.dataset.theme = settings.theme;
  document.body.dataset.accent = settings.accent;
  document.body.dataset.textSize = settings.textSize;
  document.body.dataset.density = settings.density;
  document.body.dataset.font = settings.font;
  document.body.dataset.bubbles = settings.bubbleStyle;
  if (settings.accent === 'custom') {
    document.body.style.setProperty('--accent', settings.customAccent);
    document.body.style.setProperty('--accent-ink', accentTextColor(settings.customAccent));
    document.body.style.setProperty('--accent-hover', accentHoverColor(settings.customAccent));
  } else {
    document.body.style.removeProperty('--accent');
    document.body.style.removeProperty('--accent-ink');
    document.body.style.removeProperty('--accent-hover');
  }
  themeSelect.value = settings.theme;
  accentSelect.value = settings.accent;
  customAccentInput.value = settings.customAccent;
  customAccentValue.textContent = settings.customAccent.toUpperCase();
  customAccentInput.disabled = settings.accent !== 'custom';
  textSizeSelect.value = settings.textSize;
  densitySelect.value = settings.density;
  fontSelect.value = settings.font;
  bubbleStyleSelect.value = settings.bubbleStyle;
  appearancePreviewName.textContent = displayThemeName(settings.theme);
  themePreviewButtons.forEach((button) => button.classList.toggle('active', button.dataset.themePreview === settings.theme));
  setAppearanceShortcutButton.textContent = settings.appearanceShortcut ? `Appearance shortcut: ${settings.appearanceShortcut}` : 'Set appearance shortcut';
  clearAppearanceShortcutButton.disabled = !settings.appearanceShortcut;
  updateVoiceSpeedControl();
}
function activeConversation() { return conversations.find((conversation) => conversation.id === activeConversationId); }
function formatTimestamp(value) { return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
function formatConversationDate(value) {
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString() ? formatTimestamp(value) : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}
function updateConversationMetadata(conversation = activeConversation()) {
  conversation.title = titleFromMessages(conversation.messages);
  conversation.updatedAt = new Date().toISOString();
}
function messagePayload() { return activeConversation().messages.map(({ role, content }) => ({ role, content })); }
function generationForConversation(conversationId = activeConversationId) {
  return [...generations.values()].find((item) => item.conversationId === conversationId);
}

function renderMessages() {
  const conversation = activeConversation();
  const generation = generationForConversation(conversation.id);
  messagesElement.innerHTML = '';
  streamingMessageBody = null;
  conversation.messages.forEach((message) => {
    const article = document.createElement('article');
    article.className = `message ${message.role}`;
    const label = document.createElement('p');
    label.className = 'message-label';
    label.textContent = message.role === 'assistant' ? 'ZEN' : 'YOU';
    const body = document.createElement('p');
    body.className = 'message-body';
    body.textContent = message.content;
    const timestamp = document.createElement('time');
    timestamp.className = 'message-time';
    timestamp.dateTime = message.createdAt;
    timestamp.textContent = formatTimestamp(message.createdAt);
    article.append(label, body, timestamp);
    if (message.role === 'user' && message.documentSources?.length) {
      const sources = document.createElement('p');
      sources.className = 'message-source-note';
      sources.textContent = `Asked with confirmed local excerpts: ${message.documentSources.join(', ')}`;
      article.append(sources);
    }
    if (message.role === 'assistant') {
      const readAloudButton = document.createElement('button');
      readAloudButton.className = 'read-aloud-button';
      readAloudButton.type = 'button';
      readAloudButton.textContent = 'Read aloud';
      readAloudButton.disabled = !voiceOutputReady;
      readAloudButton.addEventListener('click', () => speakText(message.content));
      article.append(readAloudButton);
    }
    messagesElement.append(article);
  });
  if (generation?.conversationId === conversation.id) {
    const article = document.createElement('article');
    article.className = 'message assistant';
    const label = document.createElement('p');
    label.className = 'message-label';
    label.textContent = 'ZEN';
    const body = document.createElement('p');
    body.className = 'message-body';
    body.textContent = generation.content || 'Thinking…';
    streamingMessageBody = body;
    article.append(label, body);
    messagesElement.append(article);
  }
  scrollMessagesToBottom();
}

function scrollMessagesToBottom() { messagesElement.scrollTop = messagesElement.scrollHeight; }

function updateStreamingMessage(generation) {
  if (generation.conversationId !== activeConversationId || !streamingMessageBody) return;
  streamingMessageBody.textContent = generation.content || 'Thinking…';
  scrollMessagesToBottom();
}

function deleteConversation(conversationId) {
  const conversation = conversations.find((item) => item.id === conversationId);
  if (generationForConversation(conversationId)) {
    window.alert('Wait for Zen to finish generating before deleting this conversation.');
    return;
  }
  if (!window.confirm(`Delete “${conversation.title}”? This only removes it from this computer.`)) return;
  conversations = conversations.filter((item) => item.id !== conversationId);
  if (!conversations.length) conversations = [createConversation()];
  if (activeConversationId === conversationId) activeConversationId = conversations[0].id;
  saveConversations();
  render();
  input.focus();
}

function renderConversationHistory() {
  const sortedConversations = [...conversations].sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt));
  historyElement.innerHTML = '';
  conversationCountElement.textContent = `${conversations.length}`;
  sortedConversations.forEach((conversation) => {
    const item = document.createElement('div');
    item.className = `conversation-item${conversation.id === activeConversationId ? ' active' : ''}`;
    item.setAttribute('role', 'listitem');
    const selectButton = document.createElement('button');
    selectButton.className = 'conversation-select';
    selectButton.type = 'button';
    selectButton.textContent = conversation.title;
    selectButton.title = conversation.title;
    selectButton.addEventListener('click', () => { activeConversationId = conversation.id; render(); input.focus(); });
    const actions = document.createElement('div');
    actions.className = 'conversation-actions';
    const date = document.createElement('span');
    date.textContent = formatConversationDate(conversation.updatedAt);
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-conversation';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', `Delete ${conversation.title}`);
    deleteButton.addEventListener('click', () => deleteConversation(conversation.id));
    actions.append(date, deleteButton);
    item.append(selectButton, actions);
    historyElement.append(item);
  });
}

function renderHeader() {
  const conversation = activeConversation();
  titleElement.textContent = conversation.title === 'New conversation' ? 'What can I help you make?' : conversation.title;
  metaElement.textContent = `Saved locally · Last updated ${formatConversationDate(conversation.updatedAt)}`;
}
function render() { renderHeader(); renderMessages(); renderConversationHistory(); setBusy(); }

function showPage(page) {
  const showingChat = page === 'chat';
  const showingSettings = page === 'settings';
  chatPage.hidden = !showingChat;
  settingsPage.hidden = !showingSettings;
  activityPage.hidden = page !== 'activity';
  memoryPage.hidden = page !== 'memory';
  documentsPage.hidden = page !== 'documents';
  chatButton.classList.toggle('active', showingChat);
  settingsButton.classList.toggle('active', showingSettings);
  activityButton.classList.toggle('active', page === 'activity');
  memoryButton.classList.toggle('active', page === 'memory');
  documentsButton.classList.toggle('active', page === 'documents');
  if (showingChat) input.focus();
}

// Keeps Tab/Shift+Tab cycling between the modal's two buttons only, since aria-modal="true"
// promises this but browsers do not enforce it automatically. Disabled buttons (e.g. Approve
// reading "Running..." mid-action) are skipped so focus never lands on an inert control.
function trapConfirmationFocus(event) {
  if (event.key !== 'Tab') return;
  const focusable = [confirmationCancelButton, confirmationApproveButton].filter((element) => element && !element.disabled);
  if (!focusable.length) return;
  event.preventDefault();
  const currentIndex = focusable.indexOf(document.activeElement);
  const nextIndex = event.shiftKey
    ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
    : (currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
  focusable[nextIndex].focus();
}
confirmationModal.addEventListener('keydown', trapConfirmationFocus);

function requestActionConfirmation({ title, description, destination, approveLabel }) {
  if (![title, description, destination, approveLabel].every((value) => typeof value === 'string' && value)) {
    throw new Error('Zen could not verify that action. Nothing was opened.');
  }
  if (pendingWebsiteConfirmation) throw new Error('Finish or cancel the current confirmation first.');
  confirmationTitle.textContent = title;
  confirmationDescription.textContent = description;
  confirmationDestination.textContent = destination;
  confirmationApproveButton.textContent = approveLabel;
  confirmationReturnFocus = document.activeElement;
  return new Promise((resolve) => {
    pendingWebsiteConfirmation = resolve;
    confirmationModal.hidden = false;
    // The dialog is a sibling of #app-shell, not a descendant, so marking the shell inert
    // while the modal is open cannot also make the modal itself inert. This is what actually
    // keeps keyboard/screen-reader focus out of the background content that aria-modal="true"
    // already claims is blocked.
    if (appShellElement) appShellElement.inert = true;
    confirmationCancelButton.focus();
  });
}

function requestWebsiteConfirmation(preview) {
  if (!preview || typeof preview.url !== 'string' || !preview.url || typeof preview.hostname !== 'string' || !preview.hostname) {
    throw new Error('Zen could not verify that website. Nothing was opened.');
  }
  return requestActionConfirmation({
    title: 'Open this website?',
    description: `Zen will open this website in your default browser. Host: ${preview.hostname}`,
    destination: preview.url,
    approveLabel: 'Open website'
  });
}

function closeWebsiteConfirmation(approved) {
  if (!pendingWebsiteConfirmation) return;
  const resolve = pendingWebsiteConfirmation;
  pendingWebsiteConfirmation = null;
  confirmationModal.hidden = true;
  if (appShellElement) appShellElement.inert = false;
  confirmationReturnFocus?.focus?.();
  confirmationReturnFocus = null;
  resolve(approved);
}

async function reviewWebsite(event) {
  event.preventDefault();
  websiteHelp.textContent = '';
  try {
    const preview = await window.zen.previewWebsite(websiteInput.value);
    const entry = createActivity('open-website', preview.url);
    const approved = await requestWebsiteConfirmation(preview);
    if (!approved) {
      updateActivity(entry, 'cancelled');
      websiteHelp.textContent = 'Cancelled. The website was not opened.';
      return;
    }
    confirmationApproveButton.disabled = true;
    confirmationApproveButton.textContent = 'Opening…';
    try {
      const result = await window.zen.openWebsite(preview.url);
      updateActivity(entry, 'completed', { result: result.url });
      websiteHelp.textContent = `Zen sent ${result.hostname} to your default browser. A 404 or sign-in page is a response from that website; Zen cannot verify that a page exists.`;
      websiteInput.value = '';
    } catch (error) {
      updateActivity(entry, 'failed', { errorCode: 'OPEN_WEBSITE_FAILED' });
      websiteHelp.textContent = error.message || 'Zen could not open that website.';
    } finally {
      confirmationApproveButton.disabled = false;
      confirmationApproveButton.textContent = 'Open website';
    }
  } catch (error) {
    const entry = createActivity('open-website', 'Invalid website request');
    updateActivity(entry, 'rejected', { errorCode: 'INVALID_WEBSITE' });
    websiteHelp.textContent = error.message || 'Zen could not validate that website.';
  }
}

async function openApprovedApp(app) {
  const destination = app.kind === 'browser-web-app' ? app.url : app.executable;
  const entry = createActivity('open-approved-app', destination);
  try {
    const approved = await requestActionConfirmation({
      title: `Open ${app.label}?`,
      description: app.kind === 'browser-web-app'
        ? 'Zen will open this fixed HTTPS address using the selected browser launcher.'
        : 'Zen will start this approved application on your computer.',
      destination,
      approveLabel: app.kind === 'browser-web-app' ? 'Open web app' : 'Open app'
    });
    if (!approved) {
      updateActivity(entry, 'cancelled');
      approvedAppsHelp.textContent = `Cancelled. ${app.label} was not opened.`;
      return;
    }
    const result = await window.zen.openApprovedApp(app.id);
    updateActivity(entry, 'completed', { result: result.destination });
    approvedAppsHelp.textContent = result.kind === 'browser-web-app'
      ? `${result.label} was sent to its approved browser launcher.`
      : `${result.label} was opened.`;
  } catch (error) {
    updateActivity(entry, 'failed', { errorCode: 'OPEN_APPROVED_APP_FAILED' });
    approvedAppsHelp.textContent = error.message || `Zen could not open ${app.label}.`;
  } finally {
    confirmationApproveButton.textContent = 'Open website';
  }
}

async function addBrowserWebApp(event) {
  event.preventDefault();
  approvedAppsHelp.textContent = '';
  try {
    const selected = await window.zen.chooseBrowserWebApp(browserWebAppName.value, browserWebAppUrl.value);
    if (!selected) {
      approvedAppsHelp.textContent = 'No browser launcher was selected.';
      return;
    }
    const entry = createActivity('approve-browser-web-app', selected.url);
    const approved = await requestActionConfirmation({
      title: `Approve ${selected.label}?`,
      description: 'Zen will save this fixed browser launcher and HTTPS address. It will still ask before every launch.',
      destination: `${selected.label} → ${selected.url}\n${selected.executable}`,
      approveLabel: 'Approve web app'
    });
    if (!approved) {
      updateActivity(entry, 'cancelled');
      approvedAppsHelp.textContent = 'Browser web-app approval cancelled.';
      return;
    }
    const app = await window.zen.approveBrowserWebApp(selected.token);
    updateActivity(entry, 'completed', { result: app.url });
    approvedAppsHelp.textContent = `${app.label} is approved locally.`;
    browserWebAppForm.reset();
    await loadApprovedApps();
  } catch (error) {
    approvedAppsHelp.textContent = error.message || 'Zen could not approve that browser web app.';
  } finally {
    confirmationApproveButton.textContent = 'Open website';
  }
}

async function addApprovedApp() {
  approvedAppsHelp.textContent = '';
  try {
    const selected = await window.zen.chooseApprovedApp();
    if (!selected) {
      approvedAppsHelp.textContent = 'No app was selected.';
      return;
    }
    const entry = createActivity('approve-app', selected.executable);
    const approved = await requestActionConfirmation({
      title: `Approve ${selected.label}?`,
      description: 'Zen will save this local approval. It will still ask before opening the app every time.',
      destination: selected.executable,
      approveLabel: 'Approve app'
    });
    if (!approved) {
      updateActivity(entry, 'cancelled');
      approvedAppsHelp.textContent = 'App approval cancelled.';
      return;
    }
    const app = await window.zen.approveApp(selected.token);
    updateActivity(entry, 'completed', { result: app.executable });
    approvedAppsHelp.textContent = `${app.label} is approved locally.`;
    await loadApprovedApps();
  } catch (error) {
    approvedAppsHelp.textContent = error.message || 'Zen could not approve that app.';
  } finally {
    confirmationApproveButton.textContent = 'Open website';
  }
}

async function removeApprovedApp(app) {
  const entry = createActivity('remove-app-approval', app.executable);
  try {
    const approved = await requestActionConfirmation({
      title: `Remove ${app.label}?`,
      description: 'Zen will remove this local app approval. Zen will no longer be able to open it.',
      destination: app.executable,
      approveLabel: 'Remove approval'
    });
    if (!approved) {
      updateActivity(entry, 'cancelled');
      approvedAppsHelp.textContent = 'Approval removal cancelled.';
      return;
    }
    await window.zen.removeApprovedApp(app.id);
    updateActivity(entry, 'completed');
    approvedAppsHelp.textContent = `${app.label} is no longer approved.`;
    await loadApprovedApps();
  } catch (error) {
    updateActivity(entry, 'failed', { errorCode: 'REMOVE_APPROVED_APP_FAILED' });
    approvedAppsHelp.textContent = error.message || 'Zen could not remove that approval.';
  } finally {
    confirmationApproveButton.textContent = 'Open website';
  }
}

async function loadApprovedApps() {
  try {
    approvedAppsCache = await window.zen.listApprovedApps();
    renderApprovedApps(approvedAppsCache);
    populateCommandStepAppOptions();
    populateWorkflowStepAppOptions();
  } catch {
    approvedAppsHelp.textContent = 'Zen could not load your approved apps.';
  }
}

function populateCommandStepAppOptions() {
  if (!commandStepApp) return;
  commandStepApp.innerHTML = '';
  if (!approvedAppsCache.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No approved apps yet';
    commandStepApp.append(option);
    return;
  }
  approvedAppsCache.forEach((app) => {
    const option = document.createElement('option');
    option.value = app.id;
    option.textContent = app.label;
    commandStepApp.append(option);
  });
}

function updateCommandStepInputVisibility() {
  const isApp = commandStepType.value === 'open-approved-app';
  commandStepApp.hidden = !isApp;
  commandStepUrl.hidden = isApp;
}

function renderStagedCommandSteps() {
  stagedCommandStepsElement.innerHTML = '';
  if (!stagedCommandSteps.length) {
    const empty = document.createElement('p');
    empty.className = 'settings-help';
    empty.textContent = 'No steps added yet. A command needs 1–5 steps.';
    stagedCommandStepsElement.append(empty);
    return;
  }
  stagedCommandSteps.forEach((step, index) => {
    const row = document.createElement('div');
    row.className = 'command-step';
    const label = document.createElement('span');
    label.textContent = `${index + 1}. ${step.type === 'open-approved-app' ? 'Open app' : 'Open website'} — ${step.label}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary-button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => { stagedCommandSteps.splice(index, 1); renderStagedCommandSteps(); });
    row.append(label, remove);
    stagedCommandStepsElement.append(row);
  });
}

function addCommandStep() {
  commandBuilderHelp.textContent = '';
  if (stagedCommandSteps.length >= 5) { commandBuilderHelp.textContent = 'A custom command supports up to 5 steps.'; return; }
  if (commandStepType.value === 'open-approved-app') {
    const app = approvedAppsCache.find((entry) => entry.id === commandStepApp.value);
    if (!app) { commandBuilderHelp.textContent = 'Approve an app in Zen first, then add it as a step.'; return; }
    stagedCommandSteps.push({ type: 'open-approved-app', appId: app.id, label: app.label });
  } else {
    const url = commandStepUrl.value.trim();
    if (!url) { commandBuilderHelp.textContent = 'Enter a website address to add this step.'; return; }
    stagedCommandSteps.push({ type: 'open-website', url, label: url });
    commandStepUrl.value = '';
  }
  renderStagedCommandSteps();
}

async function saveCustomCommand(event) {
  event.preventDefault();
  commandBuilderHelp.textContent = '';
  const name = commandNameInput.value.trim();
  if (!name) { commandBuilderHelp.textContent = 'Enter a name for this command.'; return; }
  if (!stagedCommandSteps.length) { commandBuilderHelp.textContent = 'Add at least one step before saving.'; return; }
  const rawSteps = stagedCommandSteps.map((step) => (step.type === 'open-approved-app' ? { type: step.type, appId: step.appId } : { type: step.type, url: step.url }));
  try {
    const preview = await window.zen.previewCommand(name, rawSteps);
    const entry = createActivity('create-custom-command', `${preview.name} · ${preview.steps.length} step${preview.steps.length === 1 ? '' : 's'}`);
    const approved = await requestActionConfirmation({
      title: `Save "${preview.name}"?`,
      description: 'Zen will save this named sequence. It replays only apps and websites you have already approved, and still asks before every run.',
      destination: preview.steps.map((step, index) => `${index + 1}. ${step.label} → ${step.destination}`).join('\n'),
      approveLabel: 'Save command'
    });
    if (!approved) {
      updateActivity(entry, 'cancelled');
      commandBuilderHelp.textContent = 'Command not saved.';
      return;
    }
    await window.zen.createCommand(name, rawSteps);
    updateActivity(entry, 'completed');
    commandBuilderHelp.textContent = `"${preview.name}" saved locally.`;
    commandNameInput.value = '';
    stagedCommandSteps = [];
    renderStagedCommandSteps();
    await loadCommands();
  } catch (error) {
    const entry = createActivity('create-custom-command', 'Invalid custom command');
    updateActivity(entry, 'rejected', { errorCode: error.code || 'INVALID_CUSTOM_COMMAND' });
    commandBuilderHelp.textContent = error.message || 'Zen could not save that command.';
  } finally {
    confirmationApproveButton.textContent = 'Open website';
  }
}

async function runCustomCommand(command) {
  commandBuilderHelp.textContent = '';
  try {
    const prepared = await window.zen.prepareCommandRun(command.id);
    const entry = createActivity('run-custom-command', `${prepared.name} · ${prepared.steps.length} step${prepared.steps.length === 1 ? '' : 's'}`);
    const approved = await requestActionConfirmation({
      title: `Run "${prepared.name}"?`,
      description: 'Zen will run each step below in order. It stops and tells you if a step fails.',
      destination: prepared.steps.map((step, index) => `${index + 1}. ${step.label} → ${step.destination}`).join('\n'),
      approveLabel: 'Run command'
    });
    if (!approved) {
      updateActivity(entry, 'cancelled');
      commandBuilderHelp.textContent = 'Run cancelled.';
      return;
    }
    confirmationApproveButton.disabled = true;
    confirmationApproveButton.textContent = 'Running…';
    try {
      const outcome = await window.zen.runCommand(command.id);
      const completedCount = outcome.results.filter((result) => result.status === 'completed').length;
      updateActivity(entry, outcome.completed ? 'completed' : 'failed', { result: `${completedCount}/${outcome.results.length} steps completed`, errorCode: outcome.completed ? '' : 'CUSTOM_COMMAND_STEP_FAILED' });
      commandBuilderHelp.textContent = outcome.completed
        ? `"${outcome.name}" ran all ${outcome.results.length} step${outcome.results.length === 1 ? '' : 's'}.`
        : `"${outcome.name}" stopped after ${completedCount} of ${outcome.results.length} steps. Nothing further ran.`;
    } finally {
      confirmationApproveButton.disabled = false;
      confirmationApproveButton.textContent = 'Open website';
    }
  } catch (error) {
    commandBuilderHelp.textContent = error.message || 'Zen could not run that command.';
  }
}

async function removeCustomCommand(command) {
  const entry = createActivity('remove-custom-command', command.name);
  try {
    const approved = await requestActionConfirmation({
      title: `Remove "${command.name}"?`,
      description: 'Zen will delete this saved sequence. The apps and websites it referenced stay approved on their own.',
      destination: command.name,
      approveLabel: 'Remove command'
    });
    if (!approved) {
      updateActivity(entry, 'cancelled');
      commandBuilderHelp.textContent = 'Removal cancelled.';
      return;
    }
    await window.zen.removeCommand(command.id);
    updateActivity(entry, 'completed');
    commandBuilderHelp.textContent = `"${command.name}" removed locally.`;
    await loadCommands();
  } catch (error) {
    updateActivity(entry, 'failed', { errorCode: 'REMOVE_CUSTOM_COMMAND_FAILED' });
    commandBuilderHelp.textContent = error.message || 'Zen could not remove that command.';
  } finally {
    confirmationApproveButton.textContent = 'Open website';
  }
}

function renderCommandList(commands = []) {
  commandListElement.innerHTML = '';
  if (!commands.length) {
    const empty = document.createElement('p');
    empty.className = 'settings-help';
    empty.textContent = 'No custom commands saved yet.';
    commandListElement.append(empty);
    return;
  }
  commands.forEach((command) => {
    const row = document.createElement('article');
    row.className = 'approved-app command-entry';
    const label = document.createElement('strong');
    label.textContent = command.name;
    const steps = document.createElement('ol');
    command.steps.forEach((step) => {
      const item = document.createElement('li');
      if (step.unavailable) {
        item.className = 'unavailable';
        item.textContent = `${step.type === 'open-approved-app' ? 'Open app' : 'Open website'} — unavailable (${step.reason})`;
      } else {
        item.textContent = `${step.type === 'open-approved-app' ? 'Open app' : 'Open website'} — ${step.label}`;
      }
      steps.append(item);
    });
    const actions = document.createElement('div');
    actions.className = 'approved-app-actions';
    const run = document.createElement('button');
    run.type = 'button';
    run.textContent = 'Run';
    run.disabled = command.steps.some((step) => step.unavailable);
    run.addEventListener('click', () => runCustomCommand(command));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary-button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => removeCustomCommand(command));
    actions.append(run, remove);
    row.append(label, steps, actions);
    commandListElement.append(row);
  });
}

async function loadCommands() {
  try {
    commandsCache = await window.zen.listCommands();
    renderCommandList(commandsCache);
    populateWorkflowStepCommandOptions();
  } catch { commandBuilderHelp.textContent = 'Zen could not load your custom commands.'; }
}

function populateWorkflowStepAppOptions() {
  if (!workflowStepApp) return;
  workflowStepApp.innerHTML = '';
  if (!approvedAppsCache.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No approved apps yet';
    workflowStepApp.append(option);
    return;
  }
  approvedAppsCache.forEach((app) => {
    const option = document.createElement('option');
    option.value = app.id;
    option.textContent = app.label;
    workflowStepApp.append(option);
  });
}

function populateWorkflowStepCommandOptions() {
  if (!workflowStepCommand) return;
  workflowStepCommand.innerHTML = '';
  if (!commandsCache.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No saved custom commands yet';
    workflowStepCommand.append(option);
    return;
  }
  commandsCache.forEach((command) => {
    const option = document.createElement('option');
    option.value = command.id;
    option.textContent = command.name;
    workflowStepCommand.append(option);
  });
}

function updateWorkflowStepInputVisibility() {
  const type = workflowStepType.value;
  workflowStepApp.hidden = type !== 'open-approved-app';
  workflowStepUrl.hidden = type !== 'open-website';
  workflowStepCommand.hidden = type !== 'run-custom-command';
}

// Routing options for a staged step depend on the *final* staged list -- a target must be a
// strictly later step -- so every row's select options are rebuilt whenever the list changes,
// rather than being fixed at the moment a step was added.
function routeOptionsHtml(currentIndex, selected) {
  const options = [
    `<option value="next"${selected === 'next' ? ' selected' : ''}>Continue to next step</option>`,
    `<option value="stop"${selected === 'stop' ? ' selected' : ''}>Stop the workflow</option>`
  ];
  for (let target = currentIndex + 1; target < stagedWorkflowSteps.length; target += 1) {
    const step = stagedWorkflowSteps[target];
    options.push(`<option value="${target}"${selected === target ? ' selected' : ''}>Skip to step ${target + 1}: ${step.label}</option>`);
  }
  return options.join('');
}

function renderStagedWorkflowSteps() {
  stagedWorkflowStepsElement.innerHTML = '';
  if (!stagedWorkflowSteps.length) {
    const empty = document.createElement('p');
    empty.className = 'settings-help';
    empty.textContent = 'No steps added yet. A workflow needs 1-10 steps.';
    stagedWorkflowStepsElement.append(empty);
    return;
  }
  stagedWorkflowSteps.forEach((step, index) => {
    // A routing target that pointed at a step which has since been removed is no longer
    // valid; reset it to the safe default instead of silently keeping a stale index.
    if (typeof step.onSuccess === 'number' && step.onSuccess >= stagedWorkflowSteps.length) step.onSuccess = 'next';
    if (typeof step.onFailure === 'number' && step.onFailure >= stagedWorkflowSteps.length) step.onFailure = 'stop';
    const row = document.createElement('div');
    row.className = 'workflow-step';
    const labelRow = document.createElement('div');
    labelRow.className = 'workflow-step-label';
    const label = document.createElement('span');
    const typeLabel = step.type === 'open-approved-app' ? 'Open app' : step.type === 'open-website' ? 'Open website' : 'Run custom command';
    label.textContent = `${index + 1}. ${typeLabel} - ${step.label}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary-button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => { stagedWorkflowSteps.splice(index, 1); renderStagedWorkflowSteps(); });
    labelRow.append(label, remove);
    const routing = document.createElement('div');
    routing.className = 'workflow-step-routing';
    const successLabel = document.createElement('label');
    successLabel.textContent = 'If it succeeds:';
    const successSelect = document.createElement('select');
    successSelect.innerHTML = routeOptionsHtml(index, step.onSuccess);
    successSelect.addEventListener('change', () => {
      const value = successSelect.value;
      step.onSuccess = value === 'next' || value === 'stop' ? value : Number(value);
    });
    successLabel.append(successSelect);
    const failureLabel = document.createElement('label');
    failureLabel.textContent = 'If it fails:';
    const failureSelect = document.createElement('select');
    failureSelect.innerHTML = routeOptionsHtml(index, step.onFailure);
    failureSelect.addEventListener('change', () => {
      const value = failureSelect.value;
      step.onFailure = value === 'next' || value === 'stop' ? value : Number(value);
    });
    failureLabel.append(failureSelect);
    routing.append(successLabel, failureLabel);
    row.append(labelRow, routing);
    stagedWorkflowStepsElement.append(row);
  });
}

function addWorkflowStep() {
  workflowBuilderHelp.textContent = '';
  if (stagedWorkflowSteps.length >= 10) { workflowBuilderHelp.textContent = 'A workflow supports up to 10 steps.'; return; }
  if (workflowStepType.value === 'open-approved-app') {
    const app = approvedAppsCache.find((entry) => entry.id === workflowStepApp.value);
    if (!app) { workflowBuilderHelp.textContent = 'Approve an app in Zen first, then add it as a step.'; return; }
    stagedWorkflowSteps.push({ type: 'open-approved-app', appId: app.id, label: app.label, onSuccess: 'next', onFailure: 'stop' });
  } else if (workflowStepType.value === 'open-website') {
    const url = workflowStepUrl.value.trim();
    if (!url) { workflowBuilderHelp.textContent = 'Enter a website address to add this step.'; return; }
    stagedWorkflowSteps.push({ type: 'open-website', url, label: url, onSuccess: 'next', onFailure: 'stop' });
    workflowStepUrl.value = '';
  } else {
    const command = commandsCache.find((entry) => entry.id === workflowStepCommand.value);
    if (!command) { workflowBuilderHelp.textContent = 'Save a custom command in Zen first, then add it as a step.'; return; }
    stagedWorkflowSteps.push({ type: 'run-custom-command', commandId: command.id, label: command.name, onSuccess: 'next', onFailure: 'stop' });
  }
  renderStagedWorkflowSteps();
}

function workflowStepRawPayload(step) {
  const base = { type: step.type, onSuccess: step.onSuccess, onFailure: step.onFailure };
  if (step.type === 'open-approved-app') return { ...base, appId: step.appId };
  if (step.type === 'open-website') return { ...base, url: step.url };
  return { ...base, commandId: step.commandId };
}

function routeLabel(route) {
  if (route === 'stop') return 'stop';
  if (route === 'next') return 'next step';
  return `step ${route + 1}`;
}

async function saveWorkflow(event) {
  event.preventDefault();
  workflowBuilderHelp.textContent = '';
  const name = workflowNameInput.value.trim();
  if (!name) { workflowBuilderHelp.textContent = 'Enter a name for this workflow.'; return; }
  if (!stagedWorkflowSteps.length) { workflowBuilderHelp.textContent = 'Add at least one step before saving.'; return; }
  const rawSteps = stagedWorkflowSteps.map(workflowStepRawPayload);
  try {
    const preview = await window.zen.previewWorkflow(name, rawSteps);
    const entry = createActivity('create-workflow', `${preview.name} - ${preview.steps.length} step${preview.steps.length === 1 ? '' : 's'}`);
    const approved = await requestActionConfirmation({
      title: `Save "${preview.name}"?`,
      description: 'Zen will save this named sequence with branching. It replays only apps, websites, and custom commands you have already approved, and still asks before every run.',
      destination: preview.steps.map((step, index) => `${index + 1}. ${step.label} -> ${step.destination} | on success: ${routeLabel(step.onSuccess)} | on failure: ${routeLabel(step.onFailure)}`).join('\n'),
      approveLabel: 'Save workflow'
    });
    if (!approved) {
      updateActivity(entry, 'cancelled');
      workflowBuilderHelp.textContent = 'Workflow not saved.';
      return;
    }
    await window.zen.createWorkflow(name, rawSteps);
    updateActivity(entry, 'completed');
    workflowBuilderHelp.textContent = `"${preview.name}" saved locally.`;
    workflowNameInput.value = '';
    stagedWorkflowSteps = [];
    renderStagedWorkflowSteps();
    await loadWorkflows();
  } catch (error) {
    const entry = createActivity('create-workflow', 'Invalid workflow');
    updateActivity(entry, 'rejected', { errorCode: error.code || 'INVALID_WORKFLOW' });
    workflowBuilderHelp.textContent = error.message || 'Zen could not save that workflow.';
  } finally {
    confirmationApproveButton.textContent = 'Open website';
  }
}

async function runWorkflowSequence(workflow) {
  workflowBuilderHelp.textContent = '';
  try {
    const prepared = await window.zen.prepareWorkflowRun(workflow.id);
    const entry = createActivity('run-workflow', `${prepared.name} - ${prepared.steps.length} step${prepared.steps.length === 1 ? '' : 's'}`);
    const approved = await requestActionConfirmation({
      title: `Run "${prepared.name}"?`,
      description: "Zen will run these steps in order and follow each step's success/failure routing. It reports the exact path taken.",
      destination: prepared.steps.map((step, index) => `${index + 1}. ${step.label} -> ${step.destination} | on success: ${routeLabel(step.onSuccess)} | on failure: ${routeLabel(step.onFailure)}`).join('\n'),
      approveLabel: 'Run workflow'
    });
    if (!approved) {
      updateActivity(entry, 'cancelled');
      workflowBuilderHelp.textContent = 'Run cancelled.';
      return;
    }
    confirmationApproveButton.disabled = true;
    confirmationApproveButton.textContent = 'Running...';
    try {
      const outcome = await window.zen.runWorkflow(workflow.id);
      const pathSummary = outcome.path.map((step) => `${step.index + 1}. ${step.label} - ${step.outcome}`).join(' -> ');
      const stoppedEarly = outcome.path.length < prepared.steps.length;
      const logSummary = `${outcome.path.length} of ${prepared.steps.length} steps visited${stoppedEarly ? `, stopped at step ${outcome.path[outcome.path.length - 1].index + 1}` : ''}`;
      updateActivity(entry, outcome.completed ? 'completed' : 'failed', { result: logSummary, errorCode: outcome.completed ? '' : 'WORKFLOW_STEP_FAILED' });
      workflowBuilderHelp.textContent = `"${outcome.name}" ${outcome.completed ? 'completed' : 'stopped'}. Path: ${pathSummary}.`;
    } finally {
      confirmationApproveButton.disabled = false;
      confirmationApproveButton.textContent = 'Open website';
    }
  } catch (error) {
    workflowBuilderHelp.textContent = error.message || 'Zen could not run that workflow.';
  }
}

async function removeWorkflowSequence(workflow) {
  const entry = createActivity('remove-workflow', workflow.name);
  try {
    const approved = await requestActionConfirmation({
      title: `Remove "${workflow.name}"?`,
      description: 'Zen will delete this saved workflow. The apps, websites, and custom commands it referenced stay approved on their own.',
      destination: workflow.name,
      approveLabel: 'Remove workflow'
    });
    if (!approved) {
      updateActivity(entry, 'cancelled');
      workflowBuilderHelp.textContent = 'Removal cancelled.';
      return;
    }
    await window.zen.removeWorkflow(workflow.id);
    updateActivity(entry, 'completed');
    workflowBuilderHelp.textContent = `"${workflow.name}" removed locally.`;
    await loadWorkflows();
  } catch (error) {
    updateActivity(entry, 'failed', { errorCode: 'REMOVE_WORKFLOW_FAILED' });
    workflowBuilderHelp.textContent = error.message || 'Zen could not remove that workflow.';
  } finally {
    confirmationApproveButton.textContent = 'Open website';
  }
}

function renderWorkflowList(workflows = []) {
  workflowListElement.innerHTML = '';
  if (!workflows.length) {
    const empty = document.createElement('p');
    empty.className = 'settings-help';
    empty.textContent = 'No workflows saved yet.';
    workflowListElement.append(empty);
    return;
  }
  workflows.forEach((workflow) => {
    const row = document.createElement('article');
    row.className = 'approved-app workflow-entry';
    const label = document.createElement('strong');
    label.textContent = workflow.name;
    const steps = document.createElement('ol');
    workflow.steps.forEach((step) => {
      const item = document.createElement('li');
      const typeLabel = step.type === 'open-approved-app' ? 'Open app' : step.type === 'open-website' ? 'Open website' : 'Run custom command';
      if (step.unavailable) {
        item.className = 'unavailable';
        item.textContent = `${typeLabel} - unavailable (${step.reason})`;
      } else {
        item.textContent = `${typeLabel} - ${step.label} | on success: ${routeLabel(step.onSuccess)} | on failure: ${routeLabel(step.onFailure)}`;
      }
      steps.append(item);
    });
    const actions = document.createElement('div');
    actions.className = 'approved-app-actions';
    const run = document.createElement('button');
    run.type = 'button';
    run.textContent = 'Run';
    run.disabled = workflow.steps.some((step) => step.unavailable);
    run.addEventListener('click', () => runWorkflowSequence(workflow));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary-button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => removeWorkflowSequence(workflow));
    actions.append(run, remove);
    row.append(label, steps, actions);
    workflowListElement.append(row);
  });
}

async function loadWorkflows() {
  try { renderWorkflowList(await window.zen.listWorkflows()); } catch { workflowBuilderHelp.textContent = 'Zen could not load your workflows.'; }
}

function renderFolderSearchResults(result) {
  folderSearchResults.innerHTML = '';
  if (!result.matches.length) {
    folderSearchResults.hidden = false;
    const empty = document.createElement('p');
    empty.textContent = `No file or folder names in ${result.folderPath} contain “${result.query}”.`;
    folderSearchResults.append(empty);
    return;
  }
  folderSearchResults.hidden = false;
  const summary = document.createElement('p');
  summary.textContent = result.capped
    ? `Showing the first ${result.count} matches. More results exist in this folder.`
    : `${result.count} match${result.count === 1 ? '' : 'es'} in ${result.folderPath}.`;
  folderSearchResults.append(summary);
  result.matches.forEach((match) => {
    const row = document.createElement('article');
    row.className = 'folder-search-result';
    const name = document.createElement('strong');
    name.textContent = match.name;
    const type = document.createElement('span');
    type.textContent = match.type;
    const path = document.createElement('p');
    path.textContent = match.path;
    row.append(name, type, path);
    folderSearchResults.append(row);
  });
}

async function reviewFolderSearch(event) {
  event.preventDefault();
  folderSearchHelp.textContent = '';
  folderSearchResults.hidden = true;
  try {
    const previewQuery = await window.zen.previewSearchQuery(folderSearchInput.value);
    const selected = await window.zen.chooseSearchFolder();
    if (!selected) {
      folderSearchHelp.textContent = 'No folder was selected.';
      return;
    }
    // The query is intentionally shown only in the confirmation prompt. Search
    // terms can be sensitive, so the persistent local activity record keeps
    // only the granted folder and outcome.
    const entry = createActivity('search-folder', `${selected.folderPath} · filename search`);
    const approved = await requestActionConfirmation({
      title: 'Search this folder?',
      description: 'Zen will read file and folder names in this location only. It will not open, change, or upload files.',
      destination: `Search ${selected.folderPath} for names containing “${previewQuery.query}”`,
      approveLabel: 'Search folder'
    });
    if (!approved) {
      updateActivity(entry, 'cancelled');
      folderSearchHelp.textContent = 'Search cancelled.';
      return;
    }
    confirmationApproveButton.disabled = true;
    confirmationApproveButton.textContent = 'Searching…';
    try {
      const result = await window.zen.searchFolder(selected.token, previewQuery.query);
      const resultText = result.capped
        ? `${result.count} matches (list capped at 100).`
        : `${result.count} match${result.count === 1 ? '' : 'es'}.`;
      updateActivity(entry, 'completed', { result: resultText });
      renderFolderSearchResults(result);
      folderSearchHelp.textContent = resultText;
    } catch (error) {
      updateActivity(entry, 'failed', { errorCode: 'SEARCH_FOLDER_FAILED' });
      folderSearchHelp.textContent = error.message || 'Zen could not search that folder.';
    } finally {
      confirmationApproveButton.disabled = false;
      confirmationApproveButton.textContent = 'Open website';
    }
  } catch (error) {
    if (folderSearchInput.value.trim()) {
      const entry = createActivity('search-folder', 'Invalid search request');
      updateActivity(entry, 'rejected', { errorCode: 'INVALID_SEARCH' });
    }
    folderSearchHelp.textContent = error.message || 'Zen could not start that search.';
  }
}

function isAppOpenRequest(content) {
  return /\b(open|launch|start)\b/i.test(content) && /\b(app|application|explorer|xampp|minecraft|chrome|browser)\b/i.test(content);
}

function isFileListRequest(content) {
  if (/\b(list|show|display|enumerate|find|search)\b/i.test(content) && /\b(files?|folders?|directories|contents?)\b/i.test(content)) return true;
  if (/\bwhat('s| is| are)?\s+(in|inside)\b/i.test(content) && /[A-Za-z]:\\/.test(content)) return true;
  if (/[A-Za-z]:\\[^\s]*/.test(content) && /\b(list|show|files?|folders?|contents?)\b/i.test(content)) return true;
  return false;
}

async function loadToolStatus() {
  try {
    renderToolStatus(await window.zen.getToolStatus());
  } catch {
    toolStatusList.textContent = 'Zen could not load the local tool registry.';
  }
}

function updateModelStatus() {
  document.querySelector('#model-status').textContent = `${settings.model || 'No model selected'} · local`;
}

async function loadModels() {
  try {
    const models = await window.zen.getModels();
    if (!models.length) throw new Error('No local models are installed.');
    if (!models.includes(settings.model)) {
      settings.model = models.includes('llama3.2:3b') ? 'llama3.2:3b' : models[0];
      saveSettings();
    }
    modelSelect.innerHTML = '';
    models.forEach((model) => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.append(option);
    });
    modelSelect.value = settings.model;
    modelSelect.disabled = false;
    modelHelp.textContent = `${models.length} local model${models.length === 1 ? '' : 's'} available.`;
    updateModelStatus();
  } catch (error) {
    modelSelect.innerHTML = '<option>Local models unavailable</option>';
    modelSelect.disabled = true;
    modelHelp.textContent = `${error.message} Start Ollama, then reopen Settings.`;
    document.querySelector('#model-status').textContent = 'Local service unavailable';
  }
}

async function loadVoiceStatus() {
  try {
    const voice = await window.zen.getVoiceStatus();
    const input = voice.input.available ? `${voice.input.engine} is ready for push-to-talk.` : voice.input.reason;
    const output = voice.output.available ? `${voice.output.engine} is ready for read aloud.` : voice.output.reason;
    voiceOutputReady = voice.output.available;
    const voices = Array.isArray(voice.output.voices) ? voice.output.voices : [];
    voiceSelect.innerHTML = '';
    voices.forEach((voice) => voiceSelect.append(new Option(voice.label, voice.id)));
    if (voices.length) {
      if (!voices.some((voice) => voice.id === settings.voiceOutputVoice)) settings.voiceOutputVoice = voices[0].id;
      voiceSelect.value = settings.voiceOutputVoice;
      voiceSelect.disabled = false;
      voiceHelp.textContent = `${voiceSelect.options[voiceSelect.selectedIndex].text} is selected for local read aloud.`;
      saveSettings();
    } else {
      voiceSelect.append(new Option('No local voices available', ''));
      voiceSelect.disabled = true;
    }
    updateVoiceSpeedControl();
    voiceStatusElement.textContent = `${input} ${output}`;
    voiceStatusElement.classList.toggle('ready', voice.available);
    voiceInputButton.disabled = !voice.input.available;
    voiceInputButton.textContent = voice.input.available ? 'Hold to speak' : 'Voice input unavailable';
    renderMessages();
  } catch {
    voiceStatusElement.textContent = 'Zen could not check local voice setup.';
  }
}

function stopSpeaking() {
  window.zen?.stopVoiceSpeech();
  if (activeSpeechAudio) {
    activeSpeechAudio.pause();
    URL.revokeObjectURL(activeSpeechAudio.src);
    activeSpeechAudio = null;
  }
  stopSpeakingButton.hidden = true;
}

async function speakText(text) {
  if (!voiceOutputReady) {
    setVoiceHelp('Local read aloud is not ready yet.');
    return;
  }
  stopSpeaking();
  stopSpeakingButton.hidden = false;
  stopSpeakingButton.textContent = 'Preparing voice…';
  stopSpeakingButton.disabled = true;
  try {
    const audioBytes = await window.zen.speakVoice(text, settings.voiceOutputVoice, selectedVoiceSpeed());
    const audio = new Audio(URL.createObjectURL(new Blob([audioBytes], { type: 'audio/wav' })));
    activeSpeechAudio = audio;
    audio.addEventListener('ended', () => stopSpeaking());
    await audio.play();
    stopSpeakingButton.textContent = 'Stop speaking';
    stopSpeakingButton.disabled = false;
  } catch (error) {
    stopSpeakingButton.hidden = true;
    stopSpeakingButton.disabled = false;
    setVoiceHelp(error.message || 'Zen could not read that response aloud.');
  }
}

async function loadVoiceInputs() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    voiceDeviceHelp.textContent = 'Zen cannot list microphones in this desktop environment.';
    return;
  }
  try {
    const inputs = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'audioinput');
    voiceInputSelect.innerHTML = '';
    const systemDefault = new Option('System default microphone', '');
    voiceInputSelect.append(systemDefault);
    inputs.forEach((device, index) => voiceInputSelect.append(new Option(device.label || `Microphone ${index + 1}`, device.deviceId)));
    if (settings.voiceInputId && inputs.some((device) => device.deviceId === settings.voiceInputId)) {
      voiceInputSelect.value = settings.voiceInputId;
    } else if (settings.voiceInputId) {
      settings.voiceInputId = '';
      saveSettings();
    }
    voiceInputSelect.disabled = false;
    voiceDeviceHelp.textContent = inputs.length
      ? 'Choose your Bluetooth headset microphone here when it is connected. Device names appear after Windows has granted microphone access once.'
      : 'No microphone was detected. Connect your Bluetooth headset, then select Refresh.';
  } catch {
    voiceDeviceHelp.textContent = 'Zen could not list microphones. Connect your headset, then try Refresh.';
  }
}

function setVoiceHelp(message) { document.querySelector('#voice-input-help').textContent = message; }

function handleVoiceShortcut(shortcut) {
  if (shortcut.action === 'hold') {
    if (shortcut.type === 'down' && !voiceLocked) {
      voiceKeyboardHeld = true;
      startVoiceRecording('hold');
    }
    if (shortcut.type === 'up') {
      voiceKeyboardHeld = false;
      if (voiceRecording?.trigger === 'hold') stopVoiceRecording();
    }
    return;
  }
  if (shortcut.action === 'locked' && shortcut.type === 'down') {
    if (voiceLocked) {
      voiceLocked = false;
      stopVoiceRecording();
    } else if (!voiceRecording && !voiceStartPending) {
      voiceLocked = true;
      startVoiceRecording('locked');
    }
  }
}

function makeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset, value) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true));
  return new Uint8Array(buffer);
}

function downsample(chunks, inputRate) {
  const inputLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const input = new Float32Array(inputLength);
  let offset = 0;
  chunks.forEach((chunk) => { input.set(chunk, offset); offset += chunk.length; });
  const outputLength = Math.floor(inputLength * 16000 / inputRate);
  const output = new Float32Array(outputLength);
  for (let index = 0; index < outputLength; index += 1) output[index] = input[Math.floor(index * inputRate / 16000)] || 0;
  return output;
}

function selectedVoiceConstraints() {
  const audio = { channelCount: 1, echoCancellation: true, noiseSuppression: true };
  if (settings.voiceInputId) audio.deviceId = { exact: settings.voiceInputId };
  return audio;
}

async function startVoiceRecording(trigger = 'button') {
  if (voiceRecording || voiceStartPending || voiceInputButton.disabled) return;
  voiceStartPending = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: selectedVoiceConstraints() });
    if ((trigger === 'hold' && !voiceKeyboardHeld) || (trigger === 'locked' && !voiceLocked)) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    const context = new AudioContext();
    loadVoiceInputs();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const chunks = [];
    processor.onaudioprocess = (event) => chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    source.connect(processor); processor.connect(context.destination);
    voiceRecording = { stream, context, source, processor, chunks, sampleRate: context.sampleRate, trigger };
    voiceInputButton.classList.add('recording');
    if (voiceLocked && trigger === 'locked') {
      voiceInputButton.textContent = 'Recording locked · press F9 to stop';
      setVoiceHelp('Recording is locked. Press F9 again to stop and transcribe.');
    } else {
      voiceInputButton.textContent = 'Recording… release to stop';
      setVoiceHelp('Recording locally. Release to stop; Zen will delete the temporary audio after transcription.');
    }
  } catch (error) {
    setVoiceHelp(error.name === 'NotAllowedError'
      ? 'Microphone permission was denied. Zen will not retry until you hold voice input again.'
      : error.name === 'OverconstrainedError' || error.name === 'NotFoundError'
        ? 'The selected microphone is unavailable. Connect your headset and choose it again in Settings.'
        : 'Zen could not start the microphone. Check that it is connected and not in use by another app.');
  } finally {
    voiceStartPending = false;
  }
}

async function stopVoiceRecording() {
  if (!voiceRecording) return;
  voiceKeyboardHeld = false;
  voiceLocked = false;
  const recording = voiceRecording;
  voiceRecording = null;
  recording.stream.getTracks().forEach((track) => track.stop());
  recording.source.disconnect(); recording.processor.disconnect(); await recording.context.close();
  voiceInputButton.classList.remove('recording');
  voiceInputButton.disabled = true;
  voiceInputButton.textContent = 'Transcribing…';
  setVoiceHelp('Transcribing with whisper.cpp on this computer…');
  try {
    const samples = downsample(recording.chunks, recording.sampleRate);
    if (samples.length < 1600) throw new Error('That recording was too short. Hold to speak and try again.');
    const text = await window.zen.transcribeVoice(makeWav(samples, 16000));
    input.value = input.value ? `${input.value} ${text}` : text;
    input.dispatchEvent(new Event('input'));
    setVoiceHelp('Voice input is ready. Hold to speak; your audio is processed locally and removed after transcription.');
    input.focus();
  } catch (error) {
    setVoiceHelp(error.message || 'Zen could not transcribe that recording. Please try again.');
  } finally {
    voiceInputButton.disabled = false;
    voiceInputButton.textContent = 'Hold to speak';
  }
}

function setBusy(busy = Boolean(generationForConversation())) {
  if (!window.zen) {
    input.disabled = true;
    sendButton.disabled = true;
    stopButton.hidden = true;
    return;
  }
  input.disabled = false;
  input.readOnly = false;
  sendButton.disabled = busy;
  stopButton.hidden = !busy;
  sendButton.innerHTML = busy ? 'Thinking <span class="spinner"></span>' : 'Send <span>↗</span>';
}

async function initialise() {
  applyTheme();
  loadVoiceInputs();
  render();
  renderMemories();
  loadDocuments();
  if (!window.zen) {
    document.querySelector('#model-status').textContent = 'Open Zen through its desktop app';
    input.disabled = true;
    sendButton.disabled = true;
    return;
  }
  loadVoiceStatus();
  loadToolStatus();
  loadApprovedApps();
  loadCommands();
  renderStagedCommandSteps();
  updateCommandStepInputVisibility();
  loadWorkflows();
  renderStagedWorkflowSteps();
  updateWorkflowStepInputVisibility();
  renderActivityLog();
  try {
    const status = await window.zen.getStatus();
    if (!settings.model) settings.model = status.model;
    updateModelStatus();
    loadModels();
  } catch { document.querySelector('#model-status').textContent = 'Local service unavailable'; }
}

function finishGeneration(requestId, fallbackMessage = '') {
  const completedGeneration = generations.get(requestId);
  if (!completedGeneration) return;
  generations.delete(requestId);
  const conversation = conversations.find((item) => item.id === completedGeneration.conversationId);
  if (conversation) {
    const responseContent = completedGeneration.content.trim();
    const content = responseContent && fallbackMessage ? `${responseContent}\n\n${fallbackMessage}` : responseContent || fallbackMessage;
    if (content) conversation.messages.push({ role: 'assistant', content, createdAt: completedGeneration.createdAt });
    updateConversationMetadata(conversation);
    saveConversations();
  }
  if (completedGeneration.documentQaActivity) {
    const succeeded = Boolean(completedGeneration.content.trim()) && !fallbackMessage;
    updateActivity(completedGeneration.documentQaActivity, succeeded ? 'completed' : 'failed', succeeded
      ? { result: `Answer received · ${completedGeneration.content.trim().length} characters` }
      : { errorCode: 'DOCUMENT_QA_MODEL_FAILED' });
  }
  render();
  setBusy();
  input.focus();
}

if (window.zen) {
  window.zen.onChatDelta(({ requestId, content }) => {
    const generation = generations.get(requestId);
    if (!generation) return;
    generation.content += content;
    updateStreamingMessage(generation);
  });
  window.zen.onChatComplete(({ requestId }) => finishGeneration(requestId));
  window.zen.onChatError(({ requestId, message }) => {
    finishGeneration(requestId, `I couldn’t reach the local model. ${message}`);
  });
  window.zen.onChatCancelled(({ requestId }) => finishGeneration(requestId, 'Generation stopped.'));
  window.zen.onVoiceShortcut(handleVoiceShortcut);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const content = input.value.trim();
  if (!content || generationForConversation()) return;
  const conversation = activeConversation();
  conversation.messages.push({ role: 'user', content, createdAt: new Date().toISOString() });
  updateConversationMetadata();
  input.value = '';
  input.style.height = 'auto';
  saveConversations();
  render();
  if (isAppOpenRequest(content)) {
    conversation.messages.push({ role: 'assistant', content: 'To open an approved app, use Activity → Choose what Zen may open. Zen will ask for confirmation before every launch.', createdAt: new Date().toISOString() });
    updateConversationMetadata(conversation);
    saveConversations();
    render();
    return;
  }
  if (isFileListRequest(content)) {
    conversation.messages.push({ role: 'assistant', content: 'To search file names in a folder you choose, use Activity → Search a folder. Zen will ask you to pick the folder, confirm the search, and show matching names and paths locally. It will not read file contents or change anything.', createdAt: new Date().toISOString() });
    updateConversationMetadata(conversation);
    saveConversations();
    render();
    return;
  }
  const generation = { requestId: crypto.randomUUID(), conversationId: conversation.id, content: '', createdAt: new Date().toISOString() };
  generations.set(generation.requestId, generation);
  setBusy();
  renderMessages();
  window.zen.startChat(generation.requestId, messagePayload(), settings.model);
});

input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 180)}px`; });
stopButton.addEventListener('click', () => {
  const generation = generationForConversation();
  if (generation) window.zen.stopChat(generation.requestId);
});
stopSpeakingButton.addEventListener('click', stopSpeaking);
voiceInputButton.addEventListener('pointerdown', (event) => { event.preventDefault(); startVoiceRecording('button'); });
document.addEventListener('pointerup', () => { if (voiceRecording?.trigger === 'button') stopVoiceRecording(); });
window.addEventListener('blur', () => {
  voiceKeyboardHeld = false;
  voiceLocked = false;
  if (voiceRecording?.trigger === 'hold' || voiceRecording?.trigger === 'locked') stopVoiceRecording();
});
document.querySelector('#new-chat').addEventListener('click', () => {
  const conversation = createConversation();
  conversations.unshift(conversation);
  activeConversationId = conversation.id;
  input.value = '';
  input.style.height = 'auto';
  saveConversations();
  showPage('chat');
  render();
  input.focus();
});

chatButton.addEventListener('click', () => showPage('chat'));
settingsButton.addEventListener('click', () => { showPage('settings'); loadVoiceInputs(); });
activityButton.addEventListener('click', () => { showPage('activity'); renderActivityLog(); });
memoryButton.addEventListener('click', () => { showPage('memory'); renderMemories(); });
documentsButton.addEventListener('click', () => { showPage('documents'); loadDocuments(); });
chooseDocumentsButton.addEventListener('click', chooseDocuments);
documentSearchForm.addEventListener('submit', searchImportedDocuments);
documentQaForm.addEventListener('submit', askAboutDocumentResults);
memoryForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = memoryText.value.trim();
  if (!text || text.length > 500) { memoryHelp.textContent = 'A memory must contain 1–500 characters.'; return; }
  const now = new Date().toISOString();
  memories.unshift({ id: crypto.randomUUID(), text, createdAt: now, updatedAt: now });
  saveMemories();
  memoryText.value = '';
  memoryHelp.textContent = 'Memory saved locally. It is not sent to Zen’s model yet.';
  renderMemories();
});
websiteForm.addEventListener('submit', reviewWebsite);
folderSearchForm.addEventListener('submit', reviewFolderSearch);
chooseApprovedAppButton.addEventListener('click', addApprovedApp);
browserWebAppForm.addEventListener('submit', addBrowserWebApp);
commandStepType.addEventListener('change', updateCommandStepInputVisibility);
addCommandStepButton.addEventListener('click', addCommandStep);
commandStepUrl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); addCommandStep(); }
});
commandBuilderForm.addEventListener('submit', saveCustomCommand);
workflowStepType.addEventListener('change', updateWorkflowStepInputVisibility);
addWorkflowStepButton.addEventListener('click', addWorkflowStep);
workflowStepUrl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); addWorkflowStep(); }
});
workflowBuilderForm.addEventListener('submit', saveWorkflow);
confirmationApproveButton.addEventListener('click', () => closeWebsiteConfirmation(true));
confirmationCancelButton.addEventListener('click', () => closeWebsiteConfirmation(false));
confirmationModal.addEventListener('click', (event) => {
  if (event.target === confirmationModal) closeWebsiteConfirmation(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && pendingWebsiteConfirmation) {
    event.preventDefault();
    closeWebsiteConfirmation(false);
  }
});
clearActivityLogButton.addEventListener('click', () => {
  if (!window.confirm('Clear every local activity record? This cannot be undone.')) return;
  activityLog = [];
  saveActivityLog();
  renderActivityLog();
});
voiceInputSelect.addEventListener('change', () => {
  settings.voiceInputId = voiceInputSelect.value;
  saveSettings();
  voiceDeviceHelp.textContent = voiceInputSelect.value ? 'Selected microphone saved locally. Hold to speak to test it.' : 'Zen will use the Windows default microphone.';
});
refreshVoiceInputsButton.addEventListener('click', loadVoiceInputs);
voiceSelect.addEventListener('change', () => {
  settings.voiceOutputVoice = voiceSelect.value;
  saveSettings();
  voiceHelp.textContent = `${voiceSelect.options[voiceSelect.selectedIndex].text} is selected for local read aloud.`;
  updateVoiceSpeedControl();
});
modelSelect.addEventListener('change', () => {
  settings.model = modelSelect.value;
  saveSettings();
  updateModelStatus();
  modelHelp.textContent = `${settings.model} will be used for new messages.`;
});
themeSelect.addEventListener('change', () => {
  settings.theme = themeSelect.value;
  saveSettings();
  applyTheme();
});
accentSelect.addEventListener('change', () => {
  settings.accent = accentSelect.value;
  saveSettings();
  applyTheme();
});
customAccentInput.addEventListener('input', () => {
  settings.customAccent = customAccentInput.value;
  settings.accent = 'custom';
  saveSettings();
  applyTheme();
});
textSizeSelect.addEventListener('change', () => {
  settings.textSize = textSizeSelect.value;
  saveSettings();
  applyTheme();
});
densitySelect.addEventListener('change', () => {
  settings.density = densitySelect.value;
  saveSettings();
  applyTheme();
});
fontSelect.addEventListener('change', () => {
  settings.font = fontSelect.value;
  saveSettings();
  applyTheme();
});
bubbleStyleSelect.addEventListener('change', () => {
  settings.bubbleStyle = bubbleStyleSelect.value;
  saveSettings();
  applyTheme();
});
resetAppearanceButton.addEventListener('click', () => {
  Object.assign(settings, { theme: 'deep-violet', accent: 'lavender', customAccent: '#a78bfa', textSize: 'default', density: 'comfortable', font: 'modern', bubbleStyle: 'rounded' });
  saveSettings();
  applyTheme();
  appearanceHelp.textContent = 'Appearance reset to Zen’s Deep violet default.';
});
themePreviewButtons.forEach((button) => button.addEventListener('click', () => {
  settings.theme = button.dataset.themePreview;
  saveSettings();
  applyTheme();
  appearanceHelp.textContent = `${displayThemeName(settings.theme)} is selected.`;
}));
function shortcutFromEvent(event) {
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return '';
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  return [event.ctrlKey && 'Ctrl', event.altKey && 'Alt', event.shiftKey && 'Shift', event.metaKey && 'Meta', key].filter(Boolean).join('+');
}
function isSafeAppearanceShortcut(event, shortcut) {
  if (!shortcut || ['F8', 'F9', 'F5', 'F11', 'F12', 'Alt+F4', 'Ctrl+W', 'Ctrl+R', 'Ctrl+Shift+I'].includes(shortcut)) return false;
  return event.ctrlKey || event.altKey || event.shiftKey || event.metaKey || /^F(?:[1-7]|10)$/i.test(event.key);
}
function cycleAppearanceTheme() {
  const themes = ['deep-violet', 'lavender-light', 'true-black'];
  settings.theme = themes[(themes.indexOf(settings.theme) + 1) % themes.length];
  saveSettings();
  applyTheme();
  appearanceHelp.textContent = `${displayThemeName(settings.theme)} is selected by shortcut.`;
}
setAppearanceShortcutButton.addEventListener('click', () => {
  capturingAppearanceShortcut = true;
  setAppearanceShortcutButton.textContent = 'Press a safe shortcut…';
  appearanceHelp.textContent = 'Use a combination such as Ctrl+Shift+L. Press Escape to cancel. F8 and F9 stay reserved for voice.';
});
clearAppearanceShortcutButton.addEventListener('click', () => {
  settings.appearanceShortcut = '';
  saveSettings();
  applyTheme();
  appearanceHelp.textContent = 'Appearance shortcut cleared.';
});
document.addEventListener('keydown', (event) => {
  const shortcut = shortcutFromEvent(event);
  if (capturingAppearanceShortcut) {
    event.preventDefault();
    if (event.key === 'Escape') {
      capturingAppearanceShortcut = false;
      applyTheme();
      appearanceHelp.textContent = 'Shortcut setup cancelled.';
      return;
    }
    if (!isSafeAppearanceShortcut(event, shortcut)) {
      appearanceHelp.textContent = 'Choose a combination with Ctrl, Alt, Shift, or a function key. F8 and F9 are reserved for voice.';
      return;
    }
    settings.appearanceShortcut = shortcut;
    capturingAppearanceShortcut = false;
    saveSettings();
    applyTheme();
    appearanceHelp.textContent = `${shortcut} will cycle themes while Zen is focused.`;
    return;
  }
  if (!settings.appearanceShortcut || document.activeElement?.matches('input, textarea, select, button')) return;
  if (shortcut === settings.appearanceShortcut) {
    event.preventDefault();
    cycleAppearanceTheme();
  }
});
voiceSpeedSelect.addEventListener('change', () => {
  if (!settings.voiceOutputVoice) return;
  settings.voiceSpeeds[settings.voiceOutputVoice] = Number(voiceSpeedSelect.value);
  saveSettings();
  updateVoiceSpeedControl();
});
clearConversationsButton.addEventListener('click', () => {
  if (!window.confirm('Clear every saved conversation from this computer? This cannot be undone.')) return;
  generations.forEach((generation) => window.zen.stopChat(generation.requestId));
  generations.clear();
  conversations = [createConversation()];
  activeConversationId = conversations[0].id;
  localStorage.removeItem(legacyStorageKey);
  saveConversations();
  showPage('chat');
  render();
  input.focus();
});

initialise();
