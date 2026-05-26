# Web 卡牌游戏 AI 交接文档

更新日期：2026-05-26
项目根目录：`C:\Users\C2H6O\Desktop\wechatgame`

本文档用于让后续 AI 或工程师快速理解当前 Web 端卡牌游戏的结构、内容、资源、测试方式和未来 Unity 迁移方向。本文只整理当前项目事实，不代表新的产品设计方案。

## 0. DeepSeek 接手铁律

本项目接下来会交给 Trae 里的 DeepSeek 继续做。请按下面的硬规则执行，少猜测，多确认。

1. 每次只改一个页面或一个系统，不要跨页面大重构。
2. 动手前必须先运行 `git status --short`。当前工作区已有 UI 替换改动，不要回滚、覆盖或清理不是你刚写的内容。
3. 改 UI 前必须先读目标组件、`game/src/index.css` 里的相关 class、对应资源目录、`game/src/data/runtimeAssetManifest.ts`。
4. 不要把规则逻辑写进 React 组件。规则、数值、掉落、地图生成优先在 `shared/` 或 `game/src/store/gameStore.ts` 处理。
5. 不要复制终端里的乱码中文。用支持 UTF-8 的编辑器看源码和文档。
6. 不要删除 `game/public/assets/`、`未使用/`、`game/node_modules/`。
7. 改运行时图片资源后必须执行 `cd game && npm run assets:manifest`。
8. 提交前必须至少执行 `cd game && npm test -- --run` 和 `cd game && npm run build`。
9. UI 替换必须遵守 `1920×1080参考坐标系`、`资源拼装`、`同尺寸同锚点原地换图`、`manifest同步刷新`。
10. 如果效果图和切片资源不齐，以统一网格和现有 v2 资源为准，不要靠移动文字或按钮去追旧截图偏差。

## 1. 项目定位

这是一个中医题材 Web 端卡牌构筑游戏，玩法结构接近 roguelike deckbuilder：

- 玩家选择 9 种体质之一后开始一局游戏。
- 地图节点驱动流程：普通战斗、Boss、事件、药房、休息、奖励；精英和宝箱类型仍保留，但当前常规地图生成不产出精英或宝箱节点。
- 事件系统：1 条主线（三兄弟择师，分三路，跨 3 幕分支叙事）+ 11 条支线事件。**严格线性队列**：三兄弟 Act1→Act2→Act3 顺序不可插队，支线按 `eventQueue` 预洗牌队列（50% 子午流注优先）依次消费，续集触发后注入队首。通过 `eventLog`/`eventMarkers` 持久化标记。
- 战斗核心是手牌、真气、格挡、生命、状态、敌人意图和回合推进。
- 地图为无限循环结构，每幕 10 层，击败 Boss 后进入下一幕（上限 3 幕）；没有正常胜利终点；`GamePhase` 仍保留 `victory` 类型。
- Boss 和 Boss 前休憩在独立通道上，需在当前循环累计 3 场战斗胜利后解锁。击败 Boss 后 `currentAct` 递增（上限 3），敌池、敌人行动次数和 BGM 随 Act 切换。
- 敌人随层数增强的当前实装只应用 HP：`ceil(baseHp * (1 + floor * 0.05))`。`getEnemyScaling()` 也返回 `damageBonus`，但普通开战流程尚未把它应用到敌人伤害。
- 当前运行端是 React + Vite Web 项目；规则和数据尽量集中在 `shared/`，这部分是未来迁移到 Unity 时最重要的源数据。

当前项目不是纯 UI Demo，已经包含可运行战斗规则、敌人行为、图鉴、药方合成、装备被动、资源预加载、GitHub Pages/EdgeOne 部署脚本和浏览器自动化辅助 hook。

## 2. 快速启动

主要 Web 项目在 `game/` 目录。

```powershell
cd game
npm install
npm run dev
```

常用命令：

```powershell
cd game
npm test -- --run
npm run build
npm run preview
npm run assets:manifest
```

部署相关：

- GitHub Pages 工作流：`.github/workflows/pages.yml`
- GitHub Pages 构建目录：`game/dist`
- Vite base 路径：`game/vite.config.ts`
- EdgeOne 脚本：`game/package.json` 中的 `edgeone:deploy`、`edgeone:preview`
- 自定义域名历史上下文：`test1.renxuanqi.top`

Windows 11 离线交付：

- 本机离线包目录：`offline-windows/`
- 本机压缩包：`wuxing-yidao-offline-windows.zip`
- 新电脑双击：`offline-windows/open-game.cmd`
- 运行依赖：Windows 11 自带 PowerShell；不需要 Node.js、npm、Python 或网络
- 当前本机离线 `web/` 约 96.7 MiB，根目录 zip 约 95.7 MiB
- `offline-windows/open-game.ps1` 内置一个只监听 `127.0.0.1` 的静态 HTTP 服务器，默认从 5173 开始找空闲端口，并自动打开浏览器
- `offline-windows/web/` 是 `game/dist/` 的复制产物，和 zip 一样已加入 `.gitignore`，不要提交到 GitHub；需要更新离线包时重新 `cd game && npm run build` 后复制 `game/dist` 到 `offline-windows/web`

## 3. 技术栈

`game/package.json` 当前显示：

- React 18
- Vite 5
- TypeScript 5
- Zustand 4
- Framer Motion 11
- lucide-react
- Vitest 4
- Tailwind/PostCSS 依赖存在，但当前主要样式集中在 `game/src/index.css`
- EdgeOne CLI 用于可选部署

项目结构：

```text
wechatgame/
  shared/
    baseTypes.ts              # 游戏核心类型
    core/gameCore.ts          # 纯规则核心，未来迁移 Unity 的重点
    data/cards.ts             # 卡牌数据源
    data/formulas.ts          # 药方蓝图数据源
    data/enemies.ts           # 敌人数据源
  game/
    src/
      App.tsx                 # 阶段路由和调试 hook
      components/             # 页面与战斗 UI
      store/gameStore.ts      # Zustand 状态、流程编排、持久化
      services/               # 全局资源加载服务
      hooks/                  # 渐进图片/资源加载 hook
      utils/                  # 资源 URL、图片预载、ID 等工具
      data/                   # 图鉴与运行时资源 manifest
    public/assets/            # 运行时资源（图片 manifest + 音频）
      combat/v2/              # 战斗 v2 资源拼装切片
      map/v2/                 # 地图 v2 资源拼装切片
    scripts/                  # 资源 manifest 生成脚本
```

## 4. 当前内容总览

截至本次扫描：

