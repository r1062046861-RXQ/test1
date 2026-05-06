# 五行医道 — AI 快速上手指南

> 中医题材 Web 卡牌构筑游戏。React + TypeScript + Vite。  
> 仓库：`https://github.com/r1062046861-RXQ/test1`  
> 线上地址：`test1.renxuanqi.top`
> 
> **给 AI 的说明：本项目有完整交接文档 `AI_HANDOFF.md`，包含详细的类型、数据、规则、资源、测试说明。本文件是快速启动入口。**

---

## 快速启动

```powershell
cd game
npm install
npm run dev        # 开发服务器 → http://localhost:5173
npm test -- --run  # 运行测试
npm run build       # 构建 → game/dist/
```

---

## 项目结构

```
wechatgame/
├── shared/                    # 纯规则 + 共享数据（未来可迁移 Unity）
│   ├── baseTypes.ts           # Card, Enemy, Player, MapNode 等类型
│   ├── core/gameCore.ts       # 战斗结算/地图生成/状态系统（核心！）
│   ├── data/cards.ts          # 85 条卡牌数据（75 张玩家牌 + 10 张敌方机制牌）
│   └── data/enemies.ts        # 20 个敌人数据
├── game/
│   ├── src/
│   │   ├── App.tsx            # 阶段路由 + 调试 hook
│   │   ├── store/gameStore.ts # Zustand 主状态、流程、持久化（核心！）
│   │   ├── components/        # MapView, CombatView, ShopView, RewardView 等
│   │   ├── data/              # 图鉴元数据 codex.ts + 资源 manifest
│   │   ├── hooks/             # 渐进图片加载
│   │   ├── services/          # 音频 + 资源加载服务
│   │   ├── utils/             # 资源路径、ID 生成、图片预载
│   │   └── index.css          # 主要视觉系统（很大！先搜索再改）
│   ├── public/assets/         # 运行时资源（图片约 149.5 MiB，另含音频）
│   └── package.json
├── .github/workflows/pages.yml # GitHub Pages 自动部署
├── AI_HANDOFF.md              # 完整交接文档（建议先读）
└── README.md                  # 你正在看的文件
```

---

## 当前功能

| 功能 | 状态 |
|------|------|
| 9 种体质类型，当前开放 3 种（平和/阴虚/气虚） | ✅ |
| 85 条卡牌数据（75 张玩家可获得牌 + 10 张敌方机制牌） | ✅ |
| 20 个敌人记录（含 4 个 Boss 和 1 个召唤单位） | ✅ |
| 3 幕主题数据；普通跑图当前统一使用 Act 1 敌池 | ✅ |
| 无限地图 + Boss 独立通道（需 3 场战斗解锁） | ✅ |
| 药房（购买/出售/合成·二步流程） | ✅ |
| 休憩完整；事件页当前为占位流程 | ✅ |
| 图鉴系统（卡牌+敌人） | ✅ |
| 战斗（手牌/真气/格挡/42 种状态效果） | ✅ |
| 本地持久化存档 | ✅ |
| 管理员调试入口（`?admin`） | ✅ |
| 奖励系统（3 选牌拿取+蓝图占位） | ✅ |

---

## 当前地图结构（最近修改）

每 10 层循环，永无止境：

```
层 0: [开始]
层 1: [事件]
层 2-5: [战斗/药房/事件] + Boss通道小圆点
层 6: [战斗×3] + [中段休憩 🔒]
层 7-9: [战斗/药房/事件] + Boss通道小圆点
层 10: [战斗×3] + [首领前休憩 🔒]
层 11: [战斗×3] + [首领 🔒]
层 12: 进入下一轮循环
```

- 地图初始 14 层，到达末端前自动扩展 12 层
- 药房/事件保底来自源码计数：连续计数达到 4 后强制出现
- 敌人 HP 缩放为 `ceil(baseHp * (1 + floor * 0.05))`
- `getEnemyScaling()` 目前返回 `damageBonus`，但普通开战流程尚未把它应用到敌人伤害

---

## 关键代码入口

| 想做的事 | 去这里 |
|----------|--------|
| 改卡牌效果 | `shared/core/gameCore.ts` → `resolveCardPlay()` + `shared/data/cards.ts` |
| 改战斗规则 | `shared/core/gameCore.ts` |
| 改地图生成 | `shared/core/gameCore.ts` → `generateMap()` + `generateLayerTypes()` |
| 改状态系统 | `shared/core/gameCore.ts` → 搜索 status id |
| 改游戏流程 | `game/src/store/gameStore.ts` |
| 改 UI / 页面 | `game/src/components/` + `game/src/index.css` |
| 改头像/图片 | `game/public/assets/`（改后执行 `npm run assets:manifest`） |
| 加测试 | `game/src/store/gameCore.test.ts`（规则），`gameStore.test.ts`（流程） |

---

## 测试

```powershell
cd game
npm test -- --run
```

当前 `npm test -- --run` 为 6 个测试文件、32 个测试用例通过，覆盖：
- 卡牌伤害/格挡/治疗/状态
- Boss 特殊行为
- 体质被动
- Store 流程
- 资源 manifest

`npm run build` 当前通过；Vite 会提示主 JS chunk 约 502.69 kB，略高于默认 500 kB 建议线。

---

## 部署

**GitHub Pages**（自动）：
- push 到 `main` 分支 → `.github/workflows/pages.yml` 自动构建部署
- 代码必须通过 `npm run build` 才能部署

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

1. **先读** `AI_HANDOFF.md`（完整交接文档，约 550 行）
2. 修改规则 → 先改 `shared/core/gameCore.ts` 再改测试
3. 修改 UI → 先搜索 `game/src/index.css` 中的已有 class
4. 修改资源 → 改完图片后执行 `npm run assets:manifest`
5. 别把规则逻辑写进 React 组件，规则放在 `shared/` 下
6. 文本显示乱码不要复制终端输出，用能识别 UTF-8 的编辑器看源码

---

## 更多文档

- `AI_HANDOFF.md` — 完整 AI 交接文档
- `progress.md` — 历史工作记录
- `.trae/rules/project_rules.md` — AI 并行任务执行规则
