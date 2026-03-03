# XBWorld 前端现代化重构计划 V2

> **目标**：彻底消除所有 Legacy JavaScript、jQuery、全局变量，将整个前端重写为现代 TypeScript 模块化架构。
>
> 最后更新：2026-03-04

---

## 1. 现状诊断

### 1.1 代码库全貌

当前前端由两套代码并行运行：一套是 2015 年风格的 Legacy JavaScript（通过 `<script>` 标签全局加载），另一套是 2026 年新建的 TypeScript 模块（通过 Vite 构建为 ES module）。两者通过 `exposeToLegacy()` 桥接函数共享 `window` 上的全局变量。

| 类别 | 行数 | 文件数 | 说明 |
|---|---|---|---|
| Legacy JS（业务代码） | 22,190 | 46 | 全局变量 + jQuery + 无模块系统 |
| Legacy JS（2D Canvas 渲染） | 3,675 | 6 | tilespec、mapview、mapctrl 等 |
| 第三方库（jQuery 等） | 10,599 | 25 | jQuery、jQuery UI、各种插件 |
| **Legacy 合计** | **36,464** | **77** | 全部通过 `<script>` 标签加载 |
| 已迁移 TS（已激活） | 3,618 | 18 | 通过 exposeToLegacy 覆盖 Legacy 函数 |
| 已编写 TS（未激活） | 2,152 | 13 | 已有代码但未接入 main.ts |
| **TS 合计** | **5,770** | **31** | Vite 构建为单个 ES module |

### 1.2 Legacy 代码的核心问题

**全局变量泛滥**：46 个业务 JS 文件中共有 **950+ 个顶层 `var` 声明**，所有状态都挂在 `window` 上。任何文件都可以读写任何变量，没有封装，没有访问控制，修改一个变量可能产生不可预测的连锁反应。

**jQuery 深度耦合**：全代码库共有 **1,300+ 处 `$()`  调用**，分布在 31 个文件中。其中 `pregame.js`（256 处）、`control.js`（184 处）、`city.js`（146 处）是重灾区。更严重的是对 jQuery UI 插件的依赖：**150 处 `.dialog()`**、**86 处 `.button()`**、**24 处 `.spectrum()`**、**21 处 `.dialogExtend()`**。这些不是简单的 DOM 查询替换，而是整个 UI 组件系统的替换。

**无模块系统**：所有 JS 文件通过 `<script>` 标签按顺序加载，合并为一个 1.6MB 的 `webclient.min.js`（由 Google Closure Compiler 编译）。文件间的依赖关系完全隐式，通过全局函数名约定。没有 `import`/`export`，没有依赖图，没有 tree-shaking。

**数据与 UI 混合**：核心文件如 `city.js`（2,049 行）、`tech.js`（941 行）将数据查询函数和 jQuery UI 对话框代码混在同一个文件中，无法独立测试或替换。

### 1.3 当前 exposeToLegacy 策略的局限

Phase 1-3 采用的 `exposeToLegacy` 策略在早期是正确的——它让我们在不破坏任何功能的前提下，安全地将 150 个函数迁移到了 TypeScript。但这个策略有一个根本性的天花板：**它永远无法消除 Legacy JS**。

原因如下：

1. **`exposeToLegacy` 本质上是在创建全局变量**。它把 TS 函数挂到 `window` 上，让 Legacy JS 能调用。这不是消除全局变量，而是用 TS 写的全局变量替换 JS 写的全局变量。
2. **Legacy JS 仍然是主驱动**。游戏主循环、事件绑定、UI 渲染、网络初始化全部由 `webclient.min.js` 驱动。TS 模块只是"寄生"在上面，覆盖了一些函数。
3. **无法删除任何 Legacy 文件**。只要 Legacy 中还有一个函数没被 TS 覆盖，整个 `webclient.min.js` 就必须保留。而 `webclient.min.js` 是所有 46 个文件的合并产物，无法部分删除。
4. **双重维护负担**。迁移的 TS 函数必须从 `window.*` 读取全局变量（而不是用 ES module import），因为它们需要和 Legacy 代码共享同一份数据。这意味着 TS 代码无法享受模块化的好处。

> **结论**：`exposeToLegacy` 是一个优秀的过渡策略，但不是终局。要彻底消除 Legacy，需要一个新的架构和新的迁移路径。

---

## 2. 目标架构

### 2.1 终态愿景

重构完成后，前端代码库应该是这样的：

