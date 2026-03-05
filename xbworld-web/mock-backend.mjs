/**
 * Mock Freeciv backend for local testing.
 * Simulates civclientlauncher + civserver WebSocket with minimal map data.
 */
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';

const PORT = 8080;
const FAKE_CIV_PORT = 5555;
const MAP_X = 40;
const MAP_Y = 25;

// Terrain IDs matching PixiRenderer expectations
const TERRAINS = [
  { id: 0, name: 'Coast',      graphic_str: 'coast',      graphic_alt: 'coast',      movement_cost: 1, defense_bonus: 0, output: [0, 1, 0, 0, 0, 0] },
  { id: 1, name: 'Ocean',      graphic_str: 'floor',      graphic_alt: 'ocean',      movement_cost: 1, defense_bonus: 0, output: [0, 1, 0, 0, 0, 0] },
  { id: 2, name: 'Desert',     graphic_str: 'desert',     graphic_alt: 'desert',     movement_cost: 1, defense_bonus: 0, output: [0, 0, 1, 0, 0, 0] },
  { id: 3, name: 'Forest',     graphic_str: 'forest',     graphic_alt: 'forest',     movement_cost: 2, defense_bonus: 15, output: [1, 1, 0, 0, 0, 0] },
  { id: 4, name: 'Grassland',  graphic_str: 'grass',      graphic_alt: 'grassland',  movement_cost: 1, defense_bonus: 0, output: [2, 0, 0, 0, 0, 0] },
  { id: 5, name: 'Hills',      graphic_str: 'hills',      graphic_alt: 'hills',      movement_cost: 2, defense_bonus: 10, output: [1, 0, 0, 0, 0, 0] },
  { id: 6, name: 'Jungle',     graphic_str: 'jungle',     graphic_alt: 'jungle',     movement_cost: 2, defense_bonus: 15, output: [1, 0, 0, 0, 0, 0] },
  { id: 7, name: 'Mountains',  graphic_str: 'mountains',  graphic_alt: 'mountains',  movement_cost: 3, defense_bonus: 25, output: [0, 0, 1, 0, 0, 0] },
  { id: 8, name: 'Plains',     graphic_str: 'plains',     graphic_alt: 'plains',     movement_cost: 1, defense_bonus: 0, output: [1, 1, 0, 0, 0, 0] },
  { id: 9, name: 'Swamp',      graphic_str: 'swamp',      graphic_alt: 'swamp',      movement_cost: 2, defense_bonus: 10, output: [1, 0, 0, 0, 0, 0] },
  { id: 10, name: 'Tundra',    graphic_str: 'tundra',     graphic_alt: 'tundra',     movement_cost: 1, defense_bonus: 0, output: [1, 0, 0, 0, 0, 0] },
  { id: 11, name: 'Arctic',    graphic_str: 'arctic',     graphic_alt: 'arctic',     movement_cost: 2, defense_bonus: 0, output: [0, 0, 0, 0, 0, 0] },
  { id: 12, name: 'Lake',      graphic_str: 'lake',       graphic_alt: 'lake',       movement_cost: 1, defense_bonus: 0, output: [0, 2, 0, 0, 0, 0] },
  { id: 13, name: 'Deep Ocean', graphic_str: 'deep_ocean', graphic_alt: 'deep_ocean', movement_cost: 1, defense_bonus: 0, output: [0, 1, 0, 0, 0, 0] },
];

