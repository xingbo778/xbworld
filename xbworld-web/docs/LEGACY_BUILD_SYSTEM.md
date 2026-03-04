# Legacy 构建系统：webclient.min.js 打包流程

> **状态**：历史参考文档。XBWorld 已切换到 Vite + TypeScript 构建链，本文档描述的 Maven/Closure Compiler 流程**不再使用**，仅作为理解 `webclient.min.js` 来源的参考。
>
> **对应 commit**：`43cb7b478dac` — 仓库中 `webclient.min.js` 的唯一版本，从该 commit 起内容从未变化。

---

## 背景

`webclient.min.js`（1.55 MB）是 Freeciv-web 开源项目遗留的构建产物，由 Google Closure Compiler 将约 80 个 JS 源文件压缩合并而成。XBWorld 在 `43cb7b` commit 中完成品牌重命名后，用 Maven 重新构建了一次，生成了仓库中现存的这份文件。

**关键结论**：

- `webclient.min.js` **没有黑盒**：其中每一行代码都有对应的 Legacy JS 源文件（位于 `src/main/webapp/javascript/`）
- 迁移的终极目标是用 Vite 构建的 TS bundle 完整替换 `webclient.min.js`，彻底告别 Maven/Closure Compiler 构建链
- 当前中间态：TS 通过 `exposeToLegacy` 覆盖 `window` 上的函数，与 `webclient.min.js` 中的旧版本共存（TS 版本优先，因为 `ts-bundle/main.js` 在 `webclient.min.js` 之后加载）

---

## 整体流程概览

打包分为两个大阶段：**预处理阶段**（在 Maven 正式编译之前，生成运行时依赖文件）和 **Maven 构建阶段**（由 `mvn package` 驱动，完成文件复制、模板编译、JS 压缩合并）。

```
┌─────────────────────────────────────────────────────────────────┐
│  阶段 0：预处理（手动运行，结果放入 src/derived/，被 .gitignore）  │
│                                                                   │
│  scripts/sync-js-hand.sh ──► 生成以下文件到 src/derived/webapp/  │
│    ├── packhand_gen.js      （网络包处理器，从 packets.def 生成）  │
│    ├── map-constants.js     （地图常量，从 Freeciv C 源码提取）    │
│    ├── helpdata_generated.js（游戏帮助文本，helpdata_gen.py 生成） │
│    └── event_types.js       （事件类型枚举，gen_event_types.py）  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  阶段 1：mvn package — generate-sources 阶段                      │
│                                                                   │
│  Step 1. maven-resources-plugin                                   │
│    ├── 将 src/derived/webapp/ 复制到 target/xbworld-web/          │
│    └── 将 src/main/webapp/javascript/ + handlebars.runtime.js    │
│        复制到 target/xbworld-web/javascript/                      │
│                                                                   │
│  Step 2. maven-antrun-plugin                                      │
│    └── mkdir target/xbworld-web/javascript/（确保目录存在）       │
│                                                                   │
│  Step 3. exec-maven-plugin                                        │
│    └── npm run compile-hb → hbs-templates.js                     │
│        （将 3 个 .hbs 模板预编译为 JS）                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  阶段 2：mvn package — process-resources / package 阶段           │
│                                                                   │
│  closure-compiler-maven-plugin 2.31.0                             │
│    输入：target/xbworld-web/javascript/（约 80 个文件）            │
│    输出：webclient.min.js（1.55 MB）+ webclient.min.js.map        │
│    参数：SIMPLE_OPTIMIZATIONS, ECMASCRIPT_2019 in/out             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 阶段 0：预处理 — `sync-js-hand.sh`

这是整个构建链的**前置依赖**，必须在 `mvn package` 之前手动执行一次（或在 CI 中作为独立步骤运行）。脚本需要已编译安装的 Freeciv C 服务端作为数据源。

```bash
./scripts/sync-js-hand.sh \
  -b /path/to/xbworld-web \
  -f /path/to/freeciv-src \
  -i /path/to/freeciv-install \
  -o /path/to/xbworld-web/src/derived/webapp \
  -d /path/to/savegame-data
