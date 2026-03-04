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


---

## 坑 7：TS 覆盖的函数依赖 Legacy 模块的局部变量

### 现象

`improvement_id_by_name('Palace')` 报错 `Cannot read properties of undefined (reading 'hasOwnProperty')`。

### 根因

Legacy `improvement.js` 中有一个模块级局部变量 `improvements_name_index`（用 `const` 声明），它是 `improvements_init()` 中构建的名称→ID 缓存。Legacy 的 `improvement_id_by_name` 函数可以直接访问它（同一闭包内），但 TS 版本通过 `(window as any).improvements_name_index` 去读取——这个变量**不在 `window` 上**，所以永远是 `undefined`。

```javascript
// Legacy improvement.js
const improvements_name_index = {};  // 模块局部变量，不在 window 上

function improvements_init() {
  // ... 构建 improvements_name_index ...
}

function improvement_id_by_name(name) {
  return improvements_name_index.hasOwnProperty(name)  // 可以访问
    ? improvements_name_index[name] : -1;
}
```

```typescript
// TS improvement.ts — 错误做法
function improvementIdByName(name: string): number {
  const idx = (window as any).improvements_name_index;  // undefined!
  return idx.hasOwnProperty(name) ? idx[name] : -1;     // 报错!
}
exposeToLegacy('improvement_id_by_name', improvementIdByName);  // 覆盖了能正常工作的 Legacy 版本
```

### 解决方案

**不 exposeToLegacy 这个函数**。Legacy 版本能正常工作，TS 版本反而破坏了它。TS 内部如需此功能，提供一个不覆盖 Legacy 的内部实现（遍历 `window.improvements`）。

### 教训

**迁移前必须检查函数是否依赖模块局部变量**。以下情况不应 `exposeToLegacy`：

1. 函数读取模块级 `const`/`let`/`var` 声明的变量（不在 `window` 上）
2. 函数依赖模块级缓存（如 `improvements_name_index`、`xxx_cache` 等）
3. 函数依赖模块级闭包中的状态

**检查方法**：在浏览器控制台执行 `typeof window.xxx` 确认变量是否在全局作用域上。

---

## 迁移原则（Phase 1 更新）

9. **不覆盖依赖模块局部变量的函数**：如果 Legacy 函数依赖模块内的 `const`/`let`/`var` 局部变量（不在 `window` 上），TS 版本无法访问这些变量，不应 `exposeToLegacy`。迁移前用 `typeof window.xxx` 验证。
10. **本地 dev server 测试流程**：每次修改后，用 `BACKEND_URL=... npx vite --config vite.config.dev.ts` 启动本地 dev server，连接远程后端进行端到端测试，避免每次都重新部署。


---

## 坑 8：`DIVIDE` 函数的 Legacy 实现使用 `parseInt` 而非 `Math.floor`

### 现象

单元测试 `DIVIDE(-7, 3)` 期望 `-3`，但修改后的 TS 版本返回 `-4`。

### 根因

Legacy 的 `DIVIDE` 实现：

```javascript
function DIVIDE(n, d) {
  return parseInt( (n) / (d) - (( (n) < 0 && (n) % (d) < 0 ) ? 1 : 0) );
}
```

这个实现看起来是"向负无穷取整"，但实际上 `parseInt` 是**向零截断**（truncation），然后再减 1 来补偿。最终效果等价于 `Math.floor(n/d)`。

TS 迁移时，我错误地将 Legacy 的补偿逻辑（`- (n < 0 && n % d < 0 ? 1 : 0)`）叠加到 `Math.floor` 上，导致双重补偿：

```typescript
// 错误：Math.floor 已经向负无穷取整了，再减 1 就多减了
return Math.floor(n / d) - (n < 0 && n % d < 0 ? 1 : 0);  // -7/3 → -3 - 1 = -4

// 正确：Math.floor 本身就够了
return Math.floor(n / d);  // -7/3 → -3
```

### 解决方案

直接使用 `Math.floor(n / d)`，不需要额外的补偿逻辑。

### 教训

迁移数学函数时，**必须用 Node.js 验证 Legacy 实现的实际行为**，不能只看代码逻辑推断。`parseInt` 和 `Math.floor` 对负数的行为不同：`parseInt(-2.33)` → `-2`，`Math.floor(-2.33)` → `-3`。

---

## 坑 9：`BitVector` 构造函数不能用 TS class 覆盖

### 现象

