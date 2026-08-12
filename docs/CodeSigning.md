# Windows code signing (Day 28 follow-up)

## Current state

`Zen Setup 1.0.0.exe` is unsigned. Windows SmartScreen will warn anyone other than the person
who built it. This is expected for a personal build and does not block local use, but matters
now that the project is being shared on GitHub.

## Why this can't be fully automated

Signing requires a real certificate tied to a verified identity (a person or an organization).
Getting one means passing identity/business verification with a Certificate Authority, or being
approved by a free code-signing provider for open-source projects -- both are steps only the
repository owner can complete (they need your legal name/organization details, and in most
cases payment or a signed application). No amount of local tooling substitutes for that
verification step.

## What's already wired up, ready for either path

`apps/desktop/package.json`'s `build.win` config uses `electron-builder`, which **automatically**
picks up a certificate from the `CSC_LINK` (path or base64-encoded `.pfx`) and `CSC_KEY_PASSWORD`
environment variables with zero further code changes -- this is electron-builder's built-in
behavior, not something Zen-specific had to be added for.

`.github/workflows/release.yml` (added this session) builds the installer on `windows-latest`
whenever a `v*` tag is pushed, runs `npm run check` first, and uploads the resulting installer to
a GitHub Release. It already reads `CSC_LINK`/`CSC_KEY_PASSWORD` from repository secrets if
present, and signs automatically if they're set -- otherwise it publishes an unsigned build
exactly like today's, with no error.

## Two real paths -- pick one and follow its steps yourself

### Path A -- SignPath.io (free for open-source, recommended for this project)

1. Go to signpath.io, sign in with GitHub, and submit Zen's repository for their free
   open-source signing program (they review the repo; approval isn't instant).
2. Once approved, follow SignPath's GitHub Actions integration guide to add their signing step
   to `.github/workflows/release.yml` in place of the placeholder -- this typically means adding
   a `signpath/github-action-submit-signing-request` step and a couple of SignPath-provided
   repository secrets (their org/project/policy IDs and an API token).
3. No certificate purchase needed; SignPath holds and uses their own EV certificate on your
   behalf after review.

### Path B -- buy your own certificate (works for private or commercial use, costs money)

1. Buy an OV (cheaper, still shows SmartScreen warnings for a while as reputation builds) or EV
   (more expensive, immediate trust) code-signing certificate from a CA -- DigiCert, Sectigo, or
   SSL.com are common choices -- which requires your real identity or business documents.
2. Export it as a `.pfx` file with a password.
3. In the GitHub repo: Settings -> Secrets and variables -> Actions, add `CSC_LINK` (base64 of
   the `.pfx`, or a URL to it) and `CSC_KEY_PASSWORD` (the export password) as repository
   secrets.
4. Push a `v*` tag. `.github/workflows/release.yml` picks the secrets up automatically and signs
   the build -- no further code or workflow changes needed.

## Recommendation for this project

Path A (SignPath) fits best here specifically because Zen is open-source on GitHub and personal
-- free is the right trade for the review/approval wait. Path B makes more sense only if this
becomes a commercial or time-sensitive release.
