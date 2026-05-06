# Web 卡牌游戏 AI 交接文档

更新日期：2026-05-06  
项目根目录：`C:\Users\C2H6O\Desktop\wechatgame`

本文档用于让后续 AI 或工程师快速理解当前 Web 端卡牌游戏的结构、内容、资源、测试方式和未来 Unity 迁移方向。本文只整理当前项目事实，不代表新的产品设计方案。

## 1. 项目定位

这是一个中医题材 Web 端卡牌构筑游戏，玩法结构接近 roguelike deckbuilder：

- 玩家选择体质后开始一局游戏。
- 地图节点驱动流程：普通战斗、Boss、事件、药房、休息、奖励；精英和宝箱类型仍保留，但当前常规地图生成不产出精英或宝箱节点。
- 战斗核心是手牌、真气、格挡、生命、状态、敌人意图和回合推进。
- 地图为无限循环结构，每幕10层，没有正常胜利终点；`GamePhase` 仍保留 `victory` 类型。
- Boss 和 Boss 前休憩在独立通道上，需在当前循环累计 3 场战斗胜利后解锁。
- 敌人随层数增强的当前实装只应用了 HP：`ceil(baseHp * (1 + floor * 0.05))`。`getEnemyScaling()` 也返回 `damageBonus`，但普通开战流程尚未把它应用到敌人伤害。
- 当前运行端是 React + Vite Web 项目；规则和数据尽量集中在 `shared/`，这部分是未来迁移到 Unity 时最重要的源数据。

当前项目不是纯 UI Demo，已经包含可运行战斗规则、敌人行为、图鉴、资源预加载、GitHub Pages/EdgeOne 部署脚本和浏览器自动化辅助 hook。

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
    scripts/                  # 资源 manifest 生成脚本