分析发现 TS 的 `BitVector` class 使用 `private readonly data: Uint8Array` 存储数据，而 Legacy 使用 `this.raw`。

### 根因

Legacy 代码中大量使用 `new BitVector(raw)` 创建实例，且 `packhand.js` 中直接将 `BitVector` 实例赋值给 packet 属性。如果用 TS class 覆盖：

1. `this.data`（TS）vs `this.raw`（Legacy）— 属性名不同
2. Legacy 代码可能直接访问 `bv.raw`，TS 版本中不存在
3. `Uint8Array`（TS）vs `Array`（Legacy）— 类型不同

### 解决方案

**不 exposeToLegacy `BitVector`**。TS 内部使用自己的 `BitVector` class，Legacy 继续使用自己的构造函数。

### 教训

**构造函数/类的 exposeToLegacy 需要特别谨慎**：不仅要保证方法签名兼容，还要保证**实例的属性名和类型**与 Legacy 完全一致。如果 TS 版本改变了内部存储结构（属性名、类型），则不应覆盖。

---

## Phase 2 效率总结

### 做得好的地方

1. **先盘点再编码**：花 10 分钟检查了每个 Legacy 函数的依赖关系（模块局部变量、外部依赖），避免了盲目迁移。
2. **本地 dev server 测试**：不需要等 Railway 部署（3-5 分钟），本地修改后 HMR 即时刷新。
3. **浏览器控制台批量验证**：一次性测试 10 个函数，而非逐个测试。

### 需要改进的地方

1. **DIVIDE 的 parseInt vs Math.floor 问题**：应该在编码前就用 Node.js 跑一遍 Legacy 实现，而不是写完后才发现测试失败。
2. **BitVector 分析**：花了时间分析后决定不迁移——这个决策应该在盘点阶段就做出（检查 `this.raw` vs `this.data` 的属性名差异）。

### 迁移原则（Phase 2 更新）

11. **数学函数必须用 Node.js 验证**：迁移前用 `node -e "..."` 跑 Legacy 实现的边界用例（负数、零、大数），确认行为后再写 TS 版本。
12. **构造函数/类不轻易覆盖**：如果 TS 版本改变了实例的属性名或内部存储结构，不应 `exposeToLegacy`。

---

## 坑 8：Vite dev proxy 的 TLS 握手失败

### 现象

本地 Vite dev server 代理 API 请求到 Railway HTTPS 后端时，所有请求都报错：
```
Error: Client network socket disconnected before secure TLS connection was established
```

### 根因

Vite 的 `http-proxy` 默认使用 Node.js 的 HTTPS agent，在代理到 Railway 等 PaaS 平台时，TLS 握手可能因为平台的 TLS 配置（SNI、证书链）导致连接在握手完成前被断开。仅设置 `secure: false` 不够，因为它只跳过证书验证，不解决握手超时问题。

### 解决方案

创建自定义 `https.Agent` 并传入 proxy 配置：

```typescript
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  timeout: 30000,  // 增加超时以应对 Railway 冷启动
});

const apiProxy = {
  target: BACKEND,
  changeOrigin: true,
  secure: false,
  agent: httpsAgent,  // 关键：使用自定义 agent
};
```

### 教训

> 本地 dev proxy 配置需要在首次搭建时就完整测试所有 API 端点，不能只测试页面加载。每次修改 proxy 配置后，必须验证 `/validate_user`、`/civclientlauncher`、`/civsocket` 三个关键端点。

---

## Phase 3 效率总结

### 做得好的

1. **先分析再动手** — 对 packhand.js 的 135 个函数做了完整分类（纯赋值 / 有副作用 / 依赖局部变量），避免了盲目迁移
2. **果断跳过不适合的函数** — 识别出大量 handler 依赖模块局部变量或有 UI 副作用后，只迁移了 31 个安全的函数
3. **本地 dev server 测试** — 不再需要每次部署到 Railway，节省了大量时间
4. **调试日志系统** — `__TS_CALL_LOG` 可以快速确认函数是否被调用和返回值是否正确

### 需要改进的

1. **Vite proxy 配置应该一次性测试完整** — 每次启动 dev server 都要重新排查 proxy 问题，浪费时间
2. **应该建立自动化的端到端测试脚本** — 目前每次都手动在浏览器中输入用户名、点击按钮、检查控制台，应该用 Playwright 自动化


---

