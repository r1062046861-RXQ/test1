# 五行医道 — AI 快速上手指南

> 中医题材 Web 卡牌构筑游戏。React + TypeScript + Vite。  
> 仓库：`https://github.com/r1062046861-RXQ/test1`  
> 线上地址：`test1.renxuanqi.top`
>
> **给 AI 的说明：完整交接文档见 `AI_HANDOFF.md`。本文件只保留快速启动、当前事实和常用入口。**

---

## 快速启动

```powershell
cd game
npm install
npm run dev        # 开发服务器 → http://localhost:5173
npm test -- --run  # 运行测试
npm run build      # 构建 → game/dist/
```

---

## 项目结构

```text
wechatgame/
├── shared/                    # 纯规则 + 共享数据（未来可迁移 Unity）
│   ├── baseTypes.ts           # Card, Enemy, Player, MapNode 等类型
│   ├── core/gameCore.ts       # 战斗结算/地图生成/状态系统
│   ├── data/cards.ts          # 108+ 条卡牌模板数据
│   ├── data/formulas.ts       # 12 种药方蓝图
│   ├── data/enemies.ts        # 20 个敌人数据
│   └── data/events.ts         # 事件数据（1条主线3幕+11条支线）
├── game/
│   ├── src/
│   │   ├── App.tsx            # 阶段路由 + 调试 hook
│   │   ├── store/gameStore.ts # Zustand 主状态、流程、持久化
│   │   ├── components/        # MapView, CombatView, EventView, RewardView 等
│   │   ├── data/              # 图鉴元数据 + 资源 manifest
│   │   ├── hooks/             # 渐进图片加载
│   │   ├── services/          # 音频 + 资源加载服务
│   │   ├── utils/             # 资源路径、ID 生成、图片预载
│   │   └── index.css          # 主要视觉系统（很大，先搜索再改）
│   ├── public/assets/         # 运行时资源（254个文件，约152MB）
│   └── package.json
├── .github/workflows/pages.yml # GitHub Pages 自动部署
├── AI_HANDOFF.md              # 完整交接文档
└── README.md
```

---

## 当前功能

| 功能 | 状态 |
|------|------|
| 9 种体质 + 管理员体质全部可选 | ✅ |
| 108+ 条卡牌模板：76 药材牌、12 药方牌、11 装备牌、10 敌方机制牌 | ✅ |
| 12 种药方蓝图：合成台合成，可重复合成无上限 | ✅ |
| 11 种装备牌：可重复获取，支持堆叠效果 | ✅ |
| 12 条事件（1主线分叉3幕 + 11支线）：叙事选择+效果+后果动画 | ✅ |
| 20 个敌人（含 4 个 Boss），支持管理员自选敌人挑战 | ✅ |
| Act 1/2/3 管理员可选章节进入 | ✅ |
| 全部卡牌图片已替换为真实素材 | ✅ |
| 24 张卡牌名称已完成全局统一重命名（药材名+功效） | ✅ |
| 背景图全部换新（战斗/地图/休憩/药房/合成台），压缩至200KB内 | ✅ |
| 音频全部压缩（59MB→29MB），总资源152MB | ✅ |
| 字体优化（宋体/Songti SC，macOS兼容） | ✅ |
| 战斗UI去琥珀色，按幕次主题配色（天蓝/玫红/紫清） | ✅ |
| 药方合成后汤头歌诀全屏动画展示 | ✅ |
| 合成台 + 药房合成均有合成成功弹窗 | ✅ |
| 手牌总览按钮（MapView右下）含装备牌显示 | ✅ |
| 管理员密码 260208，支持记住密码自动填充 | ✅ |
| 管理员体质跳过战斗按钮（正常领取奖励） | ✅ |
| 事件严格线性队列：主线3幕顺序→50%子午流注→随机支线 | ✅ |
| 地图每层 2/3 列事件/商店，战斗列轮换，路径无法连战 | ✅ |
| 敌人轮替不重复出现 | ✅ |
| 三兄弟择师事件数值合理化 | ✅ |
| 无限地图 + Boss 独立通道（需3场战斗解锁） | ✅ |
| 商店价格倍率系统 | ✅ |
| 本地持久化存档 | ✅ |

---

## 当前地图结构

每 10 层为一个循环。击败当前幕 Boss 后 `currentAct` 递增（上限 3），重新生成地图进入下一幕：

