# Safe Computer Control — Day 8 Design

## Purpose

This document defines the first safe computer-control capabilities for Zen. It is a permission-first design: the local model may describe or suggest an action, but only Zen's constrained desktop code may validate, present, and execute it.

No capability in this document is enabled merely by sending a chat message. The user must approve each external action in Zen's interface. Confirmed HTTPS website opening, user-managed approved-app opening, and selected-folder filename search are available from **Activity**.

## Initial approved action list

| Action | Allowed input | Effect | Level |
| --- | --- | --- | --- |
| Open an installed app | A `.exe` selected through Zen's native picker and saved in the local approved-app list | Starts that exact app | Confirm every time |
| Open a browser web app | A selected Chromium-based browser launcher, user-provided display name, and user-provided `https:` URL | Starts the selected browser with Zen-generated `--app={validated URL}` only | Confirm every time |
| Open a website | A user-provided `https:` URL | Opens the URL using Windows' default browser | Confirm every time |
| Search selected folders | Plain-text search term and a folder explicitly granted in the current session | Reads matching file names and paths only | Confirm the folder grant; show results before opening anything |

Zen stores an app only after the user selects a `.exe` in the native picker and confirms its displayed path. The main process revalidates the path when saving and launching it; chat text cannot create an approval or supply executable arguments. The one exception is a browser web-app record: Zen creates its single `--app={validated HTTPS URL}` argument itself from the reviewed URL and does not accept any other argument. Zen must never infer an executable path from chat text or run a shell command, script, installer, or PowerShell command.

## Explicit exclusions

Day 8 does **not** permit:

- Editing, moving, renaming, copying, overwriting, compressing, or deleting files.
- Opening arbitrary file paths or launching arbitrary executables.
- `http:`, `file:`, `javascript:`, `data:`, credential-bearing, malformed, or non-user-provided URLs.
- Searching outside a folder the user selected through the native folder picker.
- Reading file contents, indexing files, sending data to websites, browser automation, software installation, setting changes, or background work.
- Bypassing a confirmation because an action appears safe, is repeated, or was suggested by the model.

## Confirmation contract

Zen must display a modal confirmation for each app and website request. It must include the exact action, destination, consequence, and two equally clear choices:

### Open an app

> Open **{app name}** now? Zen will start this installed application on your computer.

Buttons: **Open app** and **Cancel**. Default keyboard focus is Cancel.

### Open a website

> Open this website in your default browser?
> **{normalized HTTPS URL}**

Buttons: **Open website** and **Cancel**. The hostname and full normalized URL must both be visible. Default keyboard focus is Cancel.

### Grant a folder for search

The native folder picker is the grant. After selection, Zen displays:

> Search **{folder path}** for file names containing **“{query}”**? Zen will read names and paths in this folder only. It will not open, change, or upload files.

Buttons: **Search folder** and **Cancel**. The grant lasts only for that search request; future searches require a new picker selection and confirmation.

Closing the modal, pressing Escape, or any validation failure is a cancellation. Zen must perform no partial action and must not retry automatically.

## Validation rules

### Apps

- The requested app ID must exactly match a registry entry.
- Each entry contains a fixed display name, fixed executable path, and `exists` check.
- Approvals are created only from a one-use native-picker selection token; chat content cannot create or amend them.
- The regular approved-app flow rejects browsers and browser web-app launchers, so a generic app approval never invokes a browser without a fixed destination.
- The separate browser-web-app flow accepts only Chrome, Edge, Brave, Opera, Vivaldi, or their supported proxy launchers. It stores a fixed label, browser path, and normalized HTTPS URL, then generates only `--app={URL}` at launch; it never stores or accepts user-provided browser arguments.
- If the app is unavailable, Zen displays an error and logs the failed attempt without launching anything.

### Websites

- Accept only a non-empty string up to 2,048 characters.
- Parse using the platform URL parser; allow only `https:`.
- Reject URLs with embedded credentials, fragments that conceal a different destination, control characters, or parsing errors.
- Store and present the normalized URL before approval.
- URL validation verifies only the address format and safety boundary. It does not determine whether a website page exists, is public, or will return a 404/sign-in page.

### Folder search

- Obtain the folder path only through Electron's native folder picker.
- Verify that the selected path is an accessible directory at execution time.
- Resolve paths and ensure every returned result remains inside the selected directory.
- Match file names only, case-insensitively; do not inspect file contents or follow symlinks/reparse points outside the selected folder.
- Cap results at 100 and report that the list is capped if more matches exist.

## Local activity log contract

Every proposed action receives an immutable local log record, whether approved, cancelled, rejected, fails, or succeeds. The activity log is not sent to Ollama, a website, or another service.

Required fields:

| Field | Description |
| --- | --- |
| `id` | Locally generated action UUID |
| `createdAt` | ISO-8601 timestamp when Zen received the request |
| `action` | `open-app`, `open-website`, or `search-folder` |
| `preview` | Sanitized destination shown to the user |
| `status` | `requested`, `cancelled`, `rejected`, `failed`, or `completed` |
| `decidedAt` | Timestamp of approval, cancellation, or rejection when applicable |
| `completedAt` | Completion/failure timestamp when applicable |
| `result` | Minimal safe result, such as app name, normalized URL, or match count |
| `errorCode` | A stable non-sensitive error code, if any |

Do not record file contents, folder-search queries, credentials, raw error stack traces, or audio. For this MVP, retain at most 200 records in browser-local storage and remove the oldest record first. The UI must let the user view and clear the log; clearing requires confirmation.

## Execution sequence

1. Zen receives a structured request from its UI, never executable instructions from the model.
2. The main process validates its action name and inputs against this document's fixed rules.
3. Zen creates a local `requested` activity record and produces a sanitized preview.
4. The renderer presents the matching confirmation prompt; Cancel is the default.
5. A cancellation or rejection updates the record and ends the flow.
6. An approval is sent once to the main process, which revalidates before execution.
7. Zen performs only the constrained registered action.
8. Zen records `completed` or `failed`, shows the outcome, and never retries automatically.

## Before enabling a capability

Each action type must pass manual tests for approval, cancellation, malformed input, unavailable destination, repeated confirmation, log creation, log clearing safeguards, and restart persistence. File search also requires tests for inaccessible folders, nested folders, result caps, and attempts to escape the selected directory.

## Deferred decisions

- An approved app may be opened, but Zen cannot yet operate its controls or make changes inside it. Those require separate app-specific actions with their own previews and confirmations.
- File-content search, document import, and memory belong to Week 3.
- File changes, browser automation, and multi-step workflows belong to later, separately approved scopes.
