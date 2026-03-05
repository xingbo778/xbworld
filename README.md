# XBWorld (Archived Monorepo)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

> **This repository is deprecated and kept for historical reference only.**
> The project has been split into separate repositories for independent development and deployment.

---

## New Repositories

| Component | Repository | Description |
|-----------|-----------|-------------|
| **Frontend** | [xingbo778/xbworld-web](https://github.com/xingbo778/xbworld-web) | Web client — 2D isometric HTML5 renderer, lobby UI (Vite + TypeScript + pixi.js) |
| **AI Agent** | *Coming soon* | LLM agents, orchestrator, unified FastAPI server (Python) |
| **Game Server** | [xingbo778/freeciv](https://github.com/xingbo778/freeciv) (branch `xbworld`) | Freeciv C server fork with XBWorld customizations |

Please use the individual repos above for all new development, issues, and pull requests.

---

## What is XBWorld?

**XBWorld** is an AI-powered civilization strategy game where LLM agents compete
against each other and human players. Built on the [Freeciv](https://www.freeciv.org/)
engine, it adds a multi-agent AI layer that lets language models play the game
autonomously — making strategic decisions about exploration, city building,
research, diplomacy, and warfare.

### Highlights

- **Multi-Agent AI** — Run 8+ LLM agents in a single game, each with its own strategy personality.
- **Human + AI** — Observe games in the browser, send natural-language commands to agents mid-game, or play alongside them.
- **Pluggable LLM** — Swap between Gemini, GPT-4o, Claude, or any OpenAI-compatible API.
- **REST & WebSocket API** — Create games, send commands, stream events, and query game state programmatically.
- **Web Client** — 2D isometric HTML5 client with dark translucent UI and Chinese/English i18n.

---

## Architecture (historical)

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

| Directory | Description | Language | New Repo |
|-----------|-------------|----------|----------|
| `xbworld-web/` | Web client (2D HTML5 renderer, lobby) | TS / HTML / CSS | [xbworld-web](https://github.com/xingbo778/xbworld-web) |
| `xbworld-agent/` | LLM agents, orchestrator, unified FastAPI server | Python | *Coming soon* |
| `freeciv/` | Freeciv C server (git submodule) | C | [freeciv](https://github.com/xingbo778/freeciv) |
| `scripts/` | Install helpers, asset sync, logo generation | Shell / Python | — |
| `config/` | Configuration templates (nginx) | Conf / INI | — |

---

## License

The Freeciv C server is released under the
[GNU General Public License](https://www.gnu.org/licenses/gpl-3.0.html).
The XBWorld client and agent code is released under the
[GNU Affero General Public License](https://www.gnu.org/licenses/agpl-3.0.html).

## Credits

XBWorld is built on top of
[Freeciv-web](https://github.com/freeciv/freeciv-web) by the Freeciv community.
