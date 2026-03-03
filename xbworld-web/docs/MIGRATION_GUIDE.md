# XBWorld JS → TS 迁移指南

> 本文档是 Legacy JavaScript 到 TypeScript 迁移的操作手册。每次迁移新模块前**必须先阅读本文档**，遵循其中的流程和规则。

---

## 1. 迁移前准备

### 1.1 阅读 Legacy 源码

迁移任何函数之前，必须完成以下准备工作：

1. **阅读 Legacy 实现**：在 `src/main/webapp/javascript/` 中找到对应的 `.js` 文件，完整阅读目标函数的实现。
2. **梳理调用链**：用 `grep` 搜索该函数在 `webclient.min.js` 和其他 `.js` 文件中的所有调用点，记录每个调用者传入的参数类型和使用返回值的方式。
3. **识别副作用**：记录函数中的所有副作用（DOM 操作、全局变量赋值、调用其他函数等）。
4. **记录返回值格式**：特别注意返回值的属性名（snake_case vs camelCase）和类型。

将以上信息记录到一个临时文件中，作为迁移的参考依据。

### 1.2 函数分类

根据函数的特征，决定是否适合通过 `exposeToLegacy` 覆盖：

| 类别 | 特征 | 是否覆盖 | 示例 |
|---|---|---|---|
| **纯查询函数** | 无副作用，只读取数据并返回 | 适合覆盖 | `map_pos_to_tile`, `tile_terrain`, `tile_get_known` |
| **纯计算函数** | 无副作用，只做数学运算 | 适合覆盖 | `NATIVE_TO_MAP_POS`, `move_points_text` |
| **初始化函数** | 设置全局状态、创建数据结构 | **不覆盖** | `map_allocate`, `tile_init`, `game_init` |
| **编排函数** | 调用多个子函数，协调流程 | **不覆盖** | `map_allocate`（调用 `tile_init` + `init_overview`） |
| **UI 函数** | 操作 DOM、绑定事件 | **不覆盖** | `init_overview`, `setup_window_size` |

### 1.3 启用调试模式

在浏览器控制台中设置 `window.__TS_DEBUG = true`，然后加载游戏。所有通过 `exposeToLegacy` 暴露的函数调用都会被记录到 `window.__TS_CALL_LOG` 中，包括参数、返回值、以及与 Legacy 版本的对比结果。

---

## 2. 编码规则

### 2.1 返回值格式必须与 Legacy 一致

通过 `exposeToLegacy` 暴露的函数是 Legacy 代码的"公共 API"，其签名必须保持向后兼容。

```typescript
// 错误：使用 camelCase（TS 风格）
return { mapX: x, mapY: y };

// 正确：使用 snake_case（匹配 Legacy 调用者的期望）
return { map_x: x, map_y: y };
```

### 2.2 全局变量必须从 window 读取

Legacy 代码中的全局变量（`tiles`, `map`, `units`, `SINGLE_MOVE` 等）是通过 `var` 声明的，存在于 `window` 上。TS 模块中的 `export let` 变量是独立的模块作用域变量，不会被 Legacy 代码的赋值影响。

```typescript
// 错误：使用模块变量（永远是 undefined）
export let SINGLE_MOVE: number;
function move_points_text(moves: number) {
  return moves / SINGLE_MOVE;  // NaN!
}

// 正确：从 window 读取
function move_points_text(moves: number) {
  const sm = (window as any).SINGLE_MOVE;
  return moves / sm;
}
```

**规则**：在 `exposeToLegacy` 暴露的函数中，始终使用 `(window as any).xxx` 访问 Legacy 全局变量。

### 2.3 不要覆盖初始化函数

初始化函数通常包含 TS 版本难以完全复制的副作用。如果 TS 版本遗漏了任何副作用，会导致下游功能静默失败。

```typescript
// 错误：覆盖初始化函数
exposeToLegacy('map_allocate', mapAllocate);  // 遗漏了 init_overview()

// 正确：只覆盖纯查询函数
exposeToLegacy('map_pos_to_tile', mapPosToTile);
```

---

## 3. 测试流程

### 3.1 修改前：采集基线日志

在修改任何代码之前，先采集 Legacy 函数的调用日志作为基线：

```javascript
// 1. 在控制台启用调试
window.__TS_DEBUG = true;

// 2. 开始录制
__TS_SNAPSHOT_START();

// 3. 正常玩游戏 2-3 个回合

// 4. 停止录制并导出
copy(JSON.stringify(__TS_SNAPSHOT_STOP(), null, 2));
// 粘贴到 baseline.json
```