| 项目 | 当前数量 / 说明 |
| --- | --- |
| 卡牌总数 | 108 条模板记录：75 药材牌、10 敌方机制牌、12 药方牌、11 装备牌 |
| 起始牌组 | 9 种体质各 15 张，管理员体质约 87 张（全部药材+药方） |
| 药方蓝图 | 12 种正式蓝图，合成台按配方合成，可重复合成无上限 |
| 药方牌 | 12 张，除合成台外无其他获取方法 |
| 装备牌 | 11 张，战斗胜利掉落，获得后全局被动，可重复获得，但效果按有效层数上限结算 |
| 事件 | 1 条主线（分叉 3 幕）+ 11 条支线，含 `eventLog`/`eventMarkers` 持久化 |
| 敌人总数 | 20 条记录：普通敌、精英、4 个 Boss 与 1 个召唤单位 |
| 体质 | 9 种 + 管理员体质（`?admin` 开启） |
| 语音/音频 | BGM、环境音、SFX 等音频资源当前约 35.6 MiB |
| `public/assets` 总量 | 当前工作区约 360 个文件，约 95.9 MiB；敌人动画和大背景已完成 WebP 压缩 |
| 图片 manifest | 当前约 338 条图片资源，`TOTAL_RUNTIME_ASSET_BYTES` 约 58.4 MiB；音频不计入 manifest |

运行时资源按目录统计：

| 目录 | 文件数 | 体积 |
| --- | ---: | ---: |
| `audio` | 20 | 约 35.6 MB |
| `author_qr` | 2 | 约 0.3 MB |
| `cards_enemy` | 65 | 约 43.3 MB（敌人动画为 480px 宽动画 WebP，另保留 poster/fallback） |
| `cards_equipment` | 11 | 约 1.1 MB |
| `cards_formula_placeholders` | 12 | 约 0.7 MB |
| `cards_herb_placeholders` | 1 | 约 0.04 MB |
| `cards_player` | 84 | 约 5.0 MB |
| `cards_replacement_placeholders` | 48 | 约 1.1 MB |
| `cards_special` | 0 | 0 MB（旧占位图已清理） |
| `combat` | 32 | 约 0.6 MB（战斗 v2 切片与 WebP 背景） |
| `constitutions` | 9 | 约 0.6 MB |
| `constitution_select` | 8 | 约 0.4 MB |
| `intro` | 11 | 约 0.6 MB |
| `main_menu` | 37 | 约 5.0 MB（主菜单 v2 运行资源和字体子集；旧大字体与 QA 截图已清理） |
| `map` | 12 | 约 0.2 MB（地图 v2 切片） |
| 根目录背景图 | 8 | 约 1.4 MB（Act 2 地图背景已转 WebP） |

新增背景资源（关键大图已压缩到约 200KB 级别）：
- `background_map_act1.png` / `background_map_act2.webp`：路径选择分幕背景
- `background_rest.png`：休憩场景背景
- `background_rest_act2.jpg`：第二幕休憩场景背景
- `background_shop.png`：药房场景背景
- `bg_synthesis_1.png` / `bg_synthesis_2.png`：合成台双图随机展示

## 5. 核心类型

源文件：`shared/baseTypes.ts`

关键类型：

- `Constitution = 'balanced' | 'yin_deficiency' | 'qi_deficiency' | 'yang_deficiency' | 'phlegm_dampness' | 'damp_heat' | 'blood_stasis' | 'qi_stagnation' | 'special_diathesis'`
- `CardType = 'attack' | 'skill' | 'power'`
- `CardRarity = 'common' | 'uncommon' | 'rare'`
- `CardTarget = 'single_enemy' | 'all_enemies' | 'self' | 'random'`
- `CardCategory = 'herb' | 'formula' | 'equipment' | 'enemy'`
- `EnemyIntent.type = 'attack' | 'defend' | 'buff' | 'debuff' | 'special'`
- `NodeType = 'combat' | 'elite' | 'boss' | 'event' | 'shop' | 'rest' | 'chest' | 'start'`
- `GamePhase = 'intro' | 'start_menu' | 'card_codex' | 'map' | 'combat' | 'event' | 'shop' | 'rest' | 'chest' | 'reward' | 'game_over' | 'victory'`

核心实体：

- `Card`：卡牌 ID、名称、分类、战斗类型、稀有度、费用、描述、效果 ID、数值、目标、升级状态、图片、不可打出标记等。
- `FormulaBlueprint`：蓝图 ID、药方牌 ID、完整素材 ID 列表、歌诀、组成、难度、出处等。
- `StatusEffect`：状态 ID、名称、buff/debuff、层数、描述、是否可叠加、持续时间、不可驱散标记。
- `Enemy`：敌人 ID、名称、生命、格挡、状态、意图、图片、poster、行为 ID、meta。
- `Player`：生命、真气、格挡、牌堆、手牌、弃牌堆、消耗堆、体质、装备/遗物、药水、金币、已获得卡牌、已录入蓝图等。
- `MapNode` / `MapLayer`：地图节点和层级连接。

## 6. 游戏流程与页面

阶段路由在 `game/src/App.tsx`。

页面组件：

| 阶段 | 组件 | 作用 |
| --- | --- | --- |
| `intro` | `IntroView` | 开场页 |
| `start_menu` | `StartMenu` | 主菜单、资源加载进度、9 体质选择入口。当前使用 1920×1080 参考坐标系做资源拼装：背景单独 cover 填充，标题与 6 个按钮 plate 独立渲染，按钮默认态/hover 态在同一网格锚点原地换图。运行资源位于 `game/public/assets/main_menu/`。当前按钮文字和 hover 图资源已有更新，不要重新按旧截图偏移 UI。 |
| `card_codex` | `CardCodexView` | 图鉴，包括卡牌/敌人/术语 |
| `map` | `MapView` | 地图节点选择。当前正在使用 v2 资源拼装界面，核心资源在 `game/public/assets/map/v2/`，核心 CSS 前缀是 `map-v2-*`，布局按 1920×1080 参考坐标系定位。 |
| `combat` | `CombatView` | 战斗主界面。当前已重写为 v2 资源拼装界面，核心资源在 `game/public/assets/combat/v2/`，核心 CSS 前缀是 `combat-v2-*`；手牌恢复旧版 `Hand` 真实卡牌交互，敌人生命/格挡/意图/状态为真实数据驱动。 |
| `reward` | `RewardView` | 战斗奖励：3 张药材牌可选取/放弃，另展示本次装备掉落和真实药方蓝图奖励 |
| `chest` | `ChestView` | 宝箱页存在；当前地图生成不产出宝箱节点 |
| `rest` | `RestView` | 休息 |
| `shop` | `ShopView` | 药房（购买/出售/合成/分解；合成页显示牌组、手牌、材料与同模板数量） |
| `event` | `EventView` | 叙事事件页，支持选项-确认-后果三步交互，效果含 HP/金币/装备/卡牌/商店价格 |
| `game_over` | `App.tsx` 内联界面 | 失败结算 |
| `victory` | 类型保留 | 当前无限地图没有正常胜利终点 |

战斗外常驻 `SynthesisBench` 合成台入口在 `map / reward / shop / rest / event / chest` 显示，不在战斗、图鉴、开场和主菜单显示。合成台用于录入药方蓝图、查看材料拥有数量、选择具体药材实例并合成药方牌。

当前工作区里地图页有一个特殊点：`MapView` 自己渲染 `<SynthesisBench />`，`App.tsx` 的地图分支不再通过 `<GameSurface synthesisBench>` 注入合成台。后续修改地图页时不要重复渲染两个合成台入口，也不要删掉地图页内的合成台入口。

