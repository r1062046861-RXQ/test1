# 药灵无双（Web → 微信小程序）迁移技术文档（iPhone 13 适配）

## 1. 文档目标与范围

本方案用于将当前 Web 版本项目迁移到微信小程序，目标机型优先适配 **iPhone 13（1170×2532，逻辑宽度 390pt）**，并确保后续可平滑覆盖主流安卓机型。

迁移范围包含：
- UI 层迁移（React DOM/Tailwind → 小程序可渲染方案）
- 状态管理与持久化迁移（Zustand + localStorage → 小程序存储）
- 资源体系迁移（`public/assets`）
- 动画与交互迁移（framer-motion/hover → 触控动画）
- 构建与发布链路迁移（Vite → 小程序构建）
- 测试、验收与发布策略

不包含：
- 新玩法重构（仅在兼容性需要时调整交互实现）
- 服务端联机化（当前仍按本地单机运行）

---

## 2. 当前项目基线（迁移输入）

### 2.1 技术栈基线

- Web 框架：React 18 + TypeScript（[package.json](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/package.json#L1-L32)）
- 构建：Vite（[vite.config.ts](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/vite.config.ts#L1-L11)）
- 状态管理：Zustand + persist（[gameStore.ts](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/store/gameStore.ts#L44-L772)）
- UI 样式：Tailwind + 自定义 CSS（[tailwind.config.js](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/tailwind.config.js#L1-L21), [index.css](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/index.css#L1-L32)）
- 动画：framer-motion（[CombatView.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/CombatView.tsx#L1-L116), [Hand.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/Hand.tsx#L1-L89), [Enemy.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/Enemy.tsx#L1-L133)）
- 图标：lucide-react（[CombatView.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/CombatView.tsx#L1-L116)）

### 2.2 页面流转基线

单应用阶段切换由全局状态 `phase` 驱动（[App.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/App.tsx#L1-L98)）：
- `start_menu`
- `map`
- `combat`
- `reward`
- `shop`
- `rest`
- `event`
- `game_over`
- `victory`

### 2.3 核心状态与逻辑基线

- 主循环逻辑集中在 [gameStore.ts](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/store/gameStore.ts#L1-L856)
- 核心类型定义在 [types/index.ts](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/types/index.ts#L1-L124)
- 卡牌/敌人数据在 [cards.ts](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/data/cards.ts) 与 [enemies.ts](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/data/enemies.ts)

### 2.4 资源基线

- 资源目录：`public/assets/`（卡牌、敌人、特质、场景背景）
- 资产索引：`CardMaster.xlsx`（根目录）
- 图片命名：编号制（`1.png`、`89.png` 等）

---

## 3. 迁移技术路线决策

## 3.1 推荐路线：Taro（React）迁移

推荐采用 **Taro 3 + React + TypeScript**，理由：
- 保留 React 组件化与 TS 习惯，降低认知迁移成本
- 支持小程序端编译目标，跨端能力更强
- 可逐步替换 DOM/动画/样式层而不必一次性重写所有业务逻辑

### 3.2 备选路线：原生小程序重写

优点：最终包体和渲染性能可更极致。  
缺点：需重写所有组件与状态组织，周期更长。

### 3.3 本项目建议

先走 **Taro 迁移**，逻辑层与数据层复用，UI 层和交互层改造；后续如需极致性能，再针对战斗界面局部下沉为原生实现。

---

## 4. 兼容性差异与改造清单

以下为当前代码中已识别的主要差异点。

### 4.1 渲染层差异（必须改）

- ReactDOM 挂载不可用（[main.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/main.tsx#L1-L10)）
- DOM API 不可直接使用：
  - `document.documentElement.style.setProperty`（[App.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/App.tsx#L19-L21)）
  - `scrollIntoView`（[CombatLog.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/CombatLog.tsx#L7-L9)）
  - `clientHeight/scrollTop`（[MapView.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/MapView.tsx#L24-L31)）

### 4.2 样式体系差异（必须改）

- Tailwind 类名在小程序端不可直接按 Web 同方式工作
- `hover:*`、`cursor-pointer`、`drop-shadow` 等需转换为触控态/固定样式
- `vw/vh` 与 `fixed inset-0` 需适配小程序容器与安全区

### 4.3 动画库差异（必须改）

- `framer-motion` 不支持小程序环境，需替换为：
  - Taro 动画 API
  - 或小程序原生动画（`createAnimation`）
  - 或 CSS keyframes（可编译子集）

涉及文件：
- [Hand.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/Hand.tsx#L1-L89)
- [Enemy.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/Enemy.tsx#L1-L133)
- [CombatView.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/CombatView.tsx#L1-L116)

### 4.4 图标库差异（建议改）

- `lucide-react` 不建议直接带入小程序端  
改为：
- SVG 雪碧图
- Iconfont
- 本地图片图标

### 4.5 存储差异（必须改）

- 当前 persist 使用 `localStorage`（[gameStore.ts](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/store/gameStore.ts#L749-L751)）
- 小程序需改为 `wx.setStorageSync / wx.getStorageSync` 适配层

### 4.6 事件交互差异（必须改）

- Web 的 `onMouseEnter/onMouseLeave`（[Hand.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/Hand.tsx#L34-L35)）需改触摸事件
- 地图节点点击、卡牌点击需改为 `tap` 流程，避免 300ms 手势冲突

---

## 5. iPhone 13 适配规范（核心）

## 5.1 设计基准

- 目标机型：iPhone 13
- 逻辑宽度：390pt
- 推荐设计稿基线：**750rpx**
- 换算：`1pt ≈ 1.923rpx`

## 5.2 安全区策略

- 顶部：状态栏 + 胶囊区域必须预留
- 底部：Home Indicator 区域预留
- 统一读取：`wx.getSystemInfoSync()` + `safeArea`

布局规则：
- 顶部操作栏使用 `safeArea.top + 16rpx`
- 底部手牌区使用 `screenHeight - safeArea.bottom` 进行补偿

## 5.3 页面尺寸建议（iPhone 13）

- 主菜单按钮区：宽度 `620rpx`，按钮高 `88rpx`
- 地图节点按钮：直径 `96~112rpx`
- 战斗手牌卡片：宽 `180~210rpx`，高 `270~315rpx`
- 战斗日志面板：宽 `280rpx`，高 `220rpx`（可折叠）

## 5.4 触控目标规范

- 可点击区域最小 `88rpx × 88rpx`（约 44pt）
- 关键按钮（结束回合/返回）建议 >= `96rpx` 高度

## 5.5 帧率与动画预算

- 战斗页目标：**55~60 FPS**
- 单帧 JS 预算：< 8ms
- 避免同帧内多重重排，状态更新批处理

---

## 6. 目标小程序架构设计

## 6.1 分层结构

- `src/core`：纯逻辑（战斗结算、状态推进、数值函数）
- `src/store`：状态容器（可继续 Zustand，外包一层 storage adapter）
- `src/pages`：页面容器（start/map/combat/reward...）
- `src/components`：通用组件（Card、Enemy、Stats、Log）
- `src/assets`：图片与图标
- `src/adapters`：平台适配（storage、systemInfo、animation）

## 6.2 推荐目录（迁移后）

```text
game-mini/
  src/
    app.ts
    app.config.ts
    pages/
      start/index.tsx
      map/index.tsx
      combat/index.tsx
      reward/index.tsx
      shop/index.tsx
      rest/index.tsx
      event/index.tsx
      gameover/index.tsx
    components/
      Card/
      Enemy/
      Hand/
      CombatLog/
      PlayerStats/
    core/
      battle/
      map/
      effects/
    store/
      gameStore.ts
      storageAdapter.ts
    data/
      cards.ts
      enemies.ts
    assets/
      cards_player/
      cards_enemy/
      cards_special/
      backgrounds/
```

## 6.3 路由策略

建议将 `phase` 迁移为“页面 + 子状态”双层：
- 页面级：`start/map/combat/...`
- 页面内子状态：例如 combat 内处理 turn、animation queue

这样可降低单页复杂度，并更符合小程序栈式导航与生命周期。

---

## 7. 迁移实施分阶段计划（可执行）

## Phase 0：准备与基线冻结（0.5 天）

- 冻结当前 Web 玩法版本（标签与变更窗口控制）
- 输出迁移输入包：
  - `src/`
  - `public/assets/`
  - `CardMaster.xlsx`
- 建立迁移分支：`feat/wechat-migration`

交付物：
- 基线快照文档
- 风险列表初稿

## Phase 1：脚手架与基础设施（1 天）

- 初始化 Taro 小程序项目（React + TS）
- 配置路径别名 `@`
- 建立 ESLint/Prettier/TypeScript 规则
- 建立 storage adapter（封装 wx storage）

交付物：
- 可在微信开发者工具运行的空壳工程

## Phase 2：数据层和逻辑层迁移（2 天）

- 迁移 `types`、`data/cards.ts`、`data/enemies.ts`
- 拆分 [gameStore.ts](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/store/gameStore.ts#L1-L856) 为：
  - `battleEngine.ts`（纯函数）
  - `mapEngine.ts`
  - `stateStore.ts`
- 将 `persist` 替换为 storage adapter

验收标准：
- 控制台可跑“开局→抽牌→出牌→结算→胜利”逻辑单测

## Phase 3：页面迁移（3 天）

- 迁移页面顺序：
  1. Start
  2. Map
  3. Combat
  4. Reward
  5. Shop/Rest/Event
  6. GameOver
- 完成背景图、卡图、敌人图加载链路
- 处理所有 DOM API 替换

验收标准：
- 全流程可点击通关第一章（无崩溃）

## Phase 4：动画与交互重构（2 天）

- 替换 framer-motion 动画
- 手牌扇形与出牌动画改小程序方案
- 日志滚动、地图自动定位改为小程序滚动容器实现

验收标准：
- iPhone 13 实机战斗操作流畅，无明显掉帧

## Phase 5：适配与优化（2 天）

- iPhone 13 像素密度、safeArea、字体与间距校准
- 包体优化（图片压缩、分包）
- 首屏时间优化

验收标准：
- 首屏 < 2.5s
- 战斗页 FPS 平均 > 55
- 主流程 crash = 0

## Phase 6：测试与发布（1.5 天）

- 功能回归（阶段流转、卡牌效果、地图节点）
- 存档升级验证（旧版本迁移/清档策略）
- 提审包生成与提审检查单

---

## 8. 关键模块迁移方案（逐模块）

## 8.1 App 与阶段管理

当前：由 [App.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/App.tsx#L1-L98) 使用 `if (phase === ...)` 条件渲染。

迁移建议：
- 页面化路由，`phase` 仅作业务子态
- 避免单文件承担所有场景渲染，提升可维护性

## 8.2 地图页（MapView）

当前风险点（[MapView.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/MapView.tsx#L1-L131)）：
- `useRef + scrollTop/clientHeight` 直接操作 DOM
- `svg` 连线在小程序支持策略需验证（建议改 Canvas 或绝对定位线段）

迁移建议：
- 方案 A：使用 Canvas 绘制连线（推荐）
- 方案 B：预计算线段，使用 View 旋转实现

## 8.3 战斗页（CombatView + Hand + Enemy）

关键挑战：
- framer-motion 全面替换
- 手牌 hover 逻辑改为触摸展开
- 多动画并发（受击、攻击、回合切换）需建立动画队列

建议：
- 建立 `animationQueue`，串行触发关键动画
- 卡牌打出动画使用 transform + transition，避免频繁 setData 大对象

## 8.4 存档与版本迁移

当前已存在版本迁移逻辑（[gameStore.ts](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/store/gameStore.ts#L751-L771)）。

小程序实现：
- `storageAdapter.getItem/setItem/removeItem`
- 保留 `version` 与 `migrate` 策略
- 增加“存档损坏回退清档”保护

---

## 9. 资源与包体治理方案

## 9.1 资源分类

- 常驻资源：背景图、基础 UI 图标
- 高频资源：当前章敌人图、初始卡组图
- 低频资源：后期章节素材、可分包

## 9.2 体积控制策略

- PNG 批量压缩（有损阈值可控）
- 背景图控制在 200~400KB/张
- 卡图控制在 40~120KB/张
- 图集化（同类小图）

## 9.3 加载策略

- 进入战斗前预加载当前战斗所需卡图/敌图
- 主菜单仅加载主背景 + 核心按钮图
- 在章节切换时预热下一章背景

---

## 10. 测试方案与验收标准

## 10.1 测试分层

- 单元测试：战斗逻辑纯函数（伤害、状态、抽弃牌、回合推进）
- 集成测试：阶段流转与关键动作链
- 实机测试：iPhone 13 操作流畅度、手势、内存

## 10.2 必测场景

- 新开局（3种体质）
- 地图点击可达性
- 战斗回合完整闭环
- 抽牌/弃牌/debuff 回合倒计时
- 胜利奖励与加卡
- 商店/休憩/事件点击有效
- 退出重进后的存档一致性

## 10.3 验收 KPI

- 功能：主流程可连续游玩 30 分钟无阻断
- 性能：战斗平均 FPS > 55（iPhone 13）
- 稳定：无白屏、无关键崩溃
- 体验：关键点击响应 < 120ms

---

## 11. 风险清单与应对

1) 动画替换后手感下降  
- 应对：关键动画优先还原（出牌、受击、回合）

2) 包体接近上限  
- 应对：背景压缩 + 分包 + 延迟加载

3) 地图连线渲染复杂  
- 应对：优先 Canvas 实现，预计算点位

4) 状态更新过重导致掉帧  
- 应对：拆分 store，减少频繁大对象写入

5) 存档迁移异常  
- 应对：保留版本号与降级清档策略

---

## 12. 迁移后的工程规范（建议）

- 逻辑纯函数化：战斗结算禁止直接耦合 UI API
- 平台 API 统一走 `adapters/`
- 页面只做编排，复杂逻辑下沉 `core/`
- 每个 effectId 必有测试样例
- 每次发版更新 `CHANGELOG + 存档版本号`

---

## 13. 里程碑排期（建议）

- M1（第 2 天）：小程序壳 + 核心逻辑可运行
- M2（第 5 天）：主流程页面联通（可游玩）
- M3（第 7 天）：动画与适配完成（iPhone 13 可验收）
- M4（第 9 天）：测试收敛并出提审包

总周期建议：**7~9 个工作日**

---

## 14. 立即执行的下一步（落地动作）

1. 在 `youxi2/game` 同级创建 `game-mini` 工程（Taro + React + TS）  
2. 先迁移 `types + data + core battle functions`，建立最小可运行逻辑闭环  
3. 首先完成 `Start → Map → Combat` 三页，锁定 iPhone 13 版式  
4. 再迁移 Reward/Shop/Rest/Event，最后统一动画与性能调优  

---

## 15. 关键代码参考（迁移输入）

- 阶段入口：[App.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/App.tsx#L1-L98)
- 主状态机：[gameStore.ts](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/store/gameStore.ts#L1-L856)
- 地图视图：[MapView.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/MapView.tsx#L1-L131)
- 战斗视图：[CombatView.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/CombatView.tsx#L1-L116)
- 手牌动画：[Hand.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/Hand.tsx#L1-L89)
- 敌人动画：[Enemy.tsx](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/components/Enemy.tsx#L1-L133)
- 存档版本迁移：[gameStore.ts](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/store/gameStore.ts#L751-L771)
- 样式体系：[index.css](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/src/index.css#L1-L32)
- 依赖清单：[package.json](file:///c:/Users/C2H6O/Desktop/youxi/youxi2/game/package.json#L1-L32)

