/**
 * PixiJS-based WebGL map renderer.
 * Replaces the legacy 2D Canvas renderer with GPU-accelerated sprite batching.
 */

import { Application, Container, Sprite, Texture, Assets, Graphics } from 'pixi.js';
import { store } from '../data/store';
import { globalEvents } from '../core/events';
import { TILE_KNOWN_SEEN, TILE_KNOWN_UNSEEN, tileGetKnown } from '../data/tile';
import { mapPosToTile, Direction, DIR_DX, DIR_DY } from '../data/map';
import { logNormal, logError } from '../core/log';
import type { Tile } from '../data/types';

export interface RendererConfig {
  tileWidth: number;
  tileHeight: number;
  container: HTMLElement;
}

const DEFAULT_TILE_W = 96;
const DEFAULT_TILE_H = 48;

const TERRAIN_COLORS: Record<string, number> = {
  grassland: 0x7CCD7C, grass: 0x7CCD7C,
  plains: 0xCDB79E, plain: 0xCDB79E,
  ocean: 0x1E5090, deep_ocean: 0x0A2A5E,
  lake: 0x4682B4,
  coast: 0x4A90D9,
  desert: 0xEDC9AF, desert2: 0xEDC9AF,
  forest: 0x2E8B57,
  hills: 0x8B7355,
  mountains: 0x8B8378, mountain: 0x8B8378,
  jungle: 0x006400,
  swamp: 0x556B2F,
  tundra: 0xB0C4DE,
  arctic: 0xF0F8FF, glacier: 0xE0E8F0,
  inaccessible: 0x333333,
};

const TERRAIN_COLORS_BY_ID: Record<number, number> = {
  0: 0x4A90D9, 1: 0x1E5090, 2: 0xEDC9AF, 3: 0x2E8B57,
  4: 0x7CCD7C, 5: 0x8B7355, 6: 0x006400, 7: 0x8B8378,
  8: 0xCDB79E, 9: 0x556B2F, 10: 0xB0C4DE, 11: 0xF0F8FF,
  12: 0x4682B4, 13: 0x0A2A5E,
};

const PLAYER_COLORS = [
  0xFF0000, 0x0000FF, 0x00CC00, 0xFFFF00,
  0xFF00FF, 0x00FFFF, 0xFF8800, 0x8800FF,
  0x88FF00, 0xFF0088, 0x0088FF, 0x888888,
  0xFFBB00, 0x00FF88, 0xBB00FF, 0xFF4444,
];

export class PixiRenderer {
  private app: Application;
  private mapContainer: Container;
  private tileLayer: Container;
  private unitLayer: Container;
  private cityLayer: Container;
  private overlayLayer: Container;
  private fogLayer: Container;

  private tileSprites = new Map<number, Sprite>();
  private unitSprites = new Map<number, Sprite>();
  private citySprites = new Map<number, Sprite>();

  private tileW: number;
  private tileH: number;

  private viewX = 0;
  private viewY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private viewStartX = 0;
  private viewStartY = 0;

  private tilesetTextures = new Map<string, Texture>();
  private terrainColorTextures = new Map<number, Texture>();
  private loaded = false;

  constructor(private config: RendererConfig) {
    this.tileW = config.tileWidth || DEFAULT_TILE_W;
    this.tileH = config.tileHeight || DEFAULT_TILE_H;

    this.app = new Application();
    this.mapContainer = new Container();
    this.tileLayer = new Container();
    this.unitLayer = new Container();
    this.cityLayer = new Container();
    this.overlayLayer = new Container();
    this.fogLayer = new Container();

    this.mapContainer.addChild(this.tileLayer);
    this.mapContainer.addChild(this.fogLayer);
    this.mapContainer.addChild(this.cityLayer);
    this.mapContainer.addChild(this.unitLayer);
    this.mapContainer.addChild(this.overlayLayer);
  }

