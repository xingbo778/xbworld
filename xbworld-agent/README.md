# xbworld-agent

LLM-powered AI agents for XBWorld. Each agent connects to a Freeciv game
server via WebSocket, observes the game state, calls an LLM for strategic
decisions, and executes actions through a tool-calling interface.

---

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt   # aiohttp, fastapi, uvicorn

# Set your LLM API key
export COMPASS_API_KEY="your-key-here"

# Single agent
python main.py --name Bot1

# Multi-agent standalone
python multi_main.py --agents 4 --standalone

# Multi-agent with HTTP API
python multi_main.py --api --standalone
```

---

## Entry Points

| Script | Use case |
|--------|----------|
| `main.py` | Single agent — starts or joins a singleplayer game |
| `multi_main.py` | Multiple agents — CLI or HTTP API mode |
| `test_connection.py` | Quick sanity check (connect, send packets, end turn) |
| `test_multi.py` | Two-agent integration test |
| `test_8agents_50turns.py` | Full stress test with pass/fail criteria |

---

## Configuration

All settings are in `config.py` and can be overridden via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `COMPASS_API_KEY` / `LLM_API_KEY` | — | API key for the LLM provider |
| `LLM_MODEL` | `openai/gemini-3-flash-preview` | Model identifier |
| `LLM_BASE_URL` | Compass endpoint | OpenAI-compatible API base URL |
| `TURN_TIMEOUT` | `30` | Max seconds per agent turn (client-side) |
| `GAME_TURN_TIMEOUT` | `30` | Server-side turn timeout |
| `SERVER_HOST` | `localhost` | XBWorld server host |
| `SERVER_PORT` | `8080` | XBWorld server port |
| `FREECIV_NGINX_HOST` | `localhost` | nginx host (for WebSocket) |
| `FREECIV_NGINX_PORT` | `8000` | nginx port |
| `FREECIV_API_HOST` | `0.0.0.0` | HTTP API bind address |
| `FREECIV_API_PORT` | `8642` | HTTP API port |

### Using Different LLM Providers

```bash
# Gemini via Compass (default)
export LLM_MODEL="openai/gemini-3-flash-preview"
export COMPASS_API_KEY="..."

# OpenAI
export LLM_MODEL="openai/gpt-4o-mini"
export LLM_API_KEY="sk-..."
export LLM_BASE_URL="https://api.openai.com/v1"

# Any OpenAI-compatible endpoint (Ollama, vLLM, etc.)
export LLM_MODEL="openai/llama3"
export LLM_API_KEY="none"
export LLM_BASE_URL="http://localhost:11434/v1"
```

---

## Module Reference

### `agent.py` — Core Agent

`XBWorldAgent` is the main class. It runs a game loop that:

1. Waits for a new turn (`wait_for_new_turn`)
2. Builds a structured state summary
3. Calls the decision engine (LLM by default)
4. Executes returned tool calls
5. Handles follow-up LLM calls if needed
6. Ends the turn

Key methods:

| Method | Description |
|--------|-------------|
| `run_game_loop()` | Main async loop — call this to start the agent |
| `submit_command(text)` | Inject a natural-language command mid-game |
| `get_status()` | Returns dict with turn, gold, cities, units, phase, perf data |
| `close()` | Clean up WebSocket and HTTP sessions |

### `game_client.py` — WebSocket Client

`GameClient` maintains a persistent WebSocket connection and keeps a
`GameState` object updated from server packets.

| Method | Description |
|--------|-------------|
| `start_new_game(game_type)` | Create game via launcher API |
| `join_game(port)` | Connect to existing server on port |
| `send_chat(text)` | Send chat/command (e.g. `/set timeout 30`) |
| `send_packet(packet)` | Send raw JSON packet |
| `wait_for_new_turn(timeout)` | Block until next turn starts |
| `unit_move(unit_id, direction)` | Move unit (computes dest_tile) |
| `city_change_production(city_id, kind, value)` | Change production |
| `close()` | Disconnect |

`GameState` fields: `turn`, `phase`, `players`, `units`, `cities`, `tiles`,
`map_info`, `research`, `game_info`, `connected`.

### `agent_tools.py` — Tool Definitions

Tools are registered with the `@tool` decorator and automatically exported
as OpenAI function-calling schemas.

#### Query Tools

| Tool | Parameters | Returns |
|------|-----------|---------|
| `get_game_overview` | — | Turn, gold, cities, units, research summary |
| `get_my_cities` | — | List of cities with production, size, buildings |
| `get_my_units` | — | List of units with type, tile, HP, moves |
| `get_research_status` | — | Current research, available techs |
| `get_visible_enemies` | — | Enemy units with type, tile, HP, owner |
| `get_recent_messages` | `count?` | Recent chat/event messages |
| `get_tile_info` | `tile_id` | Terrain, resources, improvements |

#### Action Tools

| Tool | Parameters | Effect |
|------|-----------|--------|
| `move_unit` | `unit_id`, `direction` | Move one unit (N/S/E/W/NE/NW/SE/SW) |
| `move_units` | `moves` (list) | Batch move multiple units |
| `found_city` | `unit_id`, `city_name?` | Found a city with a settler |
| `fortify_unit` | `unit_id` | Fortify a unit in place |
| `auto_explore_unit` | `unit_id` | Set unit to auto-explore |
| `disband_unit` | `unit_id` | Disband a unit |
| `sentry_unit` | `unit_id` | Put unit on sentry duty |
| `change_city_production` | `city_id`, `name` | Change what a city produces |
| `set_productions` | `changes` (list) | Batch change multiple cities |
| `set_tax_rates` | `tax`, `science`, `luxury` | Set economy rates (must sum to 100) |
| `end_turn` | — | End the current turn |
| `send_command` | `command` | Send raw server command (e.g. `/set`) |

### `llm_providers.py` — LLM Abstraction

`LLMProvider` is the abstract base class. Two implementations:

- **`GeminiProvider`** — Native Compass/Gemini API with function declarations
- **`OpenAIProvider`** — OpenAI-compatible chat completions (works with any
  OpenAI-compatible endpoint)

`create_provider(model)` auto-selects based on the model string prefix.

### `decision_engine.py` — Pluggable Engines

`DecisionEngine` is the interface for swapping decision logic:

| Engine | Description |
|--------|-------------|
| `LLMEngine` | Default — uses LLM function-calling with conversation history |
| `RuleBasedEngine` | Simple priority-based rules (found city > explore > fortify) |
| `ExternalEngine` | Placeholder for externally-controlled agents via API |

Implement your own:

```python
from decision_engine import DecisionEngine, ToolCall