```
xbworld-web/
├── src/
│   ├── ts/                          # 所有业务代码（TypeScript）
│   │   ├── core/                    # 核心基础设施
│   │   │   ├── events.ts            # 类型安全的 EventEmitter
│   │   │   ├── log.ts               # 日志系统
│   │   │   └── constants.ts         # 全局常量（枚举）
│   │   ├── state/                   # 状态管理
│   │   │   ├── GameStore.ts         # 集中式游戏状态
│   │   │   ├── selectors.ts         # 派生状态查询
│   │   │   └── actions.ts           # 状态变更动作
│   │   ├── net/                     # 网络层
│   │   │   ├── WebSocketClient.ts   # WebSocket 管理
│   │   │   ├── PacketRouter.ts      # 包路由和分发
│   │   │   └── handlers/            # 按类型分组的 packet handler
│   │   ├── engine/                  # 游戏引擎
│   │   │   ├── GameLoop.ts          # 游戏主循环
│   │   │   ├── InputManager.ts      # 键盘/鼠标/触摸输入
│   │   │   ├── UnitController.ts    # 单位控制逻辑
│   │   │   ├── CityManager.ts       # 城市管理逻辑
│   │   │   └── MapController.ts     # 地图交互逻辑
│   │   ├── renderer/                # 渲染层
│   │   │   ├── Canvas2DRenderer.ts  # 2D Canvas 渲染器
│   │   │   ├── TilesetManager.ts    # Tileset 加载和 sprite 查找
│   │   │   ├── MapView.ts           # 地图视图
│   │   │   └── OverviewMap.ts       # 小地图
│   │   ├── ui/                      # UI 组件层
│   │   │   ├── components/          # 可复用 UI 组件
│   │   │   │   ├── Dialog.ts        # 对话框（替代 jQuery UI Dialog）
│   │   │   │   ├── TabPanel.ts      # 标签页
│   │   │   │   ├── ContextMenu.ts   # 右键菜单
│   │   │   │   ├── Tooltip.ts       # 工具提示
│   │   │   │   └── LoadingOverlay.ts# 加载遮罩
│   │   │   ├── dialogs/             # 业务对话框
│   │   │   │   ├── CityDialog.ts    # 城市管理对话框
│   │   │   │   ├── TechDialog.ts    # 科技树对话框
│   │   │   │   ├── DiplomacyDialog.ts
│   │   │   │   └── ...
│   │   │   ├── panels/              # 常驻面板
│   │   │   │   ├── StatusBar.ts     # 顶部状态栏
│   │   │   │   ├── UnitPanel.ts     # 单位信息面板
│   │   │   │   └── ChatPanel.ts     # 聊天面板
│   │   │   └── pages/               # 页面级组件
│   │   │       ├── PregamePage.ts   # 预游戏大厅
│   │   │       └── GamePage.ts      # 游戏主页面
│   │   └── main.ts                  # 应用入口
│   └── styles/                      # CSS（现代化）
│       ├── base.css                 # 基础样式
│       ├── components/              # 组件样式
│       └── pages/                   # 页面样式
├── vite.config.ts                   # Vite 构建配置
├── tsconfig.json
└── package.json
```

### 2.2 架构原则

| 原则 | 说明 |
|---|---|
| **零全局变量** | 所有状态通过 `GameStore` 管理，通过 ES module `import` 访问。`window` 上不挂任何业务变量。 |
| **零 jQuery** | 所有 DOM 操作使用原生 API。对话框使用 `<dialog>` 元素 + 自定义 `Dialog` 类。事件使用 `addEventListener`。 |
| **零 `<script>` 标签** | 所有代码通过 Vite 构建为单个 ES module bundle。HTML 中只有一个 `<script type="module">`。 |
| **关注点分离** | 数据（state）、逻辑（engine）、渲染（renderer）、UI（ui）严格分层，单向依赖。 |
| **类型安全** | 所有函数参数和返回值都有 TypeScript 类型。消除 `any`，消除 `(window as any)`。 |
| **可测试性** | 每个模块都可以独立单元测试，不依赖 DOM 或全局状态。 |

### 2.3 数据流架构

```
Server ──WebSocket──→ PacketRouter ──→ GameStore（状态变更）
                                           │
                                           ├──→ Renderer（重绘地图）
                                           ├──→ UI（更新面板/对话框）
                                           └──→ Engine（触发游戏逻辑）

User Input ──→ InputManager ──→ Engine ──→ GameStore（状态变更）
                                       └──→ Network（发送请求）
```

核心思想是**单向数据流**：所有状态变更都通过 `GameStore`，所有消费者（Renderer、UI、Engine）通过订阅 `GameStore` 的事件来响应变化。这消除了全局变量的隐式耦合。

