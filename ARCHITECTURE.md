# XBWorld: AI-First Architecture Optimization Plan

This document describes the current architecture, identifies optimization
opportunities for an AI-agent-first platform, and proposes a phased roadmap.

## Current Architecture (as-is)

```
┌─────────────────────────────────────────────────────────────┐
│                       AI Agents                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Agent 1  │  │ Agent 2  │  │ Agent N  │  (Python)       │
│  │ (LLM)    │  │ (LLM)    │  │ (LLM)    │                 │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                 │
│       │              │              │                       │
│       └──────────────┼──────────────┘                       │
│                      │ WebSocket (JSON)                     │
├──────────────────────┼──────────────────────────────────────┤
│                      ▼                                      │
│  ┌─────────────────────────────────┐                       │
│  │     xbworld-proxy (Tornado)     │◄── WebSocket ── Browser│
│  └──────────────┬──────────────────┘                       │
│                 │ TCP (binary Freeciv protocol)             │
│                 ▼                                           │
│  ┌─────────────────────────────────┐                       │
│  │     freeciv-server (C)          │                       │
│  └─────────────────────────────────┘                       │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  nginx   │  │  Tomcat  │  │ MariaDB  │                 │
│  │ (proxy)  │  │  (JSP)   │  │ (auth)   │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### Component Roles

| Component | Role | Language | Required? |
|-----------|------|----------|-----------|
| freeciv-server | Game simulation engine | C | Yes |
| xbworld-proxy | WebSocket↔TCP protocol bridge | Python (Tornado) | Yes |
| xbworld-web | Web client (HTML5 2D renderer) | Java/JSP/JS | For human observers |
| publite2 | Server process manager | Python | Yes |
| nginx | Reverse proxy, static files | Config | For web access |
| Tomcat 10 | JSP rendering, servlet container | Java | For web access |
| MariaDB | User auth, game stats | SQL | For proxy auth |
| xbworld-agent | LLM-powered AI players | Python | For AI games |

### Data Flow

1. **Agent → Proxy**: JSON packets over WebSocket (e.g., `{"pid": 73, "unit_id": 42, ...}`)
2. **Proxy → Server**: Binary Freeciv protocol over TCP
3. **Server → Proxy**: Binary packets translated to JSON
4. **Proxy → Agent**: JSON game state updates over WebSocket
5. **Browser → nginx → Tomcat**: HTTP for page rendering
6. **Browser → nginx → Proxy**: WebSocket for game interaction

### Current Bottlenecks

Based on performance profiling (`PerfTracker` data from 50-turn tests):

1. **LLM latency dominates** (~70% of turn time): Each turn requires 1-3 LLM
   calls at 2-5s each. This is the single largest bottleneck.
2. **Conversation size grows**: Without aggressive trimming, token count
   increases each turn, slowing LLM responses.
3. **Sequential tool execution**: Tools are called one at a time; no batching.
4. **MariaDB overhead**: Required even for AI-only games where no auth is needed.
5. **Tomcat/JSP overhead**: Full Java stack required even when no human is
   observing.

---

## Identified Optimization Areas

### P0 — Critical (blocks third-party agent adoption)

#### 1. Agent Connect API

**Problem**: No way for external agents to join a game. Only the built-in
orchestrator (`multi_main.py`) can create agents.

**Solution**: Add REST endpoint for game joining.

```
POST /api/game/{game_id}/join
Content-Type: application/json

{
  "agent_name": "MyBot",
  "agent_type": "external"
}

Response:
{
  "ws_url": "ws://localhost:8000/civsocket/1042",
  "auth_token": "abc123",
  "player_id": 3
}
```

**Effort**: Medium. Requires new FastAPI route in `multi_main.py` and proxy
auth bypass for token-based connections.

#### 2. Direct Tool Execution API

**Problem**: The only external interface is `POST /agents/{name}/command` which
routes through the LLM. Non-LLM agents (RL, MCTS, rule-based) cannot play.

**Solution**: Add raw action endpoint.

```
POST /api/agents/{name}/actions
Content-Type: application/json

{
  "actions": [
    {"tool": "unit_move", "args": {"unit_id": 42, "direction": "north"}},
    {"tool": "change_city_production", "args": {"city_id": 1, "name": "Granary"}},
    {"tool": "end_turn", "args": {}}
  ]
}

