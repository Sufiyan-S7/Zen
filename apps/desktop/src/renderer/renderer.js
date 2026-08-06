const version = window.zen?.version ?? 'development';
const mode = window.zen?.mode ?? 'local-first';
const storageKey = 'zen-local-conversations-v2';
const legacyStorageKey = 'zen-local-conversation-v1';
const welcomeText = 'Hello, I’m Zen. I’m running locally on your computer. What would you like to work on?';
let conversations = loadConversations();
let activeConversationId = conversations[0].id;

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
const generations = new Map();
let streamingMessageBody = null;

function createConversation() {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), title: 'New conversation', createdAt: now, updatedAt: now, messages: [{ role: 'assistant', content: welcomeText, createdAt: now }] };
}

function normaliseMessage(message, fallbackTime) {
  return { role: message.role, content: message.content, createdAt: typeof message.createdAt === 'string' ? message.createdAt : fallbackTime };
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

function saveConversations() { localStorage.setItem(storageKey, JSON.stringify(conversations)); }
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

function setBusy(busy = Boolean(generationForConversation())) {
  input.disabled = busy;
  sendButton.disabled = busy;
  stopButton.hidden = !busy;
  sendButton.innerHTML = busy ? 'Thinking <span class="spinner"></span>' : 'Send <span>↗</span>';
}

async function initialise() {
  render();
  if (!window.zen) {
    document.querySelector('#model-status').textContent = 'Open Zen through its desktop app';
    input.disabled = true;
    sendButton.disabled = true;
    return;
  }
  try {
    const status = await window.zen.getStatus();
    document.querySelector('#model-status').textContent = `${status.model} · local`;
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
  const generation = { requestId: crypto.randomUUID(), conversationId: conversation.id, content: '', createdAt: new Date().toISOString() };
  generations.set(generation.requestId, generation);
  setBusy();
  renderMessages();
  window.zen.startChat(generation.requestId, messagePayload());
});

input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 180)}px`; });
stopButton.addEventListener('click', () => {
  const generation = generationForConversation();
  if (generation) window.zen.stopChat(generation.requestId);
});
document.querySelector('#new-chat').addEventListener('click', () => {
  const conversation = createConversation();
  conversations.unshift(conversation);
  activeConversationId = conversation.id;
  saveConversations();
  render();
  input.focus();
});

initialise();
