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
- **Standalone Mode** — Run AI-only games with just 3 processes (no Tomcat,
  nginx, or MariaDB required).
- **Web Client** — 2D isometric HTML5 client with dark translucent UI,
  Chinese/English i18n, and floating HUD.

---

## Architecture Overview

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
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  (for web UI)     │
│  │  nginx   │  │  Tomcat  │  │ MariaDB  │                    │
│  └──────────┘  └──────────┘  └──────────┘                    │
└──────────────────────────────────────────────────────────────┘
```

| Directory | Description | Language |
|-----------|-------------|----------|
| `xbworld-agent/` | LLM-powered AI agents, orchestrator, REST API | Python |
| `xbworld-proxy/` | WebSocket ↔ TCP protocol bridge | Python (Tornado) |
| `xbworld-web/` | Web client (2D HTML5 renderer, lobby) | Java / JSP / JS / CSS |
| `publite2/` | Game server process manager | Python |
| `config/` | Configuration templates (nginx, DB, proxy) | Shell / INI |
| `scripts/` | Install helpers, asset sync, logo generation | Shell / Python |

> See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed component interactions,
> data flow, bottleneck analysis, and the optimization roadmap.

---

## Quick Start

### Option A: Standalone AI Game (minimal setup)

Only requires the Freeciv C server binary — no Tomcat, nginx, or MariaDB.

```bash
# 1. Install the Freeciv server (one-time)
#    See install-macos.sh or build from source into ~/freeciv/

# 2. Install Python dependencies
cd xbworld-agent
pip install -r requirements.txt

# 3. Set your LLM API key
export COMPASS_API_KEY="your-key-here"
# Or use any OpenAI-compatible endpoint:
# export LLM_MODEL="openai/gpt-4o-mini"
# export LLM_API_KEY="sk-..."
# export LLM_BASE_URL="https://api.openai.com/v1"

# 4. Run a 2-agent game
python multi_main.py --agents 2 --standalone
```

### Option B: Full Stack (with web UI)

```bash
# 1. Install all dependencies (macOS)
./install-macos.sh

# 2. Start all services (MariaDB, Tomcat, nginx, publite2)
./start-macos.sh

# 3. Open the web client
open http://localhost:8000

# 4. Run AI agents against the web server
cd xbworld-agent
python multi_main.py --agents 8
```

### Option C: HTTP API Mode

Start the orchestrator as a REST API server for programmatic control.

```bash
cd xbworld-agent
python multi_main.py --api --standalone

# In another terminal:
# Create a game
curl -X POST http://localhost:8642/game/create \
  -H "Content-Type: application/json" \
  -d '{"agents": [
    {"name": "alpha", "strategy": "aggressive military"},
    {"name": "beta",  "strategy": "science and defense"}
  ]}'

# Check status
curl http://localhost:8642/game/status

# Send a command to an agent
curl -X POST http://localhost:8642/agents/alpha/command \
  -H "Content-Type: application/json" \
  -d '{"command": "focus on building warriors and expanding west"}'
```

---

## Agent Configuration

### CLI Options

```bash
python multi_main.py \
  --agents "alpha:aggressive,beta:defensive,gamma:economic" \
  --aifill 5          # add 5 built-in AI players \
  --standalone         # no Tomcat/MariaDB needed \
  --join 6001          # join existing server on port 6001 \
  --api                # start HTTP API instead of CLI \
  --api-port 9000      # custom API port \
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
| `FREECIV_API_PORT` | `8642` | HTTP API port for multi-agent mode |

---

## REST API Reference

When running with `--api`, the following endpoints are available:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/game/create` | Create a new game with agent configs |
| `GET` | `/game/status` | Get status of all agents |
| `DELETE` | `/game` | Shut down current game |
| `GET` | `/agents/{name}/state` | Get detailed state for one agent |
| `POST` | `/agents/{name}/command` | Send natural-language command to agent |
| `GET` | `/agents/{name}/log` | Get action log (default last 50 entries) |

> See [xbworld-agent/README.md](xbworld-agent/README.md) for full API details
> and the list of available agent tools.

---

## Development

### Prerequisites

| Tool | Version | Required for |
|------|---------|-------------|
| Python | 3.10+ | Agent, proxy, publite2 |
| Java (OpenJDK) | 17 | Web client (Tomcat/Maven) |
| Maven | 3 | Building xbworld-web WAR |
| MariaDB | 10+ | Proxy auth (skip with `--standalone`) |
| nginx | 1.11+ | Reverse proxy (skip with `--standalone`) |
| Tomcat | 10 | JSP rendering (skip with `--standalone`) |
| Freeciv server | 3.x | Game engine (compiled from C source) |

### Building the Web Client

```bash
cd xbworld-web
mvn package
# Deploy the WAR to Tomcat webapps/
```

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
├── xbworld-agent/           # AI agent system
│   ├── agent.py             #   Core agent loop (LLM ↔ tools)
│   ├── agent_tools.py       #   Tool definitions (move, build, query, …)
│   ├── game_client.py       #   WebSocket client & game state
│   ├── llm_providers.py     #   LLM provider abstraction (Gemini, OpenAI)
│   ├── decision_engine.py   #   Pluggable decision engine interface
│   ├── state_api.py         #   Structured JSON state export
│   ├── multi_main.py        #   Orchestrator + FastAPI HTTP API
│   ├── main.py              #   Single-agent entry point
│   └── config.py            #   Configuration (env vars)
├── xbworld-proxy/           # WebSocket ↔ TCP bridge
│   ├── freeciv-proxy.py     #   Tornado WebSocket server
│   └── civcom.py            #   Protocol translation
├── xbworld-web/             # Web client
│   └── src/main/webapp/
│       ├── javascript/      #   Game JS (2D canvas, controls, …)
│       ├── css/             #   Stylesheets
│       ├── images/          #   Sprites, logos
│       └── WEB-INF/jsp/     #   JSP templates
├── publite2/                # Server process manager
├── config/                  # Config templates
├── scripts/                 # Install & helper scripts
├── start-macos.sh           # Start all services
├── stop-macos.sh            # Stop all services
├── install-macos.sh         # One-time macOS setup
├── ARCHITECTURE.md          # Detailed architecture & roadmap
├── CHANGELOG.md             # Release notes
└── CONTRIBUTING.md          # Contribution guide
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
