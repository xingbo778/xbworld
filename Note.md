# TS Migration Progress

## Goal
完全重写所有 legacy JS 为纯 TS 模块化代码，删除 webclient.min.js 和所有 legacy JS，删除 bridge/legacy.ts 和 bridge/sync.ts。

## Benchmark
- 重构前最后稳定 commit: `2aaefe5^` (所有原始 JS 源文件)
- 原始 JS 源文件已恢复到 `/home/ubuntu/legacy_source/`

## 已完成的转换（27/31 文件）

### 小文件（已完成）
- [x] banlist.js → utils/banlist.ts
- [x] mobile.js → utils/mobile.ts
- [x] hall_of_fame.js → ui/hallOfFame.ts
- [x] pages.js → core/pages.ts
- [x] pillage_dialog.js → ui/pillageDialog.ts
- [x] cma.js → ui/cma.ts
- [x] replay.js → utils/replay.ts
- [x] sounds.js → audio/sounds.ts
- [x] speech.js → audio/speech.ts
- [x] spacerace.js → ui/spacerace.ts
- [x] intel_dialog.js → ui/intelDialog.ts
- [x] options.js → ui/options.ts

### 中等文件（已完成）
- [x] messages.js → core/messages.ts
- [x] rates.js → ui/rates.ts
- [x] helpdata.js → ui/helpdata.ts
- [x] hotseat.js → ui/hotseat.ts
- [x] map-from-image.js → ui/mapFromImage.ts
- [x] scorelog.js → ui/scorelog.ts
- [x] savegame.js → utils/savegame.ts
- [x] reqtree.js → data/reqtree.ts
- [x] diplomacy.js → ui/diplomacy.ts

### 渲染层（已完成）
- [x] overview.js → core/overview.ts
- [x] 2dcanvas/mapctrl.js → renderer/mapctrl.ts
- [x] 2dcanvas/mapview.js → renderer/mapview.ts
- [x] 2dcanvas/mapview_common.js → renderer/mapviewCommon.ts
- [x] action_dialog.js → ui/actionDialog.ts

## 待转换（4/31 文件）
- [ ] 2dcanvas/tileset_config_amplio2.js → renderer/tilesetConfig.ts (447 lines, 数据文件)
- [ ] 2dcanvas/tilespec.js → renderer/tilespec.ts (1694 lines)
- [ ] freeciv-wiki-doc.js → data/wikiDoc.ts (1047 lines, 数据文件)
- [ ] control.js → core/control.ts (3503 lines, 最大文件)
- [ ] pregame.js → core/pregame.ts (1683 lines)

## webclient.min.js 独有函数（需迁移到对应 TS 模块）
- city_dialog 系列 (29 函数) → 原始 city.js 中的 UI 部分
- tech_ui 系列 (15 函数) → 原始 tech.js 中的 UI 部分
- government_ui 系列 (7 函数) → 原始 government.js 中的 UI 部分
- worklist 系列 (9 函数) → 原始 city.js 中的 worklist 部分
- 其他 (4 函数)

## 后续步骤
1. 转换剩余 5 个大文件
2. 从原始 city.js/tech.js/government.js 迁移 UI 函数到 TS
3. 删除 bridge 层和 exposeToLegacy
4. 更新 main.ts 入口和 index.html
5. 构建、修复编译错误
6. 本地启动测试验证
