XBWorld Web Client
==================

The XBWorld web client — an HTML5 browser-based game client built with
JavaScript/TypeScript. Served as static files by the FastAPI server
(`xbworld-agent/server.py`).

Directory Layout
----------------

```
src/main/webapp/
  webclient/       — Main game client HTML entry point
  javascript/      — Game client JS source (gradually migrating to TS)
  css/             — Stylesheets
  images/          — Game images, logos, flags
  tileset/         — Tileset PNG sprites
  static/          — Landing page assets and PWA manifest
  docs/            — In-game help text
  music/           — Background music (served from /music/)
```

Development
-----------

For frontend development with hot-reload:

```bash
cd src/main/webapp
npm install
npm run dev          # Vite dev server on :3000, proxies API to :8080
```

Build for production:

```bash
npm run build        # Output in dist/
npm run typecheck    # TypeScript type checking
```

See `MIGRATION.md` for the JavaScript to TypeScript migration guide.

License
-------

Released under the GNU Affero General Public License v3.
Based on the original Freeciv-web project by Andreas Rosdal.
