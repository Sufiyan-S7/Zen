// Block D, Step 17: goal -> structured task plan. Routes through the local Ollama model (same
// engine/endpoint as regular chat) with a system prompt constrained to exactly the Block D
// action registry, rather than a keyword/regex detector -- a multi-step plan across several
// registry actions is a composition problem regex can't do reliably, which is why the sprint
// plan itself flags this step as the one most likely to need iteration. Single-action requests
// (open one app, open one website) keep using the existing lightweight detectors in
// renderer.js unchanged; this planner is only reached for explicit multi-step task requests
// (see isTaskRequest() in renderer.js) so nothing here doubles an Ollama call on ordinary chat.
const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';

function buildSystemPrompt(approvedApps, documents) {
  const appList = approvedApps.length
    ? approvedApps.map((app) => `- appId "${app.id}": ${app.label}`).join('\n')
    : '(no apps approved yet)';
  const docList = documents.length
    ? documents.map((doc) => `- documentId "${doc.id}": ${doc.displayName}`).join('\n')
    : '(no documents imported yet)';
  return [
    'You turn a single goal into a short, ordered task plan for a personal desktop agent called',
    'Zen. Respond with JSON ONLY -- no prose, no code fences, no explanation before or after it.',
    '',
    'JSON shape: {"isTask": boolean, "steps": [{"actionId": string, "input": object}]}',
    '',
    'Set "isTask" to false and "steps" to [] if the message is a question, a conversational',
    'remark, or anything else that is not a concrete request to do something on this computer.',
    '',
    'Only use these actionIds, exactly as written, each with exactly this input shape:',
    '- "open-app": input {"appId": string} -- appId must be one of the approved apps listed below.',
    '- "open-website": input {"url": string} -- a full https:// URL.',
    '- "list-folder": input {"folderPath": string} -- an absolute Windows folder path.',
    '- "read-file": input {"documentId": string} -- documentId must be one of the documents listed below.',
    '',
    'Approved apps:',
    appList,
    '',
    'Imported documents:',
    docList,
    '',
    'Never invent an appId or documentId that is not listed above -- if the goal refers to an app',
    'or document that is not listed, set "isTask" to false instead of guessing.',
    'Keep plans short: only the steps actually needed, in the order they should run.'
  ].join('\n');
}

function parsePlanResponse(raw) {
  let text = typeof raw === 'string' ? raw.trim() : '';
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  let parsed;
  try { parsed = JSON.parse(text); } catch { return { isTask: false, steps: [] }; }
  if (!parsed || typeof parsed !== 'object' || parsed.isTask !== true || !Array.isArray(parsed.steps) || !parsed.steps.length) {
    return { isTask: false, steps: [] };
  }
  const steps = parsed.steps.filter((step) => step && typeof step.actionId === 'string' && step.input && typeof step.input === 'object');
  if (!steps.length) return { isTask: false, steps: [] };
  return { isTask: true, steps };
}

async function planTask(goal, { model, approvedApps, documents }) {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: buildSystemPrompt(approvedApps, documents) },
        { role: 'user', content: goal }
      ]
    })
  });
  if (!response.ok) throw new Error(`Ollama could not respond (${response.status}). Check that ${model} is installed.`);
  const data = await response.json();
  const raw = data && data.message && data.message.content;
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('Ollama returned an empty response.');
  return parsePlanResponse(raw);
}

module.exports = { planTask, parsePlanResponse, buildSystemPrompt };