```

## 4. 当前内容总览

截至本次扫描：

| 项目 | 当前数量 / 说明 |
| --- | --- |
| 卡牌总数 | 85 条记录：75 张玩家可获得牌 + 10 张敌方机制牌 |
| 起始牌组 | 每个体质 15 张 |
| 敌人总数 | 20 条记录：普通敌、精英、4 个 Boss 与 1 个召唤单位 |
| 体质 | 类型层 9 种；当前 UI 开放 3 种：平衡、阴虚、气虚，其余 6 种锁定/预留 |
| 游戏阶段 | 12 个 `GamePhase`，含当前常规流程不会到达的 `victory` 保留类型 |
| 运行时图片 | 165 个 |
| 运行时图片总体积 | 156,756,730 bytes，约 149.49 MiB |
| GIF | 20 个，143,921,159 bytes，约 137.25 MiB |
| PNG | 141 个，12,547,329 bytes，约 11.97 MiB |
| JPG | 2 个，282,515 bytes，约 0.27 MiB |
| SVG | 2 个图片 SVG，5,727 bytes，约 0.01 MiB |
| 音频 | 27 个 MP3，60,708,003 bytes，约 57.90 MiB；不纳入图片 manifest |
| `public/assets` 总体积 | 198 个文件，217,472,167 bytes，约 207.40 MiB |

图片资源按目录统计：

| 目录 | 文件数 | 体积 |
| --- | ---: | ---: |
| `cards_enemy` | 65 | 148,649,005 bytes，约 141.76 MiB |
| `cards_player` | 85 | 5,334,184 bytes，约 5.09 MiB |
| `constitutions` | 9 | 932,678 bytes，约 0.89 MiB |
| `author_qr` | 4 | 288,242 bytes，约 0.27 MiB |
| assets 根目录背景/其他图 | 5 | 1,115,329 bytes，约 1.06 MiB |
| `cards_special` | 3 | 444,726 bytes，约 0.42 MiB |
| `audio` | 27 | 60,708,003 bytes，约 57.90 MiB |

性能重点：加载慢主要来自敌方 GIF，20 个 GIF 占运行时图片体积约 91.8%。

## 5. 核心类型

源文件：`shared/baseTypes.ts`

关键类型：

- `Constitution = 'balanced' | 'yin_deficiency' | 'qi_deficiency' | 'blood_stasis' | 'phlegm_dampness' | 'fire_heat' | 'qi_stagnation' | 'jing_deficiency' | 'yang_deficiency'`
- `CardType = 'attack' | 'skill' | 'power'`
- `CardRarity = 'common' | 'uncommon' | 'rare'`
- `CardTarget = 'single_enemy' | 'all_enemies' | 'self' | 'random'`
- `EnemyIntent.type = 'attack' | 'defend' | 'buff' | 'debuff' | 'special'`
- `NodeType = 'combat' | 'elite' | 'boss' | 'event' | 'shop' | 'rest' | 'chest' | 'start'`
- `GamePhase = 'intro' | 'start_menu' | 'card_codex' | 'map' | 'combat' | 'event' | 'shop' | 'rest' | 'chest' | 'reward' | 'game_over' | 'victory'`

核心实体：

- `Card`：卡牌 ID、名称、类型、稀有度、费用、描述、效果 ID、数值、目标、升级状态、图片等。
- `StatusEffect`：状态 ID、名称、buff/debuff、层数、描述、是否可叠加、持续时间。
- `Enemy`：敌人 ID、名称、生命、格挡、状态、意图、图片、poster、行为 ID、meta。
- `Player`：生命、真气、格挡、牌堆、手牌、弃牌堆、消耗堆、体质、遗物、药水、金币。
- `MapNode` / `MapLayer`：地图节点和层级连接。

## 6. 游戏流程与页面

阶段路由在 `game/src/App.tsx`。

页面组件：

| 阶段 | 组件 | 作用 |
| --- | --- | --- |
| `intro` | `IntroView` | 开场页 |
| `start_menu` | `StartMenu` | 主菜单、资源加载进度、开始入口 |
| `card_codex` | `CardCodexView` | 图鉴，包括卡牌/敌人/术语 |
| `map` | `MapView` | 地图节点选择 |
| `combat` | `CombatView` | 战斗主界面 |
| `reward` | `RewardView` | 战斗奖励（3张卡牌每张可选✓/✗，+ 药方蓝图占位） |
| `chest` | `ChestView` | 宝箱页存在；当前地图生成不产出宝箱节点 |
| `rest` | `RestView` | 休息 |
| `shop` | `ShopView` | 药房（购买/出售/合成·两步流程/分解占位） |
| `event` | `EventView` | 事件占位页（当前只展示占位文案并继续前进） |
| `game_over` | `App.tsx` 内联界面 | 失败结算 |
| `victory` | 类型保留 | 当前无限地图没有正常胜利终点 |

战斗相关组件：

- `Card.tsx`：单张卡牌。
- `Hand.tsx`：手牌区。
- `Enemy.tsx`：敌人牌面、意图、血条、poster/GIF。
- `PlayerStats.tsx`：玩家生命、格挡、真气等。
- `PassiveEffects.tsx`：体质/被动展示。
- `CombatLog.tsx`：战斗日志。
- `CombatView.tsx`：战斗界面编排。

全局壳：

- `PageShell.tsx`：页面背景与基础布局。
- `motionPresets.ts`：动效预设。
- `game/src/index.css`：主要视觉、布局、响应式样式集中地。

## 7. 体质系统

体质由 `shared/baseTypes.ts` 的 `Constitution` 限定，局内初始化主要在 `game/src/store/gameStore.ts`。类型层已有 9 种体质；当前开始菜单只开放平衡/阴虚/气虚，其余 6 种在 UI 中标记为锁定/预留。

当前语义：

| ID | 中文语义 | 当前规则 |
| --- | --- | --- |
| `balanced` | 平衡 / 平和 | 无额外被动，作为标准模式 |
| `yin_deficiency` | 阴虚 | 回合开始额外获得真气；受伤额外 +1 |
| `qi_deficiency` | 气虚 | 使用攻击牌时恢复 1 点生命 |
| `blood_stasis` | 血瘀 | 类型和起始牌组已存在，当前 UI 锁定 |
| `phlegm_dampness` | 痰湿 | 类型和起始牌组已存在，当前 UI 锁定 |
| `fire_heat` | 火热 | 类型和起始牌组已存在，当前 UI 锁定 |
| `qi_stagnation` | 气滞 | 类型和起始牌组已存在，当前 UI 锁定 |
| `jing_deficiency` | 精虚 | 类型和起始牌组已存在，当前 UI 锁定 |
| `yang_deficiency` | 阳虚 | 类型和起始牌组已存在，当前 UI 锁定 |

注意：阴虚“受伤 +1”曾经出现过文案和规则漂移，后续修改时必须同时检查规则核心、体质选择界面和说明文案。

## 8. 卡牌系统

源文件：`shared/data/cards.ts`

当前统计：

| 维度 | 分布 |
| --- | --- |
| 类型 | attack 22，skill 39，power 24 |
| 稀有度 | common 18，uncommon 27，rare 40 |
| 费用 | 0 费 37，1 费 33，2 费 12，3 费 3 |
| 目标 | self 55，single_enemy 20，all_enemies 10 |
| 幕数标记 | act 1 有 4，act 2 有 43，act 3 有 14，未显式 act 有 24 |

当前每种体质的起始牌组均为 15 张。当前 UI 开放体质的起始牌组 ID（以 `STARTING_DECKS` 为准）：

- `balanced`：`shanzha, chuanxiong, mahuang, huanglian, baishao, chenpi, guizhi, yiyi, gancao, zusanli, xiaochaihu, danggui, dazao, sanqi, shengma`
- `yin_deficiency`：`danshen, jinyinhua, qinggusan, lianqiao, longdan, maidong, shengdi, zhimu, shihu, yuzhu, xuanshen, baihe, biejia, shanyurou, liuwei`
- `qi_deficiency`：`shanzha, chuanxiong, mahuang, huanglian, sanqi, xiaochaihu, huangqi, gancao, dangshen, shanyao, baizhu, dazao, fuzi, buzhongyiqi, fangfeng`

卡牌通过 `effectId` 连接规则核心。常见效果方向：

- 直接伤害、AOE 伤害、真实伤害、百分比伤害。
- 获得格挡、按状态/手牌/阴液缩放格挡。
- 抽牌、弃牌、费用变化、真气上限变化。
- 治疗、复活、回合结束治疗。
- 给敌人施加血瘀、寒邪、热邪、湿邪、虚弱、易伤、眩晕等。
- 清除自身 debuff、清除敌方 buff、偷取 buff。
- 阴液体系：获得阴液、消耗阴液、提高阴液上限、阴液转伤害/格挡/治疗。
- 足三里体系：`zusanli` 可以叠加，每层让攻击牌回血 +1。

不要只改卡牌文案。凡是修改卡牌能力，必须同时检查：

- `shared/data/cards.ts` 的文案、数值、`effectId`。
- `shared/core/gameCore.ts` 的 `resolveCardPlay` 分支。
- `game/src/store/gameCore.test.ts` 的规则测试。
- 图鉴展示是否读取同一份数据。

## 9. 敌人系统

源文件：`shared/data/enemies.ts`

当前有 20 个敌人，全部有 GIF 与 poster。`damp_minion` 是正式敌人数据，但只作为召唤单位，不进入普通敌池和管理员单挑列表。

敌人列表：

| ID | 中文语义 | 幕 / 类型 | HP | 图片 |
| --- | --- | --- | ---: | --- |
| `wind_cold_guest` | 风寒客 | Act 1 普通 | 30 | `89.gif` |
| `wind_heat_attack` | 风热袭 | Act 1 普通 | 28 | `90.gif` |
| `damp_turbidity` | 湿浊缠 | Act 1 普通 | 35 | `91.gif` |
| `external_combination` | 外感合病 | Act 1 精英 | 80 | `92.gif` |
| `boss_wind_cold` | 风寒束表 | Act 1 Boss | 150 | `93.gif` |
| `boss_liver_fire` | 肝火炽盛 | Act 1 Boss | 140 | `94.gif` |
| `qi_blood_stasis` | 气滞血瘀者 | Act 2 普通 | 50 | `95.gif` |
| `spleen_dampness` | 脾虚湿盛者 | Act 2 普通 | 55 | `96.gif` |
| `heart_kidney_gap` | 心神不交者 | Act 2 普通 | 45 | `97.gif` |
| `tanmengxinqiao` | 痰蒙心窍者 | Act 2 普通 | 52 | `83.gif` |
| `phlegm_stasis` | 痰瘀互结 | Act 2 精英 | 120 | `98.gif` |
| `boss_spleen_damp` | 脾虚湿困 | Act 2 Boss | 250 | `99.gif` |
| `damp_minion` | 水湿小怪 | Act 2 召唤单位 | 20 | `104.gif` |
| `yin_yang_split` | 阴阳离决者 | Act 3 普通 | 70 | `100.gif` |
| `chong_ren_instability` | 冲任不固者 | Act 3 普通 | 65 | `101.gif` |
| `reruyingxue` | 热入营血者 | Act 3 普通 | 72 | `79.gif` |
| `shenbunaqi` | 肾不纳气者 | Act 3 普通 | 68 | `80.gif` |
| `yangmingfushi` | 阳明腑实者 | Act 3 普通 | 78 | `84.gif` |
| `jueyin_complex` | 厥阴复杂症 | Act 3 精英 | 180 | `102.gif` |
| `boss_five_elements` | 五行失调 | Act 3 Boss | 500 | `103.gif` |

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

核心状态 ID 来自 `shared/core/gameCore.ts`，当前扫描到 42 个状态/标记 ID：

```text
attack_buff, attack_stun_chance, attack_virtual_heat,
block_echo, block_per_card, block_to_strength,
blood_stasis, cold_evil, cost_reduction, cost_up, cost_up_next,
dampness_evil, dexterity, diarrhea, double_block, draw_down,
end_turn_heal, energy_drain, fire_growth, heat_evil,
lung_dryness, max_energy_down, next_skill_bonus, no_block,
no_yin_gain, pierce_all, pierce_block, reduce_next_damage,
remove_block_end, retain_block, revive, strength, strength_decay,
stun, temp_strength, virtual_heat, vulnerable, weak,
yin, yin_cap, yin_energy, zusanli
```

重要资源概念：

- 生命：玩家和敌人都有，敌人 HP 降到 0 视为死亡。
- 格挡：抵消伤害，多个规则会清空、转化或放大格挡。
- 真气：玩家出牌费用资源，基础上限为 3。
- 阴液：特殊资源，基础上限 `BASE_YIN_CAP = 5`。
- 金币：`INITIAL_PLAYER.gold = 99`，商店和事件使用。

## 11a. 地图结构与 Boss 通道（最近重构）

**`ACT_LENGTH = 10` 的无限循环**。`generateMap(12)` 初始实际生成14层；地图到达末端前通过 `generateMap(12, map.length)` 追加12层。

```
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
| **Boss后进入下一循环** | Boss 节点自身无子节点，完成后由 store 推进到下一轮循环 |
| **主线3分支** | col 0-2 为主线，非保底时随机一个主线位置可能替换为 shop/event |
| **药房/事件保底** | 连续4场战斗无药房/事件则强制出现 |
| **主线特殊节点概率** | 非保底时为 25% 事件 / 30% 药房 / 45% 战斗 |
| **本地图无宝箱** | `chest` 类型保留在类型系统但地图生成不产出宝箱节点 |

