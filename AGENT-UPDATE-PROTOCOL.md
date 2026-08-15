# Agent Update Protocol — Zen Project

> Paste this into agent context (or reference it from `AGENTS.md`) alongside the repo's other
> continuity docs. Any agent working on Zen must follow this whenever it makes a change.

> **Sprint-scoped override (Aug 15–16, 2026):** during the Zen v2.0 2-day sprint
> (`docs/ZenV2-2Day-Sprint-Plan.md`), Section 3's per-change LinkedIn cadence is replaced by
> **one batched draft per day** (end of Day 1, end of Day 2), per owner decision. Everything else
> below applies as written. The `README.md` "v2.0 Progress (8-phase roadmap)" template in Section
> 2c doesn't correspond to a section that exists in `README.md` yet — `HANDOFF.md`'s Current
> Status entries remain the primary status record for this sprint; adding a matching README
> checklist is optional, not required to keep the sprint moving.

## 1. Trigger — when does this protocol fire?

Fires only on a **noticeable change**: a real feature, a working chunk of a roadmap phase, a
meaningful fix, or something genuinely interesting solved along the way. It does **not** fire on
every commit, typo fix, formatting pass, or internal refactor with no visible behavior change.

**If unsure whether a change qualifies:** ask Sufiyan once, quickly — e.g. "Does the hotkey
overlay fix count as noticeable, or is that internal cleanup?" — then proceed based on the
answer. Don't guess silently, and don't ask more than once per change.

Once a change is confirmed noticeable, do **all three** steps below without further prompting.

---

## 2. GitHub — full autonomy, three layers, every time

### a) Commit message
```
feat(scope): what changed in one line

- why it mattered / what it enables
- anything tricky solved along the way
```

### b) `CHANGELOG.md` — newest entry on top
```markdown
## [Unreleased] — Zen v2.0

### Added — <date>
- <2-4 bullets, in plain language, not a raw commit dump>
```

### c) `README.md` progress section — update only the relevant line
```markdown
## v2.0 Progress (8-phase roadmap)
- [x] Phase 1: Global hotkey overlay ✅ <date>
- [ ] Phase 2: Intent routing
```

**Commit and push automatically** — no pause, no confirmation needed for routine changes.

**Exception — ask before pushing:** if the change deletes code/files, alters configuration,
touches credentials/secrets, or changes anything security- or auth-related, commit locally as
normal but **stop and ask before pushing**. Everything else pushes immediately.

---

## 3. LinkedIn — draft it, never post it

Agents never have LinkedIn access and never post directly. Instead, for every noticeable change:

1. **Decide the format** based on posting gap:
   - Posted in the last few days → **short/casual** format
   - Longer gap since the last post → **big/catch-up** format once, then short/casual resumes
2. **Write the draft** using the matching template below. Every draft — short or big — must
   explain the thing itself (what it does, why it matters), not just announce that something
   shipped.
3. **Deliver the draft two ways, every time:**
   - Show it directly in the session/chat for Sufiyan to copy
   - Append it to `LINKEDIN_DRAFTS.md` in the repo, newest on top, with the date

### Short/casual template
```
Added [feature] to Zen v2.0 — [what it actually does / why it matters, one line].
[optional: one interesting detail or challenge]. Still building this fully local,
zero-telemetry. 🧵
```

### Big/catch-up template (only right after a gap)
```
Been heads-down on Zen v2.0 for a while — here's what's shipped since my last update:
- [bullet: what + why]
- [bullet: what + why]
- [bullet: what + why]

Next up: [what's next].

Building this as a fully local, privacy-first personal agent — no cloud, no telemetry.
```

### `LINKEDIN_DRAFTS.md` entry format
```markdown
## <date> — <short title>
<the full draft text>
```

---

## 4. Summary — what the agent does with zero prompting

- Ships a noticeable change → writes commit message, updates `CHANGELOG.md`, updates `README.md`
  progress section, commits, pushes.
- Writes a LinkedIn draft in the right format (short vs. big, based on posting gap), shows it,
  and saves it to `LINKEDIN_DRAFTS.md`.
- Only interrupts Sufiyan for: (a) confirming whether a borderline change counts as
  "noticeable," or (b) confirming a push that touches deletions, config, or security/credentials.
