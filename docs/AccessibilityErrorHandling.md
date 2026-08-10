# Accessibility & Error-Handling Audit (Day 22)

Unlike Days 8/11/15/17/20, this is not one new capability with a single safety boundary to
define -- it is a targeted audit of what already exists (Days 1-21), verified against the real
files rather than assumed. Every item below was confirmed by reading the actual source; nothing
here is a generic "improve accessibility" placeholder. No code changes are made in Day 22 itself,
matching the design-before-code pattern used for every prior new theme.

## Method

- Read `index.html`, `renderer.js`, and `styles.css` in full for keyboard reachability, focus
  management, and screen-reader labeling.
- Searched `main.js` for every `throw new Error(...)` and compared message specificity/
  actionability against the project's own established bar (the per-step reasons already used in
  `custom-commands.js`/`workflows.js`).
- Checked `styles.css` for `:focus` / `:focus-visible` coverage and any `outline: 0` /
  `outline: none` removal without a replacement indicator.

## Findings

### 1. Confirmation modal has no focus trap and does not mark background content inert

`#action-confirmation` is a `role="dialog" aria-modal="true"` overlay with correct
`aria-labelledby`/`aria-describedby`, and it already does two things right: it sets initial focus
to Cancel, and it restores focus to the triggering control on close. But there is no `Tab`/
`Shift+Tab` key handling to keep focus cycling within the dialog, and the background `<main>`
content is not marked `inert` or `aria-hidden="true"` while the modal is open. A keyboard or
screen-reader user can Tab past Cancel/Approve and land on -- or have announced to them -- content
behind the modal while it is supposedly blocking interaction. `aria-modal="true"` states this
should not be possible; nothing currently enforces it.

**Fix:** add a `Tab` keydown handler scoped to the modal that cycles focus between its two
buttons only, and toggle `inert` on the `<main class="shell">` element (or an equivalent
`aria-hidden="true"` + programmatic focus block) for as long as the modal is open.

### 2. Decorative icon glyphs are not hidden from assistive technology

The sidebar nav buttons and the send button each pair a visible text label with a Unicode glyph
in its own `<span>` (Settings `<span>&#9881;</span>`, Memory `<span>&#10022;</span>`, Documents
`<span>&#9636;</span>`, Activity/Send `<span>&#8599;</span>`, New conversation `<span>+</span>`).
None of the 0 `aria-hidden` attributes found anywhere in `index.html` cover these. A screen
reader may announce the raw Unicode character name after the label (for example "Settings, gear")
depending on the platform's symbol-to-speech mapping, which is noise at best and confusing at
worst.

**Fix:** add `aria-hidden="true"` to every purely decorative icon `<span>` inside a button that
already has a visible text label alongside it. Confirmed this is safe: in every case the button's
accessible name is still fully carried by the adjacent text node.

### 3. The primary message input has no visible keyboard-focus indicator

`.composer textarea` (the `#message-input` field -- the single most-used control in the app) sets
`outline: 0` unconditionally and has no `box-shadow` or border-color change on `:focus` to replace
it. Checked the entire stylesheet: there is exactly one `:focus`-family rule in the whole file
(`.conversation-item:focus-within`, unrelated), and zero `:focus-visible` rules anywhere. A
keyboard user tabbing to the message box gets no visible confirmation that it is focused beyond
the blinking text caret, which is not present until they start typing and is easy to miss,
especially against the Light theme.

**Fix:** add a `:focus-visible` box-shadow/border-color rule for `.composer textarea` (matching
the existing accent-ring pattern already used on `.memory-edit-form textarea`, which is
permanently ringed rather than focus-gated), and audit whether any other interactive control
relies on a default outline that a global reset might be suppressing without a Chromium default
still coming through -- spot-checked buttons/selects and they still show the Chromium default
focus ring, so this fix is scoped to the composer textarea only.

### 4. One inconsistent, non-actionable error message (introduced in Day 21)

Every other thrown error in `main.js` is specific and tells the person what to do next ("Choose
the folder again before searching.", "The selected model is invalid.", per-step reasons in
workflow/custom-command execution). One exception, found in Day 21's own `executeStep` helper:
the catch-all `throw new Error('Unsupported step type.')`. This can only be reached if a stored
step's `type` is something other than the three validated values, which `workflows.js`/
`custom-commands.js` already prevent at save time -- so it is unreachable in normal operation, but
it is still inconsistent with the rest of the file's error-message quality bar and should read the
same way the others do if it is ever hit (for example, during a future migration bug).

**Fix:** reword to name what happened and that it is an unexpected internal state, consistent
with the rest of the file, e.g. `"Zen does not recognize this step's action type."`

## Not found / spot-checked clean

- **Settings reset paths:** every appearance/voice setting (theme, text size, spacing, accent,
  font, bubble shape, shortcut, speech speed) has a working "Reset appearance" path per the Day 9
  log and was not found broken on inspection.
- **Contrast:** the Day 6 Light-theme fix and the three Day 9 presets (Deep violet, Lavender
  light, True black) were spot-checked in `styles.css` for the custom-accent contrast logic
  (stronger of near-black/white button text) -- present and unchanged since Day 9. A full
  combinatorial contrast pass across every preset x every custom accent color is out of scope for
  Day 22; flagged as a possible future item, not a confirmed defect.
- **`aria-live` coverage:** the panels that need it (messages, activity log, folder search
  results, staged command/workflow steps, toast) already have it. No missing `aria-live` region
  was found on anything that updates dynamically.

## Day 23 implementation scope

All four fixes above, and only those four -- no unrelated refactoring. Each is small and
independently testable:

1. Modal focus trap + `inert` background, verified with a manual Tab-cycle test.
2. `aria-hidden="true"` on the five decorative icon spans, verified the button's accessible name
   is unchanged (visible text label still present).
3. `:focus-visible` style for `.composer textarea`, verified visually by tabbing to it.
4. Reworded `executeStep` error message, verified `scripts/check-workflows.js` and
   `scripts/check-custom-commands.js` still pass (neither currently asserts on this exact string,
   confirmed by reading both files, so this is a safe rename).

No new IPC surface, no new storage, no new safety boundary -- this is UI/message polish only, so
it does not need the save/run/loop-safety validation rigor of Days 19-21. `npm run check` passing
plus a short manual Tab-through of the confirmation modal and composer field is sufficient
sign-off.