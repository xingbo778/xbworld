# XBWorld JS → TS 迁移执行计划（修订版）

> 更新日期：2026-03-04
> 基于 `webclient.min.js` 分析报告修订，当前进度：Phase 7.5 已完成

---

## 一、现状快照

### 代码量

| 类别 | 文件数 | 行数 | 说明 |
|------|--------|------|------|
| 剩余 Legacy JS（主目录） | 35 个 | 19,711 行 | 待迁移 |
| 2dcanvas 渲染层 | 5 个 | 3,675 行 | 待迁移 |
| `webclient.min.js` | 1 个 | 2,665 行 | 开源打包产物，含 868 个函数 |
| 当前 TypeScript | 40+ 个 | 11,521 行 | 已激活 |

### 关键认知更新

`webclient.min.js` 是 Freeciv-web 开源项目（AGPL 协议）由 Google Closure Compiler 打包的产物，源码就是仓库中的那些 Legacy JS 文件。这意味着：

1. **不存在"黑盒"**：`webclient.min.js` 的每一行都有对应的 Legacy JS 源文件
2. **迁移的终极目标**：用 Vite 构建的 TS bundle 完整替换 `webclient.min.js`，彻底告别 Maven/Closure Compiler 构建链
3. **中间态管理**：在完全替换之前，TS 通过 `exposeToLegacy` 覆盖 `window` 上的函数，与 `webclient.min.js` 中的旧版本共存（TS 版本优先，因为 ts-bundle 在 `webclient.min.js` 之后加载）

---

## 二、整体路径

```
当前状态                    中期里程碑                   终态
Legacy JS (35 files)   →   Legacy JS (< 10 files)  →   纯 TS + Vite bundle
+ webclient.min.js         + webclient.min.js           (无 webclient.min.js)
+ ts-bundle (11k lines)    + ts-bundle (30k+ lines)     (无 Legacy JS)
```

整个迁移分为三个阶段：

- **阶段 A（当前 → 50% 清理）**：继续渐进式删除 Legacy JS，优先处理已被 TS 完整覆盖的文件
- **阶段 B（50% → 90% 清理）**：迁移核心控制层和渲染层，这是最高风险的部分
- **阶段 C（最终替换）**：利用 Source Map 解包 `webclient.min.js`，将剩余功能迁移到 TS，整体替换

---

## 三、执行计划

### Phase 8：快速清理（数据层剩余文件）

**目标**：删除 4 个已被 TS 完整覆盖的数据层文件，净减约 1,900 行 Legacy JS。

**风险**：低。这些文件的所有函数已有对应 TS 实现，只需用 `check-legacy-delete.sh` 确认后删除。

| 任务 | 文件 | 行数 | TS 覆盖情况 | 备注 |
|------|------|------|------------|------|
| 8.1 | `map.js` | 473 行 | map.ts（28 expose，覆盖全部 22 函数） | 直接删除 |
| 8.2 | `unit.js` | 507 行 | unit.ts（38 expose，覆盖全部 22 函数） | 直接删除 |
| 8.3 | `tech.js` | 757 行 | tech.ts（23 expose，覆盖全部 17 函数） | 直接删除 |
| 8.4 | `city.js` | 1,602 行 | city.ts（45 expose，覆盖全部 40 函数） | 直接删除 |

**操作步骤**：
1. 对每个文件运行 `check-legacy-delete.sh` 确认无遗漏
2. 从 `index.html` 删除对应 `<script>` 标签
3. 删除 JS 文件
4. 重建 ts-bundle，运行回归测试

---

### Phase 9：客户端核心层清理

**目标**：删除 `civclient.js`、`client_main.js`，补全 `nation.js` 覆盖后删除，净减约 1,350 行 Legacy JS。

**风险**：中。`civclient.js` 包含 `civclient_init` 初始化函数，是整个客户端的入口，需要特别小心。

