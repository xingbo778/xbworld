# XBWorld Web Client 迁移踩坑记录

> 本文档记录了从旧版 JavaScript 迁移到 TypeScript 过程中遇到的问题、根因分析和解决方案，供后续迁移参考。

---

## 坑 1：`.dockerignore` 排除了 TS 构建所需文件

### 现象

Dockerfile 中添加了 Node.js/Vite 构建阶段（Stage 3），但 Railway 部署持续失败。

### 根因

`.dockerignore` 中排除了以下文件，导致 Docker 构建上下文中缺少 TS 源码：

```
xbworld-web/src/ts/
xbworld-web/package*.json
xbworld-web/tsconfig*.json
xbworld-web/vite.config.ts
```

### 解决方案

在 `.dockerignore` 中用 `!` 前缀显式取消排除这些文件：

```
!xbworld-web/src/ts/
!xbworld-web/package.json
!xbworld-web/package-lock.json
!xbworld-web/tsconfig.json
!xbworld-web/vite.config.ts
```

### 教训

修改 Dockerfile 添加新的构建阶段时，**必须同步检查 `.dockerignore`**，确认所需文件没有被排除。

---

## 坑 2：`update_unit_position` 未定义导致地图黑屏

### 现象

游戏启动后地图全黑，视角没有自动定位到玩家起始位置。底部操作按钮显示异常。

### 根因

调用链如下：

```
advance_unit_focus()
  → set_unit_focus_and_redraw(unit)
    → auto_center_on_focus_unit()
      → update_unit_position(ptile)   ← ReferenceError!
```

`update_unit_position` 仅在 WebGL 渲染器中定义，2D Canvas 模式下不存在。`auto_center_on_focus_unit()` 中的调用**没有** `if (renderer == RENDERER_WEBGL)` 保护（而同文件中其他调用点有此保护），属于旧版代码的潜在 bug。

之前这个 bug 被掩盖的原因：`.dockerignore` 排除了 TS 源码 → Vite 构建失败 → `ts-bundle/main.js` 不存在 → `<script type="module">` 加载 404 → TS 模块从未执行 → 旧版函数没有被覆盖 → 旧版代码中的 ReferenceError 在某些执行路径下被静默吞掉。

修复 `.dockerignore` 后 TS 模块开始真正加载，`exposeToLegacy` 覆盖了旧版函数，改变了初始化时序，暴露了这个潜在 bug。

### 解决方案

在 `main.ts` 的最早期（Phase 0，在任何模块导入之前）添加 polyfill：

```typescript
const win = window as unknown as Record<string, unknown>;
if (typeof win['update_unit_position'] !== 'function') {
  win['update_unit_position'] = function (_ptile: unknown): void {
    /* no-op in 2D renderer */
  };
}
```

### 教训

1. 旧版代码中存在大量**隐式依赖**（函数在某个渲染器中定义但被公共代码无条件调用），迁移时需要逐一排查。
2. `exposeToLegacy` 覆盖旧版函数后，可能改变初始化时序，暴露之前被掩盖的 bug。
3. 每次新增 `exposeToLegacy` 调用后，**必须进入游戏实际测试**，不能只验证预游戏页面。

---

## 坑 3：`get_invalid_username_reason` 的 banlist 检查逻辑反转

### 现象

所有用户名都被拒绝，无法开始游戏。

### 根因

旧版 `check_text_with_banlist_exact(username)` 的返回值语义：
- 返回 `true` → 用户名**有效**（不在 banlist 中）
- 返回 `false` → 用户名**无效**（在 banlist 中）

新版 TS 代码误将 `true` 理解为"在 banlist 中"，导致逻辑反转。

### 解决方案

```typescript
// 错误写法：
if (check_text_with_banlist_exact(username)) return 'banned';

// 正确写法：
if (!check_text_with_banlist_exact(username)) return 'banned';
```

### 教训

迁移旧版函数时，**必须仔细阅读被调用函数的返回值语义**，不能凭函数名猜测。建议在 `global.d.ts` 中为旧版函数添加 JSDoc 注释，标注返回值含义。

---

## 坑 4：`ts-bundle` 构建产物不应提交到 Git

### 现象

`git status` 显示 `ts-bundle/` 目录下的构建产物被跟踪。

### 解决方案

在 `.gitignore` 中添加：

```
xbworld-web/src/main/webapp/javascript/ts-bundle/
```

### 教训

Vite 构建产物输出到 `webapp/javascript/ts-bundle/`，位于源码目录内，容易被误提交。**新增构建步骤时必须同步更新 `.gitignore`**。

---

## 测试手段和验证清单

### 本地验证（每次修改后必做）