```text
层 0: [开始]
层 1: [事件]  (三兄弟择师 → Act2 → Act3 → 子午流注 → 随机支线)
层 2-5: [2×事件/商店 + 1×战斗(轮换)] + Boss 通道小圆点
层 6: [战斗×3] + [中段休憩 🔒]
层 7-9: [2×事件/商店 + 1×战斗(轮换)] + Boss 通道小圆点
层 10: [战斗×3] + [首领前休憩 🔒]
层 11: [战斗×3] + [首领 🔒]  ← 击败后 currentAct++，进入下一幕
层 12: 新一幕开始
```
- 网格与路径 → 每层 4 列；col 0–2 主线 (2列事件/商店、1列战斗轮换)，col 3 Boss 通道。
- 事件严格线性，无跳序，续集触发后自动注入队列最前。
- 事件保底：combatSinceEvent≥2 时 3 列全事件/商店，路径上不可能出现连续战斗。
- 药房/事件保底：连续 2 场战斗无特殊节点则强制事件。

---

## 战斗

- 卡牌分类：`herb` 药材牌、`formula` 药方牌、`equipment` 装备牌、`enemy` 敌方机制牌。
- 战斗类型分布：`attack=27 / skill=45 / power=36`。
- 稀有度分布：`common=22 / uncommon=30 / rare=56`。
- 费用分布：`0费=65 / 1费=31 / 2费=9 / 3费=3`。
- 药方牌只能通过合成台消耗药材牌和已录入药方蓝图获得，不进入普通奖励、商店或宝箱池。
- 正常地图战斗胜利每次奖励 1 张真实药方蓝图；重复蓝图录入保持幂等。
- 装备牌不会进入手牌、牌组、奖励池或商店池；获得后存入当前跑图装备，可重复获得堆叠效果。
- 管理员密码 260208，勾选「记住密码」后下次自动填充。
- 地图事件按严格线性队列触发：三兄弟 Act1→Act2→Act3，之后 50% 子午流注，其余随机。续集触发后注入队首。
- 战斗敌人轮替不重复（`lastEnemyId` 过滤），池中仅 1 种敌人时不过滤。

---

## 关键代码入口

| 想做的事 | 去这里 |
|----------|--------|
| 改卡牌、装备或药方效果 | `shared/core/gameCore.ts` + `shared/data/cards.ts` |
| 改药方蓝图配方 | `shared/data/formulas.ts` |
| 改战斗规则 | `shared/core/gameCore.ts` |
| 改地图生成 | `shared/core/gameCore.ts` → `generateMap()` / `generateLayerTypes()` |
| 改事件数据/效果 | `shared/data/events.ts` → `SIDE_EVENTS[]` / `getMainlineActData()` |
| 改游戏流程、掉落、合成台状态 | `game/src/store/gameStore.ts` |
| 改 UI / 页面 | `game/src/components/` + `game/src/index.css` |
| 改运行时资源 | `game/public/assets/`，改后执行 `npm run assets:manifest` |
| 加测试 | `game/src/store/gameCore.test.ts`（规则），`game/src/store/gameStore.test.ts`（流程） |

---

## 测试

```powershell
cd game
npm test -- --run
npm run build
```

当前验证：`npm test -- --run` 为 6 个测试文件、69 个测试用例通过。

`npm run build` 当前通过。主 JS chunk 约 575 kB，构建产物发布于 `game/dist/`。

---

## 部署

**GitHub Pages**（自动）：
- push 到 `main` 分支 → `.github/workflows/pages.yml` 自动构建部署。
- 代码必须通过 `npm run build` 才能部署。

**EdgeOne**（可选）：

```powershell
cd game
npm run edgeone:deploy
```

---

## Git 网络问题

中国大陆网络对 GitHub HTTPS 可能 SNI 干扰。已配置 SSH：
- 远程：`git@github.com:r1062046861-RXQ/test1.git`
- SSH 密钥在 `~/.ssh/id_ed25519`
- 验证：`ssh -T git@github.com`

---

## 技术栈

React 18 · TypeScript 5 · Vite 5 · Zustand 4 · Framer Motion 11 · Tailwind CSS · Vitest 4 · lucide-react

---

## 后续 AI 工作建议

1. 先读 `AI_HANDOFF.md`，再读相关源码。
2. 修改规则先改 `shared/core/gameCore.ts`，再改数据文案和测试。
3. 修改 UI 先搜索 `game/src/index.css` 中的已有 class。
4. 修改资源后执行 `npm run assets:manifest`。
5. 不要把规则逻辑写进 React 组件；规则放在 `shared/` 下。
6. 文本显示乱码不要复制终端输出，用能识别 UTF-8 的编辑器看源码。

---

## 更多文档

- `AI_HANDOFF.md` — 完整 AI 交接文档
- `卡牌清单.xlsx` — 当前卡牌、起始牌组标记、药方素材标记