  async init(): Promise<void> {
    await this.app.init({
      resizeTo: this.config.container,
      backgroundColor: 0x000000,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.config.container.appendChild(this.app.canvas as HTMLCanvasElement);
    this.app.stage.addChild(this.mapContainer);

    this.setupInput();
    this.setupEventListeners();

    logNormal('PixiJS renderer initialized');
  }

  async loadTileset(basePath: string, spriteData: Record<string, number[]>): Promise<void> {
    try {
      const sheetNames = [
        'freeciv-web-tileset-amplio2-0.png',
        'freeciv-web-tileset-amplio2-1.png',
        'freeciv-web-tileset-amplio2-2.png',
      ];

      const baseTextures: Texture[] = [];
      for (const name of sheetNames) {
        const tex = await Assets.load(`${basePath}/${name}`);
        baseTextures.push(tex);
      }

      for (const [key, coords] of Object.entries(spriteData)) {
        if (!coords || coords.length < 4) continue;
        const [x, y, w, h, sheet = 0] = coords;
        const baseTex = baseTextures[sheet] ?? baseTextures[0];
        if (!baseTex) continue;

        const frame = new Texture({
          source: baseTex.source,
          frame: { x, y, width: w, height: h } as unknown as import('pixi.js').Rectangle,
        });
        this.tilesetTextures.set(key, frame);
      }

      this.loaded = true;
      logNormal(`Loaded ${this.tilesetTextures.size} tile sprites`);
    } catch (e) {
      logError('Failed to load tileset:', e);
    }
  }

  /** Convert map (iso) coordinates to screen pixel coordinates. */
  isoToScreen(mapX: number, mapY: number): { sx: number; sy: number } {
    const sx = (mapX - mapY) * (this.tileW / 2);
    const sy = (mapX + mapY) * (this.tileH / 2);
    return { sx, sy };
  }

  /** Convert screen pixel coordinates to map (iso) coordinates. */
  screenToIso(sx: number, sy: number): { mapX: number; mapY: number } {
    const mx = sx + this.viewX;
    const my = sy + this.viewY;
    const mapX = Math.floor((mx / (this.tileW / 2) + my / (this.tileH / 2)) / 2);
    const mapY = Math.floor((my / (this.tileH / 2) - mx / (this.tileW / 2)) / 2);
    return { mapX, mapY };
  }

  renderMap(): void {
    if (!store.mapInfo) return;

    const mi = store.mapInfo;
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    const margin = 4;
    const topLeft = this.screenToIso(-margin * this.tileW, -margin * this.tileH);
    const bottomRight = this.screenToIso(
      screenW + margin * this.tileW,
      screenH + margin * this.tileH,
    );

    const xMin = Math.max(0, topLeft.mapX - margin);
    const xMax = Math.min(mi.xsize - 1, bottomRight.mapX + margin);
    const yMin = Math.max(0, topLeft.mapY - margin);
    const yMax = Math.min(mi.ysize - 1, bottomRight.mapY + margin);

    const visibleIndices = new Set<number>();

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const tile = mapPosToTile(x, y);
        if (!tile) continue;
        visibleIndices.add(tile.index);
        this.renderTile(tile as Tile);
      }
    }

    for (const [idx, sprite] of this.tileSprites) {
      if (!visibleIndices.has(idx)) {
        sprite.removeFromParent();
        this.tileSprites.delete(idx);
      }
    }
  }

  private getTerrainColorTexture(terrainId: number): Texture {
    if (this.terrainColorTextures.has(terrainId)) {
      return this.terrainColorTextures.get(terrainId)!;
    }
    const terrainData = store.terrains[terrainId];
    const name = terrainData?.graphic_str ?? terrainData?.name?.toLowerCase() ?? '';
    const color = TERRAIN_COLORS[name] ?? TERRAIN_COLORS_BY_ID[terrainId] ?? 0x228B22;
    const g = new Graphics();
    g.rect(0, 0, this.tileW, this.tileH).fill(color);
    const tex = this.app.renderer.generateTexture(g);
    this.terrainColorTextures.set(terrainId, tex);
    return tex;
  }

  private renderTile(tile: Tile): void {
    const known = tileGetKnown(tile);
    if (known === 0) return;

    const { sx, sy } = this.isoToScreen(tile.x, tile.y);
    const screenX = sx - this.viewX;
    const screenY = sy - this.viewY;

    let sprite = this.tileSprites.get(tile.index);

    let texture: Texture | undefined;
    if (this.loaded) {
      const terrainData = store.terrains[tile.terrain];
      const texKey = terrainData ? `t.l0.${terrainData.graphic_str}1` : 't.l0.grassland1';
      texture = this.tilesetTextures.get(texKey);
    }
    if (!texture) {
      texture = this.getTerrainColorTexture(tile.terrain);
    }

    if (!sprite) {
      sprite = new Sprite(texture);
      sprite.width = this.tileW;
      sprite.height = this.tileH;
      this.tileLayer.addChild(sprite);
      this.tileSprites.set(tile.index, sprite);
    } else {
      sprite.texture = texture;
    }

    sprite.x = screenX;
    sprite.y = screenY;
    sprite.alpha = known === TILE_KNOWN_UNSEEN ? 0.5 : 1.0;
  }

  private unitColorTextures = new Map<number, Texture>();

  private getUnitTexture(owner: number): Texture {
    if (this.unitColorTextures.has(owner)) return this.unitColorTextures.get(owner)!;
    const color = PLAYER_COLORS[owner % PLAYER_COLORS.length];
    const size = Math.floor(this.tileW / 3);
    const g = new Graphics();
    g.roundRect(0, 0, size, size, 3).fill(color).stroke({ width: 1, color: 0x000000 });
    const tex = this.app.renderer.generateTexture(g);
    this.unitColorTextures.set(owner, tex);
    return tex;
  }