## 坑 10：删除 Legacy JS 文件前必须检查「变量声明」而非仅检查「函数覆盖」

### 现象

Phase 8+9 删除 `player.js` 后，Legacy 代码中引用 `DS_WAR`、`DS_PEACE`、`PLRF_AI` 等常量的函数在运行时报 `ReferenceError`。

### 根因

删除前的覆盖率检查只关注了**函数**是否在 TS 中有对应的 `exposeToLegacy`，但忽略了 Legacy JS 文件中的 **`var` 声明的常量和全局变量**。例如 `player.js` 中：

```javascript
var DS_WAR = 0;
var DS_ARMISTICE = 1;
var DS_CEASEFIRE = 2;
var DS_PEACE = 3;
var DS_ALLIANCE = 4;
var PLRF_AI = 1;
var MAX_NUM_PLAYERS = 30;
```

TS 的 `player.ts` 中这些值定义在 `const enum DiplState` 中，编译后会被**内联为数字**，不会暴露到 `window`。Legacy 代码中有 20+ 处引用 `DS_WAR` 等常量（如 `diplomacy.js`、`nation.js`），删除 `player.js` 后这些引用全部变成 `undefined`。

### 解决方案

在 `player.ts` 末尾添加显式的 `window` 暴露：

```typescript
// Expose DiplState enum values as globals for legacy JS
const w = window as any;
w.DS_WAR = DiplState.DS_WAR;           // 0
w.DS_ARMISTICE = DiplState.DS_ARMISTICE; // 1
// ... etc
w.PLRF_AI = 1;
w.MAX_NUM_PLAYERS = 30;
w.MAX_NUM_BARBARIANS = 10;
```

### 教训

**删除 Legacy JS 文件的检查清单必须包含三项**：

| 检查项 | 方法 |
|---|---|
| 函数是否全部被 TS `exposeToLegacy` 覆盖 | `grep "function " xxx.js` 对比 `grep "exposeToLegacy" xxx.ts` |
| `var` 声明的常量是否暴露到 `window` | `grep "^var " xxx.js`，然后在浏览器中逐一检查 `typeof window.XXX` |
| `var` 声明的全局变量（如 `players = {}`）是否在 `main.ts` 或 `sync.ts` 中初始化 | 检查 `main.ts` 的初始化代码和 `sync.ts` 的 `syncProp` 调用 |

**特别注意 `const enum`**：TypeScript 的 `const enum` 在编译后会被内联，不会产生运行时对象。如果 Legacy 代码引用这些常量名，必须手动暴露到 `window`。

---

## 坑 11：jQuery 插件（`$.getUrlVar`）随 `utility.js` 一起被删除

### 现象

删除 `utility.js` 后，游戏启动页面的 Welcome 对话框不显示，控制台报 `$.getUrlVar is not a function`。

### 根因

`utility.js` 中不仅有普通函数，还有一个 **jQuery 插件扩展**：

```javascript
$.extend({
  getUrlVars: function() { /* 解析 URL 参数 */ },
  getUrlVar: function(name) { return $.getUrlVars()[name]; }
});
```

TS 的 `helpers.ts` 迁移了 `utility.js` 中的所有普通函数（`generate_textlist_string`、`benchmark_start` 等），但遗漏了这个 jQuery 插件。`civclient.js` 的 `document.ready` 中调用 `$.getUrlVar('action')` 来判断游戏模式，这是页面初始化的第一步。

### 解决方案

在 `helpers.ts` 中添加 jQuery 插件注册：

```typescript
const jq = (window as any).$ as any;
if (jq && jq.extend) {
  jq.extend({
    getUrlVars: function () {
      const vars: Record<string, string> = {};
      window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, (_m, key, value) => {
        vars[key] = value;
        return '';
      });
      return vars;
    },
    getUrlVar: function (name: string) {
      return jq.getUrlVars()[name];
    },
  });
}
```

### 教训

**删除 Legacy JS 文件前，必须搜索以下模式**：

```bash
# 检查是否有 jQuery 插件扩展
grep -n "\\$.extend\|\\$.fn\." xxx.js

# 检查是否有 prototype 扩展
grep -n "prototype\." xxx.js

# 检查是否有全局事件绑定
grep -n "addEventListener\|\\$(document)\|\\$(window)" xxx.js
```

这些**副作用代码**不是函数定义，不会出现在 `grep "function "` 的结果中，但删除后会导致功能缺失。

---

## 坑 12：`fc_types.js` 的 368 个常量需要批量暴露策略

