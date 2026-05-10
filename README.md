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
│   ├── data/cards.ts          # 109 条卡牌模板数据
│   ├── data/formulas.ts       # 12 种药方蓝图
│   └── data/enemies.ts        # 20 个敌人数据
├── game/
│   ├── src/
│   │   ├── App.tsx            # 阶段路由 + 调试 hook
│   │   ├── store/gameStore.ts # Zustand 主状态、流程、持久化
│   │   ├── components/        # MapView, CombatView, RewardView 等
│   │   ├── data/              # 图鉴元数据 + 资源 manifest
│   │   ├── hooks/             # 渐进图片加载
│   │   ├── services/          # 音频 + 资源加载服务
│   │   ├── utils/             # 资源路径、ID 生成、图片预载
│   │   └── index.css          # 主要视觉系统（很大，先搜索再改）
│   ├── public/assets/         # 运行时资源
│   └── package.json
├── .github/workflows/pages.yml # GitHub Pages 自动部署
├── AI_HANDOFF.md              # 完整交接文档
├── 卡牌清单.xlsx              # 当前卡牌数据导出
└── README.md
```

---

## 当前功能

| 功能 | 状态 |
|------|------|
| 9 种体质全部可选，每种体质 15 张起始牌组 | ✅ |
| 109 条卡牌模板：76 药材牌、12 药方牌、11 装备牌、10 敌方机制牌 | ✅ |
| 12 种药方蓝图：战斗胜利奖励真实蓝图，合成台按完整配方合成药方牌 | ✅ |
| 11 种装备牌：普通/精英/首领胜利分别 10%/20%/50% 掉落，获得后全局被动生效 | ✅ |
| 20 个敌人记录（含 4 个 Boss 和 1 个召唤单位） | ✅ |
| Act 1/2/3 全部开放：击败 Boss 后推进到下一幕，敌池随 Act 切换 | ✅ |
| 所有卡牌图片已替换为真实素材，零 SVG 占位图 | ✅ |
| 无限地图 + Boss 独立通道（需 3 场战斗解锁） | ✅ |
| 药房、休憩、奖励、图鉴、管理员调试入口（`?admin`） | ✅ |
| 事件页为占位继续流程；`ChestView` 存在但当前地图不生成宝箱节点 | ✅ |
| 本地持久化存档 | ✅ |

---

## 当前地图结构

每 10 层为一个循环。击败当前幕 Boss 后 `currentAct` 递增（上限 3），重新生成地图进入下一幕：

```text
层 0: [开始]
层 1: [事件]
层 2-5: [战斗/药房/事件] + Boss 通道小圆点
层 6: [战斗×3] + [中段休憩 🔒]
层 7-9: [战斗/药房/事件] + Boss 通道小圆点
层 10: [战斗×3] + [首领前休憩 🔒]
层 11: [战斗×3] + [首领 🔒]  ← 击败后 currentAct++，进入下一幕
层 12: 新一幕开始
```

- 地图初始实际生成 14 层，到达末端前自动追加 12 层。
- 药房/事件保底来自源码计数：连续计数达到 4 后强制出现。
- 敌人 HP 缩放为 `ceil(baseHp * (1 + floor * 0.05))`。
- Act 1 敌池（风寒初起）→ Act 2（邪热入里）→ Act 3（五行失衡），BGM 随 Act 切换。
- `getEnemyScaling()` 返回 `damageBonus`，但普通开战流程尚未把它应用到敌人伤害。

---

## 卡牌与合成

- 卡牌分类：`herb` 药材牌、`formula` 药方牌、`equipment` 装备牌、`enemy` 敌方机制牌。
- 战斗类型分布：`attack=27 / skill=47 / power=36`。
- 稀有度分布：`common=23 / uncommon=31 / rare=56`。
- 费用分布：`0费=66 / 1费=31 / 2费=10 / 3费=3`。
- 药方牌只能通过合成台消耗药材牌和已录入药方蓝图获得，不进入普通奖励、商店或宝箱池。
- 正常地图战斗胜利每次奖励 1 张真实药方蓝图；重复蓝图录入保持幂等。
- 装备牌不会进入手牌、牌组、奖励池或商店池；获得后存入当前跑图装备并立即生效。

---

## 关键代码入口

| 想做的事 | 去这里 |
|----------|--------|
| 改卡牌、装备或药方效果 | `shared/core/gameCore.ts` + `shared/data/cards.ts` |
| 改药方蓝图配方 | `shared/data/formulas.ts` |
| 改战斗规则 | `shared/core/gameCore.ts` |
| 改地图生成 | `shared/core/gameCore.ts` → `generateMap()` / `generateLayerTypes()` |
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

当前验证：`npm test -- --run` 为 6 个测试文件、69 个测试用例通过，覆盖卡牌效果、药方合成、装备被动、体质被动、Boss 行为、Store 流程和资源 manifest。

`npm run build` 当前通过；Vite 会提示主 JS chunk 约 545 kB，略高于默认 500 kB 建议线。

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
