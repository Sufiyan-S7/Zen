# Zen Architecture

## Design rule

The AI proposes a plan; constrained tools execute it. The model must never receive unrestricted Windows control.

```text
User (text / voice)
        |
        v
Desktop UI  <-->  Application service
                         |
        +----------------+----------------+
        |                |                |
        v                v                v
     AI adapter       Memory           Tool registry
     (Ollama)       (SQLite)      (Windows / files / web)
                                             |
                                             v
                                    Permission gate + activity log
```

## Modules

### Desktop UI
Displays chat, activity, permission prompts, settings, and stored memories.

### Brain
Uses a local Ollama model to interpret requests and return structured plans. It cannot call operating-system APIs directly.

### Memory
Stores conversation history, preferences, and user-approved facts locally. SQLite is the initial database.

### Tool registry
Defines each available action, its inputs, risk level, and verification step. Initial tools will open approved apps, search selected folders, and browse with permission.

### Permission gate
Allows safe actions immediately and requires a clear confirmation for actions that modify files, install software, send data, or affect system state.

### Voice
Converts speech to text locally and produces local speech output. It will be added after stable text chat.

### Plugins
Adds optional, isolated capabilities through a documented manifest and permission model. Plugins are post-MVP.

