# XBWorld Web Client

XBWorld web client — an HTML5 browser-based game client built with TypeScript + PIXI.js.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                 XBWorld Frontend                       │
│                                                      │
│  ┌──────────────┐   ┌──────────────┐                │
│  │ PIXI.js      │   │ TypeScript   │                │
│  │ Renderer     │   │ Game Client  │                │
│  │ (WebGL)      │   │ (State/UI)   │                │
│  └──────┬───────┘   └──────┬───────┘                │
│         │                  │                         │
│         └──────┬───────────┘                         │
│                │ WebSocket + REST                     │
│                ▼                                     │
│   nginx reverse proxy → backend (port 8080)          │
└──────────────────────────────────────────────────────┘
```

## Quick Start

### Docker

```bash
docker build -t xbworld-frontend .
docker run -p 8081:80 -e BACKEND_URL=http://localhost:8080 xbworld-frontend
```

Or with docker-compose:

```bash
docker-compose up
```

### Local Development

1. Install dependencies:

```bash
npm install
```

2. Start the dev server (with backend proxy):

```bash
BACKEND_URL=http://localhost:8080 npx vite --config vite.config.dev.ts
```

3. Build for production:

```bash
npm run build
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + Vite production build |
| `npm run typecheck` | TypeScript type checking only |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run lint` | Lint TypeScript code |
| `npm run format` | Format code with Prettier |

## Project Structure

```
xbworld-web/
├── src/
│   ├── main/webapp/           # Static HTML/CSS/JS/images
│   │   ├── webclient/         # Main HTML entry point
│   │   ├── javascript/        # Legacy JS + TS bundle output
│   │   ├── css/               # Stylesheets
│   │   ├── images/            # Game images
│   │   ├── tileset/           # Tile sprites
│   │   ├── music/             # Background music
│   │   └── fonts/             # Custom fonts
│   └── ts/                    # TypeScript source (modern rewrite)
│       ├── audio/             # Audio manager
│       ├── client/            # Client loop
│       ├── core/              # Core logic (events, control, log)
│       ├── data/              # Data models & store
│       ├── net/               # Network (WebSocket, packets)
│       ├── renderer/          # PIXI.js rendering
│       ├── ui/                # UI dialogs
│       └── utils/             # Helpers
├── tests/                     # Test files
├── Dockerfile                 # Docker build (nginx)
├── docker-compose.yml         # Docker compose config
├── nginx.conf                 # nginx reverse proxy config
├── vite.config.ts             # Vite production build config
├── vite.config.dev.ts         # Vite dev server config
├── tsconfig.json              # TypeScript config
├── package.json               # npm dependencies
└── playwright.config.ts       # E2E test config
```

## Connecting to Backend

The frontend connects to the XBWorld backend via:
- **WebSocket**: `/civsocket/{port}` (game protocol)
- **REST API**: `/game/`, `/agents/`, `/meta/` (JSON)
- **SSE**: `/game/events` (real-time events)

Set the `BACKEND_URL` environment variable to point to the backend service.

## License

Released under the GNU Affero General Public License v3.
Based on the original Freeciv-web project by Andreas Rosdal.
