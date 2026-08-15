// Block D, Step 19: renders the plan popup and drives approve/pause/resume/cancel. The single
// "Start" click here is the one-time per-task approval from docs/AgentContract.md Section 1 --
// once clicked, routine steps run without asking again (none of Block D's four actions are
// sensitive, so nothing further interrupts the run; a future sensitive step still gets its own
// fresh confirmation per Section 2, layered on top of this same popup in a later block).
const stateEl = document.getElementById('taskState');
const goalEl = document.getElementById('taskGoal');
const stepsEl = document.getElementById('taskSteps');
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
    const icon = document.createElement('span');
    icon.className = 'task-step-icon';
    icon.textContent = STATUS_ICON[step.status] || '○';
    const label = document.createElement('span');
    label.className = 'task-step-label';
    label.textContent = step.summary || step.actionId;
    li.append(icon, label);
    stepsEl.appendChild(li);
  }
  renderActions(task);
}

function renderActions(task) {
  actionsEl.innerHTML = '';
  if (task.state === 'proposed') {
    actionsEl.append(
      button('Start', 'primary', () => window.zenTaskPopup.approve(task.id)),
      button('Dismiss', '', () => window.zenTaskPopup.close())
    );
    return;
  }
  if (task.state === 'running' || task.state === 'blocked') {
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
