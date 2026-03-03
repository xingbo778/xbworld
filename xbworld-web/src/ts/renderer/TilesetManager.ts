import { Assets, Texture, Rectangle } from 'pixi.js';
import { logNormal, logError } from '../core/log';

const SHEET_COUNT = 3;
const SPEC_URL = '/javascript/2dcanvas/tileset_spec_amplio2.js';

type SpriteEntry = [number, number, number, number, number]; // x, y, w, h, sheet_index

export class TilesetManager {
  private textures = new Map<string, Texture>();
  private loaded = false;

  async load(tilesetBasePath: string): Promise<void> {
    try {
      const sheetTextures: Texture[] = [];
      for (let i = 0; i < SHEET_COUNT; i++) {
        const url = `${tilesetBasePath}/xbworld-tileset-amplio2-${i}.png`;
        sheetTextures.push(await Assets.load<Texture>(url));
      }

      const spec = await this.loadSpec();
      if (!spec) {
        logError('TilesetManager: failed to load tileset spec');
        return;
      }

      for (const [key, entry] of Object.entries(spec)) {
        const [x, y, w, h, sheetIdx] = entry as SpriteEntry;
        const base = sheetTextures[sheetIdx];
        if (!base) continue;
        this.textures.set(
          key,
          new Texture({ source: base.source, frame: new Rectangle(x, y, w, h) }),
        );
      }

      this.loaded = true;
      logNormal(`TilesetManager: loaded ${this.textures.size} sprites`);
    } catch (e) {
      logError('TilesetManager: load failed', e);
    }
  }

  private async loadSpec(): Promise<Record<string, SpriteEntry> | null> {
    const win = window as any;
    if (win.tileset && typeof win.tileset === 'object') {
      return win.tileset;
    }

    try {
      const text = await (await fetch(SPEC_URL)).text();
      const match = text.match(/var\s+tileset\s*=\s*(\{[\s\S]*\})/);
      if (!match) return null;
      return JSON.parse(match[1]);
    } catch (e) {
      logError('TilesetManager: failed to fetch/parse spec', e);
      return null;
    }
  }

  getTexture(key: string): Texture | null {
    return this.textures.get(key) ?? null;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getTerrainTexture(graphicStr: string): Texture | null {
    return (
      this.getTexture(`t.l0.${graphicStr}1`) ??
      this.getTexture(`t.l1.${graphicStr}_n0e0s0w0`) ??
      null
    );
  }

  getUnitTexture(graphicStr: string): Texture | null {
    return this.getTexture(`u.${graphicStr}_Idle`) ?? null;
  }

  getCityTexture(style: string, sizeLevel: number): Texture | null {
    return this.getTexture(`city.${style}_city_${sizeLevel}`) ?? null;
  }

  getSpriteCount(): number {
    return this.textures.size;
  }
}
