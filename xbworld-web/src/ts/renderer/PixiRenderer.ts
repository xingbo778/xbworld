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
    if (!this.loaded || !store.mapInfo) return;

    const mi = store.mapInfo;
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    const margin = 2;
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

    // Remove off-screen sprites
    for (const [idx, sprite] of this.tileSprites) {
      if (!visibleIndices.has(idx)) {
        sprite.removeFromParent();
        this.tileSprites.delete(idx);
      }
    }
  }

  private renderTile(tile: Tile): void {
    const known = tileGetKnown(tile);
    if (known === 0) return; // TILE_UNKNOWN

    const { sx, sy } = this.isoToScreen(tile.x, tile.y);
    const screenX = sx - this.viewX;
    const screenY = sy - this.viewY;

    let sprite = this.tileSprites.get(tile.index);
    const terrainData = store.terrains[tile.terrain];
    const texKey = terrainData ? `t.l0.${terrainData.graphic_str}1` : 't.l0.grassland1';
    const texture = this.tilesetTextures.get(texKey);

    if (!sprite) {
      sprite = new Sprite(texture ?? Texture.WHITE);
      sprite.width = this.tileW;
      sprite.height = this.tileH;
      this.tileLayer.addChild(sprite);
      this.tileSprites.set(tile.index, sprite);
    } else if (texture) {
      sprite.texture = texture;
    }

    sprite.x = screenX;
    sprite.y = screenY;
    sprite.alpha = known === TILE_KNOWN_UNSEEN ? 0.5 : 1.0;
  }

  renderUnits(): void {
    const rendered = new Set<number>();
    for (const [id, unit] of Object.entries(store.units)) {
      const uid = Number(id);
      rendered.add(uid);
      const tile = store.tiles[unit.tile];
      if (!tile) continue;

      const { sx, sy } = this.isoToScreen(tile.x, tile.y);
      const screenX = sx - this.viewX + this.tileW / 4;
      const screenY = sy - this.viewY;

      let sprite = this.unitSprites.get(uid);
      const ut = store.unitTypes[unit.type];
      const texKey = ut ? `u.${ut.graphic_str}` : 'u.warriors';
      const texture = this.tilesetTextures.get(texKey);

      if (!sprite) {
        sprite = new Sprite(texture ?? Texture.WHITE);
        sprite.width = this.tileW / 2;
        sprite.height = this.tileH;
        this.unitLayer.addChild(sprite);
        this.unitSprites.set(uid, sprite);
      } else if (texture) {
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

  renderCities(): void {
    const rendered = new Set<number>();
    for (const [id, city] of Object.entries(store.cities)) {
      const cid = Number(id);
      rendered.add(cid);
      const tile = store.tiles[city.tile];
      if (!tile) continue;

      const { sx, sy } = this.isoToScreen(tile.x, tile.y);
      const screenX = sx - this.viewX;
      const screenY = sy - this.viewY - this.tileH / 2;

      let sprite = this.citySprites.get(cid);
      const texture = this.tilesetTextures.get('city.european_city_0');

      if (!sprite) {
        sprite = new Sprite(texture ?? Texture.WHITE);
        sprite.width = this.tileW;
        sprite.height = this.tileH;
        this.cityLayer.addChild(sprite);
        this.citySprites.set(cid, sprite);
      } else if (texture) {
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

  private setupEventListeners(): void {
    globalEvents.on('tile:updated', () => this.renderMap());
    globalEvents.on('unit:updated', () => this.renderUnits());
    globalEvents.on('unit:removed', () => this.renderUnits());
    globalEvents.on('city:updated', () => this.renderCities());
    globalEvents.on('city:removed', () => this.renderCities());
    globalEvents.on('map:allocated', () => this.renderAll());

    window.addEventListener('resize', () => {
      this.app.resize();
      this.renderAll();
    });
  }

  destroy(): void {
    this.app.destroy(true);
  }
}