/** Generate a simple terrain map using noise-like patterns */
function generateTerrain(x, y) {
  // Simple terrain generation based on position
  const nx = x / MAP_X;
  const ny = y / MAP_Y;

  // Create some land masses and ocean
  const distFromCenter = Math.sqrt(Math.pow(nx - 0.5, 2) + Math.pow(ny - 0.5, 2));
  const isOcean = distFromCenter > 0.4 || (y < 2) || (y >= MAP_Y - 2);

  if (isOcean) {
    return distFromCenter > 0.45 ? 13 : (Math.random() > 0.3 ? 1 : 0); // deep ocean / ocean / coast
  }

  // Land terrains
  const r = Math.random();
  const latFactor = Math.abs(ny - 0.5) * 2; // 0 at equator, 1 at poles

  if (latFactor > 0.7) return r > 0.5 ? 11 : 10; // arctic/tundra at poles
  if (latFactor > 0.5) return r > 0.6 ? 3 : (r > 0.3 ? 8 : 5); // forest/plains/hills
  // Equatorial
  if (r > 0.7) return 6;  // jungle
  if (r > 0.5) return 4;  // grassland
  if (r > 0.3) return 8;  // plains
  if (r > 0.15) return 3; // forest
  if (r > 0.05) return 5; // hills
  return 7;               // mountains
}

function sendPackets(ws, packets) {
  ws.send(JSON.stringify(packets));
}