class MyEngine(DecisionEngine):
    engine_type = "custom"

    async def decide(self, state, available_tools, context=None):
        actions = []
        for unit in state.get("units", []):
            if unit["movesleft"] > 0:
                actions.append(ToolCall("move_unit", {
                    "unit_id": unit["id"],
                    "direction": "east",
                }))
        actions.append(ToolCall("end_turn", {}))
        return actions
```

### `multi_main.py` — Orchestrator & API

`GameOrchestrator` manages the full lifecycle:

- Spawns freeciv-server + proxy (standalone mode)
- Connects all agents
- Configures game settings (aifill, timeout)
- Starts agent game loops
- Provides shutdown/cleanup

**CLI usage:**

```bash
# Count-based
python multi_main.py --agents 4

# Named with strategies
python multi_main.py --agents "alpha:aggressive,beta:defensive"

# JSON config
python multi_main.py --config agents.json

# Standalone mode
python multi_main.py --agents 2 --standalone

# HTTP API mode
python multi_main.py --api --standalone --api-port 9000
```

**HTTP API endpoints** (when running with `--api`):

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/game/create` | `{agents, aifill?, server_port?}` | Create game |
| GET | `/game/status` | — | All agent statuses |
| DELETE | `/game` | — | Shutdown game |
| GET | `/agents/{name}/state` | — | Single agent state |
| POST | `/agents/{name}/command` | `{command}` | Natural-language command |
| GET | `/agents/{name}/log?limit=50` | — | Action log |

### `state_api.py` — Structured State

`game_state_to_json(client)` converts the raw `GameState` into a clean
JSON-serializable dict with:

- Player info (gold, tax, science, luxury, government)
- Cities (id, name, size, production, turns left)
- Units (id, type, tile, HP, moves left, activity)
- Research (current tech, bulbs, available techs)
- Visible enemies
- Turn deltas (new/lost units, new cities, completed techs)

`StateTracker` maintains per-agent delta tracking across turns.

---

## Performance Monitoring

The agent includes a built-in `PerfTracker` that records:

- LLM call duration
- Tool execution duration
- Idle wait time
- Conversation size (token estimate)
- Checkpoint summaries every 5 turns

Access via `agent.get_status()` which includes `perf` data, or check the
agent logs.

---

## Tests

```bash
# Quick connection test
python test_connection.py

# Two-agent state isolation test
python test_multi.py

# 8-agent 50-turn stress test
# Pass criteria: ≥2 cities by turn 20, no stuck >60s, <5% errors, all reach turn 50
python test_8agents_50turns.py
```

---

## Directory Structure

```
xbworld-agent/
├── agent.py              # Core agent loop
├── agent_tools.py        # Tool definitions (@tool decorator)
├── config.py             # Configuration (env vars)
├── decision_engine.py    # DecisionEngine interface + implementations
├── game_client.py        # WebSocket client + GameState
├── llm_providers.py      # LLM provider abstraction
├── main.py               # Single-agent entry point
├── multi_main.py         # Multi-agent orchestrator + FastAPI API
├── state_api.py          # Structured JSON state export
├── requirements.txt      # Python dependencies
├── test_connection.py    # Connection sanity test
├── test_multi.py         # Two-agent integration test
└── test_8agents_50turns.py  # Full stress test
```