---

## 3. jQuery 替代方案

jQuery 的 1,300+ 处调用可以归类为以下几种模式，每种都有明确的现代替代方案：

### 3.1 DOM 查询和操作（~500 处）

```javascript
// Legacy jQuery
$('#city_name').html(city.name);
$('#unit_panel').show();
$('.overview_dialog').css('left', '10px');

// Modern TypeScript
document.querySelector<HTMLElement>('#city_name')!.textContent = city.name;
document.getElementById('unit_panel')!.classList.remove('hidden');
document.querySelector<HTMLElement>('.overview_dialog')!.style.left = '10px';
```

这类替换是机械性的，风险低，可以批量处理。

### 3.2 jQuery UI Dialog（150 处）— 最大挑战

jQuery UI Dialog 是最深度耦合的部分。Legacy 代码中有 **20+ 个不同的对话框**，每个都使用 `.dialog()` 创建，`.dialogExtend()` 添加最小化/最大化功能。

替代方案：基于 HTML `<dialog>` 元素构建自定义 `Dialog` 类。

```typescript
// 新的 Dialog 组件
class GameDialog {
  private el: HTMLDialogElement;
  
  constructor(options: DialogOptions) {
    this.el = document.createElement('dialog');
    this.el.className = 'game-dialog';
    this.el.innerHTML = `
      <header class="dialog-header">
        <span class="dialog-title">${options.title}</span>
        <div class="dialog-controls">
          <button class="dialog-minimize" title="Minimize">−</button>
          <button class="dialog-maximize" title="Maximize">□</button>
          <button class="dialog-close" title="Close">×</button>
        </div>
      </header>
      <div class="dialog-content"></div>
    `;
    this.setupDrag();
    this.setupResize();
    document.body.appendChild(this.el);
  }
  
  open(): void { this.el.showModal(); }
  close(): void { this.el.close(); }
  setContent(html: string): void { /* ... */ }
  minimize(): void { /* ... */ }
  maximize(): void { /* ... */ }
}
```

这个 `Dialog` 类需要在迁移 UI 层之前完成，因为所有对话框都依赖它。

### 3.3 jQuery UI 插件替代