function handleConnection(ws) {
  console.log('WebSocket client connected');

  ws.on('message', (data) => {
    try {
      const packet = JSON.parse(data.toString());
      console.log('Received packet pid=' + packet.pid);

      if (packet.pid === 4) {
        // Login request → send full game initialization sequence
        console.log('Login from:', packet.username);
        sendGameInit(ws, packet.username);
      } else if (packet.pid === 119) {
        // CLIENT_INFO - ignore
      }
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
}

function sendGameInit(ws, username) {
  // 1. Server join reply
  sendPackets(ws, [{ pid: 5, you_can_join: true, conn_id: 1, message: '' }]);

  // 2. Server info
  sendPackets(ws, [{
    pid: 29, emerg_version: 0, major_version: 3, minor_version: 1,
    patch_version: 90, version_label: '-dev',
  }]);

  // 3. Connect message
  sendPackets(ws, [{ pid: 27, message: 'You are logged in as ' + username }]);

  // 4. Game info
  sendPackets(ws, [{
    pid: 16, turn: 0, year: -4000, timeout: 0, first_timeout: 0,
    phase: 0, phase_mode: 0, global_advances: [],
    gold: 50, tax: 0, science: 0, luxury: 0,
  }]);

  // 5. Calendar info
  sendPackets(ws, [{
    pid: 255, calendar_fragment_count: 0, calendar_fragments: [],
    positive_year_label: 'AD', negative_year_label: 'BC',
    calendar_fragment_name: [],
  }]);

  // 6. Map info (critical - triggers map_allocate)
  sendPackets(ws, [{
    pid: 17, xsize: MAP_X, ysize: MAP_Y,
    topology_id: 0, wrap_id: 0,
  }]);

  // 7. Ruleset terrain definitions
  for (const t of TERRAINS) {
    sendPackets(ws, [{
      pid: 151,
      ...t,
      rule_name: t.name.toLowerCase(),
      citizens_graphic: '',
      helptext: '',
      flags: [],
      native_to: [],
      color_red: 0, color_green: 0, color_blue: 0,
      base_time: 1, road_time: 1,
      irrigation_result: 0, irrigation_food_incr: 0, irrigation_time: 0,
      mining_result: 0, mining_shield_incr: 0, mining_time: 0,
      animal: -1, transform_result: 0, transform_time: 0,
      placing_time: 1, pillage_time: 1, clean_pollution_time: 1,
      clean_fallout_time: 1, property: [0, 0, 0, 0, 0],
    }]);
  }

  // 8. Terrain control
  sendPackets(ws, [{
    pid: 146,
    num_resources: 0,
    ocean_reclaim_requirement: 3,
    land_channel_requirement: 3,
    terrain_thaw_requirement: 0,
    terrain_freeze_requirement: 0,
    lake_max_size: 0,
    min_start_native_area: 0,
    move_fragments: 3,
    igter_cost: 1,
  }]);

  // 9. Ruleset control
  sendPackets(ws, [{
    pid: 155,
    num_unit_classes: 0, num_unit_types: 0, num_impr_types: 0,
    num_tech_types: 0, num_extra_types: 0, num_base_types: 0,
    num_road_types: 0, num_disaster_types: 0, num_achievement_types: 0,
    num_multipliers: 0, num_styles: 0, government_count: 0,
    nation_count: 1, playable_nation_count: 1, style_count: 0,
    terrain_count: TERRAINS.length, resource_count: 0,
    num_goods_types: 0, default_government: 0, default_music_style: -1,
    preferred_tileset: '', name: 'mock', description: 'Mock ruleset',
    enabled_actions: [], enabled_unit_class_flags: [], enabled_unit_type_flags: [],
    enabled_impr_flags: [], enabled_tech_flags: [], enabled_terrain_flags: [],
    enabled_extra_flags: [],
  }]);

  // 10. Player info
  sendPackets(ws, [{
    pid: 51,
    playerno: 0, name: username, username: username,
    nation: 0, is_alive: true, is_connected: true,
    team: 0, is_ready: false,
    turns_alive: 0, phase_done: false,
    nturns_idle: 0, ai_skill_level: 0,
    government: 0, target_government: 0,
    real_embassy: [0], city_options: [0],
    gold: 50, tax: 0, science: 0, luxury: 0,
    revolution_finishes: 0, culture: 0,
    mood: 0,
    style: 0,
    music_style: -1,
    science_cost: 0,
    love: [],
    color_valid: true,
    color_red: 255, color_green: 255, color_blue: 255,
    multip: [], multip_target: [],
    diplstates: [], gives_shared_vision: [0],
    wonders: [], tech_upkeep: 0,
  }]);

  // 11. Connection info
  sendPackets(ws, [{
    pid: 115, id: 1, used: true, established: true,
    player_num: 0, observer: false,
    access_level: 0, username: username,
    addr: '127.0.0.1', capability: '+Freeciv.Web.Devel-3.3',
  }]);

  // 12. Rulesets ready
  sendPackets(ws, [{ pid: 225 }]);

  // 13. Send all tile data
  console.log('Sending ' + (MAP_X * MAP_Y) + ' tiles...');
  const tileBatch = [];
  for (let y = 0; y < MAP_Y; y++) {
    for (let x = 0; x < MAP_X; x++) {
      const index = y * MAP_X + x;
      tileBatch.push({
        pid: 15,
        tile: index,
        x: x,
        y: y,
        known: 2, // TILE_KNOWN_SEEN
        terrain: generateTerrain(x, y),
        extras: [0], // empty BitVector
        resource: -1,
        owner: -1,
        worked: 0,
        continent: 1,
        spec_sprite: '',
        label: '',
        height: 0,
      });

      // Send in batches of 50 tiles
      if (tileBatch.length >= 50) {
        sendPackets(ws, tileBatch.splice(0));
      }
    }
  }
  // Send remaining tiles
  if (tileBatch.length > 0) {
    sendPackets(ws, tileBatch.splice(0));
  }

  console.log('All tiles sent!');

  // 14. Start game phase
  sendPackets(ws, [
    { pid: 127, year: -4000, fragments: 0, turn: 0 }, // new_year
    { pid: 126, phase: 0 }, // start_phase
    { pid: 128 }, // begin_turn
  ]);

  // 15. Periodic ping to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      sendPackets(ws, [{ pid: 88 }]); // conn_ping
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (url.pathname === '/civclientlauncher' && req.method === 'POST') {
    console.log('Game launch request');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ port: FAKE_CIV_PORT, result: 'success' }));
    return;
  }

  if (url.pathname === '/meta/status') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok;1;0;1');
    return;
  }

  if (url.pathname === '/game/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'running', agents: [] }));
    return;
  }

  // Serve a simple test page
  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>Mock Freeciv Backend</h1><p>Running on port ' + PORT + '</p></body></html>');
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// WebSocket server for /civsocket/*
const wss = new WebSocketServer({ noServer: true });
wss.on('connection', handleConnection);

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/civsocket/')) {
    console.log('WebSocket upgrade:', url.pathname);
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Mock Freeciv backend running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/civsocket/${1000 + FAKE_CIV_PORT}`);
});
