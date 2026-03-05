# XBWorld AI-First Architecture

XBWorld is designed as an **AI-agent-first** civilization game platform. The primary users are AI agents; humans observe and influence agents via chat.

## Repository Structure

This mono-repo orchestrates three independent components, each designed to work as a standalone repository:

| Directory | Description | Standalone Repo |
|-----------|-------------|-----------------|
| `xbworld-backend/` | Python FastAPI server + freeciv C engine | Has own Dockerfile, docker-compose |
| `xbworld-web/` | TypeScript/HTML5 web client (PIXI.js) | Has own Dockerfile, docker-compose |
| `scripts/`, `config/` | Shared build scripts & config | — |

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
│                  │   (port 8080)   │  [xbworld-backend]       │
│                  └───────┬────────┘                           │
│                          │                                    │
│                  ┌───────▼────────┐                           │
│                  │  WS Proxy      │  ← WebSocket ↔ TCP        │
│                  │ (in-process)   │                           │
│                  └───────┬────────┘                           │
│                          │                                    │
│                  ┌───────▼────────┐                           │
│                  │ freeciv-server │  ← C game engine          │
│                  │ (port 6000+)   │                           │
│                  └────────────────┘                           │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Web Client: TypeScript + PIXI.js [xbworld-web]        │  │
│  │ Served via nginx → reverse proxy to backend            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Deployment Options

| Mode | How | Description |
|------|-----|-------------|
| **Full Stack** | `Dockerfile.railway` | Single image: backend + frontend |
| **Separate Services** | `xbworld-backend/Dockerfile` + `xbworld-web/Dockerfile` | Independent containers |
| **Local Dev** | `docker-compose.yml` | Both services orchestrated |
| **Frontend Dev** | `cd xbworld-web && npm run dev` | Vite dev server, proxies to remote backend |

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
| FastAPI + WS Proxy (Python) | Required | Required | Required |
| xbworld-web (nginx) | Not needed | Recommended | Required |

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

## Freeciv Server Source

The Freeciv C server is included as a git submodule at `xbworld-backend/freeciv/freeciv`,
pointing to the `xbworld` branch of [xingbo778/freeciv](https://github.com/xingbo778/freeciv)
(forked from [freeciv/freeciv](https://github.com/freeciv/freeciv)).

### Branch History

The `xbworld` branch starts from upstream commit `add9f4e1` and includes:
1. Web capstring change (protocol compatibility)
2. 18 patches from freeciv-web (combat fixes, WebSocket protocol, savegame,
   map handling, longturn, etc.) — each applied as an individual commit
3. Custom `xbworld` ruleset (based on webperimental)

### Customization Layers

```
Layer 1: Rulesets          xbworld-backend/freeciv/freeciv/data/xbworld/*.ruleset
         (no recompile     Edit text files, rebuild to install.
          for testing)     Covers: techs, units, buildings, terrain, victory.

Layer 2: Lua Scripts       xbworld-backend/freeciv/freeciv/data/xbworld/script.lua
                           Event-driven logic: turn triggers, special events.

Layer 3: C Source          xbworld-backend/freeciv/freeciv/server/*.c, common/*.c, ai/*.c
                           Full engine control: combat formulas, turn flow,
                           packet protocol, diplomacy logic.
```

### Build Workflow

```bash
cd xbworld-backend/freeciv
./prepare_freeciv.sh          # configure + build + install to ~/freeciv/
./prepare_freeciv.sh clean    # full rebuild from scratch
```

The build script auto-initializes the submodule if needed, runs meson setup
(only on first build), then ninja build + install.

### Committing Server Changes

Changes to the Freeciv source are committed in two places:

```bash
# 1. Inside the submodule (push to xingbo778/freeciv xbworld branch)
cd xbworld-backend/freeciv/freeciv
git add -A && git commit -m "feat: description"
git push origin xbworld

# 2. In the main repo (update submodule reference)
cd ../../..
git add xbworld-backend/freeciv/freeciv
git commit -m "chore: update freeciv submodule"
```

---

## Future Improvements

### Not Yet Implemented

- **Agent SDK Package**: Publishable `xbworld-sdk` for pip install
- **Agent Metrics Dashboard**: Real-time web dashboard with charts
- **Replay System**: Record/replay game events for training data
- **Spatial Helpers**: `tile_id_to_xy`, `distance`, `neighbors` in state API
- **Human-Agent Chat Protocol**: Structured intents beyond free-text
- **WebSocket Agent API**: Real-time bidirectional agent communication
- **Packet Filtering**: Agent-aware proxy that filters irrelevant packets
