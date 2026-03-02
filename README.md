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

### Option A: Full Stack (recommended)

```bash
# 1. Install the Freeciv server (one-time)
#    See install-macos.sh or build from source into ~/freeciv/

# 2. Install Python dependencies
cd xbworld-agent
pip install -r requirements.txt

# 3. Set your LLM API key
export COMPASS_API_KEY="your-key-here"

# 4. Start the unified server (serves web UI + API + game launcher)
python server.py --port 8080

# 5. Open http://localhost:8080 in your browser
```

### Option B: AI-Only Game (no browser needed)

```bash
cd xbworld-agent
python multi_main.py --agents 2 --standalone
```

### Option C: macOS Services

```bash
# Start everything (nginx + XBWorld server)
./start-macos.sh

# Stop everything
./stop-macos.sh
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

## Development

### Prerequisites

| Tool | Version | Required for |
|------|---------|-------------|
| Python | 3.10+ | Server, agent, proxy |
| Freeciv server | 3.x | Game engine (compiled from C source) |
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
├── xbworld-agent/           # AI agent system + unified server
│   ├── server.py            #   Unified FastAPI server (replaces Tomcat+publite2)
│   ├── agent.py             #   Core agent loop (LLM ↔ tools)
│   ├── agent_tools.py       #   Tool definitions (move, build, query, …)
│   ├── game_client.py       #   WebSocket client & game state
│   ├── llm_providers.py     #   LLM provider abstraction (Gemini, OpenAI)
│   ├── multi_main.py        #   Multi-agent CLI entry point
│   ├── main.py              #   Single-agent entry point
│   └── config.py            #   Configuration (env vars)
├── xbworld-proxy/           # WebSocket ↔ TCP bridge
│   ├── freeciv-proxy.py     #   Tornado WebSocket server
│   └── civcom.py            #   Protocol translation
├── xbworld-web/             # Web client (static HTML + JS)
│   └── src/main/webapp/
│       ├── webclient/        #   index.html (game client)
│       ├── javascript/       #   Game JS (2D canvas, controls, …)
│       ├── css/              #   Stylesheets
│       └── images/           #   Sprites, logos
├── config/                  # Config templates (nginx)
├── scripts/                 # Install & helper scripts
├── start-macos.sh           # Start services (nginx + server.py)
├── stop-macos.sh            # Stop services
├── ARCHITECTURE.md          # Detailed architecture & roadmap
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