| 任务 | 文件 | 行数 | 待补全工作 | 备注 |
|------|------|------|-----------|------|
| 9.1 | `nation.js` | 462 行 | 补全 4 个未覆盖函数（`update_nation_screen` 等 UI 函数）| 部分是 jQuery UI，可保留在 Legacy 或迁移 |
| 9.2 | `client_main.js` | 418 行 | 补全 7 个未覆盖函数（`set_client_state`、`show_new_game_message` 等）| 需要迁移初始化逻辑 |
| 9.3 | `civclient.js` | 480 行 | 补全 `civclient_init`（最复杂，是游戏启动入口）| 高风险，需要完整测试 |

**`civclient_init` 迁移策略**：
- 将初始化逻辑拆分为：网络初始化（已在 `connection.ts`）、UI 初始化（新建 `clientInit.ts`）、事件绑定（保留在 Legacy 或新建 `clientEvents.ts`）
- 迁移后保留 `civclient.js` 中的 `civclient_init` 作为一个薄包装，调用 TS 版本，待完全验证后再删除

---

### Phase 10：控制层（最高风险）

**目标**：迁移 `control.js`（3,503 行，96 个函数），这是整个迁移中最复杂的部分。

**风险**：高。`control.js` 包含键盘/鼠标事件处理、单位命令、地图交互等核心游戏逻辑，任何错误都会直接影响游戏可玩性。

**分批迁移策略**（按功能模块拆分）：

| 批次 | 功能 | 函数数 | 风险 |
|------|------|--------|------|
| 10.1 | 单位焦点管理（`set_unit_focus`、`get_unit_in_focus` 等） | ~10 | 低 |
| 10.2 | 单位命令发送（`send_unit_move`、`send_attack_unit` 等） | ~15 | 中 |
| 10.3 | Goto 路径规划（`send_goto_tile`、`goto_path_*` 等） | ~12 | 中 |
| 10.4 | 地图点击处理（`map_canvas_click`、`map_canvas_*` 等） | ~20 | 高 |
| 10.5 | Action 决策（`request_action_*`、`do_action_*` 等） | ~25 | 高 |
| 10.6 | 键盘/鼠标事件绑定（`key_down_handler` 等） | ~14 | 极高 |

**前置检查**：在开始 Phase 10 之前，用 `check-legacy-delete.sh` 扫描 `control.js` 中所有依赖的数据结构，确认 BitVector 字段都已正确转换（参考 `packhandlers.ts` 的修复经验）。

---

### Phase 11：渲染层（与 Phase 10 并行）

**目标**：迁移 2dcanvas 渲染层（3,675 行），从 `tilespec.js` 开始。

**风险**：高。渲染层任何错误都会导致地图黑屏，需要在迁移前截图建立视觉基准。

| 任务 | 文件 | 行数 | 说明 |
|------|------|------|------|
| 11.1 | `tilespec.js` | 1,694 行 | 瓦片规格定义，纯数据，风险相对低 |
| 11.2 | `mapview_common.js` | 642 行 | 地图视图公共逻辑 |
| 11.3 | `mapview.js` | 518 行 | 地图渲染主逻辑 |
| 11.4 | `mapctrl.js` | 374 行 | 地图控制（与 control.js 有交叉） |
| 11.5 | `tileset_config_amplio2.js` | 447 行 | 瓦片集配置（纯数据，可提前） |

**建议**：Phase 11.1（`tilespec.js`）可以在 Phase 10.1 完成后立即启动，不需要等待 Phase 10 全部完成。

---

### Phase 12：UI 层（最后阶段）

**目标**：迁移剩余的 UI 对话框和功能面板（约 8,000 行），这些文件与 jQuery 深度耦合。

**策略**：这一阶段的迁移策略需要根据 Phase 10/11 完成后的实际情况重新评估。主要候选文件：

| 文件 | 行数 | 优先级 | 说明 |
|------|------|--------|------|
| `pregame.js` | 1,683 行 | 高 | 预游戏大厅，用户首先接触的界面 |
| `action_dialog.js` | 1,128 行 | 中 | 单位行动对话框 |
| `diplomacy.js` | 564 行 | 中 | 外交系统 |
| `rates.js` | 328 行 | 低 | 税率调整 |
| `messages.js` | 249 行 | 低 | 消息面板 |
| 其余小文件 | ~3,000 行 | 低 | 各类对话框 |

---

### Phase 13：webclient.min.js 整体替换（终态）