### 现象

`fc_types.js` 有 368 个 `var` 声明的常量，被 Legacy 代码广泛引用（几乎每个 JS 文件都用到）。逐一手动暴露不现实。

### 根因

`fcTypes.ts` 最初只定义了约 170 个常量（从 Phase 1 迁移），且使用 `const enum`（编译时内联，不暴露到 `window`）。`fc_types.js` 中还有约 195 个常量未在 TS 中定义。

### 解决方案

使用 Python 脚本从 `fc_types.js` 自动提取所有 `var` 声明，生成 `export const` 语句和批量暴露代码：

```python
# 1. 提取所有 var 声明
grep "^var " fc_types.js | sed 's/var /export const /' > constants.txt

# 2. 生成批量暴露代码
const _allConstants = { VAR1, VAR2, ... };
for (const [k, v] of Object.entries(_allConstants)) {
  (window as any)[k] = v;
}
```

**关键注意事项**：

1. **去重**：旧版 `fcTypes.ts` 中已有的常量不能重复声明（如 `RPT_POSSIBLE`、`RPT_CERTAIN`）
2. **值冲突**：旧版 `fcTypes.ts` 中的值可能与 `fc_types.js` 不同（如 `ACTRES_NONE` 在旧 TS 中是 47，在 JS 中是 67），以 JS 为准
3. **XBWorld 自定义常量**：旧版 `fcTypes.ts` 中有 15 个不在 `fc_types.js` 中的常量（如 `REQ_RANGE_PLAYER`、`VUT_UTYPE`），这些是 XBWorld 项目自定义的，必须保留

### 教训

**大文件迁移应使用脚本自动化**，而非手动逐行迁移。自动化脚本应包含：

1. 从 Legacy JS 提取所有声明
2. 与现有 TS 文件做 diff，找出缺失项
3. 生成代码并检查重复/冲突
4. 编译验证

---

## 坑 13：`type="module"` 脚本的加载时序与 Legacy JS 不同

### 现象

删除 Legacy JS 文件后，担心 TS bundle（`type="module"`）在 Legacy JS 之后加载，导致 Legacy JS 在加载时引用的全局变量不存在。

### 根因分析

`index.html` 中的加载顺序：

```html
<!-- 1. jQuery 和第三方库 -->
<script src="/javascript/libs/jquery.min.js"></script>

<!-- 2. Legacy JS 文件（普通 script） -->
<script src="/javascript/civclient.js"></script>
<script src="/javascript/control.js"></script>
<!-- ... -->

<!-- 3. TS bundle（type="module"） -->
<script type="module" src="/javascript/ts-bundle/main.js"></script>
```

`type="module"` 脚本是**延迟执行**的（类似 `defer`），在 DOM 解析完成后、`DOMContentLoaded` 事件前执行。Legacy JS 是**同步执行**的，在加载时立即运行。

**关键发现**：Legacy JS 文件中的全局变量引用（如 `terrains`、`players`、`DS_WAR`）几乎全部出现在**函数定义内部**，而非全局作用域的立即执行代码。函数只在被调用时才解析变量引用，而函数调用发生在 `document.ready` 之后（此时 TS module 已加载完毕）。

### 安全删除的条件

一个 Legacy JS 文件可以安全删除，当且仅当：

1. 其所有函数和常量已在 TS 中通过 `exposeToLegacy` 或 `window[xxx] = yyy` 暴露
2. 其声明的全局变量已在 `main.ts` 或 `sync.ts` 中初始化
3. **没有在全局作用域立即使用其他 Legacy 文件的变量**（如 `var x = someOtherGlobal + 1`）

### 验证方法

```bash
# 检查文件中是否有全局作用域的立即执行代码（非函数定义内）
# 如果只有 var 声明和 function 定义，则安全
grep -n "^[^/]" xxx.js | grep -v "^[0-9]*:var \|^[0-9]*:function \|^[0-9]*:}\|^[0-9]*:$\|^[0-9]*://\|^[0-9]*:/\*"
```

---

## 坑 14：`connection.js` 的函数被 TS `packhandlers.ts` 通过 `window` 调用但未定义

### 现象

分析 `connection.js` 时发现其 3 个函数（`find_conn_by_id`、`client_remove_cli_conn`、`conn_list_append`）在 TS 的 `packhandlers.ts` 中通过 `w.find_conn_by_id()` 调用，但从未在 TS 中定义。

