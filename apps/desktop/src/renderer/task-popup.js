// Block D, Step 19: renders the plan popup and drives approve/pause/resume/cancel. The single
// "Start" click here is the one-time per-task approval from docs/AgentContract.md Section 1 --
// once clicked, routine steps run without asking again (none of Block D's four actions are
// sensitive, so nothing further interrupts the run; a future sensitive step still gets its own
// fresh confirmation per Section 2, layered on top of this same popup in a later block).
const stateEl = document.getElementById('taskState');
const goalEl = document.getElementById('taskGoal');
const stepsEl = document.getElementById('taskSteps');
const sensitiveNoticeEl = document.getElementById('taskSensitiveNotice');
const actionsEl = document.getElementById('taskActions');

let currentTask = null;

const STATUS_ICON = {
  pending: '○', running: '●', completed: '✓', failed: '✕', cancelled: '■', skipped: '·'
};

function render(task) {
  currentTask = task;
  stateEl.textContent = task.state;
  goalEl.textContent = task.goal;
  stepsEl.innerHTML = '';
  for (const step of task.steps) {
    const li = document.createElement('li');
    li.className = 'task-step';
    li.dataset.status = step.status;
    const header = document.createElement('div');
    header.className = 'task-step-header';
    const icon = document.createElement('span');
    icon.className = 'task-step-icon';
    icon.textContent = STATUS_ICON[step.status] || '○';
    const label = document.createElement('span');
    label.className = 'task-step-label';
    // Block E: once a step finishes, prefer its real result summary (e.g. search-folder's
    // "Found 2 match(es)...", read-file's "Read notes.txt...") over the pre-execution describe()
    // text -- otherwise a read-only step like search-folder or read-file completes with a
    // checkmark but never actually shows what it found, which defeats the point of running it.
    const resultSummary = (step.status === 'completed' || step.status === 'failed') && step.result && typeof step.result.summary === 'string'
      ? step.result.summary : null;
    label.textContent = resultSummary || step.summary || step.actionId;
    header.append(icon, label);
    li.appendChild(header);
    // Block E: search-folder's matches and read-file's text are the actual point of running
    // those actions -- show them, not just a "completed" checkmark next to the original plan.
    if (step.status === 'completed' && step.result) {
      if (Array.isArray(step.result.matches)) {
        const list = document.createElement('ul');
        list.className = 'task-step-detail-list';
        if (!step.result.matches.length) {
          const none = document.createElement('li');
          none.textContent = '(no matches)';
          list.appendChild(none);
        }
        for (const match of step.result.matches.slice(0, 10)) {
          const item = document.createElement('li');
          item.textContent = match.path || match.name;
          list.appendChild(item);
        }
        li.appendChild(list);
      } else if (typeof step.result.text === 'string') {
        const preview = document.createElement('p');
        preview.className = 'task-step-detail-text';
        preview.textContent = step.result.text.length > 400 ? `${step.result.text.slice(0, 400)}…` : step.result.text;
        li.appendChild(preview);
      }
    }
    // Block E: a failed step must say WHY -- e.g. move-file/copy-file/rename-file/delete-file's
    // real filesystem check now happens here at execute() time (see action-registry.js), so the
    // reason belongs on the step that actually failed, not buried only in the audit log.
    if (step.status === 'failed' && step.error) {
      const errorEl = document.createElement('p');
      errorEl.className = 'task-step-detail-text task-step-error';
      errorEl.textContent = step.error;
      li.appendChild(errorEl);
    }
    stepsEl.appendChild(li);
  }
  renderActions(task);
}

function renderActions(task) {
  actionsEl.innerHTML = '';
  sensitiveNoticeEl.hidden = true;
  if (task.state === 'proposed') {
    actionsEl.append(
      button('Start', 'primary', () => window.zenTaskPopup.approve(task.id)),
      button('Dismiss', '', () => window.zenTaskPopup.close())
    );
    return;
  }
  if (task.state === 'running' || task.state === 'blocked') {
    if (task.state === 'blocked' && task.pendingConfirmation) {
      // Block E, Step 24: fresh re-confirmation on a sensitive step (delete-file). This is
      // deliberately a distinct control pair from the generic Pause/Cancel below it -- Approve
      // here answers "do this specific sensitive step," not "resume the task."
      sensitiveNoticeEl.textContent = task.pendingConfirmation.summary || 'This step needs confirmation.';
      sensitiveNoticeEl.hidden = false;
      actionsEl.append(
        button('Approve', 'primary', () => window.zenTaskPopup.confirmSensitive(task.id, true)),
        button('Deny', 'danger', () => window.zenTaskPopup.confirmSensitive(task.id, false))
      );
      return;
    }
    actionsEl.append(
      button('Pause', '', () => window.zenTaskPopup.pause(task.id)),
      button('Cancel', 'danger', () => window.zenTaskPopup.cancel(task.id))
    );
    return;
  }
  if (task.state === 'paused') {
    actionsEl.append(
      button('Resume', 'primary', () => window.zenTaskPopup.resume(task.id)),
      button('Cancel', 'danger', () => window.zenTaskPopup.cancel(task.id))
    );
    return;
  }
  // completed / failed / cancelled -- terminal, nothing left to do but close.
  actionsEl.append(button('Close', 'primary', () => window.zenTaskPopup.close()));
}

function button(text, cls, onClick) {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = text;
  if (cls) el.classList.add(cls);
  el.addEventListener('click', onClick);
  return el;
}

window.zenTaskPopup.onTask(render);

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !currentTask) return;
  const active = ['running', 'paused', 'blocked'].includes(currentTask.state);
  if (active) window.zenTaskPopup.cancel(currentTask.id);
  else window.zenTaskPopup.close();
});
