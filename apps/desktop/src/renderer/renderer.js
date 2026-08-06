const version = window.zen?.version ?? 'development';
const mode = window.zen?.mode ?? 'local-first';
const storageKey = 'zen-local-conversations-v2';
const legacyStorageKey = 'zen-local-conversation-v1';
const settingsStorageKey = 'zen-local-settings-v1';
const welcomeText = 'Hello, I’m Zen. I’m running locally on your computer. What would you like to work on?';
let conversations = loadConversations();
let activeConversationId = conversations[0].id;
let settings = loadSettings();

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
const chatButton = document.querySelector('#chat-button');
const settingsButton = document.querySelector('#settings-button');
const modelSelect = document.querySelector('#model-select');
const modelHelp = document.querySelector('#model-help');
const themeSelect = document.querySelector('#theme-select');
const clearConversationsButton = document.querySelector('#clear-conversations');
const voiceInputButton = document.querySelector('#voice-input-button');
const voiceStatusElement = document.querySelector('#voice-status');
const stopSpeakingButton = document.querySelector('#stop-speaking-button');
const voiceSelect = document.querySelector('#voice-select');
const voiceHelp = document.querySelector('#voice-help');
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

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(settingsStorageKey));
    return {
      model: typeof stored?.model === 'string' ? stored.model : '',
      theme: stored?.theme === 'light' ? 'light' : 'dark',
      voiceInputId: typeof stored?.voiceInputId === 'string' ? stored.voiceInputId : '',
      voiceOutputVoice: typeof stored?.voiceOutputVoice === 'string' ? stored.voiceOutputVoice : ''
    };
  } catch { return { model: '', theme: 'dark', voiceInputId: '', voiceOutputVoice: '' }; }
}

function saveConversations() { localStorage.setItem(storageKey, JSON.stringify(conversations)); }
function saveSettings() { localStorage.setItem(settingsStorageKey, JSON.stringify(settings)); }
function applyTheme() { document.body.dataset.theme = settings.theme; themeSelect.value = settings.theme; }
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
  const showingSettings = page === 'settings';
  chatPage.hidden = showingSettings;
  settingsPage.hidden = !showingSettings;
  chatButton.classList.toggle('active', !showingSettings);
  settingsButton.classList.toggle('active', showingSettings);
  if (!showingSettings) input.focus();
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
    const audioBytes = await window.zen.speakVoice(text, settings.voiceOutputVoice);
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
  if (!window.zen) {
    document.querySelector('#model-status').textContent = 'Open Zen through its desktop app';
    input.disabled = true;
    sendButton.disabled = true;
    return;
  }
  loadVoiceStatus();
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