**MapView 节点渲染**：
- col 3 combat：灰色1.5px小圆点（不可点击）
- rest/boss@col 3：正常图标 + 锁定状态（未达3胜时显示 🔒）
- Boss 节点：`map-page__node-shell--boss` —— 4.2rem 大图标 + 橙色光晕
- 其他节点：2.8rem 图标
- 节点间距 `LAYER_SPACING = 110px`

**敌池变化**：普通跑图当前在 `gameStore.ts` 中固定使用 `ENEMY_POOLS.act1`；Act 2/3 敌人主要存在于数据、图鉴和管理员挑战中。开战时只应用 HP 缩放：`ceil(baseHp * (1 + floor * 0.05))`；`damageBonus` 虽由 `getEnemyScaling()` 返回，但当前普通开战流程未把它应用到敌人伤害。

## 11b. 战斗规则核心

源文件：`shared/core/gameCore.ts`

核心导出：

- `INITIAL_PLAYER`：初始玩家模板，HP 80/80，真气 3/3，金币 99。
- `INITIAL_TURN_FLAGS`：回合标记。
- `BASE_YIN_CAP = 5`。
- `applyCardUpgrade(card)`：卡牌升级。
- `generateMap(layers, startOffset)`：生成地图层（初始14层，传0偏移；扩展段传 `map.length` 偏移以保证循环连续性）。
- `generateMapSegment(totalLayers, startLayerIndex)`：内部实际生成函数。
- `generateLayerTypes(absoluteLayer, nodeCount, combatSinceShop, combatSinceEvent)`：按10层循环生成每层节点类型，col 3 为Boss独立通道。
- `getBossUnlockWinsRequired()`：返回3——需3场战斗胜利解锁Boss通道。
- `getEnemyScaling(floor)`：返回 `hpMultiplier: 1 + floor * 0.05` 和 `damageBonus: Math.floor(floor * 0.03)`；当前 `gameStore.ts` 只用 `hpMultiplier` 计算敌人 HP。
- `resolveCardPlay(state, cardId, targetId, log)`：结算玩家出牌。
- `resolvePlayerEndTurn(state, log)`：玩家结束回合处理。
- `resolveEnemyTurn(state, log)`：敌方回合处理。

