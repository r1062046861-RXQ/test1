# 五行医道（王熠游戏）— 任务计划

> Web 版卡牌 Roguelike 游戏 | 原名「药灵无双」 | 玩法参考《杀戮尖塔》
> 技术栈：React 18 + TypeScript + Vite + TailwindCSS + Zustand + Framer Motion
> 视觉作者：王熠 | 技术作者：任玄奇

## Phase 1: 核心游戏系统 ✅ 完成
- **Status:** complete
- 卡牌系统（75张玩家卡牌、10张敌人能力卡）
- 敌人系统（20个敌人，含Boss）
- 战斗引擎（回合制、伤害、格挡、状态效果、敌人AI）
- 地图系统（15节点随机生成、多层嵌套休息/商店/事件/宝箱/Boss）
- 体质系统（平和质/阴虚质/气虚质，被动效果）
- 商店/休息/奖励/宝箱/事件完整实现
- 3幕流程（风、火、水主题）

## Phase 2: UI/UX 重构 ✅ 完成
- **Status:** complete
- 开场动画 + 电影化卡牌选体质流程（Cardistry动画）
- PageShell 沉浸式布局系统
- 战斗布局多变体（regular/compact/tight 视口适配）
- 全幅卡牌艺术展示（Hand/Card/Codex 全覆盖art-first）
- 敌人全幅肖像 + GIF动图 + progressive loading
- 图鉴单页分段网格（卡片/敌人/状态词典三段连续浏览）
- 开始菜单管理面板（?admin快速战斗进入）

## Phase 3: 素材导入与优化 ✅ 完成
- **Status:** complete
- AI卡牌图批量同步（51张卡片 art）
- 敌方GIF动画导入（20个敌人全部GIF+Poster）
- 体质肖像图导入（平和质/阴虚质/气虚质）
- 图片2/图片3素材导入
- 全仓库图片优化（908张图片压缩，节省285MB）
- 王熠/任玄奇作者二维码

## Phase 4: 性能与稳定性 ✅ 完成
- **Status:** complete
- GIF渐进式加载（poster→GIF淡入）
- 重复GIF解码修复（backdrop用poster不用GIF）
- 加载进度条（StartMenu显示MB进度）
- 缓存和preload机制（progressiveAssets.ts）
- Boss召唤上限修复（最多2个在场）
- 商店固本培元稳定性修复
- crypto.randomUUID fallback 修复HTTP部署

## Phase 5: Web部署 ✅ 完成
- **Status:** complete
- Vite配置base路径（GitHub Pages /test1/）
- assets.ts URL解析器（BASE_URL-safe）
- GitHub Pages工作流（.github/workflows/pages.yml）
- 一键启动脚本（open-web-game.cmd/.ps1）
- 存储库图片优化

## Phase 6: 细节完善 ✅ 大部分完成
- **Status:** complete
- 品牌改名：药灵无双→五行医道
- 中文UI本地化（移除所有可见英文）
- 敌人战斗信息重排（右rail信息区）
- 意图说明紧凑单行显示
- 体质选择页无滚动
- 敌方动画加载缓慢修复（91.gif压缩+双层渲染修复）

## Phase 7: 当前待处理
- **Status:** pending
- Unity迁移前准备工作
- 可能需要：游戏平衡性微调
- 可能需要：更多卡牌玩法深度
- 可能需要：移动端适配优化

## Phase 8: 413恢复 — 立即行动
- **Status:** pending
- 当前Codex会话413报错
- 已通过task_plan.md + progress.md保存全量状态
- 关闭Codex → 重开即可恢复
