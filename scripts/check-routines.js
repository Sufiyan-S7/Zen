const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const routines = require('../apps/desktop/src/main/routines');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-routines-'));
try {
  routines.configureRoutines(sandbox);

  const preview = routines.previewRoutine('  Morning docs  ', [
    { actionId: 'open-website', input: { url: 'https://example.com/docs' } }
  ]);
  assert.equal(preview.name, 'Morning docs');
  assert.equal(preview.steps[0].summary, 'Open a website');

  assert.throws(() => routines.previewRoutine('Nested', [
    { actionId: 'run-routine', input: { routineId: '00000000-0000-0000-0000-000000000000' } }
  ]), /cannot contain another routine/);
  assert.throws(() => routines.previewRoutine('Too many', Array.from({ length: 11 }, () => ({ actionId: 'open-website', input: { url: 'https://example.com' } }))), /between 1 and 10/);

  const saved = routines.createRoutine(preview.name, preview.steps);
  assert.equal(routines.listRoutines().length, 1);
  const prepared = routines.prepareRoutineRun(saved.id);
  assert.equal(prepared.name, 'Morning docs');
  assert.deepEqual(prepared.steps.map((step) => step.actionId), ['open-website']);

  const exported = routines.exportRoutines();
  routines.removeRoutine(saved.id);
  assert.equal(routines.listRoutines().length, 0);
  const restored = routines.restoreRoutines(exported);
  assert.equal(restored.restored, 1);
  assert.equal(restored.skipped.length, 0);
  assert.equal(routines.listRoutines()[0].name, 'Morning docs');

  const invalidRestore = routines.restoreRoutines([{ name: 'Bad nested', steps: [{ actionId: 'run-routine', input: { routineId: saved.id } }] }]);
  assert.equal(invalidRestore.restored, 0);
  assert.equal(invalidRestore.skipped.length, 1);
  console.log('Routine safety checks passed.');
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