规则核心承担：

- 伤害、格挡、治疗、抽牌、弃牌、消耗牌。
- 卡牌效果 `effectId` 到实际规则的分发。
- 状态添加、叠加、持续时间、衰减、清除。
- 敌人特殊行为和意图推进。
- Boss 阶段逻辑。
- 召唤单位逻辑。

迁移或重构时，优先保证 `shared/core/gameCore.ts` 保持纯规则层，不直接依赖 DOM、React 或浏览器 API。

## 12. Store 与持久化

源文件：`game/src/store/gameStore.ts`

职责：

- Zustand 全局状态。
- `persist` 本地持久化。
- 存储 key：`wuxing-yidao-storage`。
- 当前持久化 version：9。
- 创建新局、选择体质、进入地图节点、启动战斗。
- 连接 UI 操作和 `shared/core/gameCore.ts` 规则函数。
- 管理奖励、商店、休息、事件等非战斗流程。
- 管理敌方行动动画调度和测试用时间推进。
- `combatWinsThisCycle`：当前循环内战斗胜利次数（达3解锁Boss通道）。
- 地图到达末端前自动扩展12层（`generateMap(12, map.length)`）。
- `EventView` 当前是占位继续前进；`ChestView` 存在，但当前地图生成不产出 `chest` 节点。