当前 UI 替换状态：

- 主菜单 v2 已接入：`StartMenu.tsx` 使用 `game/public/assets/main_menu/` 下的 v2/default、v2/hover、regions 等资源；默认态与 hover 态必须同尺寸同锚点原地换图。
- 地图 v2 正在接入：`MapView.tsx` 使用 `map-v2-*` 样式和 `game/public/assets/map/v2/` 切片，包括路径框、首领进度、统计图标、提示框。
- 战斗 v2 已接入并持续微调：`CombatView.tsx` 使用 `combat-v2-*` 样式和 `game/public/assets/combat/v2/` 切片，包括巡诊者窗口、被动/装备窗口、生命/格挡/真气窗口、结束回合按钮、敌人信息区和战斗记录。
- 战斗手牌已恢复旧版 `Hand` 组件，不使用 `CombatHandV2` 或“卡牌合并/敌人牌”示例占位图。
- 敌人信息区必须读取真实战斗状态：`enemy.currentHp/maxHp` 驱动血条，`enemy.block` 驱动格挡，`enemy.intent` 驱动意图说明，`enemy.statusEffects` 驱动状态列表。没有真实状态时不显示占位状态图。
- 被动/装备窗口是同窗标签页：被动页只展示 `player.statusEffects`，装备页按 `player.relics` 聚合并用 `CARD_LIBRARY[relic.id].image` 展示真实装备卡图、名称、数量和描述。
- 战斗 UI 动画 cue 是表现层逻辑：玩家/敌人生命、格挡、真气变化、敌人受击、敌人获得负面效果、敌人不同意图类型释放反馈都由 `CombatView` 本地 diff 和 CSS 动画生成，不应改变核心结算。
- `game/src/data/runtimeAssetManifest.ts` 已随当前资源变化更新；继续改运行时资源后必须重新执行 `npm run assets:manifest`。

## 7. 体质系统

体质由 `shared/baseTypes.ts` 的 `Constitution` 限定，局内初始化主要在 `game/src/store/gameStore.ts`。9 种体质当前全部可选，均有被动状态和 15 张起始牌组。

当前语义：

| ID | 中文语义 | 当前规则摘要 |
| --- | --- | --- |
| `balanced` | 平和质 | 攻击牌伤害、格挡获得、治疗效果各 +1 |
| `yin_deficiency` | 阴虚质 | 获得滋阴额外 +1；玩家回合开始真气 +1；受到伤害 +1 |
| `qi_deficiency` | 气虚质 | 攻击牌伤害 -1；格挡 +2；治疗 +1；每打出攻击牌恢复 1 生命 |
| `yang_deficiency` | 阳虚质 | 回合开始得温阳；前 2 个玩家回合真气 -1；温阳 3 层触发群体伤害 |
| `phlegm_dampness` | 痰湿质 | 技能牌给敌人叠痰湿禁锢，满层触发眩晕与虚弱 |
| `damp_heat` | 湿热质 | 攻击牌叠热邪；每回合首张攻击牌额外影响全体；格挡收益 -2 |
| `blood_stasis` | 血瘀质 | 攻击叠血瘀；攻击血瘀目标时伤害放大并穿透格挡；治疗和格挡减半 |
| `qi_stagnation` | 气郁质 | 每回合抽牌 +1；首张技能额外抽牌；敌方回合首次受伤减免；攻防 -1 |
| `special_diathesis` | 特禀质 | 玩家回合开始随机触发真气、抽牌、格挡、治疗、临时力量或无事发生 |

当前每种体质的起始牌组均为 15 张，以 `STARTING_DECKS` 为准。`卡牌清单.xlsx` 的“九大体质初始卡牌”列按中文体质名反向标记了每张卡出现在哪些起始牌组。

## 8. 卡牌、药方与装备系统

源文件：

- `shared/data/cards.ts`
- `shared/data/formulas.ts`
- `shared/core/gameCore.ts`

当前统计：

| 维度 | 分布 |
| --- | --- |
| 分类 | herb 75，enemy 10，formula 12，equipment 11 |
| 战斗类型 | attack 28，skill 44，power 36 |
| 稀有度 | common 22，uncommon 30，rare 56 |
| 费用 | 0 费 44，1 费 45，2 费 15，3 费 4 |
| 目标 | self 73，single_enemy 23，all_enemies 12 |

规则要点：

- 药材牌是普通玩家可打出卡牌的主体。
- `黄芩清肺`（`huangqin`）已从 `formula_ingredient_placeholder`/不可打出改为可打出的 0 费攻击牌：`huangqin_effect` 对单体敌人造成 4 点伤害并施加 1 层热邪；它仍保留 `herb` 分类，可继续作为药方蓝图材料。
- 药方牌共有 12 张，只能通过合成台消耗完整配方药材实例后加入牌组。
- 药方蓝图共有 12 种，正常地图战斗胜利每次奖励 1 张真实蓝图；重复蓝图录入不会重复污染进度。
- 第一次成功合成某药方时，本局显示对应汤头歌诀；同一局再次合成不重复弹。
- 攻击牌按印刷费用和费用修正消耗真气；第一轮平衡已取消 `resolveCardPlay` 中“攻击牌实际费用强制为 0”的特例。
- 装备牌共有 11 张，只通过战斗胜利掉落：普通 10%、精英 20%、首领 50%。装备获得后作为当前跑图全局被动，不进入手牌、牌组、商店、宝箱或普通奖励池。装备可重复获得（不再唯一），但效果按 `EQUIPMENT_EFFECT_CAPS` 有效层数上限结算。
- 允许持有同模板多张卡，系统以运行时实例 ID 区分；模板数量上限保留为 10 张。药房合成页会显示每张候选牌的同模板拥有数量（含 `x1`），并显示牌组、手牌、材料计数。

不要只改卡牌文案。凡是修改卡牌能力，必须同时检查：

- `shared/data/cards.ts` 的文案、数值、`effectId`。
- `shared/core/gameCore.ts` 的 `resolveCardPlay` 分支。
- `game/src/store/gameCore.test.ts` 的规则测试。
- 图鉴展示是否读取同一份数据。

## 8.5 事件系统

源文件：`shared/data/events.ts`

事件分类：
- **主线事件**（`mainline_three_brothers`）：Act 1 择师三选一 → `eventMarkers[three_brothers]` 分支 → Act 2/3 各分支叙事。完成后 `handleEventChoice` 注入 `__mainline_act2/act3` 到 `eventQueue` 队首。
- **支线事件**（`SIDE_EVENTS[]`）：11 条，含续集（`continuationMarker`）。

调度逻辑（`gameStore.ts`，严格线性队列）：
1. `startCombat`：检查 `eventQueue[0]` 是否为 `__mainline_act*`，是则消费之（出主线事件）
2. 否则检查 `actX_intro` marker：未触发则出主线事件
3. 否则 `pickSideEvent` 按队列顺序遍历 `eventQueue`，跳过 `eventLog` 已触发的
4. 续集事件通过 `handleEventChoice` 注入队首，不会被随机支线插队
5. `buildEventQueue`：开局洗牌，50% 概率 `side_needle_stage1` 排首位（第二个事件）