### 根因

Phase 5 迁移 packet handlers 时，这些函数被视为"Legacy 辅助函数"，通过 `window` 调用以避免导入。但如果删除 `connection.js`，这些 `window` 调用就会失败。

### 解决方案

将这 3 个函数直接实现在 `packhandlers.ts` 中，并将 `w.find_conn_by_id()` 等调用替换为直接函数调用：

```typescript
// 在 packhandlers.ts 中添加
function find_conn_by_id(id: number) { /* ... */ }
function client_remove_cli_conn(pconn: any) { /* ... */ }
function conn_list_append(pconn: any) { /* ... */ }

// 同时暴露给 Legacy
exposeToLegacy('find_conn_by_id', find_conn_by_id);
```

### 教训

**TS 代码中通过 `window.xxx()` 调用的函数，必须在删除对应 Legacy 文件前迁移到 TS 内部**。搜索方法：

```bash
# 查找 TS 中所有通过 window 调用的 Legacy 函数
grep -n "w\.\|window\." src/ts/**/*.ts | grep -v "window.location\|window.document\|window.setTimeout"
```

---

## Phase 8-10 效率总结

### 做得好的

1. **系统性的删除前检查**：对每个待删除文件做了函数覆盖、变量声明、jQuery 插件三项检查，避免了大规模回退。
2. **Python 脚本自动化**：用脚本从 `fc_types.js` 自动生成 368 个常量的 TS 代码，避免手动逐行迁移。
3. **发现并修复了 `$.getUrlVar` 遗漏**：在测试中快速定位到 jQuery 插件缺失的问题。

### 需要改进的

1. **Vite dev server 配置反复折腾**：`allowedHosts`、`root` 目录、端口占用等问题消耗了大量时间。**应该建立一个稳定的 `vite.config.dev.ts`** 专门用于本地测试，与生产 `vite.config.ts` 分离，且在文档中记录启动命令。

2. **黑色地图问题的排查效率低**：花了大量时间在浏览器控制台中逐步排查渲染管线，最终发现是 `mark_all_dirty()` 时序问题（可能是预先存在的 bug）。**应该建立一个标准的地图渲染诊断脚本**：

```javascript
// 标准地图渲染诊断（保存为 bookmark 或 snippet）
(function() {
  var d = {};
  d.tileset_loaded = typeof tileset !== 'undefined' && Object.keys(tileset).length > 0;
  d.sprites_count = typeof sprites !== 'undefined' ? Object.keys(sprites).length : 0;
  d.map_exists = typeof map !== 'undefined' && map.xsize > 0;
  d.known_tiles = Object.values(tiles).filter(t => t.known >= 2).length;
  d.dirty_all = typeof dirty_all !== 'undefined' ? dirty_all : 'N/A';
  d.dirty_count = typeof dirty_count !== 'undefined' ? dirty_count : 'N/A';
  d.mapview_origin = typeof mapview !== 'undefined' ? {x: mapview.gui_x0, y: mapview.gui_y0} : 'N/A';
  d.canvas_size = {w: mapview_canvas.width, h: mapview_canvas.height};
  console.table(d);
  // 尝试修复
  if (d.known_tiles > 0 && d.dirty_all === false) {
    center_tile_mapcanvas(Object.values(tiles).find(t => t.known >= 2));
    update_map_canvas_full();
    console.log('Forced map redraw');
  }
})();
```

3. **后端服务器依赖问题**：测试依赖后端服务器（端口 8002），但后端可能随时停止。**应该建立一个 mock server** 或使用录制的 WebSocket 消息进行离线测试。

4. **删除文件的检查流程应该脚本化**：每次删除文件前的三项检查（函数、变量、副作用）应该写成一个自动化脚本，输入 JS 文件名，输出缺失的暴露项。

### 迁移原则（Phase 8-10 更新）

13. **删除 Legacy JS 的三项检查**：函数覆盖 + 变量暴露 + 副作用代码（jQuery 插件、prototype 扩展、事件绑定）。
14. **`const enum` 不等于全局暴露**：TypeScript 的 `const enum` 编译后被内联，必须手动暴露到 `window`。
15. **大文件用脚本自动化迁移**：超过 50 个声明的文件，用 Python/Node 脚本提取和生成代码。
16. **TS 中的 `window.xxx()` 调用是隐式依赖**：删除 Legacy 文件前，必须搜索 TS 代码中通过 `window` 调用的函数。
17. **建立稳定的本地测试环境**：`vite.config.dev.ts` + 标准诊断脚本 + mock server，避免每次测试都重新配置。