Response:
{
  "results": [
    {"tool": "unit_move", "success": true, "result": "Unit 42 moved north"},
    {"tool": "change_city_production", "success": true, "result": "City 1 now producing Granary"},
    {"tool": "end_turn", "success": true, "result": "Turn ended"}
  ]
}
```

**Effort**: Small. The tool execution infrastructure already exists in
`agent_tools.py`; just needs an HTTP wrapper.

#### 3. Pluggable Decision Engine

**Problem**: `XBWorldAgent` hardcodes the LLM loop. Swapping decision-making
logic requires modifying the agent class.

**Solution**: Introduce a `DecisionEngine` interface.

```python
from abc import ABC, abstractmethod

class DecisionEngine(ABC):
    @abstractmethod
    async def decide(self, state: GameState, tools: list[dict]) -> list[ToolCall]:
        """Given game state and available tools, return actions to execute."""
        ...

class LLMEngine(DecisionEngine):
    """Current LLM-based decision making."""
    async def decide(self, state, tools):
        # Call LLM with state summary, get tool calls back
        ...

class RuleBasedEngine(DecisionEngine):
    """Simple rule-based AI for testing and baselines."""
    async def decide(self, state, tools):
        actions = []
        for unit in state.my_units().values():
            if unit_is_settler(unit) and no_nearby_city(unit, state):
                actions.append(ToolCall("found_city", {"unit_id": unit["id"]}))
            else:
                actions.append(ToolCall("unit_move", {"unit_id": unit["id"], "direction": "east"}))
        actions.append(ToolCall("end_turn", {}))
        return actions

class RLEngine(DecisionEngine):
    """Reinforcement learning agent."""
    async def decide(self, state, tools):
        observation = state_to_tensor(state)
        action = self.model.predict(observation)
        return tensor_to_tool_calls(action, state)
```

**Effort**: Medium. Requires refactoring `XBWorldAgent._autonomous_turn()` and
`_llm_loop()` to use the engine interface.

---

### P1 — Important (performance and scalability)

#### 4. Remove MariaDB Dependency for AI Games

**Problem**: The proxy requires MySQL for auth even when no password is needed.
MariaDB is the heaviest infrastructure dependency.

**Solution**: Add `--no-auth` flag to `xbworld-proxy/freeciv-proxy.py`.

```python
# In freeciv-proxy.py
if args.no_auth:
    # Skip DB connection entirely
    def authenticate(username, password):
        return True
```

**Effort**: Small. The auth code is isolated in the proxy's connection handler.

#### 5. Structured Game State API

**Problem**: State summaries are text-based, consuming many LLM tokens.

**Solution**: JSON state endpoint with turn deltas.

```
GET /api/game/{game_id}/state

{
  "turn": 15,
  "year": "2000 BC",
  "my_player": {
    "id": 0, "gold": 42, "tax": 30, "science": 60, "luxury": 10
  },
  "my_units": [
    {"id": 42, "type": "Warriors", "tile": 1234, "hp": 10, "moves_left": 1}
  ],
  "my_cities": [
    {"id": 1, "name": "Berlin", "size": 3, "producing": "Granary", "turns_left": 4}
  ],
  "visible_enemies": [
    {"type": "Warriors", "tile": 1240, "owner": 2, "hp": 10}
  ],
  "delta_since_last": {
    "new_units": [], "lost_units": [38], "new_cities": [],
    "tech_completed": "Bronze Working"
  }
}
```

**Effort**: Medium. State data already exists in `GameState`; needs JSON
serialization and delta tracking.

#### 6. Observer Event Stream

**Problem**: No way to monitor games without the full webclient.

**Solution**: Server-Sent Events endpoint.

```
GET /api/game/{game_id}/events
Accept: text/event-stream