| 插件 | 调用次数 | 替代方案 | 复杂度 |
|---|---|---|---|
| `.dialog()` | 150 | 自定义 `GameDialog` 类 + `<dialog>` 元素 | 高 |
| `.button()` | 86 | CSS 样式 + 原生 `<button>` | 低 |
| `.spectrum()` | 24 | `<input type="color">` 或轻量级 [vanilla-colorful](https://github.com/nicolo-ribaudo/vanilla-colorful) | 中 |
| `.dialogExtend()` | 21 | 集成到 `GameDialog` 类中 | 中 |
| `.tooltip()` | 18 | CSS `::after` 伪元素 + `data-tooltip` 属性 | 低 |
| `.contextMenu()` | 14 | 自定义 `ContextMenu` 类 | 中 |
| `.blockUI()` | 10 | CSS overlay + `LoadingOverlay` 类 | 低 |
| `.tabs()` | 9 | 自定义 `TabPanel` 类 + CSS | 中 |
| `.tablesorter()` | 4 | TS 排序逻辑 + DOM 更新 | 低 |
| `.mCustomScrollbar()` | 3 | CSS `overflow-y: auto` + `scrollbar-width` | 低 |

### 3.4 $.ajax() 替代

```javascript
// Legacy
$.ajax({ type: "POST", url: "/civclientlauncher", dataType: "json", success: fn, error: fn });

// Modern
const response = await fetch('/civclientlauncher', { method: 'POST' });
const data = await response.json();
```

---

## 4. 分阶段重构路线图

### 策略转变：从"覆盖"到"替换"

Phase 1-3 的 `exposeToLegacy` 策略是"在 Legacy 上叠加 TS"。从 Phase 4 开始，策略转变为**绞杀者模式（Strangler Fig Pattern）**：逐个用 TS 模块完全替换 Legacy JS 文件，每替换一个就从 `webclient.min.js` 中删除对应的代码，直到 `webclient.min.js` 为空。

关键转变：

| 维度 | 旧策略（Phase 1-3） | 新策略（Phase 4+） |
|---|---|---|
| 目标 | TS 覆盖 Legacy 函数 | TS 完全替代 Legacy 文件 |
| 桥接方式 | `exposeToLegacy` (TS→window) | Legacy 调用 `window.__TS.*` (Legacy→TS) |
| 数据访问 | 从 `window.*` 读取全局变量 | 从 `GameStore` import |
| 删除 Legacy | 不删除，两套并行 | 每完成一个模块就删除对应 Legacy |
| 终态 | 永远需要 webclient.min.js | 完全删除 webclient.min.js |

### 前置条件：拆分 webclient.min.js

当前所有 Legacy JS 被合并为一个 `webclient.min.js`，无法部分删除。**第一步必须将其拆回独立文件**，这样才能逐个替换和删除。

具体做法：将 `webclient.min.js` 替换为按文件加载的独立 `<script>` 标签（使用未压缩的源文件），然后逐个用 TS 模块替换。

---

### Phase 4：基础设施 — UI 组件库 + webclient.min.js 拆分

**目标**：为后续所有 UI 迁移打好基础。

**预计工作量**：~1,500 行 TS + 构建配置变更

| 任务 | 说明 | 行数 | 难度 |
|---|---|---|---|
| 4.1 拆分 webclient.min.js | 将 HTML 中的 `<script src="webclient.min.js">` 替换为 46 个独立 `<script>` 标签，按依赖顺序加载。验证功能不变。 | 0 (配置) | 中 |
| 4.2 构建 `GameDialog` 组件 | 替代 jQuery UI Dialog + dialogExtend。支持：打开/关闭、拖拽、调整大小、最小化/最大化、标题栏、模态/非模态。 | ~300 | 高 |
| 4.3 构建 `TabPanel` 组件 | 替代 jQuery UI Tabs。支持：标签切换、内容面板、动态添加/删除标签。 | ~100 | 低 |
| 4.4 构建 `ContextMenu` 组件 | 替代 jquery.contextMenu。支持：右键触发、子菜单、图标、分隔线。 | ~150 | 中 |
| 4.5 构建 `Tooltip` 组件 | 替代 jQuery UI Tooltip。纯 CSS 实现 + `data-tooltip` 属性。 | ~50 | 低 |
| 4.6 构建 `LoadingOverlay` 组件 | 替代 jQuery blockUI。CSS overlay + 加载动画。 | ~50 | 低 |
| 4.7 CSS 基础样式 | 为所有 UI 组件编写现代 CSS，替代 jQuery UI 主题 CSS。 | ~500 | 中 |

**验收标准**：
- webclient.min.js 拆分后，游戏功能完全不变
- 所有 UI 组件有独立的 Storybook 式演示页面
- 组件 API 设计能覆盖 Legacy 中所有 jQuery UI 用法

**为什么先做这一步**：后续每个 Phase 都需要将 jQuery UI 对话框替换为新组件。如果不先建好组件库，每个 Phase 都要重复造轮子。

---

### Phase 5：网络层完全替换

**目标**：用 TS 完全替换 `clinet.js`（网络连接）和 `packhand.js`（包处理），删除这两个 Legacy 文件。

**预计工作量**：~2,500 行 TS

| 任务 | Legacy 源 | 行数 | 难度 | 说明 |
|---|---|---|---|---|
| 5.1 `WebSocketClient.ts` | `clinet.js` (259 行) | ~300 | 高 | 完全替换 WebSocket 管理。包括 `network_init`、`websocket_init`、`send_request`。同时替换 index.html 中的内联 patch 脚本。 |
| 5.2 `PacketRouter.ts` | `packhand.js` 框架 | ~200 | 中 | 包路由和分发系统。根据 packet type 调用对应 handler。 |
| 5.3 完成所有 packet handler | `packhand.js` (1,986 行, 140 函数) | ~1,500 | 中 | Phase 3 已迁移 31 个，剩余 ~109 个。按类型分组迁移。 |
| 5.4 删除 Legacy 网络代码 | - | 0 | 低 | 从 HTML 中移除 `clinet.js` 和 `packhand.js` 的 `<script>` 标签，删除 index.html 中的内联 patch 脚本。 |

**验收标准**：
- `clinet.js` 和 `packhand.js` 从项目中完全删除
- index.html 中的内联 WebSocket patch 脚本删除
- 网络连接、包收发、所有 packet handler 全部由 TS 驱动
- 完整游戏流程测试通过（连接 → 开始 → 10 回合 → 保存 → 加载）

---

### Phase 6：数据层完全替换

**目标**：用 TS 完全替换所有纯数据模块，删除对应的 Legacy 文件。

**预计工作量**：~2,000 行 TS

| 任务 | Legacy 源 | 行数 | 函数数 | 难度 | 说明 |
|---|---|---|---|---|---|
| 6.1 完成 `game.ts` | `game.js` (182 行) | ~50 | 8 | 低 | 补全剩余函数，删除 Legacy 文件。 |
| 6.2 完成 `unit.ts` | `unit.js` (507 行) | ~100 | 22 | 中 | 补全剩余函数。 |
| 6.3 完成 `player.ts` | `player.js` (307 行) | ~100 | 16 | 中 | 补全剩余函数。 |
| 6.4 完成 `map.ts` + `tile.ts` | `map.js` (473 行) + `tile.js` (121 行) | ~150 | 32 | 中 | 补全剩余函数。 |
| 6.5 `city.ts`（数据部分） | `city.js` 数据函数 (~800 行) | ~600 | ~30 | 高 | 只迁移纯数据查询函数，UI 函数留到 Phase 9。 |
| 6.6 `tech.ts`（数据部分） | `tech.js` 数据函数 (~300 行) | ~250 | ~10 | 中 | 只迁移纯数据查询函数。 |
| 6.7 完成其余小模块 | `terrain.js`, `unittype.js`, `connection.js`, `specialist.js`, `effects.js`, `bitvector.js` | ~200 | ~15 | 低 | 补全并删除 Legacy。 |
| 6.8 `nation.ts` | `nation.js` 数据函数 | ~100 | ~5 | 低 | 纯数据查询。 |
| 6.9 `fc_types.ts` 完善 | `fc_types.js` (431 行) | ~200 | 0 | 低 | 所有常量迁移为 TS enum/const。 |

**验收标准**：
- 以下 Legacy 文件完全删除：`game.js`, `unit.js`, `player.js`, `map.js`, `tile.js`, `terrain.js`, `unittype.js`, `connection.js`, `specialist.js`, `effects.js`, `bitvector.js`, `fc_types.js`, `actions.js`, `extra.js`, `improvement.js`, `requirements.js`
- 所有数据访问通过 `import { store } from './state/GameStore'`，不再有 `(window as any).units` 等模式
- 单元测试覆盖所有数据查询函数

---

### Phase 7：游戏引擎层

**目标**：用 TS 完全替换 `control.js`（核心控制逻辑）和相关游戏逻辑模块。

**预计工作量**：~3,500 行 TS

| 任务 | Legacy 源 | 行数 | 函数数 | 难度 | 说明 |
|---|---|---|---|---|---|
| 7.1 `InputManager.ts` | `control.js` 事件处理部分 | ~400 | ~15 | 高 | 键盘、鼠标、触摸事件统一管理。替换所有 jQuery `.click()`、`.on()` 事件绑定。 |
| 7.2 `UnitController.ts` | `control.js` 单位控制部分 | ~600 | ~35 | 高 | `update_unit_focus`、`advance_unit_focus`、`key_unit_*` 系列、goto 路径。 |
| 7.3 `MapController.ts` | `control.js` 地图交互部分 | ~300 | ~10 | 高 | `do_map_click`、`ask_server_for_actions`、地图拖拽。 |
| 7.4 `ActionDecision.ts` | `control.js` + `action_dialog.js` 逻辑部分 | ~400 | ~15 | 高 | 动作决策逻辑（与 UI 分离）。 |
| 7.5 `GameLoop.ts` | `civclient.js` + `client_main.js` 部分 | ~300 | ~10 | 高 | 游戏主循环、回合管理、状态机。 |
| 7.6 `DiplomacyEngine.ts` | `diplomacy.js` 逻辑部分 | ~200 | ~10 | 中 | 外交逻辑（与 UI 分离）。 |
| 7.7 工具和辅助 | `utility.js`, `log.js`, `options.js` | ~300 | ~20 | 低 | 完善工具函数，迁移选项管理。 |

**验收标准**：
- `control.js`、`civclient.js`、`utility.js`、`log.js` 从项目中完全删除
- 所有游戏操作（移动单位、建城、攻击、外交、goto）通过 TS 引擎驱动
- 事件绑定全部使用 `addEventListener`，零 jQuery 事件

---

### Phase 8：渲染层

**目标**：用 TS 完全替换 2D Canvas 渲染管线。

**预计工作量**：~3,500 行 TS

| 任务 | Legacy 源 | 行数 | 函数数 | 难度 | 说明 |
|---|---|---|---|---|---|
| 8.1 `TilesetManager.ts` | `tilespec.js` (1,694 行) | ~1,200 | 58 | 高 | Tileset 配置、sprite 查找、图块渲染规则。这是渲染层最大最复杂的模块。 |
| 8.2 `MapView.ts` | `mapview.js` (518 行) + `mapview_common.js` (642 行) | ~800 | 39 | 高 | 地图视图渲染、视口管理、滚动。 |
| 8.3 `MapInput.ts` | `mapctrl.js` (374 行) | ~300 | 12 | 中 | 地图上的鼠标/触摸交互。 |
| 8.4 `OverviewMap.ts` | `overview.js` (401 行) | ~300 | 10 | 中 | 小地图渲染和交互。 |
| 8.5 Tileset 配置 | `tileset_config_amplio2.js` (447 行) | ~400 | 0 | 低 | 转为 TS 常量/配置对象。 |

**验收标准**：
- `2dcanvas/` 目录下所有 JS 文件完全删除
- 地图渲染性能不低于 Legacy 版本（FPS 基准测试）
- 所有地形、单位、城市、特殊资源正确显示

---

### Phase 9：UI 层 — 对话框迁移

**目标**：用 TS + 自定义组件完全替换所有 jQuery UI 对话框。

**预计工作量**：~5,000 行 TS + ~1,000 行 CSS

| 任务 | Legacy 源 | 行数 | $() 调用 | 难度 | 说明 |
|---|---|---|---|---|---|
| 9.1 城市对话框 | `city.js` UI 部分 (~1,200 行) | ~800 | 146 | 高 | 最复杂的对话框：标签页、生产队列、市民管理、建筑列表。 |
| 9.2 科技树 | `tech.js` UI 部分 (~600 行) | ~400 | 64 | 高 | Canvas 绘制的科技树 + 对话框。 |
| 9.3 动作对话框 | `action_dialog.js` (1,128 行) | ~600 | 89 | 高 | 复杂的动作选择 UI。 |
| 9.4 预游戏大厅 | `pregame.js` (1,683 行) | ~800 | 256 | 高 | jQuery 最密集的文件。国家选择、游戏设置、玩家列表。 |
| 9.5 外交对话框 | `diplomacy.js` UI 部分 (~350 行) | ~250 | 20 | 中 | 外交谈判界面。 |
| 9.6 国家界面 | `nation.js` UI 部分 (~400 行) | ~300 | 52 | 中 | 国家信息表格。 |
| 9.7 其余对话框 | `savegame.js`, `government.js`, `helpdata.js`, `rates.js`, `intel_dialog.js`, `cma.js`, `pillage_dialog.js`, `spacerace.js`, `scorelog.js`, `hall_of_fame.js`, `banlist.js` | ~1,000 | ~200 | 中 | 各种辅助对话框。 |
| 9.8 消息和聊天 | `messages.js` (249 行) | ~150 | 15 | 低 | 聊天框和消息日志。 |

**验收标准**：
- 所有对话框使用 `GameDialog` 组件，零 jQuery UI
- 所有 `.button()` 替换为 CSS 样式的原生 `<button>`
- 所有 `.spectrum()` 替换为原生颜色选择器
- 视觉效果与 Legacy 版本一致（可以更好，但不能更差）

---

### Phase 10：清理和终态

**目标**：删除所有 Legacy 代码和第三方 jQuery 库，完成现代化。

**预计工作量**：~500 行配置变更

| 任务 | 说明 | 难度 |
|---|---|---|
| 10.1 删除 webclient.min.js | 确认所有功能已由 TS 驱动后，删除这个 1.6MB 的文件。 | 低 |
| 10.2 删除 jQuery 和所有插件 | 删除 `libs/` 目录下的 jQuery、jQuery UI、所有 jQuery 插件。 | 低 |
| 10.3 删除其余 Legacy JS | 删除所有剩余的 `.js` 源文件。 | 低 |
| 10.4 清理 HTML | 移除所有 `<script>` 标签（除了 TS bundle 的 `<script type="module">`）。移除 jQuery UI CSS。 | 低 |
| 10.5 清理 CSS | 移除 jQuery UI 主题 CSS，合并为现代 CSS 文件。 | 中 |
| 10.6 更新构建流程 | Dockerfile 中移除 Closure Compiler 相关步骤。Vite 构建产出完整的前端 bundle。 | 中 |
| 10.7 最终测试 | 完整游戏流程回归测试。性能基准测试。 | 高 |
| 10.8 删除 exposeToLegacy 机制 | 移除 `bridge/legacy.ts`、`bridge/sync.ts`、所有 `exposeToLegacy` 调用。TS 模块间使用纯 `import`。 | 中 |

**验收标准**：
- 项目中零 `.js` 业务文件（只有 Vite 构建产出的 bundle）
- 零 jQuery 依赖
- 零 `window.*` 全局变量（除了必要的浏览器 API）
- 零 `<script>` 标签（除了 `<script type="module">` 加载 TS bundle）
- HTML 中只有一个 `<script type="module" src="/assets/main.js">`
- 所有功能与 Legacy 版本一致

---

## 5. 里程碑和工作量估算

| 里程碑 | Phase | 新增 TS 行数 | 删除 Legacy 行数 | 累计 Legacy 删除率 | 关键交付物 |
|---|---|---|---|---|---|
| **M0: 当前状态** | 1-3 ✅ | 3,618 | 0 | 0% | exposeToLegacy 桥接，150 函数覆盖 |
| **M1: UI 组件库就绪** | 4 | ~1,500 | ~0 | 0% | GameDialog、TabPanel、ContextMenu 等组件 |
| **M2: 网络层独立** | 5 | ~2,500 | ~2,245 | 9% | clinet.js + packhand.js 完全删除 |
| **M3: 数据层独立** | 6 | ~2,000 | ~3,500 | 22% | 16 个数据文件完全删除 |
| **M4: 引擎层独立** | 7 | ~3,500 | ~5,500 | 43% | control.js 等核心逻辑完全删除 |
| **M5: 渲染层独立** | 8 | ~3,500 | ~3,675 | 57% | 2dcanvas/ 目录完全删除 |
| **M6: UI 层独立** | 9 | ~5,000 | ~8,000 | 88% | 所有对话框迁移完成 |
| **M7: 终态** | 10 | ~500 | ~3,000+ | **100%** | **零 Legacy JS，零 jQuery** |
| **合计** | - | **~22,000** | **~26,000** | 100% | 完全现代化的 TypeScript 前端 |

---

## 6. 每个 Phase 的标准工作流

每个 Phase 内的每个模块迁移都遵循以下流程：

```
┌─────────────────────────────────────────────────────────┐
│  1. 阅读 Legacy 源码                                      │
│     - 记录所有函数签名、返回值格式、副作用                      │
│     - 分类：纯查询 / 状态变更 / DOM 操作 / 事件绑定            │
│     - 绘制依赖图：这个文件调用了哪些其他文件的函数？              │
│                                                          │
│  2. 编写 TS 模块                                          │
│     - 数据从 GameStore import，不从 window.* 读取             │
│     - DOM 操作使用原生 API，不使用 jQuery                     │
│     - 对话框使用 GameDialog 组件                             │
│     - 事件使用 addEventListener                             │
│     - 所有函数有完整的 TypeScript 类型                        │
│                                                          │
│  3. 编写单元测试                                           │
│     - 每个公开函数至少一个测试                                │
│     - 边界条件和错误路径测试                                  │
│                                                          │
│  4. 本地验证                                              │
│     - vitest run（单元测试）                                │
│     - vite build（构建检查）                                │
│     - ./scripts/dev.sh（本地 dev server + Railway 后端）     │
│     - 手动测试关键功能                                      │
│                                                          │
│  5. 删除 Legacy 文件                                       │
│     - 从 HTML 中移除对应的 <script> 标签                     │
│     - 删除 Legacy .js 源文件                                │
│     - 再次运行所有测试确认无回归                               │
│                                                          │
│  6. 提交和部署                                             │
│     - git commit（包含 TS 新增 + Legacy 删除）               │
│     - 部署到 Railway 验证                                   │
│     - 更新 MIGRATION_PITFALLS.md（如有新踩坑）               │
└─────────────────────────────────────────────────────────┘
```

---

## 7. 风险管理

### 7.1 高风险点

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| webclient.min.js 拆分后功能异常 | 阻塞所有后续工作 | 先在本地验证，逐个文件对比函数是否都能访问 |
| GameDialog 组件无法覆盖所有 jQuery UI Dialog 用法 | UI 迁移受阻 | 先调研所有 `.dialog()` 调用的参数，确保组件 API 完整 |
| control.js 迁移引入游戏逻辑 bug | 核心玩法受损 | 分批迁移（按功能组），每批都做完整游戏流程测试 |
| tilespec.js 迁移导致渲染异常 | 地图显示错误 | 迁移前做截图基准，迁移后像素级对比 |
| 性能回归 | 游戏卡顿 | 每个 Phase 做 FPS 基准测试，Canvas 渲染性能不能下降 |

### 7.2 回滚策略

每个 Phase 的提交都是原子性的：一个 commit 包含"TS 新增 + Legacy 删除"。如果部署后发现问题，可以 `git revert` 整个 commit，立即恢复到上一个稳定状态。

### 7.3 并行开发策略

Phase 之间有依赖关系，但 Phase 内部的任务可以并行：

```
Phase 4 (UI 组件库) ──→ Phase 5 (网络层) ──→ Phase 6 (数据层)
                                                    │
                                                    ├──→ Phase 7 (引擎层) ──→ Phase 8 (渲染层)
                                                    │
                                                    └──→ Phase 9 (UI 层) ──────────────────→ Phase 10 (清理)
```

Phase 7（引擎）和 Phase 9（UI）可以并行推进，因为引擎层不依赖 UI 组件，UI 层不依赖引擎实现细节。

---

## 8. 第三方库处理

### 8.1 需要删除的库

| 库 | 当前用途 | 替代方案 |
|---|---|---|
| jQuery (jquery.min.js) | DOM 查询和操作 | 原生 DOM API |
| jQuery UI (jquery-ui.min.js) | Dialog, Button, Tabs, Tooltip, Slider | 自定义 TS 组件 |
| jquery.blockUI.js | 加载遮罩 | CSS overlay |
| jquery.contextMenu.js | 右键菜单 | 自定义 ContextMenu |
| jquery.dialogextend.js | 对话框最小化/最大化 | 集成到 GameDialog |
| jquery.mCustomScrollbar.js | 自定义滚动条 | CSS `scrollbar-width` |
| jquery.tablesorter.min.js | 表格排序 | TS 排序逻辑 |
| spectrum.js | 颜色选择器 | `<input type="color">` |
| morris.min.js + raphael-min.js | 图表（评分日志） | Chart.js 或 Canvas 直接绘制 |
| sweetalert.min.js | 弹窗提示 | 自定义 Alert 组件或原生 `<dialog>` |

### 8.2 需要保留或替换的库

| 库 | 当前用途 | 处理方式 |
|---|---|---|
| hammer.min.js | 触摸手势 | 保留（或替换为更轻量的 TS 手势库） |
| gif.js + gif.worker.js | GIF 录制 | 保留（功能性库，无 jQuery 依赖） |
| bmp_lib.js | BMP 图片处理 | 保留或用 Canvas API 替代 |
| sha512.js | 密码哈希 | 替换为 Web Crypto API |
| seedrandom.min.js | 可重复随机数 | 保留（功能性库） |
| simpleStorage.min.js | 本地存储 | 替换为原生 `localStorage` API |
| bigscreen.min.js | 全屏 API | 替换为原生 Fullscreen API |
| platform.js | 平台检测 | 替换为 `navigator.userAgent` 解析 |
| EventAggregator.js | 事件总线 | 替换为 TS EventEmitter |
| slider.js + range.js | 滑块控件 | 原生 `<input type="range">` |

---

## 9. 与 V1 计划的对比

| 维度 | V1 计划 | V2 计划 |
|---|---|---|
| **终极目标** | 渐进式覆盖 Legacy 函数 | 彻底删除所有 Legacy JS |
| **jQuery 处理** | Phase 7 再决定 | Phase 4 就开始替换，Phase 10 完全删除 |
| **全局变量** | 通过 exposeToLegacy 桥接 | 通过 GameStore + ES module import 消除 |
| **webclient.min.js** | 始终保留 | Phase 4 拆分，Phase 10 删除 |
| **Legacy 文件删除** | 不删除 | 每个 Phase 都删除已替换的文件 |
| **UI 组件** | 无计划 | Phase 4 建立完整组件库 |
| **总工作量** | ~18,000 行 TS | ~22,000 行 TS（但删除 ~26,000 行 Legacy） |
| **最终代码量** | ~44,000 行（TS + Legacy 并存） | ~22,000 行（纯 TS） |

---

## 10. 文件索引

| 文件 | 用途 |
|---|---|
| `docs/MIGRATION_PLAN_V2.md` | 本文档（V2 重构计划） |
| `docs/MIGRATION_PLAN.md` | V1 计划（Phase 1-3 参考，已完成部分仍然有效） |
| `docs/MIGRATION_GUIDE.md` | 迁移操作手册（编码规则、测试流程） |
| `docs/MIGRATION_PITFALLS.md` | 踩坑记录 |
| `scripts/e2e-smoke.sh` | E2E 冒烟测试脚本 |
| `scripts/check-legacy-compat.cjs` | 静态兼容性检查（Phase 10 后可删除） |
| `vite.config.ts` | Vite 构建配置 |
| `vite.config.dev.ts` | 本地开发配置 |