  renderUnits(): void {
    const rendered = new Set<number>();
    for (const [id, unit] of Object.entries(store.units)) {
      const uid = Number(id);
      rendered.add(uid);
      const tile = store.tiles[unit.tile];
      if (!tile) continue;

      const { sx, sy } = this.isoToScreen(tile.x, tile.y);
      const screenX = sx - this.viewX + this.tileW / 3;
      const screenY = sy - this.viewY + this.tileH / 6;

      let sprite = this.unitSprites.get(uid);

      let texture: Texture | undefined;
      if (this.loaded) {
        const ut = store.unitTypes[unit.type];
        const texKey = ut ? `u.${ut.graphic_str}` : 'u.warriors';
        texture = this.tilesetTextures.get(texKey);
      }
      if (!texture) {
        texture = this.getUnitTexture(unit.owner ?? 0);
      }

      if (!sprite) {
        sprite = new Sprite(texture);
        this.unitLayer.addChild(sprite);
        this.unitSprites.set(uid, sprite);
      } else {
        sprite.texture = texture;
      }

      sprite.x = screenX;
      sprite.y = screenY;
    }

    for (const [uid, sprite] of this.unitSprites) {
      if (!rendered.has(uid)) {
        sprite.removeFromParent();
        this.unitSprites.delete(uid);
      }
    }
  }

  private cityColorTextures = new Map<number, Texture>();

  private getCityTexture(owner: number): Texture {
    if (this.cityColorTextures.has(owner)) return this.cityColorTextures.get(owner)!;
    const color = PLAYER_COLORS[owner % PLAYER_COLORS.length];
    const w = Math.floor(this.tileW * 0.6);
    const h = Math.floor(this.tileH * 0.8);
    const g = new Graphics();
    g.roundRect(0, 0, w, h, 4).fill(color).stroke({ width: 2, color: 0xFFFFFF });
    const tex = this.app.renderer.generateTexture(g);
    this.cityColorTextures.set(owner, tex);
    return tex;
  }

  renderCities(): void {
    const rendered = new Set<number>();
    for (const [id, city] of Object.entries(store.cities)) {
      const cid = Number(id);
      rendered.add(cid);
      const tile = store.tiles[city.tile];
      if (!tile) continue;

      const { sx, sy } = this.isoToScreen(tile.x, tile.y);
      const screenX = sx - this.viewX + this.tileW * 0.2;
      const screenY = sy - this.viewY - this.tileH / 4;

      let sprite = this.citySprites.get(cid);

      let texture: Texture | undefined;
      if (this.loaded) {
        texture = this.tilesetTextures.get('city.european_city_0');
      }
      if (!texture) {
        texture = this.getCityTexture(city.owner ?? 0);
      }

      if (!sprite) {
        sprite = new Sprite(texture);
        this.cityLayer.addChild(sprite);
        this.citySprites.set(cid, sprite);
      } else {
        sprite.texture = texture;
      }

      sprite.x = screenX;
      sprite.y = screenY;
    }

    for (const [cid, sprite] of this.citySprites) {
      if (!rendered.has(cid)) {
        sprite.removeFromParent();
        this.citySprites.delete(cid);
      }
    }
  }

  centerOnTile(tile: Tile): void {
    const { sx, sy } = this.isoToScreen(tile.x, tile.y);
    this.viewX = sx - this.app.screen.width / 2;
    this.viewY = sy - this.app.screen.height / 2;
    this.renderAll();
  }

  renderAll(): void {
    this.renderMap();
    this.renderCities();
    this.renderUnits();
  }

  private setupInput(): void {
    const canvas = this.app.canvas as HTMLCanvasElement;

    canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.viewStartX = this.viewX;
      this.viewStartY = this.viewY;
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      this.viewX = this.viewStartX - dx;
      this.viewY = this.viewStartY - dy;
      this.renderAll();
    });

    canvas.addEventListener('pointerup', (e) => {
      const moved = Math.abs(e.clientX - this.dragStartX) + Math.abs(e.clientY - this.dragStartY);
      if (moved < 5) {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const { mapX, mapY } = this.screenToIso(sx, sy);
        const tile = mapPosToTile(mapX, mapY);
        if (tile) {
          globalEvents.emit('map:tileclick', { tile, event: e });
        }
      }
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      // Scroll to pan
      this.viewX += e.deltaX;
      this.viewY += e.deltaY;
      this.renderAll();
    }, { passive: false });
  }

  private renderScheduled = false;

  private scheduleRender(): void {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.renderScheduled = false;
      this.renderAll();
    });
  }

  private setupEventListeners(): void {
    globalEvents.on('tile:updated', () => this.scheduleRender());
    globalEvents.on('unit:updated', () => this.scheduleRender());
    globalEvents.on('unit:removed', () => this.scheduleRender());
    globalEvents.on('city:updated', () => this.scheduleRender());
    globalEvents.on('city:removed', () => this.scheduleRender());
    globalEvents.on('map:allocated', () => this.renderAll());
    globalEvents.on('game:beginturn', () => this.scheduleRender());

    window.addEventListener('resize', () => {
      this.app.resize();
      this.renderAll();
    });
  }

  destroy(): void {
    this.app.destroy(true);
  }
}