重要动作：

- `startGame`
- `startCombat`
- `startAdminEnemyChallenge`
- `playCard`
- `endTurn`
- `completeCombat` / `completeNonCombat`
- `addCardToDeck` / `removeCardFromDeck` / `sellCardFromDeck`
- `combineCards(cardIds, targetCardId)`
- `advanceTime`

注意：`startCombat(nodeId)` 在 store 中实际承担"进入地图节点"的分发职责，节点可能不是战斗，也可能进入商店、休息、事件或宝箱；但当前地图生成不会产出宝箱节点。Boss 节点在 `combatWinsThisCycle < 3` 时被拒绝进入。

## 13. 图鉴与管理员入口

图鉴数据主要在 `game/src/data/codex.ts`。

功能：

- 卡牌图鉴。
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

关键工具：

- `game/scripts/generateAssetManifest.mjs`
- `game/src/data/runtimeAssetManifest.ts`
- `game/src/services/runtimeAssetLoading.ts`
- `game/src/hooks/useRuntimeAssetLoadingProgress.ts`
- `game/src/utils/progressiveAssets.ts`
- `game/src/hooks/useProgressiveAssetSource.ts`

当前资源 manifest 只覆盖运行时图片预加载资源，分三阶段：

| 阶段 | 文件数 | 体积 | 说明 |
| --- | ---: | ---: | --- |
| `critical` | 4 | 1,007,090 bytes，约 0.96 MiB | 主菜单首屏和体质图 |
| `static` | 141 | 11,828,481 bytes，约 11.28 MiB | 非 GIF 静态图 |
| `gif` | 20 | 143,921,159 bytes，约 137.25 MiB | 敌人动图 |