---

## 坑 16：删除 Legacy JS 后，其中的 `var` 全局变量声明也随之消失

### 现象

`nation.js` 被删除后，`diplstates`、`selected_player`、`nation_groups` 三个全局变量在运行时为 `undefined`，导致 `packhandlers.ts` 中的 `w.diplstates[id] = ...` 赋值操作报 `TypeError: Cannot set properties of undefined`。

### 根因

`nation.js` 顶部有三个 `var` 声明：

```javascript
var diplstates = {};
var selected_player = -1;
var nation_groups = [];
```

这些变量不是函数，不会出现在 `grep "function "` 的结果中，也不是常量（不在坑 10 的检查范围内），而是**运行时状态变量**。删除 `nation.js` 后，这些变量在 `window` 上不再存在，但 `packhandlers.ts` 仍然通过 `w.diplstates[id] = ...` 写入它们。

### 解决方案

在 `nation.ts` 的模块加载时（`exposeToLegacy` 调用之前）显式初始化这些变量：

```typescript
// Initialize global state variables that were previously declared in nation.js
const w = window as any;
if (w.diplstates === undefined) w.diplstates = {};
if (w.selected_player === undefined) w.selected_player = -1;
if (w.nation_groups === undefined) w.nation_groups = [];
```

使用 `=== undefined` 而非直接赋值，避免在模块重新加载时覆盖已有数据。

### 教训

**删除 Legacy JS 文件的检查清单更新为五项**：

| 检查项 | 方法 |
|---|---|
| 1. 函数覆盖 | `grep "function " xxx.js` 对比 TS `exposeToLegacy` |
| 2. 常量暴露 | `grep "^var [A-Z_]" xxx.js`，检查 `window.XXX` 是否存在 |
| 3. 副作用代码 | `grep "$.extend\|prototype\.\|addEventListener" xxx.js` |
| 4. 全局作用域立即引用 | 检查其他 Legacy 文件中 `var x = DELETED_CONSTANT` 的模式 |
| 5. **运行时状态变量** | `grep "^var [a-z]" xxx.js`，这些是小写的全局状态变量，需要在对应 TS 模块中初始化 |

**小写 `var` 声明 ≠ 常量**：常量通常是大写（`DS_WAR`、`PLRF_AI`），而运行时状态变量通常是小写（`diplstates`、`selected_player`）。两者都需要在删除 Legacy 文件时迁移，但处理方式不同：常量通过 `window[NAME] = VALUE` 暴露，状态变量通过 `if (w.xxx === undefined) w.xxx = initialValue` 初始化。

---

## 当前迁移进度（Phase 10 完成后）

| 阶段 | 删除的 Legacy JS 文件数 | 剩余 Legacy JS 文件数 | 累计减少代码行数 |
|---|---|---|---|
| Phase 1-7 | 2 (packhand.js, webclient.min.js 拆分) | 58 | ~3,000 |
| Phase 8+9 | 11 | 47 | ~6,352 |
| Phase 10 | 8 | 39 | ~7,567 |

**剩余 39 个 Legacy JS 文件中的分类**：

| 分类 | 文件数 | 代表文件 | 迁移难度 |
|---|---|---|---|
| 纯 UI 渲染（DOM/jQuery 操作） | ~15 | control.js, pregame.js, diplomacy.js | 高（大量 jQuery UI 依赖） |
| 2D Canvas 渲染 | ~8 | 2dcanvas/mapview.js, tilespec.js | 高（渲染管线复杂） |
| 数据+UI 混合 | ~10 | government.js, nation.js, city.js | 中（需拆分数据和 UI） |
| 核心逻辑 | ~6 | civclient.js, client_main.js, map.js | 中（有大量初始化副作用） |


---

## 坑 15：全局作用域立即赋值 `var x = CONSTANT` 在 `type="module"` 加载前执行

### 现象

删除 `fc_types.js` 后，游戏地图全黑。`auto_center_on_unit` 变量为 `undefined`，导致 `auto_center_on_focus_unit()` 中的 `if (ptile != null && auto_center_on_unit)` 永远为 `false`，地图视图不会自动居中到玩家位置。

### 根因