### 3.2 修改后：采集对比日志

用同样的方法采集修改后的日志，然后对比：

```bash
# 对比两份日志
diff baseline.json migrated.json

# 或者只看 mismatch
cat migrated.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for e in data:
    if e.get('mismatch'):
        print(f\"{e['fn']}({e['args']}) => TS:{e['ret']} Legacy:{e['legacyRet']}\")
"
```

### 3.3 本地验证清单

每次修改后，按顺序执行以下检查：

```bash
# 1. TypeScript 类型检查（零错误）
npx tsc --noEmit

# 2. 单元测试（全部通过）
npx vitest run

# 3. Vite 构建（成功）
npx vite build

# 4. 本地前端开发服务器（连接远程后端）
BACKEND_URL=https://xbworld-production.up.railway.app ./scripts/dev.sh
```

第 4 步会启动 Vite dev server，连接到远程后端。你可以在浏览器中实际玩游戏来验证修改，**无需重新部署后端**。

### 3.4 线上验证

部署后，在浏览器控制台执行以下快速检查：

```javascript
// 检查 TS 模块加载
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('ts-bundle'))
  .map(r => ({name: r.name, status: 'loaded'}));

// 检查关键函数
['client_state', 'can_client_control', 'client_is_observer',
 'map_pos_to_tile', 'tile_terrain', 'move_points_text'
].forEach(fn => console.log(fn, typeof window[fn]));

// 检查 mismatch 日志
window.__TS_DEBUG = true;
// 玩几个回合后：
__TS_CALL_LOG.filter(e => e.mismatch);
```

---

## 4. 部署流程

### 4.1 前后端分离部署

项目支持三种部署方式：

| 方式 | Dockerfile | 适用场景 |
|---|---|---|
| **全栈（当前）** | `Dockerfile.railway` | 生产环境，一体化部署 |
| **仅后端** | `Dockerfile.backend` | 后端代码变更时，不需要重新构建前端 |
| **仅前端** | `Dockerfile.frontend` | 前端代码变更时，不需要重新构建后端（C 编译约 3 分钟） |

### 4.2 本地开发（推荐）

对于前端迁移工作，推荐使用本地 Vite dev server 连接远程后端：

```bash
cd xbworld-web
BACKEND_URL=https://xbworld-production.up.railway.app ./scripts/dev.sh
```

这样可以获得：
- **即时反馈**：Vite HMR，修改 TS 代码后浏览器自动刷新
- **零部署等待**：不需要 Docker 构建和 Railway 部署
- **真实后端**：WebSocket 和 API 请求代理到远程后端，游戏功能完整可用
- **调试日志**：`__TS_DEBUG` 模式下实时对比 TS 和 Legacy 函数的输出

---

## 5. 常见问题排查

### 5.1 函数返回 undefined

**检查顺序**：
1. 函数是否在 `exposeToLegacy` 中注册？
2. 函数内部是否使用了模块变量而非 `window` 全局变量？
3. 返回值的属性名是否与 Legacy 一致？

### 5.2 地图黑屏

**检查顺序**（从渲染管线末端往回追）：
1. `mapview.gui_x0 / gui_y0` 是否指向有效区域？
2. `tile_get_known(tile)` 对可见 tiles 是否返回 `TILE_KNOWN_SEEN`？
3. `fill_sprite_array(tile)` 是否返回非空数组？
4. `tiles` 对象是否有数据？
5. `map_allocate` 是否被正确调用？

### 5.3 NaN / undefined 显示

通常是 TS 模块变量未被 Legacy 代码赋值。搜索该变量在 Legacy 代码中的赋值位置，改为从 `window` 读取。

---

## 6. 文件索引

| 文件 | 用途 |
|---|---|
| `src/ts/bridge/legacy.ts` | TS ↔ Legacy 桥接层，包含日志系统 |
| `src/ts/main.ts` | TS 模块入口，Phase 0 polyfills |
| `src/ts/global.d.ts` | Legacy 全局变量和函数的类型声明 |
| `docs/MIGRATION_PITFALLS.md` | 踩坑记录（每次踩坑后更新） |
| `docs/MIGRATION_GUIDE.md` | 本文档（迁移操作手册） |
| `vite.config.dev.ts` | 本地开发配置（连接远程后端） |
| `scripts/dev.sh` | 本地开发启动脚本 |
