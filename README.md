# 五行医道 — AI 快速上手指南

> 中医题材 Web 卡牌构筑游戏。React + TypeScript + Vite。  
> 仓库：`https://github.com/r1062046861-RXQ/test1`  
> 线上地址：`test1.renxuanqi.top`
>
> **给 AI 的说明：完整交接文档见 `AI_HANDOFF.md`。本文件只保留快速启动、当前事实和常用入口。**

---

## Trae / DeepSeek 接手提示

1. 先读 `AI_HANDOFF.md`，再动代码；不要只看本 README。
2. 动手前先运行 `git status --short`。如果工作区已有未提交改动，不能擅自回滚、覆盖或清理。
3. 终端中文可能乱码。文档和 UI 文案必须用 UTF-8 编辑器确认，不要复制终端乱码。
4. UI 替换必须遵守：`1920×1080参考坐标系`、`资源拼装`、`同尺寸同锚点原地换图`、`manifest同步刷新`。
5. 一次只改一个页面或一个系统；改完跑 `npm test -- --run` 和 `npm run build`。

---

## 快速启动

```powershell
cd game
npm install
npm run dev        # 开发服务器 → http://localhost:5173
npm test -- --run  # 运行测试
npm run build      # 构建 → game/dist/
```

### Windows 11 离线版

给没有 Node.js、npm、网络环境的新 Windows 11 电脑使用时，使用根目录生成好的离线包：

- 本机成品文件夹：`offline-windows/`
- 本机压缩包：`wuxing-yidao-offline-windows.zip`
- 新电脑用法：解压后双击 `offline-windows/open-game.cmd`
- 运行依赖：Windows 11 自带 PowerShell；不需要 Node.js、npm、Python 或联网
- 注意：游玩时不要关闭弹出的本地服务器窗口；关闭窗口即停止游戏

离线包里的 `web/` 是 `game/dist/` 的复制产物，当前约 96.7MiB；根目录 zip 约 95.7MiB，均不提交到 GitHub。需要更新离线版时先执行 `cd game && npm run build`，再把 `game/dist/` 复制到 `offline-windows/web/` 并重新压缩。

---

## 项目结构

```text
wechatgame/
├── shared/                    # 纯规则 + 共享数据（未来可迁移 Unity）
│   ├── baseTypes.ts           # Card, Enemy, Player, MapNode 等类型
│   ├── core/gameCore.ts       # 战斗结算/地图生成/状态系统
│   ├── data/cards.ts          # 108 条卡牌模板数据
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
│   ├── public/assets/         # 运行时资源（当前工作区约368个文件，约118MiB）
│   └── package.json
├── .github/workflows/pages.yml # GitHub Pages 自动部署
├── AI_HANDOFF.md              # 完整交接文档
├── codex_crash_log.md         # Codex 异常退出/插件修复记录
└── README.md
```

---

## 当前功能

