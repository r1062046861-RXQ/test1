# 药灵无双 (Yaoling Wushuang)

## 项目简介
这是一个基于《杀戮尖塔》逻辑的中医题材卡牌构筑游戏。玩家扮演不同体质的医者，通过收集药材（卡牌）、运用医理（遗物），在经络穴位（地图）中巡诊，最终调理五脏五行。

## 技术栈
- **核心框架**: React + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand (带本地持久化)
- **UI 样式**: Tailwind CSS
- **图标库**: Lucide React

## 开发环境设置
1. 确保安装了 Node.js (v18+)。
2. 进入 `game` 目录:
   ```bash
   cd game
   ```
3. 安装依赖:
   ```bash
   npm install
   ```
4. 启动开发服务器:
   ```bash
   npm run dev
   ```

## 构建离线版本
1. 运行构建命令:
   ```bash
   npm run build
   ```
   这将生成 `dist` 目录，包含所有静态资源。

2. **离线运行**:
   - 由于浏览器的安全策略（CORS），直接打开 `index.html` 可能无法正常加载某些资源。
   - 推荐使用轻量级服务器运行，例如 `serve`：
     ```bash
     npx serve -s dist
     ```
   - 或者使用 Python (如果在其它电脑上):
     ```bash
     cd dist
     python -m http.server
     ```

## 游戏操作说明
- **开始游戏**: 点击主菜单的“开始巡诊”。
- **地图**: 点击高亮的节点（如“病症：风寒”）进入战斗。
- **战斗**:
  - 拖拽或点击卡牌使用。
  - 攻击卡对敌人造成伤害，技能卡提供护盾或增益。
  - 观察敌人的意图（头顶图标），决定防守还是进攻。
  - 能量（真气）耗尽后点击“End Turn”结束回合。
- **胜利**: 击败敌人后获得奖励。

## 目录结构
- `src/components`: UI 组件 (卡牌, 敌人, 战斗界面等)
- `src/store`: 游戏状态管理 (Zustand)
- `src/types`: TypeScript 类型定义
- `src/data`: 游戏数据 (卡牌库, 敌人配置)
- `src/utils`: 工具函数

## 离线部署
将 `dist` 文件夹复制到任何电脑，配合一个简单的 HTTP 服务器即可运行。所有资源均已打包在内。