```bash
# 1. TypeScript 类型检查（零错误）
npx tsc --noEmit

# 2. ESLint 检查（只允许 no-explicit-any 警告）
npx eslint src/ts/ --ext .ts

# 3. Prettier 格式化检查
npx prettier --check "src/ts/**/*.ts"

# 4. 单元测试（全部通过）
npx vitest run

# 5. Vite 构建（成功生成 ts-bundle/main.js）
npx vite build
```

### 线上验证（每次部署后必做）

#### 步骤 1：检查 TS 模块加载

打开浏览器控制台，确认：

```javascript
// 检查 ts-bundle 是否加载成功
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('ts-bundle'))
  .map(r => ({name: r.name, status: 'loaded'}));
```

#### 步骤 2：检查 exposeToLegacy 函数

```javascript
// 验证所有暴露的函数存在且可调用
['client_state', 'can_client_control', 'client_is_observer',
 'is_longturn', 'get_invalid_username_reason', 'update_unit_position'
].forEach(fn => console.log(fn, typeof window[fn]));
```

#### 步骤 3：进入游戏验证地图

1. 以 singleplayer 模式启动游戏（用户名不含特殊字符）
2. 等待 15-20 秒让地图生成
3. 确认以下项目：

| 验证项 | 预期结果 |
|---|---|
| 地图渲染 | 地形（草地、森林、河流、海洋）全部可见 |
| 视角定位 | 自动 center 到玩家起始位置（非全黑） |
| 单位显示 | Explorer、Settlers 等单位图标可见 |
| 操作按钮 | 底部 11 个按钮（Goto、Explore、Fortify 等）正常显示 |
| 标签页 | Map/Government/Research/Nations/Cities/Options/Manual 可切换 |
| 状态栏 | 显示文明名称、金币、年代、回合数 |
| 控制台 | 无 ReferenceError 或其他 JS 错误 |

#### 步骤 4：检查控制台错误

```javascript
// 快速检查关键状态
JSON.stringify({
  update_unit_position: typeof update_unit_position,
  current_focus: current_focus.length,
  units_count: Object.keys(units).length,
  tiles_count: Object.keys(tiles).length
});
```

---

## 迁移原则（从踩坑中总结）

1. **先 polyfill 再 override**：在 `main.ts` 中，先补齐缺失的函数（Phase 0），再导入会覆盖旧版函数的模块。
2. **返回值语义必须验证**：迁移函数时，用控制台对比新旧版本的返回值，确保一致。
3. **构建配置三件套同步**：修改 Dockerfile 时，同步检查 `.dockerignore` 和 `.gitignore`。
4. **端到端测试不可省略**：每次部署后必须实际进入游戏，不能只验证预游戏页面。
5. **渐进式覆盖**：`exposeToLegacy` 一次只覆盖少量函数，每批覆盖后都要完整测试。

## 4. `var` 声明的全局变量无法被 `Object.defineProperty` 拦截

**发现时间**：Phase 6 迁移 map/tile/terrain 模块后

**现象**：`map_pos_to_tile()` 对所有输入返回 `undefined`，地图渲染为全黑。

**根因**：旧版 JS 中的全局变量（如 `var tiles = {}`, `var map = {}`）的 `configurable` 属性为 `false`。`syncStoreWithLegacy()` 尝试用 `Object.defineProperty(window, 'tiles', ...)` 将其重定义为 getter/setter，但因为 `configurable: false` 而**静默失败**（被 try/catch 吞掉）。

结果是：
- `store.tiles` 和 `store.mapInfo` 永远为空
- TS 函数内部的 `getMapInfo()` 和 `getTiles()` 先检查 `store.*`（空的），然后 fallback 到 `window.*`
- 但 fallback 逻辑在 bundle 的闭包中引用的是编译时的 `c`（store），而不是运行时的 `window`

**修复方案**：所有通过 `exposeToLegacy` 暴露给旧版代码的函数，**必须直接读取 `window` 全局变量**，不能通过 `store` 中转。`store` 只用于纯 TS 内部的新代码。

**测试方法**：
```javascript
// 在控制台检查全局变量是否有 getter/setter
Object.getOwnPropertyDescriptor(window, 'tiles')
// 如果 configurable: false 且没有 get/set，说明 syncProp 失败了

// 检查 TS 函数是否能正确读取数据
map_pos_to_tile(10, 10)  // 应该返回 tile 对象，不是 undefined
```

**规则**：在 `exposeToLegacy` 暴露的函数中，始终使用 `(window as any).xxx` 访问旧版全局变量。

---

## 坑 5：`exposeToLegacy` 覆盖初始化函数导致地图黑屏

### 现象

游戏启动后地图全黑（所有像素为 `rgba(0,0,0,255)`），但 UI 元素（标签页、按钮、消息面板）正常显示。小地图（World map）也无内容。

### 根因

TS 模块通过 `exposeToLegacy` 覆盖了三个关键的初始化函数：

