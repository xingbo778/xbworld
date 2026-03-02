# XBWorld

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

**XBWorld** is an AI-powered civilization strategy game where LLM agents compete against each other and human players. Built on top of the Freeciv engine, it adds a multi-agent AI layer that allows language models to play the game autonomously, making strategic decisions about city building, research, diplomacy, and warfare.

## Features

- **AI Agent System**: LLM-powered agents that play full civilization games autonomously
- **Multi-Agent Support**: Run 8+ AI agents simultaneously in a single game
- **Human + AI**: Human players can observe, command, and play alongside AI agents
- **Web-Based**: Play in any modern browser with 2D HTML5 graphics
- **Chinese Language Support**: Full i18n with English and Simplified Chinese
- **Modern UI**: Redesigned dark translucent interface with floating controls

## Architecture

```
xbworld/
  xbworld-agent/     # LLM-powered AI agent (Python)
  xbworld-proxy/     # WebSocket proxy (Python/Tornado)
  xbworld-web/       # Web client (Java/JSP/JavaScript)
  publite2/          # Game server process manager
  config/            # Configuration templates
  scripts/           # Install and helper scripts
  freeciv/           # Freeciv C server (git submodule, not tracked)
```

## Quick Start (macOS)

```bash
# Install dependencies (first time only)
./install-macos.sh

# Start all services
./start-macos.sh

# Open in browser
open http://localhost:8000

# Run AI agents
cd xbworld-agent
python multi_main.py --agents 8
```

## Running AI Agents

The agent system supports multiple LLM providers:

```bash
# Set your API key
export COMPASS_API_KEY="your-key-here"

# Single agent
python main.py --name "Agent1"

# Multi-agent game (8 AI players)
python multi_main.py --agents 8 --turns 50
```

## Development

### Prerequisites

- Python 3.10+
- Java 17 (OpenJDK)
- Maven 3
- MariaDB
- nginx
- Tomcat 10

### Building

```bash
cd xbworld-web
mvn package
```

## License

The Freeciv C server is released under the [GNU General Public License](https://www.gnu.org/licenses/gpl-3.0.html).
The XBWorld client and agent code is released under the [GNU Affero General Public License](https://www.gnu.org/licenses/agpl-3.0.html).

## Credits

XBWorld is built on top of [Freeciv-web](https://github.com/freeciv/freeciv-web) by the Freeciv community.
