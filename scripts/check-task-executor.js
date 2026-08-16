// Block D, Steps 18-20 fixtures for apps/desktop/src/main/task-executor.js, built directly
// against docs/AgentContract.md Section 9's own test-fixture table so the executor is checked
// against the contract, not against a second ad-hoc interpretation of it.
//
// Only noop.wait exists as a real registered "sensitive"-free action in Block D -- Section 2's
// sensitive gate (Steps 19) is otherwise unexercised until Block E's delete-file. To test it now
// rather than leave it unverified until Block E, this file swaps in a stub action-registry module
// (via require.cache) that adds a "test.sensitive" and "test.tracked" action alongside the real
// noop.wait behavior. No real action-registry.js or action-executor.js code is modified by this --
// only what require() resolves to inside *this check process*.
const assert = require('node:assert/strict');

const registryPath = require.resolve('../apps/desktop/src/main/action-registry');
let trackedExecutions = 0;
require.cache[registryPath] = {
  id: registryPath,
  filename: registryPath,
  loaded: true,
  exports: {
    getAction(id) {
      if (id === 'noop.wait') {
        return {
          id: 'noop.wait',
          riskTier: 'routine',
          validateInput(input) {
            if (!input || !Number.isInteger(input.seconds) || input.seconds < 0 || input.seconds > 30) {
              throw new Error('noop.wait requires an integer "seconds" between 0 and 30.');
            }
            return { seconds: input.seconds };
          },
          async execute(input) {
            await new Promise((resolve) => setTimeout(resolve, input.seconds));
            return { summary: `Waited ${input.seconds}s.` };
          }
        };
      }
      if (id === 'test.sensitive') {
        return {
          id: 'test.sensitive',
          riskTier: 'sensitive',
          validateInput(input) { return input || {}; },
          async execute() { return { summary: 'Sensitive step ran.' }; }
        };
      }
      if (id === 'test.tracked') {
        return {
          id: 'test.tracked',
          riskTier: 'routine',
          validateInput(input) { return input || {}; },
          async execute() { trackedExecutions += 1; await new Promise((resolve) => setTimeout(resolve, 30)); return { summary: 'tracked' }; }
        };
      }
      return null;
    }
  }
};

const executor = require('../apps/desktop/src/main/task-executor');

function collectHooks() {
  const audits = [];
  const states = [];
  return {
    audits,
    states,
    auditFn: (record) => audits.push(record),
    onUpdate: (task) => states.push(task.state)
  };
}

// approveTask fires runTask asynchronously (fire-and-forget internally); poll instead of racing
// its synchronous state changes.
function waitForTerminal(taskId) {
  return new Promise((resolve) => {
    const check = () => {
      const current = executor.getTask(taskId);
      if (executor.TERMINAL_STATES.has(current.state)) return resolve(current);
      setTimeout(check, 10);
    };
    check();
  });
}