关键类型：
- `GameEvent`：id, title, description, options[], actRequirement, continuationMarker, clearMarkerOnTrigger
- `EventOption`：label, description, effects[], setMarker
- `EventEffect`：type（heal/damage/maxHpChange/goldChange/shopPriceChange/addCard/addEquipment/addRelic/randomCard/removeCard）+ value/cardId/relicId/rarity/cardType

交互流程（`EventView.tsx`）：
1. 点选项 → 高亮选中
2. 点「确认选择」→ 执行所有效果 + 显示效果标签 + 叙事后果文字，通过 store `eventChosenIndex` 保持 `currentEvent` 不消失
3. 点「继续」→ `clearCurrentEvent()` + `completeNonCombat()` 回地图

## 9. 敌人系统

源文件：`shared/data/enemies.ts`

当前有 20 个敌人，全部有动画 WebP 与 poster。`damp_minion` 是正式敌人数据，但只作为召唤单位，不进入普通敌池和管理员单挑列表。

敌人列表：

| ID | 中文语义 | 幕 / 类型 | HP | 图片 |
| --- | --- | --- | ---: | --- |
| `wind_cold_guest` | 风寒客 | Act 1 普通 | 30 | `89.webp` |
| `wind_heat_attack` | 风热袭 | Act 1 普通 | 28 | `90.webp` |
| `damp_turbidity` | 湿浊缠 | Act 1 普通 | 35 | `91.webp` |
| `external_combination` | 外感合病 | Act 1 精英 | 80 | `92.webp` |
| `boss_wind_cold` | 风寒束表 | Act 1 Boss | 150 | `93.webp` |
| `boss_liver_fire` | 肝火炽盛 | Act 1 Boss | 140 | `94.webp` |
| `qi_blood_stasis` | 气滞血瘀者 | Act 2 普通 | 50 | `95.webp` |
| `spleen_dampness` | 脾虚湿盛者 | Act 2 普通 | 55 | `96.webp` |
| `heart_kidney_gap` | 心神不交者 | Act 2 普通 | 45 | `97.webp` |
| `tanmengxinqiao` | 痰蒙心窍者 | Act 2 普通 | 52 | `83.webp` |
| `phlegm_stasis` | 痰瘀互结 | Act 2 精英 | 120 | `98.webp` |
| `boss_spleen_damp` | 脾虚湿困 | Act 2 Boss | 250 | `99.webp` |
| `damp_minion` | 水湿小怪 | Act 2 召唤单位 | 20 | `104.webp` |
| `yin_yang_split` | 阴阳离决者 | Act 3 普通 | 70 | `100.webp` |
| `chong_ren_instability` | 冲任不固者 | Act 3 普通 | 65 | `101.webp` |
| `reruyingxue` | 热入营血者 | Act 3 普通 | 72 | `79.webp` |
| `shenbunaqi` | 肾不纳气者 | Act 3 普通 | 68 | `80.webp` |
| `yangmingfushi` | 阳明腑实者 | Act 3 普通 | 78 | `84.webp` |
| `jueyin_complex` | 厥阴复杂症 | Act 3 精英 | 180 | `102.webp` |
| `boss_five_elements` | 五行失调 | Act 3 Boss | 500 | `103.webp` |

敌池分布：

| 幕 | 普通 | 精英 | Boss |
| --- | ---: | ---: | ---: |
| Act 1 | 3 | 1 | 2 |
| Act 2 | 4 | 1 | 1 |
| Act 3 | 5 | 1 | 1 |

关键敌人行为：

- `boss_spleen_damp` 会召唤 `damp_minion`，但当前核心规则限制同屏存活敌人数最多 2 个；小怪死亡后可补召回到 2 个。
- `yin_yang_split` 通过 `meta.form` 做阴/阳形态切换。
- `boss_five_elements` 使用五行阶段循环。
- `boss_liver_fire` 曾经出现首回合攻击不掉血回归问题，相关测试应保留。
- 敌人意图解释由 UI 根据 `enemy.intent.type/value/hits` 派生，不扩展 `EnemyIntent` 类型。

## 10. 状态与资源

核心状态 ID 来自 `shared/core/gameCore.ts`。重要资源概念：

- 生命：玩家和敌人都有，敌人 HP 降到 0 视为死亡。
- 格挡：抵消伤害，多个规则会清空、转化或放大格挡。
- 真气：玩家出牌费用资源，基础上限为 3。
- 阴液：特殊资源，基础上限 `BASE_YIN_CAP = 5`。
- 金币：`INITIAL_PLAYER.gold = 99`，商店和事件使用。
- 装备/遗物：当前跑图全局被动，存放在 `player.relics`。
- 药方蓝图：存放在 `player.knownFormulaBlueprintIds`，用于合成台解锁配方。

## 11. 地图结构与 Boss 通道

**`ACT_LENGTH = 10` 的无限循环**。`generateMap(12)` 初始实际生成 14 层；地图到达末端前通过 `generateMap(12, map.length)` 追加 12 层。

```text
绝对层 0: [start]                         单节点
绝对层 1: [event]                         必然事件
绝对层 2-5: [combat/shop/event] + col 3 Boss通道连接器（小圆点）
绝对层 6: [combat×3] + [rest 🔒]          中段休憩在 Boss 通道
绝对层 7-9: [combat/shop/event] + col 3 Boss通道连接器（小圆点）
绝对层 10: [combat×3] + [rest 🔒]         首领前休憩在 Boss 通道
绝对层 11: [combat×3] + [boss 🔒]         首领在 Boss 通道
绝对层 12: 下一轮循环开始（cyclePos 0）
```

关键特性：