图片 manifest 合计 165 个图片，156,756,730 bytes，约 149.49 MiB。`game/public/assets` 目录还包含 27 个 MP3，60,708,003 bytes，约 57.90 MiB；完整 `public/assets` 总量约 207.40 MiB，音频不纳入图片 manifest。

加载行为：

- App 启动后调用 `ensureRuntimeAssetLoadingStarted()`。
- 阶段顺序固定为 `critical -> static -> gif`。
- 并发配置：critical 4，static 4，gif 2。
- 主菜单显示加载进度、当前速度和“无需等待全部资源加载完成”的提示。
- 战斗/图鉴中的图片走 poster/fallback，再渐进切换到 GIF。
- `preloadImageAsset` 和全局加载队列共享缓存，避免同 URL 重复下载。

资源变更注意：

- 改动运行时图片后执行 `cd game && npm run assets:manifest`。
- 敌方 GIF 目标：600x800，单个运行时 GIF 小于等于 8,000,000 bytes。
- GIF 原始素材目录 `gif/` 不是运行时目录，不应自动删除。

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

当前验证（2026-05-06）：`npm test -- --run` 为 6 个测试文件、32 个测试用例通过；`npm run build` 通过。构建时 Vite 会提示主 JS chunk 约 502.69 kB，略高于默认 500 kB 建议线。

测试重点：

- 卡牌规则：伤害、格挡、治疗、抽牌、状态、特殊卡。
- 体质规则：阴虚受伤 +1、气虚攻击回血等。
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
- 敌方 GIF 是最大性能风险。新增动图前必须压缩并更新 manifest。
- `npm run build` 当前通过，但主 JS chunk 约 502.69 kB，后续做功能增长时需要留意拆包或按需加载。
- `game/public/assets/cards_enemy/<slot>.png` 多数是 fallback；GIF 与 poster 当前是主链路，不要误删 fallback。
- `progress.md` 是历史工作记录，当前已有本地修改，不应回滚或删除。
- 根目录素材文件夹大多是原始素材或导入来源，不应删除。
- **Git 网络**：中国大陆可能对 GitHub HTTPS 做 SNI 干扰（TLS 通过但 HTTP 被 RST）。当前已配置 SSH：`git@github.com:r1062046861-RXQ/test1.git`，密钥 `~/.ssh/id_ed25519`。
- `shopRemovalCost` 和 `combatWinsThisCycle` 均已加入 persist partialize，勿遗漏。
- `combineCards(cardIds, targetCardId)` 签名已改为两参数，需传目标卡牌 ID。

## 18. 后续 AI 修改流程建议

修改规则时：

1. 先读 `shared/baseTypes.ts`、`shared/data/cards.ts`、`shared/data/enemies.ts`、`shared/core/gameCore.ts`。
2. 找到对应 `effectId`、`behavior` 或状态 ID。
3. 改核心规则。
4. 改数据文案。
5. 增加或更新 `game/src/store/gameCore.test.ts`。
6. 如涉及 Zustand 状态同步，再改 `game/src/store/gameStore.test.ts`。

修改 UI 时：

1. 先读目标页面组件和 `game/src/index.css`。
2. 保持现有阶段路由和 store 接口不变。
3. 图片使用 `resolveAssetUrl` 或现有渐进图片 hook。
4. 浏览器验收时检查控制台 404 和资源加载。

修改资源时：

1. 原始素材放在根目录素材文件夹或指定来源。
2. 运行时资源放入 `game/public/assets`。
3. 需要压缩 GIF 时使用现有导入脚本。
4. 执行 `cd game && npm run assets:manifest`。
5. 检查 `runtimeAssetManifest.test.ts`。

## 19. Unity 迁移准备

未来迁移到 Unity 时，建议把当前项目拆成三层理解：

