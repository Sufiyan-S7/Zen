// Direct-request policy: requests that only inspect already-granted local data, open an
// approved app/HTTPS site, or research in Zen's separately granted browser may start without
// the old task-plan "Start" click. This does NOT include file changes, UI control automation,
// draft form filling, routines, or PowerShell. Those stay review/confirmation-gated because a
// local model must never turn an ambiguous sentence into an external or irreversible effect.
const AUTO_RUN_ACTION_IDS = new Set([
  'open-app',
  'open-website',
  'list-folder',
  'search-folder',
  'read-file',
  'browser-navigate',
  'browser-read'
]);

function shouldAutoRunPlan(steps) {
  return Array.isArray(steps) && steps.length > 0 && steps.every((step) => AUTO_RUN_ACTION_IDS.has(step?.actionId));
}

module.exports = { AUTO_RUN_ACTION_IDS, shouldAutoRunPlan };