data: {"type": "turn_start", "turn": 15, "year": "2000 BC"}
data: {"type": "unit_move", "player": 0, "unit_id": 42, "from": 1234, "to": 1235}
data: {"type": "city_founded", "player": 0, "city": "Berlin", "tile": 1234}
data: {"type": "combat", "attacker": {"player": 0, "unit": 42}, "defender": {"player": 2, "unit": 99}, "winner": "attacker"}
data: {"type": "turn_end", "turn": 15}
```

**Effort**: Medium. Requires event emission in packet handlers and SSE endpoint.

#### 7. Static Observer Client

**Problem**: Tomcat/Java required just to serve the webclient.

**Solution**: Extract JSP into static HTML. The JSP only provides:
- Build timestamp (`${initParam.buildTimeStamp}`)
- Config properties (GA tracking, captcha keys)
- i18n message formatting

All of these can be baked into static files at build time.

**Effort**: Large. Requires build-time JSP rendering or manual extraction.

---

### P2 — Nice to Have (developer experience)

#### 8. Agent SDK / Client Library

Publish `xbworld-sdk` Python package:

```python
from xbworld import GameClient, ToolRegistry

client = GameClient("ws://localhost:8000/civsocket/1042")
await client.connect(username="MyBot")

# Get state
state = await client.get_state()
print(f"Turn {state.turn}, {len(state.my_units)} units")

# Execute actions
await client.move_unit(42, "north")
await client.found_city(43)
await client.end_turn()
```

**Effort**: Medium. Wrap existing `GameClient` with cleaner API.

#### 9. Batch Tool Execution

**Problem**: ~20 individual tool calls per turn creates round-trip overhead.

**Solution**: Support batch operations.

```python
# Instead of 20 individual calls:
await client.move_unit(42, "north")
await client.move_unit(43, "east")
await client.change_production(1, "Granary")

# Single batch call:
await client.batch([
    MoveUnit(42, "north"),
    MoveUnit(43, "east"),
    ChangeProduction(1, "Granary"),
])
```

**Effort**: Small. Batch wrapper around existing packet sending.

#### 10. Agent Metrics Dashboard

Real-time web dashboard showing per-agent metrics:
- Turn time breakdown (LLM / tool / idle)
- Cities, units, gold over time
- Tool call frequency
- Error rate

Built on the observer event stream (P1.6).

**Effort**: Medium. Frontend dashboard + metrics aggregation.

#### 11. Replay System

Record all game events to JSONL file for:
- Offline analysis
- Training data generation for RL agents
- Replay viewing in the webclient

**Effort**: Small. Hook into packet handlers to write events.

#### 12. Turn Synchronization

**Problem**: Turn timeout is infinite (`/set timeout 0`). One slow agent blocks
all others.

**Solution**: Default 15-second timeout for AI games.

```python
# In multi_main.py, after game start:
await client.send_chat("/set timeout 15")
```

**Effort**: Trivial. Single configuration change.

#### 13. Spatial Helpers in Game State

Add coordinate utilities so agents can reason spatially:

```python
class GameState:
    def tile_to_xy(self, tile_id: int) -> tuple[int, int]: ...
    def xy_to_tile(self, x: int, y: int) -> int: ...
    def distance(self, tile_a: int, tile_b: int) -> int: ...
    def neighbors(self, tile_id: int) -> list[int]: ...
    def tiles_in_radius(self, tile_id: int, radius: int) -> list[int]: ...
```

**Effort**: Small. Math utilities using existing `map_info`.

#### 14. Human-Agent Chat Protocol

Formalize how human observers influence agents:

```json
{"type": "suggest_strategy", "content": "focus on defense, enemy nearby"}
{"type": "approve_action", "action_id": 123}
{"type": "override_production", "city_id": 1, "produce": "Phalanx"}
{"type": "set_priority", "priority": "expand_west"}
```

**Effort**: Medium. Requires structured intent parsing in agent.

---

## Target Architecture (to-be)

```
┌─────────────────────────────────────────────────────────────┐
│              AI Agents (any language/framework)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ LLM Agent│  │ RL Agent │  │ External │                  │
│  │ (Python) │  │ (PyTorch)│  │ (Go/JS)  │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                 │
│       │              │              │                       │
│       └──────────────┼──────────────┘                       │
│                      │ REST + WebSocket                     │
├──────────────────────┼──────────────────────────────────────┤
│                      ▼                                      │
│  ┌─────────────────────────────────┐                       │
│  │     FastAPI Gateway             │                       │
│  │  /api/game/join                 │                       │
│  │  /api/agents/{name}/actions     │                       │
│  │  /api/game/{id}/state           │                       │
│  │  /api/game/{id}/events (SSE)    │                       │
│  └──────────────┬──────────────────┘                       │
│                 │                                           │
│  ┌──────────────┼──────────────────┐                       │
│  │  xbworld-proxy (Tornado)        │                       │
│  │  --no-auth mode for AI games    │                       │
│  └──────────────┬──────────────────┘                       │
│                 │                                           │
│  ┌─────────────────────────────────┐                       │
│  │     freeciv-server (C)          │                       │
│  └─────────────────────────────────┘                       │
│                                                             │
│  ┌──────────────────────────────────────┐                  │
│  │  Static Observer UI (nginx only)     │                  │
│  │  + Metrics Dashboard                 │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Dependency Reduction Roadmap