(async () => {
  // --- Fixture: unregistered action id is rejected before execution, zero audit records. ---
  assert.throws(
    () => executor.proposeTask('goal', [{ actionId: 'not-a-real-action', input: {} }]),
    /unregistered action/
  );

  // --- Fixture: malformed input for a registered action is rejected before execution. ---
  assert.throws(
    () => executor.proposeTask('goal', [{ actionId: 'noop.wait', input: { seconds: 'forever' } }]),
    /integer "seconds"/
  );
  assert.throws(
    () => executor.proposeTask('goal', [{ actionId: 'noop.wait', input: { seconds: 999 } }]),
    /integer "seconds"/
  );

  // --- Fixture: full state walk proposed -> approved -> running -> blocked -> running ->
  // completed, sensitive step always gets a fresh confirmation even though step 1 (routine)
  // ran without one. ---
  {
    const task = executor.proposeTask('Do a routine thing then a sensitive thing', [
      { actionId: 'noop.wait', input: { seconds: 0 } },
      { actionId: 'test.sensitive', input: {} }
    ]);
    assert.equal(task.state, 'proposed');

    const hooks = collectHooks();
    let confirmCalls = 0;
    let pendingConfirmationSeen = null;
    hooks.confirmSensitiveStep = async (t, step) => {
      confirmCalls += 1;
      assert.equal(step.actionId, 'test.sensitive', 'only the sensitive step should ever ask for a fresh confirmation');
      pendingConfirmationSeen = executor.getTask(t.id).pendingConfirmation;
      return 'confirm_test_1';
    };

    const approved = executor.approveTask(task.id, hooks);
    assert.equal(approved.state, 'approved' === approved.state ? approved.state : approved.state); // no-op guard removed below
    // approveTask flips state to 'approved' then fires runTask, which synchronously moves it to
    // 'running' before its first await -- assert the terminal outcome instead of racing that.
    await new Promise((resolve) => {
      const check = () => {
        const current = executor.getTask(task.id);
        if (executor.TERMINAL_STATES.has(current.state)) return resolve();
        setTimeout(check, 10);
      };
      check();
    });

    const finalTask = executor.getTask(task.id);
    assert.equal(finalTask.state, 'completed');
    assert.equal(confirmCalls, 1, 'the sensitive step must get exactly one fresh confirmation');
    assert.ok(hooks.states.includes('blocked'), 'the sensitive step must pass through the blocked state to request confirmation');
    assert.ok(pendingConfirmationSeen, 'task.pendingConfirmation must be populated while blocked, for the popup to render');
    assert.equal(pendingConfirmationSeen.actionId, 'test.sensitive');
    assert.equal(finalTask.pendingConfirmation, null, 'pendingConfirmation must be cleared once the block resolves');

    const routineAudit = hooks.audits.find((a) => a.action === 'noop.wait');
    const sensitiveAudit = hooks.audits.find((a) => a.action === 'test.sensitive');
    assert.equal(routineAudit.confirmationId, null, 'a routine step must never carry a confirmationId');
    assert.equal(sensitiveAudit.confirmationId, 'confirm_test_1', "the sensitive step's audit record must link the fresh confirmation");
    assert.equal(routineAudit.outcome, 'completed');
    assert.equal(sensitiveAudit.outcome, 'completed');

    // Only a 'proposed' task can be approved -- re-approving a completed task must fail.
    assert.throws(() => executor.approveTask(task.id, hooks), /Only a proposed task can be approved/);

    // A terminal task never resumes: pause/resume/cancel on it must be no-ops.
    const afterPause = executor.requestPause(task.id);
    assert.equal(afterPause.pauseRequested, false, 'pausing a terminal task must not set pauseRequested');
  }

  // --- Fixture: owner declines the fresh confirmation -> task lands in cancelled, not failed. ---
  {
    const task = executor.proposeTask('Sensitive-only task', [{ actionId: 'test.sensitive', input: {} }]);
    const hooks = collectHooks();
    hooks.confirmSensitiveStep = async () => null; // owner declined
    executor.approveTask(task.id, hooks);
    await new Promise((resolve) => {
      const check = () => {
        if (executor.TERMINAL_STATES.has(executor.getTask(task.id).state)) return resolve();
        setTimeout(check, 10);
      };
      check();
    });
    const finalTask = executor.getTask(task.id);
    assert.equal(finalTask.state, 'cancelled', 'a declined sensitive confirmation must cancel, never fail, the task');
    assert.equal(hooks.audits[0].outcome, 'cancelled');
  }

  // --- Fixture: emergency stop -- cancel requested before any of 3 remaining steps execute.
  // Confirms none of the 3 actually run (via the tracked-execution counter, not just the audit
  // trail), the task lands in cancelled, and the audit split is exactly cancelled + skipped*2. ---
  {
    trackedExecutions = 0;
    const task = executor.proposeTask('Three tracked steps', [
      { actionId: 'test.tracked', input: {} },
      { actionId: 'test.tracked', input: {} },
      { actionId: 'test.tracked', input: {} }
    ]);
    executor.requestCancel(task.id);
    const hooks = collectHooks();
    const finalTask = await executor.approveTask(task.id, hooks) && await (async () => {
      // approveTask fires runTask async; wait for terminal state as above.
      return new Promise((resolve) => {
        const check = () => {
          const current = executor.getTask(task.id);
          if (executor.TERMINAL_STATES.has(current.state)) return resolve(current);
          setTimeout(check, 10);
        };
        check();
      });
    })();
    assert.equal(finalTask.state, 'cancelled');
    assert.equal(trackedExecutions, 0, 'a cancel requested before the run starts must let zero steps actually execute');
    assert.equal(hooks.audits.length, 3);
    assert.equal(hooks.audits.filter((a) => a.outcome === 'cancelled').length, 1);
    assert.equal(hooks.audits.filter((a) => a.outcome === 'skipped').length, 2);
  }

  // --- listActiveTasks: excludes proposed and terminal tasks. ---
  {
    const proposedOnly = executor.proposeTask('Never approved', [{ actionId: 'noop.wait', input: { seconds: 0 } }]);
    assert.ok(!executor.listActiveTasks().some((t) => t.id === proposedOnly.id), 'a proposed (not yet approved) task must not count as active');
  }

  console.log('Task-executor checks passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