| Web 当前层 | Unity 对应方向 |
| --- | --- |
| `shared/baseTypes.ts` | C# 数据结构、ScriptableObject schema 或纯 C# model |
| `shared/data/cards.ts`、`shared/data/enemies.ts` | ScriptableObject、JSON、CSV 或 Addressables 数据表 |
| `shared/core/gameCore.ts` | 纯 C# 战斗规则服务 / BattleResolver |
| `game/src/store/gameStore.ts` | Unity GameManager、RunState、BattleState、SaveService |
| React components | Unity UI Toolkit / uGUI 页面、Prefab |
| `game/public/assets` | Unity Texture/Sprite/Animator/Addressables |
| GIF + poster | 建议转 sprite sheet、Animator、VideoClip 或 Spine/序列帧 |

迁移前建议先做的工程准备：

- 把 `gameCore.ts` 进一步纯函数化，减少随机和日志副作用。
- 为战斗结算建立明确事件流：输入动作 -> 规则结果 -> UI 表现事件。
- 为所有卡牌和敌人建立稳定 schema，避免 UI 文案和数值混在一处。
- 给卡牌、敌人、状态、意图、地图节点建立可导出的 JSON。
- 明确随机数来源，迁移时使用可注入 seed。
- 把 GIF 转为 Unity 友好的动画格式，并建立资源 ID 到 Addressables key 的映射。
- 将当前 Vitest 规则测试迁移为 Unity EditMode 测试，先保证战斗数值一致，再重做表现层。

Unity 迁移时不要直接照搬 React/Zustand 架构。应保留“数据 + 规则 + 表现”的边界：

- 数据层：卡牌、敌人、状态、事件、地图。
- 规则层：出牌、伤害、状态、敌方行为、奖励、地图推进。
- 表现层：动画、UI、音效、输入、资源加载。

## 20. 当前安全清理原则

可删除：

- `.playwright-cli/`
- `tmp/`
- `__pycache__/`
- `game/dist/`
- 根目录 `tmp_actions*.json`
- 根目录 `tmp_gif_actions.json`
- 根目录 `tmp_github_pages_docs.*`
- `output/` 中旧浏览器截图、临时验收目录、过期日志

不应自动删除：

- `gif/`
- `动图zip/`
- `图片2/`
- `图片3/`
- `boss/`
- `ai卡牌/`
- `体质选择/`
- `替换素材/`
- 二维码图片
- 导入脚本
- `progress.md`
- `game/node_modules/`

原因：这些文件虽然很多是未跟踪文件，但大多是素材源、导入来源、历史记录或本地开发依赖。误删会增加后续返工成本。

## 21. 最近重大变更（2026-04-30 ~ 2026-05-06）

| 变更 | 文件 | 说明 |
|------|------|------|
| 地图无限循环 | `gameCore.ts` | `ACT_LENGTH=10`，4列布局，col 0-2主线+col 3 Boss独立通道 |
| Boss 独立通道 | `gameCore.ts` `MapView.tsx` | 从 event 直连，3胜解锁；本轮 Boss 节点自身无子节点，完成后进入下一轮循环 |
| 3 胜解锁 Boss | `gameStore.ts` | `combatWinsThisCycle` 状态，`getBossUnlockWinsRequired()=3` |
| 敌人缩放 | `gameCore.ts` `gameStore.ts` | `getEnemyScaling(floor)` 返回线性 HP 倍率和 `damageBonus`；当前普通开战流程只应用 HP 缩放 |
| 敌池统一 | `gameStore.ts` | 普通跑图固定使用 `ENEMY_POOLS.act1`；Act 2/3 敌人主要用于数据、图鉴和管理员挑战 |
| 药房合成两步 | `ShopView.tsx` `gameStore.ts` | 先选3张材料，再选1张目标（从 `obtainedCardIds` 中选） |
| 奖励每张可选 | `RewardView.tsx` | 3 张卡牌每张 ✓/✗ + 蓝图占位 |
| 地图扩展 | `gameStore.ts` | `generateMap(12, map.length)` 到达末端前追加12层 |
| 节点图标缩小 | `index.css` `MapView.tsx` | 普通 2.8rem，Boss 4.2rem，间距 110px |
| 图例删除 | `MapView.tsx` | 右侧图例面板已移除 |
| SSH Git | `~/.ssh` | 因 HTTPS 被干扰，改用 `git@github.com:r1062046861-RXQ/test1.git` |
| persist v9 | `gameStore.ts` | 新增 `combatWinsThisCycle` 持久化字段 |
