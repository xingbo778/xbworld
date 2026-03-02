# XBWorld

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

**XBWorld** is an AI-powered civilization strategy game where LLM agents compete
against each other and human players. Built on the [Freeciv](https://www.freeciv.org/)
engine, it adds a multi-agent AI layer that lets language models play the game
autonomously — making strategic decisions about exploration, city building,
research, diplomacy, and warfare.

---

## Highlights

- **Multi-Agent AI** — Run 8+ LLM agents in a single game, each with its own
  strategy personality (aggressive, defensive, economic, …).
- **Human + AI** — Observe games in the browser, send natural-language commands
  to agents mid-game, or play alongside them.
- **Pluggable LLM** — Swap between Gemini, GPT-4o, Claude, or any
  OpenAI-compatible API via a single env var.
- **REST & WebSocket API** — Create games, send commands, stream events, and
  query game state programmatically.
- **Simplified Stack** — Only 3 processes needed: Python (FastAPI), freeciv-server (C), and optionally nginx. No Java, Tomcat, or MariaDB.
- **Web Client** — 2D isometric HTML5 client with dark translucent UI,
  Chinese/English i18n, and floating HUD.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        AI Agents                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Agent 1  │  │ Agent 2  │  │ Agent N  │   (Python)        │
│  │  (LLM)   │  │  (LLM)   │  │  (LLM)   │                   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
│       └──────────────┼──────────────┘                         │
│                      │ WebSocket (JSON)                       │
├──────────────────────┼────────────────────────────────────────┤
│                      ▼                                        │
│  ┌──────────────────────────────────┐                        │
│  │     xbworld-proxy (Tornado)      │◄── WebSocket ── Browser│
│  └──────────────┬───────────────────┘                        │
│                 │ TCP (Freeciv binary protocol)               │
│                 ▼                                             │
│  ┌──────────────────────────────────┐                        │
│  │     freeciv-server (C)           │                        │
│  └──────────────────────────────────┘                        │
│                                                               │
│  ┌──────────────────────────────────┐                        │
│  │  XBWorld Server (FastAPI)        │  ← serves web UI,      │
│  │  API + static files + launcher   │    replaces Tomcat      │
│  └──────────────────────────────────┘                        │
│                                                               │
│  ┌──────────┐  (optional, for production)                    │
│  │  nginx   │                                                 │
│  └──────────┘                                                 │
└──────────────────────────────────────────────────────────────┘
```

| Directory | Description | Language |
|-----------|-------------|----------|
| `xbworld-agent/` | LLM agents, orchestrator, unified FastAPI server | Python |
| `xbworld-proxy/` | WebSocket ↔ TCP protocol bridge | Python (Tornado) |
| `xbworld-web/` | Web client (2D HTML5 renderer, lobby) | HTML / JS / CSS |
| `publite2/` | Legacy process manager (replaced by server.py) | Python |
| `config/` | Configuration templates (nginx) | Conf / INI |
| `scripts/` | Install helpers, asset sync, logo generation | Shell / Python |

> See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed component interactions,
> data flow, bottleneck analysis, and the optimization roadmap.

---

## Quick Start

### 1. Clone with Submodule

```bash
git clone --recurse-submodules https://github.com/xingbo778/xbworld.git
cd xbworld
```

### 2. Build the Freeciv Server

```bash
# Install build dependencies (macOS)
brew install meson ninja jansson icu4c pkg-config lua

# Build and install to ~/freeciv/
cd freeciv && ./prepare_freeciv.sh && cd ..
```

### 3. Run AI Agents

```bash
cd xbworld-agent
pip install -r requirements.txt
export COMPASS_API_KEY="your-key-here"

# AI-only game (no browser needed)
python multi_main.py --agents 2 --standalone

# Or: full stack with web UI
python server.py --port 8080
# Open http://localhost:8080
```

---

## Agent Configuration

### CLI Options

```bash
python multi_main.py \
  --agents "alpha:aggressive,beta:defensive,gamma:economic" \
  --aifill 5          # add 5 built-in AI players \
  --standalone         # spawn server directly \
  --join 6001          # join existing server on port 6001 \
  --api                # start HTTP API instead of CLI \
  -v                   # verbose/debug logging
```

### JSON Config File

```bash
python multi_main.py --config agents.json --standalone
```

```json
[
  {"name": "alpha", "strategy": "aggressive military expansion"},
  {"name": "beta",  "strategy": "defensive turtle with science focus"},
  {"name": "gamma", "strategy": "economic and diplomatic", "llm_model": "openai/gpt-4o-mini"}
]
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COMPASS_API_KEY` | — | LLM API key (also reads `LLM_API_KEY`) |
| `LLM_MODEL` | `openai/gemini-3-flash-preview` | LLM model identifier |
| `LLM_BASE_URL` | Compass endpoint | OpenAI-compatible API base URL |
| `TURN_TIMEOUT` | `30` | Agent-side turn timeout (seconds) |
| `GAME_TURN_TIMEOUT` | `30` | Server-side turn timeout (seconds) |
| `XBWORLD_PORT` | `8080` | Unified server port |

---

## REST API Reference

The unified server (`server.py`) provides these endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Web client (game UI) |
| `POST` | `/civclientlauncher` | Launch a game server (JS client compat) |
| `GET` | `/meta/status` | Metaserver status |
| `POST` | `/game/create` | Create a new game with agent configs |
| `GET` | `/game/status` | Get status of all agents |
| `DELETE` | `/game` | Shut down current game |
| `GET` | `/agents/{name}/state` | Get detailed state for one agent |
| `POST` | `/agents/{name}/command` | Send natural-language command to agent |
| `GET` | `/agents/{name}/log` | Get action log (default last 50 entries) |
| `GET` | `/servers` | List active game servers |

Interactive API docs available at `/docs` (Swagger UI).

---

## Customizing the Game

The Freeciv C server source is included as a git submodule at `freeciv/freeciv`
(fork: [xingbo778/freeciv](https://github.com/xingbo778/freeciv), branch `xbworld`).
You have full control over the game engine at three levels:

### Rulesets (no C code changes)

Edit files in `freeciv/freeciv/data/xbworld/` to change game rules:

| File | What you can change |
|------|-------------------|
| `techs.ruleset` | Tech tree, research costs, prerequisites |
| `units.ruleset` | Unit stats (attack, defense, HP, movement, cost) |
| `buildings.ruleset` | Buildings and wonders |
| `effects.ruleset` | Numeric effects of buildings/governments/techs |
| `game.ruleset` | Victory conditions, start units, turn limits |
| `terrain.ruleset` | Terrain output, movement costs |
| `script.lua` | Lua event scripts (custom triggers, special events) |

After editing, rebuild: `cd freeciv && ./prepare_freeciv.sh`

### C Source (full engine control)

Modify C source directly in the submodule for deeper changes:

- `freeciv/freeciv/server/` — Server logic (turns, combat, diplomacy)
- `freeciv/freeciv/common/` — Shared protocol, data structures, packets
- `freeciv/freeciv/ai/` — Built-in AI logic

```bash
# Edit, rebuild, test
cd freeciv && ./prepare_freeciv.sh
cd ../xbworld-agent && python multi_main.py --agents 2 --standalone

# Commit changes to the fork
cd freeciv/freeciv
git add -A && git commit -m "feat: my game change"
git push origin xbworld

# Update submodule ref in main repo
cd ../..
git add freeciv/freeciv && git commit -m "chore: update freeciv submodule"
```

### Syncing with Upstream Freeciv

```bash
cd freeciv/freeciv
git remote add upstream https://github.com/freeciv/freeciv.git  # one-time
git fetch upstream
git merge upstream/main  # resolve conflicts if any
git push origin xbworld
```

---

## Development

### Prerequisites

| Tool | Version | Required for |
|------|---------|-------------|
| Python | 3.10+ | Server, agent, proxy |
| meson + ninja | Latest | Building Freeciv C server |
| jansson, icu4c, lua | Latest | Freeciv build dependencies |
| nginx | 1.11+ | Reverse proxy (optional, for production) |

**No longer required:** Java, Maven, Tomcat, MariaDB.

### Running Tests

```bash
cd xbworld-agent

# Basic connection test
python test_connection.py

# Two-agent integration test
python test_multi.py

# Full 8-agent 50-turn stress test
python test_8agents_50turns.py
```

### Project Layout

```
xbworld/
├── freeciv/                 # Freeciv C server
│   ├── freeciv/             #   Git submodule → xingbo778/freeciv (xbworld branch)
│   │   ├── server/          #     Server logic (C source, fully editable)
│   │   ├── common/          #     Shared protocol & data structures
│   │   ├── ai/              #     Built-in AI logic
│   │   └── data/xbworld/   #     Custom ruleset (techs, units, buildings, …)
│   ├── build/               #   Compiled artifacts (.gitignored)
│   ├── patches/             #   Historical patch files (reference)
│   └── prepare_freeciv.sh   #   Build script (meson + ninja)
├── xbworld-agent/           # AI agent system + unified server
│   ├── server.py            #   Unified FastAPI server
│   ├── agent.py             #   Core agent loop (LLM ↔ tools)
│   ├── agent_tools.py       #   Tool definitions (move, build, query, …)
│   ├── game_client.py       #   WebSocket client & game state
│   ├── llm_providers.py     #   LLM provider abstraction
│   └── multi_main.py        #   Multi-agent orchestrator
├── xbworld-proxy/           # WebSocket ↔ TCP bridge
├── xbworld-web/             # Web client (HTML5 2D renderer)
├── ARCHITECTURE.md          # System architecture & roadmap
├── CONTRIBUTING.md          # Contribution guide
└── CHANGELOG.md             # Release notes
```

---

## License

The Freeciv C server is released under the
[GNU General Public License](https://www.gnu.org/licenses/gpl-3.0.html).
The XBWorld client and agent code is released under the
[GNU Affero General Public License](https://www.gnu.org/licenses/agpl-3.0.html).

## Credits

XBWorld is built on top of
[Freeciv-web](https://github.com/freeciv/freeciv-web) by the Freeciv
community.
