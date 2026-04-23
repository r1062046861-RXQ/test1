# 五行医道

## 项目简介

`五行医道` 是一个 **Web 端单机卡牌构筑游戏**。主题基于中医辨证与五行思路，整体玩法参考 deckbuilding / 爬塔式路线推进结构：玩家选择体质开局，在地图节点间推进，通过战斗、事件、药铺、休憩和宝箱逐步调整牌组，最终挑战三幕首领。

当前仓库主线已经是 **web-only**：

- React + TypeScript + Vite 前端在 `game/`
- 纯规则与共享数据在 `shared/`
- 素材导入、压缩和同步脚本在仓库根目录以及 `game/*.py`

如果你是新接手这个仓库的开发者或 AI，建议先看：

- 根目录 `AI_HANDOFF.md`
- 根目录 `progress.md`

## 当前内容概况

- 3 幕流程
- 8 层地图生成
- 75 张玩家可获得卡牌
- 10 张敌方专用机制牌
- 19 个敌人
- 30 条状态/机制词条
- 本地持久化存档
- 管理员调试入口：访问地址加 `?admin`

## 技术栈

- React 18
- TypeScript
- Vite
- Zustand + persist
- Tailwind CSS
- Framer Motion
- Vitest

## 目录结构

```text
game/
  src/
    components/   页面与战斗 UI
    data/         Web 侧导出与图鉴元数据
    hooks/        资源加载等 hooks
    store/        Zustand 状态层与测试
    types/        Web 侧类型桥接
    utils/        资源路径、ID 等工具
  public/assets/  运行时静态资源
shared/
  baseTypes.ts    基础类型
  data/           卡牌/敌人数据
  core/           战斗与地图规则核心
```

## 开发

```bash
cd game
npm install
npm run dev
```

默认会启动本地 Vite 开发服务器。

如果在 Windows 上想一键启动，也可以在仓库根目录使用：

- `open-web-game.cmd`
- `open-web-game.ps1`

## 测试

```bash
cd game
npm test -- --run
```

当前测试主要覆盖：

- 关键卡牌/状态规则
- 敌人特化机制
- store 开局与调试战斗入口
- 运行时 ID 回退逻辑

## 构建

```bash
cd game
npm run build
```

构建产物会输出到 `game/dist/`。

## 本地预览构建产物

```bash
cd game
npm run build
npx serve -s dist
```

或：

```bash
cd game/dist
python -m http.server
```

不要直接双击 `index.html` 打开，因为浏览器安全策略可能影响资源加载。

## 部署

当前仓库已带 GitHub Pages workflow：

- `.github/workflows/pages.yml`

构建 base 由 `game/vite.config.ts` 控制，资源路径通过 `game/src/utils/assets.ts` 做统一解析，因此支持子路径部署。

## 关键代码入口

- `src/App.tsx`
  - 页面 phase 分发与外部调试钩子挂载
- `src/store/gameStore.ts`
  - 游戏主状态、持久化、开局、地图节点进入、战斗演出调度
- `../shared/core/gameCore.ts`
  - 真正的地图生成、打牌结算、玩家回合末、敌人回合规则
- `src/components/StartMenu.tsx`
  - 主菜单、体质入口、设置、联系作者、管理员调试入口
- `src/components/CombatView.tsx`
  - 战斗主舞台
- `src/components/CardCodexView.tsx`
  - 单页图鉴总览
- `src/index.css`
  - 主要视觉系统与页面布局

## 体质说明

当前体质选择展示与实际规则已对齐：

- 平和体质：平和开局
- 阴虚体质：回合开始时获得 1 点能量，但受到伤害 +1
- 气虚体质：每次打出攻击牌，恢复 1 点生命

实际开局被动实现位于：

- `src/store/gameStore.ts -> buildStartingPlayer`

## 常用调试方式

### 管理员入口

访问本地地址时加 `?admin`，例如：

```text
http://127.0.0.1:5173/?admin
```

可以直接：

- 开随机战斗
- 直达事件/药铺/休憩
- 指定某个敌人开战

### 浏览器全局钩子

`src/App.tsx` 会挂出：

- `window.render_game_to_text()`
- `window.advanceTime(ms)`
- `window.__cardCodexState`

这些钩子主要服务自动化验证和外部状态读取。

## 素材相关

运行时资源主要在：

- `public/assets/cards_player`
- `public/assets/cards_enemy`
- `public/assets/cards_special`
- `public/assets/constitutions`

常见素材脚本包括：

- 根目录 `import_constitution_assets.py`
- 根目录 `import_enemy_gif_asset.py`
- 根目录 `import_image2_assets.py`
- 根目录 `import_image3_assets.py`
- `sync_ai_card_art.py`

如果是替换卡图、敌人图或体质图，优先先看对应脚本而不是手工逐个改文件。
