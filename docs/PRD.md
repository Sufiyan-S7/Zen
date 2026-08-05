# Zen Product Requirements Document

## Problem

Everyday computer work is spread across apps, files, notes, and repetitive actions. Zen gives one private interface for asking for help and running approved actions.

## Product goal

Build a local-first Windows assistant that can converse, remember user-approved context, and execute safe desktop workflows.

## Version 0.1 (four-week MVP)

- Text chat with a local Ollama model.
- Push-to-talk input and spoken responses.
- Open approved applications and websites.
- Search and summarize user-selected local files.
- Store conversation history and preferences locally.
- Request confirmation before destructive or sensitive actions.

## Non-goals for the MVP

- Unrestricted autonomous computer control.
- Always-listening wake word.
- Cloud account, subscription, or data collection.
- Perfect support for every Windows application.

## Safety requirements

- Show a clear action preview before deleting, moving, overwriting, installing, or sending anything.
- Keep an activity log for every tool action.
- Limit filesystem access to user-approved locations.
- Make stored memories viewable and removable.

## Success criteria

By the end of four weeks, a user can ask Zen to answer a question, open a safe app, find an approved file, and complete a simple confirmed workflow through a polished local desktop UI.