| 特性 | 说明 |
|------|------|
| **Boss独立通道** | col 3（最右列），从 event 节点直连，全程由灰色小圆点串联 |
| **3胜解锁** | `combatWinsThisCycle >= 3` 才可进入 rest/boss 节点 |
| **Boss后进入下一幕** | Boss 节点自身无子节点，完成后 `currentAct++`（上限 3），重置地图进入下一幕 |
| **主线3分支** | col 0-2 为主线，每层 2 列事件/商店 + 1 列战斗（`lastCombatCol` 轮换不重复） |
| **路径无连战** | `combatSinceEvent >= 2` 时 3 列全事件/商店；任意单列不可能连续战斗 |
| **事件密度** | 85% 事件 / 10% 商店 / 5% 战斗；force 时 3 列全事件(85%)/商店(15%） |
| **主线特殊节点概率** | 非保底时为 85% 事件 / 10% 商店 / 5% 战斗 |
| **本地图无宝箱** | `chest` 类型保留在类型系统但地图生成不产出宝箱节点 |

普通跑图当前在 `gameStore.ts` 中按 `state.currentAct` 动态选择 `ENEMY_POOLS.act1/act2/act3`；击败 Boss 后 `currentAct++`（上限 3），重置地图进入下一幕。开战时只应用 HP 缩放：`ceil(baseHp * (1 + floor * 0.05))`；`damageBonus` 虽由 `getEnemyScaling()` 返回，但当前普通开战流程未把它应用到敌人伤害。

## 12. Store 与持久化

源文件：`game/src/store/gameStore.ts`

职责：

- Zustand 全局状态。
- `persist` 本地持久化。
- 存储 key：`wuxing-yidao-storage`。
- 当前持久化 version：14。
- 新增状态字段：`eventLog`（已触发事件ID列表）、`eventMarkers`（事件分叉标记）、`eventQueue`（支线事件线性队列）、`lastEnemyId`（防重复敌人）、`shopPriceMultiplier`（商店价格倍率）、`eventChosenIndex`（事件选项确认状态）。
- 创建新局、选择体质、进入地图节点、启动战斗。
- 连接 UI 操作和 `shared/core/gameCore.ts` 规则函数。
- 管理奖励、装备掉落、药方蓝图掉落、合成台、商店、休息、事件等流程。
- 管理敌方行动动画调度和测试用时间推进。
- `combatWinsThisCycle`：当前循环内战斗胜利次数（达 3 解锁 Boss 通道）。
- 地图到达末端前自动扩展 12 层（通过 `connectMapSegments` 连接新旧段）。
- `EventView` 现为完整事件交互页，`ChestView` 存在但当前地图生成不产出 `chest` 节点。

重要动作：

- `startGame`
- `startCombat`
- `startAdminEnemyChallenge`
- `playCard`
- `endTurn`
- `completeCombat` / `completeNonCombat`
- `addCardToDeck` / `removeCardFromDeck` / `sellCardFromDeck`
- `combineCards(cardIds, targetCardId)`
- `recordFormulaBlueprint(blueprintId)`
- `craftFormulaFromBlueprint(blueprintId, ingredientInstanceIds)`
- `handleEventChoice(eventId, optionIndex)` → 执行事件选项效果，设置 `eventChosenIndex`
- `clearCurrentEvent()` → 清空 `currentEvent` 和 `eventChosenIndex`
- `clearPendingEquipmentReward`
- `clearPendingFormulaBlueprintReward`
- `advanceTime`

注意：`startCombat(nodeId)` 在 store 中实际承担“进入地图节点”的分发职责，节点可能不是战斗，也可能进入商店、休息、事件或宝箱；但当前地图生成不会产出宝箱节点。Boss 节点在 `combatWinsThisCycle < 3` 时被拒绝进入。

## 13. 图鉴与管理员入口

图鉴数据主要在 `game/src/data/codex.ts`。

功能：

- 卡牌图鉴，按药材牌、药方牌、装备牌展示。
- 敌人图鉴。
- 术语/机制说明。
- 管理员敌人挑战入口使用图鉴元数据过滤。

特殊字段：

- `EnemyCodexMeta.adminSelectable?: boolean`
- `damp_minion` 设置为 `adminSelectable: false`，所以它出现在图鉴中，但不出现在管理员单挑选择器。

如果新增敌人，通常要同步：

- `shared/data/enemies.ts`
- `game/src/data/codex.ts`
- 图片资源 `game/public/assets/cards_enemy`
- 如可直接遭遇，更新 `ENEMY_POOLS`
- 如有特殊行为，更新 `shared/core/gameCore.ts` 和测试

## 14. 资源与加载策略

运行时资源目录：`game/public/assets`

当前 UI 替换新增资源目录：

- `game/public/assets/combat/v2/`：战斗 v2 资源拼装切片，当前约 32 个文件，包含 `background.webp`、`background_act2.webp`、玩家资源/生命面板、被动/装备面板、按钮、血条和状态图标。
- `game/public/assets/map/v2/`：地图 v2 资源拼装切片，当前约 12 个文件，包含路线框、首领进度、提示面板和统计图标。
- `game/public/assets/main_menu/`：主菜单 v2 运行资源、按钮文字、hover 图和字体子集；旧大字体、旧区域切片和 QA 截图已清理，不要按旧截图重新偏移文字或 icon。

关键工具：

- `game/scripts/generateAssetManifest.mjs`
- `game/src/data/runtimeAssetManifest.ts`
- `game/src/services/runtimeAssetLoading.ts`
- `game/src/hooks/useRuntimeAssetLoadingProgress.ts`
- `game/src/utils/progressiveAssets.ts`
- `game/src/hooks/useProgressiveAssetSource.ts`

当前资源 manifest 只覆盖运行时图片预加载资源，分三阶段：`critical -> static -> gif`。音频不纳入图片 manifest；`gif` 阶段当前也承载敌人动画 WebP，作为延后加载阶段名称保留。
主页进度条使用 `useRuntimeAssetLoadingProgress()`，当前总进度分母只统计实际预加载的 `critical/static` 阶段资源，`gif` 阶段不再计入首屏加载总量，避免加载条长期卡在延后加载的敌人动画上。
`runtimeAssetManifest.ts` 已随当前 UI 资源变化更新；如果资源文件数量或路径继续变化，必须重新生成 manifest，不要手写大段 manifest。

资源变更注意：

- 改动运行时图片后执行 `cd game && npm run assets:manifest`。
- 敌方动画目标：优先使用 480px 宽动画 WebP + poster；新增动图必须压缩并重新生成 manifest，不要再提交大体积 GIF。
- 根目录原始素材已经整理到 `未使用/`，不是运行时目录，不应自动删除。

## 15. 测试

当前测试文件：

```text
game/src/data/runtimeAssetManifest.test.ts
game/src/services/runtimeAssetLoading.test.ts
game/src/store/gameCore.test.ts
game/src/store/gameStore.test.ts
game/src/utils/id.test.ts
game/src/utils/progressiveAssets.test.ts
```

常规验证：

```powershell
cd game
npm test -- --run
npm run build
```

当前验证（2026-05-26）：`npm test -- --run` 为 6 个测试文件、89 个测试用例通过；`npm run build` 通过。当前主 JS chunk 约 487 kB。

测试重点：

- 卡牌规则：伤害、格挡、治疗、抽牌、状态、特殊卡。
- 药方系统：完整配方校验、合成消耗、歌诀显示、药方牌战斗效果。
- 药材/合成材料双身份：`黄芩清肺` 可打出，同时仍可作为药方蓝图材料。
- 装备系统：掉落概率、装备不进手牌、11 种装备被动。
- 体质规则：9 种体质被动。
- Boss 行为：肝火炽盛、脾虚湿困、五行失调等。
- 召唤限制：同屏存活敌人最多 2 个。
- Store 回归：出牌后 HP 变化必须正确落入 Zustand 状态。
- 资源 manifest：总字节数、阶段分类、加载顺序。
- 渐进资源加载：共享缓存、流式进度、fallback。

## 16. 浏览器自动化 hook

`game/src/App.tsx` 在 `window` 上暴露了两个调试/自动化入口：

- `window.render_game_to_text()`：返回当前游戏状态摘要 JSON，便于 Playwright 或其他 AI 读取页面状态。
- `window.advanceTime(ms)`：推进 store 内部调度时间，便于测试敌方行动动画和异步回合。

使用自动化检查 UI 时，优先调用这些 hook，而不是只依赖截图识别。

## 17. 已知工程注意事项

- 部分源码中文字符串在某些终端里会显示乱码。不要把终端中的乱码复制进新文档或 UI 文案；应使用支持 UTF-8 的编辑器确认，或直接按产品语义重写干净中文。
- `shared/` 是规则和数据核心，`game/` 是 Web 表现层。不要把规则直接写死到 React 组件里。
- `game/src/index.css` 很大，UI 调整前应先搜索已有 class，避免重复造样式系统。
- 当前 UI v2 主要 class 前缀是 `map-v2-*` 和 `combat-v2-*`。改地图或战斗时优先沿用这些前缀，不要再新建一套并行 UI 系统。
- `CombatView.tsx` 当前已重写为资源拼装界面；如果战斗出牌、选敌、结束回合异常，先检查 v2 组件是否仍正确调用 `playCard`、`selectEnemy`、`endTurn`、`completeCombat`。
- `CombatView.tsx` 里敌人/玩家受击、格挡、真气、负面效果和敌方行动动画均为 UI-only cue。不要为了动画反馈去修改 `shared/core/gameCore.ts` 的结算结果或 store 字段结构。
- 战斗左侧被动/装备窗口采用标签页，不要重新把装备列表混回被动页；被动页需要避免图标、文字、类型标签重叠。
- 战斗手牌当前依赖旧版 `Hand` 组件和 `viewportTier`，不要恢复已删除的 `CombatHandV2` 占位手牌。
- `ConstitutionIntroOverlay.tsx` 的体质选择前动画已恢复为旧版真实卡面“小包洗牌”过场，`CONSTITUTION_CINEMATIC_MS` 为 2200ms；体质选择页本身仍保留当前新版。
- `MapView.tsx` 当前已重写为资源拼装界面；如果节点不可点击或 Boss 通道异常，先检查 `startCombat(node.id)`、`combatWinsThisCycle`、`getBossUnlockWinsRequired()` 是否仍按原逻辑使用。
- 敌方动画是最大图片体积风险。当前主链路为动画 WebP + poster；新增动图前必须压缩并更新 manifest。
- `npm run build` 当前通过，主 JS chunk 约 488.8 kB；后续做功能增长时仍需要留意拆包或按需加载。
- `game/public/assets/cards_enemy/<slot>.png` 多数是 fallback；动画 WebP 与 poster 当前是主链路，不要误删 fallback。
- 根目录 `未使用/` 保存原始素材、历史记录和导入来源，不应删除。
- 根目录 `codex_crash_log.md` 是 Codex 闪退、浏览器插件和本机修复记录，后续排查异常退出时优先追加记录，不要当作普通临时日志删除。
- **Git 网络**：中国大陆可能对 GitHub HTTPS 做 SNI 干扰（TLS 通过但 HTTP 被 RST）。当前已配置 SSH：`git@github.com:r1062046861-RXQ/test1.git`，密钥 `~/.ssh/id_ed25519`。

### UI 替换关键词规范

后续页面 UI 替换以“资源拼装 + 网格对齐 + 原地状态切换”为准，不再严格照抄 `最终效果图.png` 的像素位置；效果图只作为气质、层级和大概位置参考。所有按钮、面板、文字、图标先建立统一网格，再按网格对齐。

关键词：`1920×1080参考坐标系`、`网格对齐优先`、`效果图仅作风格参考`、`背景填充cover不拉伸`、`无左侧白边`、`无顶部白边`、`边缘像素检查`、`默认态与点亮态同尺寸同锚点`、`hover/active原地换图`、`禁止轻微位移`、`禁止CSS额外发光外框`、`文字与icon跨状态对齐`、`字号不随修图变化`、`点亮前后内容位置一致`、`按钮热区与视觉区域一致`、`切片资源优先于整页截图`、`资源可轻量锐化但不得改变尺寸`、`manifest同步刷新`、`1920截图人工核对`、`响应式不裁切关键UI`。

执行标准：

- 背景图必须保持比例填充 viewport，不允许拉伸；若出现左侧、顶部或任意边缘白边，优先修资源边缘或 cover 策略，不移动 UI。
- 默认态和点亮态必须是同一个位置、同一个宽高、同一个锚点的图片替换；hover 时只发生视觉亮起，不允许文字、icon、边框产生 1px 级漂移。
- 如果素材或效果图本身不齐，以统一网格为准重新裁切/合成；不要为了贴合有问题的效果图而破坏按钮、文字、icon 的网格对齐。
- 文字和 icon 的大小、位置一旦确认，后续只做清晰度优化，不再改字号、不再改排版。
- 清晰度优化只允许对运行 PNG 做轻量锐化/对比增强，必须保持图片尺寸、坐标和透明区域逻辑不变。
- 每次替换后必须检查：默认态、点亮态、左/顶边缘、按钮对齐、文字/icon 对齐、无 404、`npm run assets:manifest`、`npm run build`。

## 18. 后续 AI 修改流程建议

修改规则时：

1. 先读 `shared/baseTypes.ts`、`shared/data/cards.ts`、`shared/data/formulas.ts`、`shared/data/enemies.ts`、`shared/core/gameCore.ts`。
2. 找到对应 `effectId`、`behavior` 或状态 ID。
3. 改核心规则。
4. 改数据文案。
5. 增加或更新 `game/src/store/gameCore.test.ts`。
6. 如涉及 Zustand 状态同步，再改 `game/src/store/gameStore.test.ts`。

修改 UI 时：

1. 先读目标页面组件和 `game/src/index.css`。
2. 保持现有阶段路由和 store 接口不变。
3. 图片使用 `resolveAssetUrl` 或现有渐进图片 hook。
4. 遵守上面的 UI 替换关键词规范；状态切换必须同尺寸同锚点原地变化。
5. 浏览器验收时检查控制台 404 和资源加载。

修改资源时：

1. 原始素材放在根目录素材文件夹或指定来源。
2. 运行时资源放入 `game/public/assets`。
3. 需要压缩敌方动图时优先转 480px 宽动画 WebP，并保留 poster。
4. 执行 `cd game && npm run assets:manifest`。
5. 检查 `runtimeAssetManifest.test.ts`。

## 18.5 下一步 UI 替换任务验收清单

每次继续替换主菜单、地图、战斗或其他页面 UI 后，至少检查下面事项：

- 1920×1080 截图检查：无左侧白边、无顶部白边、背景 cover 填满 viewport，不拉伸。
- 默认态、hover 态、active 态：按钮、文字、icon 不产生 1px 级位移。
- 浏览器控制台无资源 404。
- 地图节点可点击；普通节点能进入对应页面；Boss 通道仍需 3 场战斗胜利后解锁。
- 战斗可正常选敌、出牌、结束回合、返回地图；管理员体质仍可跳过战斗并正常领取奖励。
- 地图页合成台入口仍可用，不遮挡“手牌一览”按钮，不重复出现两个入口。
- 改资源后执行 `cd game && npm run assets:manifest`。
- 提交前执行 `cd game && npm test -- --run` 和 `cd game && npm run build`。
- 自动化检查 UI 时优先调用 `window.render_game_to_text()`，不要只凭截图猜状态。

## 19. Unity 迁移准备

未来迁移到 Unity 时，建议把当前项目拆成三层理解：

| Web 当前层 | Unity 对应方向 |
| --- | --- |
| `shared/baseTypes.ts` | C# 数据结构、ScriptableObject schema 或纯 C# model |
| `shared/data/cards.ts`、`shared/data/formulas.ts`、`shared/data/enemies.ts` | ScriptableObject、JSON、CSV 或 Addressables 数据表 |
| `shared/core/gameCore.ts` | 纯 C# 战斗规则服务 / BattleResolver |
| `game/src/store/gameStore.ts` | Unity GameManager、RunState、BattleState、SaveService |
| React components | Unity UI Toolkit / uGUI 页面、Prefab |
| `game/public/assets` | Unity Texture/Sprite/Animator/Addressables |
| 动画 WebP/GIF + poster | 建议转 sprite sheet、Animator、VideoClip 或 Spine/序列帧 |

迁移前建议先做的工程准备：

- 把 `gameCore.ts` 进一步纯函数化，减少随机和日志副作用。
- 为战斗结算建立明确事件流：输入动作 -> 规则结果 -> UI 表现事件。
- 为所有卡牌和敌人建立稳定 schema，避免 UI 文案和数值混在一处。
- 给卡牌、敌人、状态、意图、地图节点建立可导出的 JSON。
- 明确随机数来源，迁移时使用可注入 seed。
- 把 WebP/GIF 动图转为 Unity 友好的动画格式，并建立资源 ID 到 Addressables key 的映射。
- 将当前 Vitest 规则测试迁移为 Unity EditMode 测试，先保证战斗数值一致，再重做表现层。

Unity 迁移时不要直接照搬 React/Zustand 架构。应保留“数据 + 规则 + 表现”的边界：

- 数据层：卡牌、敌人、状态、事件、地图。
- 规则层：出牌、伤害、状态、敌方行为、奖励、地图推进。
- 表现层：动画、UI、音效、输入、资源加载。

## 20. 当前安全清理原则

可清理的通常是生成物或临时物：

- `.playwright-cli/`
- `tmp/`
- `__pycache__/`
- `game/dist/`
- `offline-windows/web/`
- `wuxing-yidao-offline-windows.zip`
- 根目录临时 JSON、截图、过期日志

不应自动删除：

- `未使用/` 中的原始素材、历史记录和导入来源
- `codex_crash_log.md` 中的 Codex 闪退/插件修复记录
- `game/public/assets/`
- `game/node_modules/`
- 根目录启动测试文件 `open-web-game.*`
- `offline-windows/open-game.cmd`、`offline-windows/open-game.ps1`、`offline-windows/README_OFFLINE.txt`

## 21. 最近重大变更

| 变更 | 说明 |
|------|------|
| 美术资产压缩与离线包刷新 | 敌人动画从大体积 GIF 改为 480px 宽动画 WebP；首页、主菜单、战斗和第二幕地图等大背景改用 WebP；`public/assets` 从约 202MiB 降至约 95.9MiB，`runtimeAssetManifest.ts` 已刷新。 |
| Windows 11 离线版 | 新增 `offline-windows/open-game.cmd` 与 `open-game.ps1`，用 PowerShell 内置本地 HTTP 服务启动 `offline-windows/web`，目标电脑不需要 Node.js、npm、Python 或网络；`web/` 和 zip 为本机构建产物，不进 Git。 |
| 第五轮平衡调整 | 每回合首张攻击牌费用 -1；白芍柔肝/点穴/酸枣仁/厚朴/细辛/麻黄汤补进攻收益；陈皮、葛根、赤芍、桔梗、枳实和子午流注改为更少堵手；低攻击体质开局补到至少 5 张攻击牌；奖励和药房在低进攻牌组时保底给进攻牌。 |
| 首页右侧按钮回退静态版 | 首页右侧“公告/活动/图鉴/设置”已退回旧静态 `side_menu.png`，移除动态圈、拆分图标和拆分文字层。 |
| 事件装备点亮图鉴 | `handleEventChoice` 的 `addRelic` 分支现在会把真实装备牌同步加入 `player.obtainedCardIds`，修复事件获得装备后卡牌图鉴不点亮的问题，并补充 store 回归测试。 |
| 2026-05-26 线上发布 | 本项目通过 `origin/main` 触发 GitHub Pages；线上 `https://test1.renxuanqi.top` 以后续 Actions 最新成功运行为准。 |
| 体质抽牌动画回退 | `ConstitutionIntroOverlay.tsx` 已恢复旧版真实卡面“小包洗牌”动画；接口 `ConstitutionIntroStage`、`CONSTITUTION_CINEMATIC_MS`、`onSkip/onClose/onSelect` 保持不变，选择页本身不回滚。 |
| 战斗手牌回退旧版 | 战斗中手牌使用现有 `Hand` 组件，保留长按预览和出牌逻辑；不再使用新写的占位式 `CombatHandV2`。 |
| 战斗敌人信息真实化 | 敌人 HP 血条、生命数字、格挡、意图、状态全部读取真实 `enemy` 数据；没有真实状态时不显示占位状态图。 |
| 被动/装备窗口标签页 | 左侧被动窗口改为“被动效果/装备”同窗标签页；被动页只显示状态，装备页按 `player.relics` 聚合显示真实装备卡图、数量和描述。 |
| 战斗反馈增强 | 玩家/敌人掉血、回血、格挡、真气变化有更明显浮字；敌人受攻击或获得负面效果有视觉反馈；敌方 attack/defend/buff/debuff/special 意图有不同释放动画。 |
| `黄芩清肺` 可打出 | `huangqin` 改为 0 费单体攻击牌，造成 4 点伤害并施加 1 层热邪，同时仍作为药方合成材料；已补充规则和 store 测试。 |
| 第一轮平衡调整 | 取消攻击牌强制 0 费；高收益 0 费牌、控制牌、起始牌组、普通敌双动概率和装备重复收益已削峰，详见 `BALANCE_GUIDE.md`。 |
| 战斗示例图资源清理 | “卡牌合并.png / 敌人牌.png”等示例图不应出现在 UI 资产中；当前战斗 UI 使用 `combat/v2` 真实切片和数据驱动状态。 |
| 战斗 v2 资源拼装接入 | `CombatView.tsx` 已重写为资源拼装界面，使用 `game/public/assets/combat/v2/` 资源与 `combat-v2-*` 样式；保留出牌、选敌、结束回合、返回地图、管理员跳过战斗等原有流程入口。 |
| 地图 v2 资源拼装接入 | `MapView.tsx` 已重写为资源拼装界面，使用 `game/public/assets/map/v2/` 资源与 `map-v2-*` 样式；保留地图节点点击、Boss 3 胜解锁、手牌一览等原有流程。 |
| 地图页合成台入口调整 | `MapView` 自己渲染 `<SynthesisBench />`；`App.tsx` 的地图分支不再通过 `<GameSurface synthesisBench>` 注入，后续不要重复渲染两个合成台入口。 |
| 运行时资源 manifest 更新 | `game/src/data/runtimeAssetManifest.ts` 已随当前主菜单、地图 v2、战斗 v2 资源变化更新；继续改 `game/public/assets` 后必须重新执行 `npm run assets:manifest`。 |
| 主菜单文字与 hover 图资源更新 | `game/public/assets/main_menu/v2/default/*_text.png` 与 `game/public/assets/main_menu/v2/hover/*.png` 已更新；不要为了贴旧效果图而移动按钮文字或 icon。 |
| 路径战斗轮换 v2.4 | 每层 2/3 列事件/商店 + 1/3 战斗，`lastCombatCol` 轮换确保单列不连战 |
| 事件线性队列 | 三兄弟 Act1→Act2→Act3 不可插队；`eventQueue` 预洗牌+`__mainline_act*`注入 |
| 管理员密码 | 密码 260208 保护管理员面板和体质入口，支持 localstorage 记住密码 |
| 药房合成弹窗 | ShopView combine 成功后弹出卡牌图片+名称+描述全屏动画 |
| 药房合成数量显示 | ShopView combine 页显示牌组/手牌/材料数量，每张材料与目标候选牌显示同模板拥有数量 `xN` |
| 敌人不重复 | `lastEnemyId` 过滤，同一敌人不连续出现 |
| 三兄弟数值 | Act1 二哥路线从满血开局无效回血改为生命上限 +2 + 50 金币；其他路线保留合理化后的事件奖励 |
| 主页资源加载进度 | `runtimeAssetLoading` 的总量只统计实际预加载的 critical/static 资源，不再把延后加载的敌人动画纳入加载条分母 |
| 事件系统 v2.1 | 新增 1 主线（3 幕分叉）+ 11 支线事件，含完整叙事、选项效果、后果动画；`eventLog`/`eventMarkers` 持久化 |
| 装备堆叠 | 装备不再唯一，但通过 `EQUIPMENT_EFFECT_CAPS` 限制有效层数；重复装备可持有，超过上限不再继续放大效果 |
| 事件密度调整 | 层类型概率 25%→35%，保底间隔 4→2 场战斗，三幕全通约 11-12 事件 |
| 24 张卡牌重命名 | 药材名统一改为「药名+功效」格式（如「葛根」→「葛根解肌」） |
| randomCard 效果 | 事件可按 rarity+cardType 从牌库随机抽取卡牌 |
| 商店价格倍率 | 新增 `shopPriceMultiplier` 系统，事件可调商店价格 |
| 管理员跳过战斗 | CombatView 右上角新增跳过按钮，调用 `completeCombat` 走正常奖励 |
| 路径延展断连修复 | `connectMapSegments` 连接新旧地图段，消除末端按钮不可点击 |
| EventView 交互修复 | 确认→结果→继续三步流程，效果标签显示，不再跳空占位页 |
| 手牌列表显示装备 | MapView 手牌总览新增装备牌分区，含卡图缩略 |
| 名声系统移除 | 所有名声相关逻辑替换为金币/商店价格 |
| 药方牌图片替换 | 12 张药方牌全部替换为真实 450×600 PNG（43–75 KB） |
| 新药材牌图片替换 | 24 张药材牌全部替换为真实 450×600 PNG（21–62 KB） |
| 黄芩图片替换 | `huangqin` 从 SVG 占位替换为真实 450×600 PNG（36 KB） |
| 芦根卡片删除 | `lugen` 卡牌及银翘散蓝图中对应材料已移除（当前 108 张总模板） |
| 零 SVG 占位图 | 全库 108 张卡牌均使用真实 PNG/webp 图片 |
| 九大体质全部可选 | 9 种体质均有图片、被动和 15 张起始牌组 |
| 卡牌分类扩展 | 新增药材牌、药方牌、装备牌、敌方机制牌分类 |
| 药方蓝图正式接入 | 12 种蓝图，胜利奖励真实蓝图，合成台按完整配方合成药方牌 |
| 药方牌正式可打出 | 12 张药方牌有真实战斗效果和图鉴信息 |
| 装备牌系统 | 11 张装备牌，战斗胜利概率掉落，获得后全局被动生效 |
| 同模板多实例 | 允许同名卡多张共存，按运行时实例 ID 操作，模板上限 10 张 |
| 地图无限循环 + 多幕 | `ACT_LENGTH=10`，4列布局，col 0-2主线 + col 3 Boss 独立通道 |
| Boss 独立通道 | 从 event 直连，3胜解锁；Boss 后 `currentAct++` 进入下一幕 |
| 敌人缩放 | 普通开战流程只应用 HP 缩放，尚未应用 `damageBonus` |
| 管理员章节选择 | `startGame('admin', actNum)` 可直接从 Act 1/2/3 开始管理员体质 |
| 管理员初始牌组扩充 | 管理员体质运行时含全部药材牌（75张）+ 药方牌（12张）入初始牌组，装备作为遗物持有 |
| 管理员全图鉴 | 管理员体质 `obtainedCardIds` 含所有药材+药方+装备，图鉴全部点亮 |
| 背景图全面换新 | 战斗/地图/休憩/药房/合成台使用新艺术图，每张压缩至200KB内 |
| 音频全面压缩 | 所有 BGM 重编码为 96kbps，环境音 64kbps 单声道，当前音频目录约 29MB |
| 字体修复 | `font-family` 从 KaiTi 改为 SimSun/Songti SC，修复 macOS 字体问题 |
| 战斗UI去琥珀色 | 所有战斗界面暗黄色替换为冷灰/幕次主题色 |
| 巡诊者面板分幕配色 | PlayerStats 按 Act 切换 sky(1)/rose(2)/violet(3) 主题 |
| 战斗去框 | Arena 大框、敌人框、MapView/RestView/ShopView 的 ornate-panel 全部移除 |
| 汤头歌诀动画 | 药方合成成功后全屏弹出卷轴动画，逐行展示歌诀 |
| 手牌总览按钮 | MapView 右下角新增按钮，查看当前所有手牌及数量（含卡图缩略图） |
| 药方合成无上限 | 同一药方牌可重复合成，不受 `MAX_CARD_COPIES` 限制 |
| 蓝图药材高亮 | 合成台中当前蓝图所需药材显示金色高亮边框 |
| `_templateId` 精确匹配 | 卡牌运行时实例携带模板ID，修复合成时药材匹配不准确的问题 |
| 主菜单 UI 替换为资源拼装 | StartMenu 使用 `game/public/assets/main_menu/` 资源拼装主菜单：背景 cover 填充，标题与 6 个按钮 plate 独立渲染，默认态/hover 态同尺寸同锚点原地换图；布局按统一网格对齐，不再严格追随有偏差的效果图。 |
