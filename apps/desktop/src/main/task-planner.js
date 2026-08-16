// Block D, Step 17: goal -> structured task plan. Routes through the local Ollama model (same
// engine/endpoint as regular chat) with a system prompt constrained to exactly the current
// action registry (Block D's initial 4 actions, extended by Block E Steps 22-24's
// search-folder/move-file/copy-file/rename-file/delete-file and the upgraded read-file), rather
// than a keyword/regex detector -- a multi-step plan across several registry actions is a
// composition problem regex can't do reliably, which is why the sprint plan itself flags this
// step as the one most likely to need iteration. Single-action requests (open one app, open one
// website) keep using the existing lightweight detectors in renderer.js unchanged; this planner
// is only reached for explicit multi-step task requests (see isTaskRequest() in renderer.js) so
// nothing here doubles an Ollama call on ordinary chat.
const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';

function buildSystemPrompt(approvedApps, documents, grantedFolders) {
  const appList = approvedApps.length
    ? approvedApps.map((app) => `- appId "${app.id}": ${app.label}`).join('\n')
    : '(no apps approved yet)';
  const docList = documents.length
    ? documents.map((doc) => `- documentId "${doc.id}": ${doc.displayName}`).join('\n')
    : '(no documents imported yet)';
  const folderList = grantedFolders.length
    ? grantedFolders.map((folder) => `- "${folder}" (and anything inside it)`).join('\n')
    : '(no folders granted yet)';
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
    '- "list-folder": input {"folderPath": string} -- must be one of the granted folders below, or a path inside one.',
    '- "search-folder": input {"folderPath": string, "query": string} -- folderPath must be granted (see above); query is a filename substring.',
    '- "read-file": input {"documentId": string} to read an imported document, OR {"filePath": string} for any other file -- filePath must be inside a granted folder.',
    '- "move-file": input {"sourcePath": string, "destinationFolderPath": string} -- both must be inside granted folders.',
    '- "copy-file": input {"sourcePath": string, "destinationFolderPath": string} -- both must be inside granted folders.',
    '- "rename-file": input {"sourcePath": string, "newName": string} -- sourcePath must be inside a granted folder; newName has no path separators.',
    '- "delete-file": input {"filePath": string} -- filePath must be inside a granted folder. This always asks the user to confirm again at the moment it runs, and always goes to the Recycle Bin, never permanent.',
    '',
    'Approved apps:',
    appList,
    '',
    'Imported documents:',
    docList,
    '',
    'Folders Zen currently has permission to search/read/move/copy/rename/delete within:',
    folderList,
    '',
    'Never invent an appId or documentId that is not listed above, and never invent a folder or',
    'file path outside the granted folders listed above -- if the goal needs an app, document, or',
    'folder that is not listed, set "isTask" to false instead of guessing.',
    'documentId values from "Imported documents" above are ONLY valid as read-file\'s documentId',
    'input. move-file/copy-file/rename-file/delete-file NEVER take a documentId -- their',
    'sourcePath/filePath must always be a real full path built from the granted folders above',
    '(e.g. a granted folder path plus the exact filename mentioned in the goal), never a',
    'documentId, even if that same file also happens to be listed as an imported document.',
    'Copy every filename from the goal EXACTLY as written, character for character, including',
    'spaces -- "Zen Feature.txt" must stay "Zen Feature.txt", never become "Feature.txt" or any',
    'other shortened/paraphrased version. A wrong filename makes the step fail.',
    'Only include a step if it is directly necessary to accomplish the goal. Do NOT add',
    'exploratory or "just in case" steps -- no list-folder/search-folder/read-file/open-app step',
    'unless the goal itself asks to list, search, read, or open something. A goal that names an',
    'exact source file and an exact destination needs exactly ONE step (the matching',
    'move-file/copy-file/rename-file/delete-file), never a list-folder or search-folder first to',
    '"check" it -- the action itself will fail with a clear reason if the file is not there.',
    '',
    'Example -- goal: "copy report.txt from Downloads to Downloads\\archive" with',
    '"C:\\Users\\me\\Downloads" granted:',
    '{"isTask": true, "steps": [{"actionId": "copy-file", "input": {"sourcePath":',
    '"C:\\Users\\me\\Downloads\\report.txt", "destinationFolderPath":',
    '"C:\\Users\\me\\Downloads\\archive"}}]}',
    'That is the whole plan -- one step, nothing exploratory before it.',
    '',
    'Example -- goal: "open Notepad" with appId "abc123": "Notepad" approved:',
    '{"isTask": true, "steps": [{"actionId": "open-app", "input": {"appId": "abc123"}}]}',
    '',
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

async function planTask(goal, { model, approvedApps, documents, grantedFolders = [] }) {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: buildSystemPrompt(approvedApps, documents, grantedFolders) },
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