**触发条件**：当 Legacy JS 文件数量减少到 10 个以下，且 TS bundle 已覆盖 `webclient.min.js` 中 80% 以上的函数时，启动整体替换。

**操作步骤**：
1. 利用 `webclient.min.js.map`（Source Map）还原剩余未迁移函数的源码位置
2. 将剩余函数迁移到对应的 TS 模块
3. 从 `index.html` 删除 `webclient.min.js` 的 `<script>` 标签
4. 完整回归测试（单人游戏 + 多人游戏 + Longturn 模式）
5. 更新构建流程：从 Maven + Closure Compiler 切换到纯 Vite

**预期收益**：
- 构建时间从 Maven 的 3-5 分钟降至 Vite 的 10-30 秒
- 完整的 TypeScript 类型安全覆盖
- 支持 HMR（热模块替换），开发效率大幅提升
- 消除 1.55MB 的压缩 JS 文件，改为按需加载

---

## 四、优先级总结

```
立即开始（本周）
├── Phase 8.1: 删除 map.js        [低风险，473 行]
├── Phase 8.2: 删除 unit.js       [低风险，507 行]
├── Phase 8.3: 删除 tech.js       [低风险，757 行]
└── Phase 8.4: 删除 city.js       [低风险，1,602 行]

下一步（下周）
├── Phase 9.1: 补全并删除 nation.js     [中风险，462 行]
├── Phase 9.2: 补全并删除 client_main.js [中风险，418 行]
└── Phase 10.0: 前置扫描 control.js 依赖 [准备工作]

中期（本月）
├── Phase 10.1-10.3: control.js 前三批   [高风险]
└── Phase 11.1: tilespec.js 迁移         [高风险，并行]

长期
├── Phase 10.4-10.6: control.js 后三批
├── Phase 11.2-11.5: 渲染层剩余
├── Phase 12: UI 层
└── Phase 13: webclient.min.js 整体替换
```

---

## 五、风险管控

### 已建立的工具

| 工具 | 用途 |
|------|------|
| `scripts/check-legacy-delete.sh` | 删除前检查函数覆盖完整性 |
| `scripts/map-diagnostics.js` | 地图渲染问题诊断 |
| `scripts/mock-server.py` | WebSocket 录制/回放，用于离线测试 |
| `vite.config.dev.ts` | 本地开发连接 Railway 后端 |
| Playwright 回归测试套件 | 自动化端到端测试 |

### 新增建议

1. **每次删除前截图基准**：对于渲染层文件，在删除前截图保存为基准，删除后对比
2. **BitVector 检查**：每次删除数据层文件前，检查该文件中的所有 BitVector 字段是否已在 `packhandlers.ts` 中正确转换（参考 Phase 7.5 的 `flags`/`gives_shared_vision` 修复）
3. **全局变量作用域检查**：注意 `webclient.min.js` 中有些变量是在 `$(document).ready` 内部定义的，不在 `window` 上，不能依赖它们（参考 `REPORT_*` 常量的问题）
4. **`type=module` 时序**：ts-bundle 是 defer 加载的，任何需要在页面加载时立即可用的常量/函数，都需要在 `index.html` 的同步 `<script>` 块中预定义（参考 P0/P1 修复）

---

## 六、进度追踪

| Phase | 状态 | 净减 Legacy 行数 | 完成日期 |
|-------|------|-----------------|---------|
| Phase 1-7 | ✅ 已完成 | ~6,154 行 | 2026-03-04 前 |
| Phase 7.5 | ✅ 已完成 | -471 行 | 2026-03-04 |
| Phase 8 | 🔜 下一步 | 预计 -3,339 行 | — |
| Phase 9 | 📋 计划中 | 预计 -1,360 行 | — |
| Phase 10 | 📋 计划中 | 预计 -3,503 行 | — |
| Phase 11 | 📋 计划中 | 预计 -3,675 行 | — |
| Phase 12 | 📋 计划中 | 预计 -8,000 行 | — |
| Phase 13 | 📋 计划中 | -2,665 行（webclient.min.js）| — |

**完成 Phase 8 后**：Legacy JS 从 19,711 行降至约 16,372 行，整体清理进度约 **37%**。