| 函数 | Legacy 行为 | TS 行为 | 差异 |
|---|---|---|---|
| `map_allocate` | 创建 tiles → 调用 `tile_init()` → 调用 `init_overview()` | 仅创建 tiles | 缺少 `init_overview()` 调用 |
| `tile_init` | 设置 `known: null`, `owner: null` | 设置 `known: 0`, `owner: -1` | 默认值不同 |
| `map_init_topology` | 设置 `map.topology_id` 等拓扑参数 | 仅设置部分参数 | 不完整 |

当 Legacy 代码调用 `map_allocate()` 时，执行的是 TS 版本，跳过了 `init_overview()`，导致小地图不初始化。同时 `tile_init` 的默认值差异导致 `tile_get_known()` 对所有 tiles 返回 `TILE_UNKNOWN`（因为 `known: 0 === TILE_UNKNOWN`），渲染代码跳过所有 unknown tiles。

### 解决方案

移除这三个函数的 `exposeToLegacy` 调用，让 Legacy 版本继续执行：

```typescript
// 已移除：
// exposeToLegacy('map_allocate', mapAllocate);
// exposeToLegacy('tile_init', tileInit);
// exposeToLegacy('map_init_topology', mapInitTopology);
```

### 教训

**不是所有函数都适合通过 `exposeToLegacy` 覆盖**。以下类型的函数应该保留 Legacy 版本：

1. **初始化函数**：通常包含副作用（UI 初始化、事件绑定等），TS 版本很难完全复制所有副作用。
2. **编排函数**：调用多个其他函数的函数（如 `map_allocate` 调用 `tile_init` 和 `init_overview`），TS 版本可能遗漏部分调用。
3. **设置默认值的函数**：如果 TS 版本的默认值与 Legacy 不同，会导致下游逻辑异常。

适合 `exposeToLegacy` 的函数是**纯查询函数**（如 `map_pos_to_tile`、`tile_get_known`、`tile_terrain`）和**纯计算函数**（如 `NATIVE_TO_MAP_POS`）。

---

## 坑 6：坐标转换函数返回值属性名不匹配

### 现象

地图渲染时，所有依赖坐标转换的操作返回 `undefined`，导致 tiles 无法正确定位。

### 根因

TS 版本使用 camelCase 属性名，但 Legacy 代码期望 snake_case：

| 函数 | TS 返回值 | Legacy 期望值 |
|---|---|---|
| `NATIVE_TO_MAP_POS` | `{mapX, mapY}` | `{map_x, map_y}` |
| `MAP_TO_NATIVE_POS` | `{natX, natY}` | `{nat_x, nat_y}` |

Legacy 代码中的调用方式：

```javascript
var r = NATIVE_TO_MAP_POS(nat_x, nat_y);
var map_x = r.map_x;  // TS 版本返回 undefined！
var map_y = r.map_y;  // TS 版本返回 undefined！
```

### 解决方案

修改 TS 函数的返回值属性名以匹配 Legacy 格式：

```typescript
// 修改前：
return { mapX: ..., mapY: ... };

// 修改后：
return { map_x: ..., map_y: ... };
```

同时更新所有引用这些属性的 TS 代码和单元测试。

### 教训

通过 `exposeToLegacy` 暴露给 Legacy 代码的函数，其**返回值的属性名必须与 Legacy 版本完全一致**。迁移时应该：

1. 在 Legacy 代码中搜索函数调用点，确认返回值的使用方式。
2. 在 `global.d.ts` 中为返回值类型添加明确的接口定义。
3. 编写单元测试验证返回值属性名。

**规则**：`exposeToLegacy` 暴露的函数是 Legacy 代码的"公共 API"，其签名（参数和返回值）必须保持向后兼容。

---

## 迁移原则（更新版）

1. **先 polyfill 再 override**：在 `main.ts` 中，先补齐缺失的函数（Phase 0），再导入会覆盖旧版函数的模块。
2. **返回值语义必须验证**：迁移函数时，用控制台对比新旧版本的返回值，确保一致。
3. **返回值属性名必须匹配**：`exposeToLegacy` 暴露的函数，返回值属性名必须使用 Legacy 的 snake_case 格式。
4. **构建配置三件套同步**：修改 Dockerfile 时，同步检查 `.dockerignore` 和 `.gitignore`。
5. **端到端测试不可省略**：每次部署后必须实际进入游戏，不能只验证预游戏页面。
6. **渐进式覆盖**：`exposeToLegacy` 一次只覆盖少量函数，每批覆盖后都要完整测试。
7. **不覆盖初始化/编排函数**：包含副作用或调用多个子函数的初始化函数，应保留 Legacy 版本。
8. **只覆盖纯查询/计算函数**：适合 `exposeToLegacy` 的是无副作用的纯函数。