```

| 子脚本 | 生成文件 | 说明 |
|--------|---------|------|
| `generate_js_hand/generate_js_hand.py` | `packhand_gen.js` | 从 `packets.def` 自动生成网络包处理函数（`client_handle_*` 系列） |
| `gen_event_types/gen_event_types.py` | `event_types.js` | 从 Freeciv C 源码提取事件类型枚举常量 |
| `helpdata_gen/helpdata_gen.py` | `helpdata_generated.js` | 从规则集提取游戏帮助文本，生成 `helpdata` 对象（约 75 KB） |
| `helpdata_gen/ruleset_auto_gen.sh` | `map-constants.js` 等 | 从规则集提取地图相关常量 |

> `src/derived/` 目录被 `.gitignore` 完全忽略，这些文件**不会提交到 Git 仓库**。

---

## 阶段 2：Closure Compiler 压缩合并

### 编译器参数

```
--language_in    ECMASCRIPT_2019
--language_out   ECMASCRIPT_2019
--create_source_map  webclient.min.js.map
--emit_use_strict    false
--compilation_level  SIMPLE_OPTIMIZATIONS
```

`SIMPLE_OPTIMIZATIONS` 模式执行：变量名缩短（局部变量重命名为单/双字母）、空白符删除、注释删除，但**不进行跨文件内联优化或 dead code elimination**（与 `ADVANCED_OPTIMIZATIONS` 的区别）。

### 合并文件清单（按顺序）

pom.xml 中 `<includes>` 的顺序**严格决定**最终合并顺序：

**① 顺序敏感的前置文件（4 个，必须最先）**

| 文件 | 说明 |
|------|------|
| `libs/EventAggregator.js` | 事件总线，其他模块依赖它 |
| `handlebars.runtime.js` | Handlebars v4.7.8 运行时（530 KB） |
| `map-constants.js` | 地图常量（派生自 Freeciv C 源码） |
| `2dcanvas/tilespec-constants.js` | 瓦片规格常量 |

**② 根目录业务逻辑 JS（约 50 个，按字母序）**

```
action_dialog.js    actions.js      banlist.js      bitvector.js
city.js             civclient.js    client_main.js  clinet.js
cma.js              connection.js   control.js      diplomacy.js
effects.js          extra.js        fc_types.js     freeciv-wiki-doc.js
game.js             government.js   hall_of_fame.js helpdata.js
helpdata_generated.js（派生）       hotseat.js      hbs-templates.js（编译生成）
improvement.js      intel_dialog.js log.js          map-from-image.js
map.js              messages.js     mobile.js       nation.js
options.js          overview.js     packhand.js     packhand_gen.js（派生）
pages.js            pbem.js         pillage_dialog.js  player.js
pregame.js          rates.js        replay.js       reqtree.js
requirements.js     savegame.js     scorelog.js     sounds.js
spacerace.js        specialist.js   speech.js       tech.js
terrain.js          tile.js         unit.js         unittype.js
utility.js
```

**③ 第三方库（`libs/*.js`，已排除 `jquery.min.js` / `hammer.min.js` / `gif.worker.js`）**

| 文件 | 说明 |
|------|------|
| `libs/bigscreen.min.js` | 全屏 API 封装 |
| `libs/bmp_lib.js` | BMP 图像解析 |
| `libs/gif.js` | GIF 动图渲染（主线程部分） |
| `libs/jquery-ui.min.js` | jQuery UI v1.13.2（137 KB） |
| `libs/jquery.blockUI.js` | 页面遮罩 |
| `libs/jquery.contextMenu.js` | 右键菜单 |
| `libs/jquery.dialogextend.js` | 对话框扩展 |
| `libs/jquery.mCustomScrollbar.js` | 自定义滚动条 |
| `libs/jquery.tablesorter.min.js` | 表格排序 |
| `libs/modernizr-custom-webp.js` | Modernizr v3.6.0 特性检测 |
| `libs/morris.min.js` | Morris.js 图表库 |
| `libs/platform.js` | 平台/浏览器检测 |
| `libs/range.js` | Range 工具 |
| `libs/raphael-min.js` | Raphael.js SVG 库 |
| `libs/seedrandom.min.js` | 可重现随机数 |
| `libs/sha512.js` | SHA-512 哈希 |
| `libs/simpleStorage.min.js` | localStorage 封装 |
| `libs/slider.js` | 滑块组件 |
| `libs/spectrum.js` | 颜色选择器 |
| `libs/sweetalert.min.js` | 美化弹窗 |
| `libs/timer.js` | 计时器 |

**④ 2D Canvas 渲染模块（`2dcanvas/*.js`，已排除 `*trident*` 文件）**

| 文件 | 说明 |
|------|------|
| `2dcanvas/mapctrl.js` | 地图控制（鼠标/触控交互） |
| `2dcanvas/mapview.js` | 地图视图渲染 |
| `2dcanvas/mapview_common.js` | 地图视图公共函数 |
| `2dcanvas/tileset_config_amplio2.js` | Amplio2 瓦片集配置 |
| `2dcanvas/tileset_spec_amplio2.js` | Amplio2 瓦片集规格 |
| `2dcanvas/tilespec.js` | 瓦片规格解析 |

**单独排除（不合并进 min.js）**

| 排除文件 | 原因 |
|---------|------|
| `webclient.js` | 入口文件，单独加载 |
| `webclient.min.js` | 输出文件本身，防止循环 |
| `libs/jquery.min.js` | jQuery 主库，通过独立标签加载 |
| `libs/hammer.min.js` | 触控手势库，独立加载 |
| `libs/gif.worker.js` | Web Worker 文件，必须独立加载 |

---

## 与当前 XBWorld 架构的关系

XBWorld 在重构过程中已将 `webclient.min.js` 的功能逐步拆解，当前（Phase 9/10 完成后）的加载架构为：

```
index.html 加载顺序：
  1. jQuery（独立加载）
  2. 剩余 Legacy JS 文件（31 个根目录 + 6 个 2dcanvas，约 19,585 行）
  3. webclient.min.js（仍然加载，作为兜底）
  4. ts-bundle/main.js（type="module"，defer 加载，TS 函数优先覆盖 window）
```

**TS 函数覆盖机制**：`ts-bundle/main.js` 在 `webclient.min.js` 之后加载，通过 `exposeToLegacy(name, fn)` 将 TS 函数赋值到 `window[name]`，覆盖 `webclient.min.js` 中的旧版本。Legacy JS 调用这些函数时，实际执行的是 TS 版本。

**终态目标**：当所有 Legacy JS 文件都迁移到 TS 后，从 `index.html` 删除 `webclient.min.js` 的 `<script>` 标签，完成整体替换（对应迁移计划中的 Phase 13）。

---

## Source Map 的用途

`webclient.min.js.map`（约 3 MB）是 Closure Compiler 生成的 Source Map，可以将压缩后的代码还原到对应的源文件和行号。在 Phase 13 整体替换阶段，可以利用它定位 `webclient.min.js` 中尚未迁移的函数来自哪个源文件，加速最终的迁移工作。

```bash
# 使用 source-map 工具查询某个压缩位置对应的源文件
npx source-map-explorer webclient.min.js webclient.min.js.map
```

---

## 关键设计决策说明

**为什么 `src/derived/` 不提交到 Git？** 这些文件是从 Freeciv C 源码自动生成的，文件体积大且随 Freeciv 版本变化，不适合纳入版本控制。

**为什么使用 `SIMPLE_OPTIMIZATIONS` 而不是 `ADVANCED_OPTIMIZATIONS`？** `ADVANCED_OPTIMIZATIONS` 需要为所有外部依赖提供 extern 声明，否则会破坏与 jQuery、WebSocket API 等的交互。`SIMPLE_OPTIMIZATIONS` 只做变量名缩短和空白删除，更安全。

**为什么 `handlebars.runtime.js` 要单独处理？** Handlebars 运行时需要在所有预编译模板（`hbs-templates.js`）之前加载，因此在 `<includes>` 中被显式列为第二个文件，而不是随 `libs/*.js` 一起按字母序加载。