| Component | Current | AI-Only Target | Observation Target |
|-----------|---------|----------------|-------------------|
| freeciv-server | Required | Required | Required |
| xbworld-proxy | Required | Required | Required |
| nginx | Required | Optional | Required |
| Tomcat/Java | Required | **Remove** | **Remove** (static UI) |
| MariaDB | Required | **Remove** (`--no-auth`) | **Remove** |
| publite2 | Required | **Remove** (standalone) | **Remove** |

**AI-only minimum**: freeciv-server + xbworld-proxy + xbworld-agent (3 processes)

---

## Implementation Priority

### Phase A: Quick Wins (1-2 days each)

| # | Optimization | Effort | Impact |
|---|-------------|--------|--------|
| A1 | Direct Tool Execution API (P0.2) | S | Enables non-LLM agents |
| A2 | Remove MariaDB for AI games (P1.4) | S | Eliminates heaviest dep |
| A3 | Turn synchronization (P2.12) | Trivial | Prevents agent blocking |
| A4 | Batch tool execution (P2.9) | S | 5-10x fewer round-trips |
| A5 | Spatial helpers (P2.13) | S | Better agent reasoning |

### Phase B: Core Platform (1-2 weeks)

| # | Optimization | Effort | Impact |
|---|-------------|--------|--------|
| B1 | Agent Connect API (P0.1) | M | Third-party agent support |
| B2 | Pluggable Decision Engine (P0.3) | M | RL/rule-based agents |
| B3 | Structured Game State API (P1.5) | M | Reduces LLM tokens 50%+ |
| B4 | Observer Event Stream (P1.6) | M | Monitoring, analytics |

### Phase C: Polish (2-4 weeks)

| # | Optimization | Effort | Impact |
|---|-------------|--------|--------|
| C1 | Agent SDK package (P2.8) | M | Developer adoption |
| C2 | Metrics Dashboard (P2.10) | M | Observability |
| C3 | Replay System (P2.11) | S | Training data, analysis |
| C4 | Static Observer Client (P1.7) | L | Remove Tomcat entirely |
| C5 | Human-Agent Chat Protocol (P2.14) | M | Human-AI interaction |

### Breaking Changes

- **Phase A**: No breaking changes. All additive.
- **Phase B**: `XBWorldAgent` constructor changes (engine parameter). Existing
  code works with default `LLMEngine`.
- **Phase C**: Static client replaces JSP. URL structure may change.

---

## Migration Guide

### For existing agents (multi_main.py users)

No changes required for Phase A. After Phase B:

```python
# Before (still works):
agent = XBWorldAgent(client, name="Bot1")

# After (new option):
from engines import LLMEngine, RuleBasedEngine
agent = XBWorldAgent(client, name="Bot1", engine=LLMEngine())
# or
agent = XBWorldAgent(client, name="Bot1", engine=RuleBasedEngine())
```

### For new external agents

After Phase A (Direct Tool API):

```bash
# Join a game
curl -X POST http://localhost:8642/api/agents/MyBot/actions \
  -H "Content-Type: application/json" \
  -d '{"actions": [{"tool": "get_game_overview", "args": {}}]}'
```

After Phase B (Agent Connect API):

```bash
# Get WebSocket URL
WS_URL=$(curl -s -X POST http://localhost:8642/api/game/1/join \
  -d '{"agent_name": "MyBot"}' | jq -r .ws_url)

# Connect directly
wscat -c "$WS_URL"
```

---

*Document version: 0.1.0 | Last updated: 2026-03-02*
