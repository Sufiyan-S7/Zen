const version = window.zen?.version ?? 'development';
const mode = window.zen?.mode ?? 'local-first';
const storageKey = 'zen-local-conversation-v1';
const welcome = { role: 'assistant', content: 'Hello, I’m Zen. I’m running locally on your computer. What would you like to work on?' };
let messages = loadMessages();

document.querySelector('#version').textContent = `v${version}`;
document.querySelector('#mode').textContent = mode;

const messagesElement = document.querySelector('#messages');
const form = document.querySelector('#composer');
const input = document.querySelector('#message-input');
const sendButton = document.querySelector('#send-button');

function loadMessages() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(stored) && stored.length ? stored : [welcome];
  } catch {
    return [welcome];
  }
}

function saveMessages() {
  localStorage.setItem(storageKey, JSON.stringify(messages));
}

function renderMessages() {
  messagesElement.innerHTML = '';
  messages.forEach((message) => {
    const article = document.createElement('article');
    article.className = `message ${message.role}`;
    const label = document.createElement('p');
    label.className = 'message-label';
    label.textContent = message.role === 'assistant' ? 'ZEN' : 'YOU';
    const body = document.createElement('p');
    body.className = 'message-body';
    body.textContent = message.content;
    article.append(label, body);
    messagesElement.append(article);
  });
  messagesElement.scrollTop = messagesElement.scrollHeight;
}

function setBusy(busy) {
  input.disabled = busy;
  sendButton.disabled = busy;
  sendButton.innerHTML = busy ? 'Thinking <span class="spinner"></span>' : 'Send <span>↗</span>';
}

async function initialise() {
  renderMessages();
  try {
    const status = await window.zen.getStatus();
    document.querySelector('#model-status').textContent = `${status.model} · local`;
  } catch {
    document.querySelector('#model-status').textContent = 'Local service unavailable';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const content = input.value.trim();
  if (!content) return;
  messages.push({ role: 'user', content });
  input.value = '';
  input.style.height = 'auto';
  saveMessages();
  renderMessages();
  setBusy(true);
  try {
    const reply = await window.zen.chat(messages);
    messages.push({ role: 'assistant', content: reply });
  } catch (error) {
    messages.push({ role: 'assistant', content: `I couldn’t reach the local model. ${error.message}` });
  } finally {
    saveMessages();
    renderMessages();
    setBusy(false);
    input.focus();
  }
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
});

document.querySelector('#clear-chat').addEventListener('click', () => {
  messages = [welcome];
  saveMessages();
  renderMessages();
  input.focus();
});

initialise();