| 功能 | 状态 |
|------|------|
| 9 种体质 + 管理员体质全部可选 | ✅ |
| 108 条卡牌模板：75 药材牌、10 敌方机制牌、12 药方牌、11 装备牌 | ✅ |
| 12 种药方蓝图：合成台合成，可重复合成无上限 | ✅ |
| 11 种装备牌：可重复获取，效果按有效层数上限结算 | ✅ |
| 12 条事件（1主线分叉3幕 + 11支线）：叙事选择+效果+后果动画 | ✅ |
| 20 个敌人（含 4 个 Boss），支持管理员自选敌人挑战 | ✅ |
| Act 1/2/3 管理员可选章节进入 | ✅ |
| 全部卡牌图片已替换为真实素材 | ✅ |
| 24 张卡牌名称已完成全局统一重命名（药材名+功效） | ✅ |
| 背景图全部换新（战斗/地图/休憩/药房/合成台），关键大图已转 WebP 并压缩到约 200KB 级别 | ✅ |
| 敌人动画已由大体积 GIF 转为 480px 宽动画 WebP，`cards_enemy` 目录约 43.3MiB | ✅ |
| 音频目录当前约35.6MiB；运行时资源当前工作区约114.6MiB，图片 manifest 约77.1MiB | ✅ |
| 主页加载条按实际预加载资源（critical/static）统计进度，不再把延后加载的敌人动画计入总量 | ✅ |
| 字体优化（宋体/Songti SC，macOS兼容） | ✅ |
| 战斗UI去琥珀色，按幕次主题配色（天蓝/玫红/紫清） | ✅ |
| 体质选择前动画已恢复为旧版真实卡面“小包洗牌”抽牌过场 | ✅ |
| 战斗手牌已恢复旧版 `Hand` 真实卡牌交互，不再使用示例占位图 | ✅ |
| 战斗敌人区生命、格挡、意图、状态改为真实数据驱动，血条随 HP 实时变化 | ✅ |
| 战斗被动/装备窗口已拆为同窗标签页，装备页展示真实装备卡图、数量与描述 | ✅ |
| 敌人攻击、防御、增益、减益、特殊意图有不同释放反馈；受击和负面效果有视觉反馈 | ✅ |
| 玩家/敌人生命、格挡、真气变化浮字增强并渐隐消失 | ✅ |
| 第一轮平衡已取消攻击牌强制 0 费，0 费爆发牌、控制牌、起始牌组和敌人双动节奏已削峰 | ✅ |
| 药方合成后汤头歌诀全屏动画展示 | ✅ |
| 合成台 + 药房合成均有合成成功弹窗 | ✅ |
| 药房“合成”页显示牌组/手牌/材料数量，每张可选牌显示拥有数量 xN | ✅ |
| 手牌总览按钮（MapView右下）含装备牌显示 | ✅ |
| 管理员密码 260208，支持记住密码自动填充 | ✅ |
| 管理员体质跳过战斗按钮（正常领取奖励） | ✅ |
| 事件严格线性队列：主线3幕顺序→50%子午流注→随机支线 | ✅ |
| 地图每层 2/3 列事件/商店，战斗列轮换，路径无法连战 | ✅ |
| 敌人轮替不重复出现 | ✅ |
| 三兄弟择师事件数值合理化：Act1 二哥路线为生命上限 +2 + 50 金币 | ✅ |
| 无限地图 + Boss 独立通道（需3场战斗解锁） | ✅ |
| 商店价格倍率系统 | ✅ |
| 本地持久化存档 | ✅ |
| 启动页 v2 资源拼装已接入：按示例图 1920×1080 坐标还原标题、文案、右侧入口和进入按钮 | ✅ |
| 主菜单 v2 资源拼装已接入：默认态/hover 态同尺寸同锚点原地换图 | ✅ |
| `黄芩清肺` 保留药材身份且可打出：0 费造成 4 点伤害并施加 1 层热邪 | ✅ |
| 地图 v2 正在使用 `game/public/assets/map/v2/` 与 `map-v2-*` 样式 | 已接入，持续微调 |
| 战斗 v2 正在使用 `game/public/assets/combat/v2/` 与 `combat-v2-*` 样式 | 已接入，持续微调 |
| 地图页合成台入口由 `MapView` 自己渲染，不再由 `GameSurface synthesisBench` 注入 | ✅ |

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
- 战斗类型分布：`attack=28 / skill=44 / power=36`。
- 稀有度分布：`common=22 / uncommon=30 / rare=56`。
- 费用分布：`0费=44 / 1费=45 / 2费=15 / 3费=4`。
- 药方牌只能通过合成台消耗药材牌和已录入药方蓝图获得，不进入普通奖励、商店或宝箱池。
- `黄芩清肺` 已从“仅合成材料/不可打出”改为可打出的 0 费攻击牌：造成 4 点伤害并施加 1 层热邪，同时仍可作为药方蓝图材料。
- 正常地图战斗胜利每次奖励 1 张真实药方蓝图；重复蓝图录入保持幂等。
- 攻击牌按印刷费用和费用修正消耗真气，不再在结算层强制变成 0 费。
- 装备牌不会进入手牌、牌组、奖励池或商店池；获得后存入当前跑图装备，可重复获得，但效果按有效层数上限结算。
- 战斗 UI 当前以 `CombatView.tsx` + `combat-v2-*` 为主：左侧巡诊者/被动装备/生命格挡窗口、结束回合按钮按 1920×1080 参考坐标系定位。
- 手牌使用旧版 `Hand` 组件；敌人 HP、格挡、意图、状态均读取真实战斗状态，不再使用静态占位图。
- 敌方行动和玩家/敌人资源变化只在表现层生成动画 cue，不改变 store 的战斗结算。
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
| 改启动页 UI | `game/src/components/IntroView.tsx` + `game/public/assets/intro/v2/` |
| 改主菜单 UI | `game/src/components/StartMenu.tsx` + `game/public/assets/main_menu/` |
| 改地图 v2 UI | `game/src/components/MapView.tsx` + `map-v2-*` CSS + `game/public/assets/map/v2/` |
| 改战斗 v2 UI | `game/src/components/CombatView.tsx` + `combat-v2-*` CSS + `game/public/assets/combat/v2/` |
| 改运行时资源 | `game/public/assets/`，改后执行 `npm run assets:manifest` |
| 加测试 | `game/src/store/gameCore.test.ts`（规则），`game/src/store/gameStore.test.ts`（流程） |

---

## 测试

```powershell
cd game
npm test -- --run
npm run build
```

当前验证（2026-05-27）：`npm test -- --run` 为 6 个测试文件、90 个测试用例通过。

`npm run build` 当前通过。主 JS chunk 约 489 kB，构建产物发布于 `game/dist/`。

---

## 部署

**GitHub Pages**（自动）：
- push 到 `main` 分支 → `.github/workflows/pages.yml` 自动构建部署。
- 代码必须通过 `npm run build` 才能部署。
- 最近一次线上发布以后续 `main` 分支 GitHub Actions 最新运行结果为准；`https://test1.renxuanqi.top` 由 GitHub Pages 自动更新。

**Windows 离线包**（本机交付）：
- `offline-windows/open-game.cmd` + `open-game.ps1` 使用 Windows PowerShell 内置能力启动本地 HTTP 服务。
- `offline-windows/web/` 和 `wuxing-yidao-offline-windows.zip` 是本机构建产物，已加入 `.gitignore`，不要提交到 GitHub。
- 当前本机离线 zip 已验证可返回首页和主 JS 资源。

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

1. 先运行 `git status --short`，确认当前未提交改动；不要回滚不是你写的 UI 替换成果。
2. 先读 `AI_HANDOFF.md`，再读相关源码。
3. 修改规则先改 `shared/core/gameCore.ts`，再改数据文案和测试。
4. 修改 UI 先搜索 `game/src/index.css` 中的已有 class，并先读 `AI_HANDOFF.md` 的“UI 替换关键词规范”。
5. 地图和战斗当前分别使用 `map-v2-*`、`combat-v2-*` 样式；不要重新按旧截图偏移 UI。
6. 修改资源后执行 `npm run assets:manifest`。
7. 不要把规则逻辑写进 React 组件；规则放在 `shared/` 下。
8. 文本显示乱码不要复制终端输出，用能识别 UTF-8 的编辑器看源码。

---

## 更多文档

- `AI_HANDOFF.md` — 完整 AI 交接文档
- `codex_crash_log.md` — Codex 闪退、浏览器插件和本机修复记录，方便后续排查
- `卡牌清单.xlsx` — 当前卡牌、起始牌组标记、药方素材标记