`options.js` 在全局作用域中有约 70 个形如 `var auto_center_on_unit = TRUE;` 的赋值语句。`TRUE` 原来在 `fc_types.js` 中定义为 `var TRUE = true;`。

加载顺序：
```
fc_types.js (line 206, 已删除) → 定义 TRUE = true
options.js  (line 248)         → var auto_center_on_unit = TRUE; // 立即执行
ts-bundle   (line 276, module) → 暴露 TRUE 到 window // 延迟执行
```

删除 `fc_types.js` 后，`options.js` 执行时 `TRUE` 是 `undefined`（TS bundle 还没加载），所以 `auto_center_on_unit = undefined`。

**这与坑 13 的结论矛盾**：坑 13 说"Legacy JS 中的变量引用几乎全在函数内部"，但 `options.js` 是一个例外 — 它在全局作用域立即使用常量进行赋值。

### 解决方案

在 `index.html` 中 `fc_types.js` 原来的位置添加内联 shim：

```html
<!-- fc_types.js: REMOVED Phase 10 — migrated to src/ts/data/fcTypes.ts -->
<script>/* Shim: constants needed at global scope before TS module loads */
var TRUE = true, FALSE = false, MAX_NUM_ADVANCES = 250;</script>
```

只需 shim 被全局作用域立即使用的常量（`TRUE`、`FALSE`、`MAX_NUM_ADVANCES`），其他 368 个常量仍由 TS bundle 暴露。

### 教训

**坑 13 的结论需要修正**：不能假设"所有 Legacy JS 的变量引用都在函数内部"。必须逐文件检查全局作用域的立即赋值：

```bash
# 检查哪些 Legacy JS 文件在全局作用域使用了被删除文件的常量
for jsfile in src/main/webapp/javascript/*.js; do
  # 提取全局作用域的 var 赋值右侧引用的变量名
  grep "^var .* = " "$jsfile" | grep -oP '= \K[A-Z_]+' | sort -u
done
```

**删除 Legacy JS 文件的检查清单更新为四项**：

| 检查项 | 方法 |
|---|---|
| 1. 函数覆盖 | `grep "function " xxx.js` 对比 TS `exposeToLegacy` |
| 2. 变量暴露 | `grep "^var " xxx.js`，检查 `window.XXX` 是否存在 |
| 3. 副作用代码 | `grep "$.extend\|prototype\.\|addEventListener" xxx.js` |
| 4. **全局作用域立即引用** | 检查其他 Legacy 文件中 `var x = DELETED_CONSTANT` 的模式 |

---

## 效率工具清单（Phase 10 建立）

本次建立了 4 个工具，存放在 `scripts/` 目录：

### 1. `vite.config.dev.ts`（已存在）

稳定的本地开发配置，连接 Railway 后端：

```bash
BACKEND_URL=https://your-railway-app.up.railway.app npx vite --config vite.config.dev.ts --host 0.0.0.0
```

- `root` 指向 `src/main/webapp`，确保 `/webclient/` 和 `/javascript/` 路径正确
- `allowedHosts: true` 允许外部访问
- 自动代理 `/civclientlauncher`、`/validate_user`、`/civsocket` 到 Railway 后端

### 2. `scripts/mock-server.py`（新建）

录制+回放 WebSocket 消息的 mock server，用于离线测试：

```bash
# 录制模式：代理真实后端并录制所有消息
python3 scripts/mock-server.py record --backend ws://real-server:port --output recording.json

# 回放模式：用录制的消息模拟后端
python3 scripts/mock-server.py replay --input recording.json --port 8002
```

### 3. `scripts/map-diagnostics.js`（新建）

浏览器控制台诊断脚本，一键检查地图渲染状态：

```javascript
// 在浏览器控制台执行
// 输出：tileset 状态、sprite 数量、已知 tile 数、dirty 标志、mapview 原点
// 如果检测到问题，自动尝试修复（center + redraw）
```

### 4. `scripts/check-legacy-delete.sh`（新建）

自动化删除检查脚本：

```bash
# 检查 government.js 是否可以安全删除
./scripts/check-legacy-delete.sh government.js

# 输出：
# [FUNCTIONS] 9 defined, 2 covered by TS, 7 MISSING
# [VARIABLES] 5 defined, 3 exposed, 2 MISSING: REPORT_WONDERS_OF_THE_WORLD, REPORT_TOP_CITIES
# [SIDE_EFFECTS] None found
# [VERDICT] NOT SAFE TO DELETE - 7 functions and 2 variables missing
```
