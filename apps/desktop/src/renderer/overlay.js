const input = document.getElementById('overlay-input');
const micButton = document.getElementById('overlay-mic');
const waveform = document.getElementById('overlay-waveform');
const waveformBars = [...waveform.querySelectorAll('span')];

let voiceRecording = null;
let voiceStartPending = false;
let micReady = false;
let waveformFrame = null;

function resetInputView() {
  waveform.hidden = true;
  input.hidden = false;
  input.placeholder = 'Ask Zen...';
}

function focusInput() {
  resetInputView();
  input.value = '';
  input.focus();
}

async function refreshVoiceStatus() {
  let status = null;
  try { status = await window.zenOverlay.getVoiceStatus(); } catch { /* unavailable */ }
  micReady = Boolean(status?.input?.available);
  micButton.disabled = !micReady;
  micButton.title = micReady ? 'Hold to speak' : (status?.input?.reason || 'Voice input unavailable');
}

focusInput();
refreshVoiceStatus();
window.zenOverlay.onShow(() => { focusInput(); refreshVoiceStatus(); });

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  // Escape cancels an in-progress recording first; a second Escape (now idle) closes the
  // overlay. Judgment call (INSTRUCTIONS.md Section 5): the sprint plan doesn't specify this
  // ordering -- discarding a live recording silently on the first Escape felt riskier than one
  // extra keypress to actually close.
  if (voiceRecording) { stopRecording({ cancel: true }); return; }
  window.zenOverlay.close();
});

input.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.shiftKey) return;
  event.preventDefault();
  const text = input.value.trim();
  if (text) window.zenOverlay.submit(text);
});

// Voice capture mirrors renderer.js's startVoiceRecording/stopVoiceRecording/downsample/makeWav
// (same whisper.cpp engine, reached through the shared zen:voice-status / zen:voice:transcribe
// channels bridged in overlay-preload.js) -- simplified to a single hold-to-talk trigger since
// the overlay has no locked-mode or microphone-picker UI of its own.
function downsample(chunks, inputRate) {
  const inputLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const inputData = new Float32Array(inputLength);
  let offset = 0;
  chunks.forEach((chunk) => { inputData.set(chunk, offset); offset += chunk.length; });
  const outputLength = Math.floor(inputLength * 16000 / inputRate);
  const output = new Float32Array(outputLength);
  for (let index = 0; index < outputLength; index += 1) output[index] = inputData[Math.floor(index * inputRate / 16000)] || 0;
  return output;
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

// Step 13: live waveform indicator -- reads live amplitude off an AnalyserNode while recording,
// independent of the ScriptProcessor chunk capture used for the actual transcription audio.
function animateWaveform() {
  if (!voiceRecording) return;
  const data = new Uint8Array(voiceRecording.analyser.frequencyBinCount);
  voiceRecording.analyser.getByteFrequencyData(data);
  const level = data.reduce((sum, value) => sum + value, 0) / data.length / 255;
  waveformBars.forEach((bar) => {
    const jitter = 0.6 + Math.random() * 0.5;
    bar.style.transform = `scaleY(${Math.max(0.15, Math.min(1, level * 2.4 * jitter))})`;
  });
  waveformFrame = requestAnimationFrame(animateWaveform);
}

async function startRecording() {
  if (voiceRecording || voiceStartPending || micButton.disabled) return;
  voiceStartPending = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const chunks = [];
    processor.onaudioprocess = (event) => chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    source.connect(processor);
    processor.connect(context.destination);
    voiceRecording = { stream, context, source, processor, analyser, chunks, sampleRate: context.sampleRate };
    micButton.classList.add('recording');
    input.hidden = true;
    waveform.hidden = false;
    animateWaveform();
  } catch {
    input.placeholder = 'Microphone unavailable. Type instead.';
  } finally {
    voiceStartPending = false;
  }
}

async function stopRecording({ cancel = false } = {}) {
  if (!voiceRecording) return;
  const recording = voiceRecording;
  voiceRecording = null;
  cancelAnimationFrame(waveformFrame);
  recording.stream.getTracks().forEach((track) => track.stop());
  recording.source.disconnect();
  recording.processor.disconnect();
  recording.analyser.disconnect();
  await recording.context.close();
  micButton.classList.remove('recording');
  resetInputView();
  if (cancel) { input.focus(); return; }
  micButton.disabled = true;
  input.placeholder = 'Transcribing...';
  try {
    const samples = downsample(recording.chunks, recording.sampleRate);
    if (samples.length < 1600) throw new Error('That recording was too short.');
    const text = await window.zenOverlay.transcribeVoice(makeWav(samples, 16000));
    // Step 15, editable transcript: the result lands in the input for review, never auto-sent --
    // Enter still submits it, exactly like typed entry.
    input.value = text;
    input.placeholder = 'Ask Zen...';
  } catch (error) {
    // Judgment call (INSTRUCTIONS.md Section 5): whisper.cpp here returns plain text with no
    // confidence score (see main.js runWhisper's `-nt -otxt` invocation), so there is no numeric
    // "low confidence" signal to branch on. Re-ask/retry is implemented as: any transcription
    // failure (silence or engine error) leaves the overlay open, idle, and editable, with the
    // reason shown as the placeholder -- press the mic again to retry, or type instead. This is
    // also the "failed to load transcript" clean-close path: a failure never leaves the overlay
    // stuck on "Transcribing...", and Escape still closes it from this state.
    input.placeholder = error.message || 'Could not transcribe. Try again or type.';
  } finally {
    micButton.disabled = !micReady;
    input.focus();
  }
}

micButton.addEventListener('pointerdown', (event) => { event.preventDefault(); startRecording(); });
document.addEventListener('pointerup', () => { if (voiceRecording) stopRecording(); });
window.addEventListener('blur', () => { if (voiceRecording) stopRecording({ cancel: true }); });
