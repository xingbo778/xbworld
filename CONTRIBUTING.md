# Contributing to XBWorld

Thanks for your interest in contributing! This guide covers the development
workflow, code conventions, and how to submit changes.

---

## Getting Started

### 1. Clone and Set Up

```bash
git clone https://github.com/xingbo778/xbworld.git
cd xbworld
```

### 2. Choose Your Focus Area

| Area | Setup needed | Key files |
|------|-------------|-----------|
| **AI Agent** | Python 3.10+, pip | `xbworld-agent/` |
| **Web Client** | Java 17, Maven, Tomcat | `xbworld-web/` |
| **Proxy** | Python 3.10+, Tornado | `xbworld-proxy/` |
| **Infrastructure** | macOS or Linux | `scripts/`, `config/`, `publite2/` |

### 3. Agent Development (most common)

```bash
cd xbworld-agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Set your LLM key
export COMPASS_API_KEY="your-key"

# Run a quick test
python test_connection.py
```

### 4. Full Stack Development

```bash
# One-time setup (installs Freeciv server, Tomcat, nginx, MariaDB, etc.)
./install-macos.sh

# Start all services
./start-macos.sh

# Verify
open http://localhost:8000
```

---

## Development Workflow

### Branch Naming

```
feat/short-description     # New features
fix/short-description      # Bug fixes
docs/short-description     # Documentation only
refactor/short-description # Code restructuring
perf/short-description     # Performance improvements
test/short-description     # Test additions/fixes
```

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add batch tool execution for unit moves
fix: correct direction mapping to match Freeciv NW=0 convention
docs: update architecture diagram with standalone mode
perf: reduce conversation trimming threshold to 16 messages
refactor: extract DecisionEngine interface from agent loop
test: add 8-agent 50-turn stress test with pass/fail criteria
```

Guidelines:
- Use imperative mood ("add", not "added" or "adds")
- First line ≤ 72 characters
- Reference issues when applicable: `fix: handle null tile (#42)`
- Body (optional) explains *why*, not *what*

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes with clear, focused commits
3. Run relevant tests (see [Testing](#testing) below)
4. Push and open a PR against `main`
5. PR description should include:
   - **Summary**: What changed and why (1–3 bullet points)
   - **Test plan**: How you verified the changes

---

## Code Style

### Python (agent, proxy, publite2)

- **Formatter**: No strict formatter enforced yet — match surrounding code style
- **Type hints**: Use them for function signatures
- **Docstrings**: Required for public classes and functions
- **Imports**: stdlib → third-party → local, separated by blank lines
- **Naming**: `snake_case` for functions/variables, `PascalCase` for classes,
  `UPPER_SNAKE` for constants
- **Line length**: 100 characters soft limit
- **Async**: Use `async/await` for all I/O operations in agent code

```python
async def move_unit(client: GameClient, unit_id: int, direction: str) -> str:
    """Move a unit in the specified compass direction.

    Returns a status message describing the result.
    """
    unit = client.state.units.get(unit_id)
    if not unit:
        return f"Unit {unit_id} not found"
    ...
```

### JavaScript (web client)

- Match the existing style in `xbworld-web/src/main/webapp/javascript/`
- Use `var` for consistency with the existing codebase (legacy code)
- Document non-obvious game logic with comments

### Java (servlets)

- Standard Java conventions
- Maven for builds: `cd xbworld-web && mvn package`

---

## Testing

### Agent Tests

```bash
cd xbworld-agent

# Quick: verify WebSocket connection and basic packet exchange
python test_connection.py

# Medium: two agents join, verify independent state and turn sync
python test_multi.py

# Full: 8 LLM agents, 50 turns, with pass/fail criteria:
#   - All agents ≥ 2 cities by turn 20
#   - No agent stuck > 60s on one turn
#   - Error rate < 5%
#   - All agents reach turn 50
python test_8agents_50turns.py
```

### Infrastructure Tests

```bash
# Full-stack integration (requires all services running)
cd tests
bash test_freeciv_web.sh
```

### What to Test

- **New tools**: Add a test in `test_connection.py` or `test_multi.py` that
  exercises the tool
- **Agent logic changes**: Run `test_multi.py` at minimum
- **Protocol changes**: Run `test_connection.py` to verify packet handling
- **Web UI changes**: Manual testing in browser + `test_freeciv_web.sh`

---

## Adding a New Agent Tool

1. Define the tool in `xbworld-agent/agent_tools.py`:

```python
@tool("my_new_tool", "Description of what this tool does")
def my_new_tool(client: GameClient, param1: int, param2: str) -> str:
    """Detailed docstring."""
    # Implementation using client.state and client.send_*
    return "Result message"
```

2. The `@tool` decorator automatically registers it in `TOOL_REGISTRY` and
   generates the OpenAI function-calling schema.

3. The LLM will see it in its available tools on the next turn.

4. Test it:
```python
from agent_tools import execute_tool
result = await execute_tool("my_new_tool", {"param1": 42, "param2": "test"}, client)
```

---

## Adding a New Decision Engine

1. Implement the `DecisionEngine` interface in `xbworld-agent/decision_engine.py`:

```python
class MyEngine(DecisionEngine):
    async def decide(self, state: GameState, tools: list[dict]) -> list[ToolCall]:
        # Your decision logic here
        return [ToolCall("end_turn", {})]
```

2. Wire it up in `multi_main.py` or `main.py`:

```python
agent = XBWorldAgent(client, name="bot", engine=MyEngine())
```

---

## Project Structure Reference

```
xbworld/
├── xbworld-agent/        # AI agent (Python) — most active development
├── xbworld-proxy/        # WebSocket proxy (Python/Tornado)
├── xbworld-web/          # Web client (Java/JSP/JS)
├── publite2/             # Server process manager (Python)
├── config/               # Config templates
├── scripts/              # Install & helper scripts
├── tests/                # Integration tests
├── ARCHITECTURE.md       # System architecture & roadmap
├── CHANGELOG.md          # Release notes
├── CONTRIBUTING.md       # This file
└── README.md             # Project overview & quick start
```

---

## Questions?

Open an issue on GitHub or check the existing issues for context. When filing
a bug, include:

- Steps to reproduce
- Expected vs actual behavior
- Relevant log output (`logs/` directory or agent console output)
- Your environment (OS, Python version, LLM provider)
