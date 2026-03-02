# XBWorld AI-First Architecture

XBWorld is designed as an **AI-agent-first** civilization game platform. The primary users are AI agents; humans observe and influence agents via chat.

## Current Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     AI Agents (any language)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ LLM Agent│  │ RL Agent │  │Rule-Based│  │External Agent│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘ │
│       │              │             │               │         │
│       └──────────────┴─────────────┴───────────────┘         │
│                          │                                    │
│                  ┌───────▼────────┐                           │
│                  │ FastAPI Gateway │  ← REST + SSE + WS       │
│                  │   (port 8642)   │                          │
│                  └───────┬────────┘                           │
│                          │                                    │
│                  ┌───────▼────────┐                           │
│                  │ xbworld-proxy  │  ← WebSocket ↔ TCP        │
│                  │ (Tornado)      │                           │
│                  └───────┬────────┘                           │
│                          │                                    │
│                  ┌───────▼────────┐                           │
│                  │ freeciv-server │  ← C game engine          │
│                  │ (port 6000+)   │                           │
│                  └────────────────┘                           │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Observers: Static HTML UI / SSE Dashboard / Browser    │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Game Management

| Method | Path | Description |
|--------|------|-------------|
| POST | `/game/create` | Create game with agents. Body: `{agents, aifill?, turn_timeout?}` |
| GET | `/game/status` | Status of all agents |
| GET | `/game/state` | Full structured state for all agents |
| DELETE | `/game` | Shut down game |
| POST | `/game/join` | External agent joins. Body: `{username}` |
| GET | `/game/tools` | List all tools with JSON schemas |
| GET | `/game/events` | SSE stream of real-time game events |

### Agent Control

| Method | Path | Description |
|--------|------|-------------|
| GET | `/agents/{name}/state` | Agent status summary |
| GET | `/agents/{name}/state/json` | Full structured JSON state |
| GET | `/agents/{name}/state/delta` | State changes since last query |
| POST | `/agents/{name}/command` | Natural language command (via LLM) |
| POST | `/agents/{name}/actions` | Direct tool execution (bypass LLM) |
| POST | `/agents/{name}/end_turn` | End turn directly |
| GET | `/agents/{name}/log` | Action log |

### Observer

| Method | Path | Description |
|--------|------|-------------|
| GET | `/observe/` | Static observer HTML UI |
| GET | `/game/events` | SSE event stream for dashboards |

## Decision Engine Architecture

The decision-making is decoupled from the game client via the `DecisionEngine` interface:

```python
class DecisionEngine(ABC):
    async def decide(self, state: dict, available_tools: list[dict], context: dict) -> list[ToolCall]
    async def on_results(self, results: list[dict], state: dict, available_tools: list[dict]) -> list[ToolCall] | None
```

### Available Engines

| Engine | Type | Use Case |
|--------|------|----------|
| `LLMEngine` | LLM function-calling | Default. Uses Gemini/OpenAI for strategic decisions |
| `RuleBasedEngine` | Deterministic rules | Testing, baseline, fast games |
| `ExternalEngine` | API-driven | Third-party agents via `/agents/{name}/actions` |

### Adding a Custom Engine

1. Subclass `DecisionEngine`
2. Implement `decide()` to return `list[ToolCall]`
3. Pass to `XBWorldAgent(engine=my_engine)`

## Dependency Matrix

| Component | AI-Only | With Observer | Full Stack |
|-----------|---------|---------------|------------|
| freeciv-server (C) | Required | Required | Required |
| xbworld-proxy | Required | Required | Required |
| FastAPI (Python) | Required | Required | Required |
| Nginx | Optional | Recommended | Required |
| Tomcat/Java | Not needed | Not needed | Required |
| MariaDB | Not needed (`--no-auth`) | Not needed | Required |
| publite2 | Not needed | Not needed | Required |

### Standalone Mode (AI-Only)

```bash
python multi_main.py --agents 4 --standalone --api
```

This spawns freeciv-server + proxy with `--no-auth`, no Tomcat/MariaDB needed.

## Batch Tools

For efficiency, agents can use batch tools to reduce LLM round-trips:

| Tool | Description | Replaces |
|------|-------------|----------|
| `move_units` | Move multiple units in one call | N x `move_unit` |
| `set_productions` | Set production for multiple cities | N x `change_city_production` |

## Turn Synchronization

- Server-side turn timeout: configurable via `GAME_TURN_TIMEOUT` env var (default: 30s)
- Per-agent client timeout: `TURN_TIMEOUT_SECONDS` (default: 30s)
- If one agent is slow, the server auto-advances after the timeout

## Event System

The SSE event stream (`GET /game/events`) publishes:

- `turn_start` — new turn begins
- `agent_action` — agent executes a tool
- `command_sent` — human sends command to agent

## Future Improvements

### Not Yet Implemented

- **Agent SDK Package**: Publishable `xbworld-sdk` for pip install
- **Agent Metrics Dashboard**: Real-time web dashboard with charts
- **Replay System**: Record/replay game events for training data
- **Spatial Helpers**: `tile_id_to_xy`, `distance`, `neighbors` in state API
- **Human-Agent Chat Protocol**: Structured intents beyond free-text
- **WebSocket Agent API**: Real-time bidirectional agent communication
- **Packet Filtering**: Agent-aware proxy that filters irrelevant packets
