# 新手教程图文准备文档

## 目标

这份文档用于准备一套“图文结合”的新手教程素材。当前阶段先做静态图文材料，不直接接入游戏内交互流程。

教程优先解释第一次游玩必须理解的路径：

1. 选择体质。
2. 看懂地图路线。
3. 进入战斗。
4. 观察敌人意图并出牌。
5. 战斗后拿奖励。
6. 录入蓝图并合成药方。
7. 强化牌组后挑战首领。

推荐制作 9 张主教程图，统一使用 `1920x1080` 横版画幅，匹配当前游戏 16:9 主视觉。风格沿用现有中医、卷轴地图、药房、药材卡牌、暗色金边界面、冷灰战斗 UI，不另起卡通、霓虹或科幻风格。

## 通用制作规范

- 画幅：`1920x1080`，横版，sRGB。
- 文件建议：最终运行时素材用 `.webp` 或压缩后的 `.png`；分层源文件、废稿、参考拼贴放入 `未使用/tutorial_art_sources/`，不要放进线上运行资源目录。
- 构图：每张图保留右侧或下方 25%-35% 留白，用于后期叠加中文说明。
- 信息密度：每屏只讲 1 个核心概念，最多 3 条短说明。
- 图像策略：AI 生成优先负责背景、氛围、场景；真实 UI、卡牌、箭头、框选、中文文字后期合成。
- 文案策略：不要让 AI 生成小字号中文 UI 文字，避免乱码、错字和规则错误。
- 标注策略：使用游戏现有图标、现有 UI 资源或 lucide/现有图标体系；不使用表情符号做教程图标。
- 无障碍：关键文字区域和背景保持足够明暗对比；后续接入游戏内时再验证 `1366x768`、`1920x1080`、移动窄屏。

## 风格基准

主视觉关键词：

`中医药, 古籍, 药柜, 卷轴地图, 药材卡牌, 汤头歌诀, 暗色金边 UI, 冷灰战斗界面, 纸纹, 朱砂印, 水墨边缘, 克制的国风游戏界面`

统一负面词：

`卡通Q版, 现代医院, 科幻赛博朋克, 霓虹紫蓝, 过度玻璃拟态, 手机游戏广告风, 错误中文文字, 乱码, 英文 UI 占主导, 夸张表情, 低清晰度, 模糊卡牌文字, 杂乱规则表`

## 现有参考素材

已确认存在的关键素材：

- `game/public/assets/intro/background.png`
- `game/public/assets/main_menu/v2/background.png`
- `game/public/assets/constitution_select/background.png`
- `game/public/assets/constitutions/*.webp`
- `game/public/assets/background_map_act1.png`
- `game/public/assets/background_map_act2.png`
- `game/public/assets/map/v2/route_frame.png`
- `game/public/assets/map/v2/boss_progress_plate.png`
- `game/public/assets/combat/v2/background.png`
- `game/public/assets/combat/v2/player_resource_panel.png`
- `game/public/assets/combat/v2/status_icon_1.png`
- `game/public/assets/combat/v2/status_icon_2.png`
- `game/public/assets/combat/v2/status_icon_3.png`
- `game/public/assets/bg_synthesis_1.png`
- `game/public/assets/bg_synthesis_2.png`
- `game/public/assets/cards_player/1.png`
- `game/public/assets/cards_player/3.png`
- `game/public/assets/cards_player/21.png`
- `game/public/assets/cards_formula_placeholders/gegen_tang.png`
- `game/public/assets/cards_equipment/zhiweibing.webp`
- `game/public/assets/cards_enemy/91-poster.png`

需要实机截图或后期补齐的内容：

- `CombatView` 当前完整战斗 UI。
- `RewardView` 当前奖励界面。
- `SynthesisBench` 当前合成台弹窗。
- 手牌区底座素材：当前仓库没有 `game/public/assets/combat/v2/hand_cards_base.png`，手牌区域建议直接截 `CombatView` 或用现有手牌图标、卡牌图后期合成。

## 9 张教程图规划

### 01. 总览图：一次巡诊怎么玩

用途：作为教程开篇，让玩家先理解一局游戏的闭环，而不是一开始就学习细规则。

学习点：选体质后进入地图，通过战斗和事件获取资源，强化牌组，最终挑战首领。

推荐构图：

- 左侧或中部做流程串联：主菜单 -> 地图 -> 战斗 -> 奖励 -> 药房/合成 -> 首领。
- 背景可用卷轴地图和主菜单氛围融合。
- 右侧留 30% 空白放教程标题和 3 条说明。

生成关键词：

`中医卡牌构筑游戏, 巡诊路线, 卷轴地图, 药材卡牌, roguelike deckbuilder, 古风医疗奇幻, 教程总览, 暗金色游戏UI, 药柜与古籍`

负面词：

`现代医院, 科幻飞船, 霓虹赛博朋克, Q版角色, 复杂规则表, 错误中文文字, UI文字乱码`

参考素材：

- `game/public/assets/main_menu/v2/background.png`
- `game/public/assets/background_map_act1.png`
- `game/public/assets/intro/background.png`

建议叠加文案：

- `一次巡诊，就是一次牌组成长。`
- `选体质，走地图，打战斗，拿奖励。`
- `准备足够后，解锁并挑战首领。`

制作备注：

- 流程箭头和节点图标后期合成，不让生成模型直接画 UI。
- “巡诊”概念要突出，避免画成普通玄幻战斗海报。

### 02. 选择体质

用途：解释体质选择是开局流派选择，不只是外观选择。

学习点：九种体质代表不同起手被动和牌组方向；新手优先推荐 `平和质`。

推荐构图：

- 背景使用古籍书页和体质卡片陈列感。
- 中心突出 `平和质`，周围可虚化展示其他体质卡。
- 右侧留白放“新手推荐”的说明。

生成关键词：

`九种中医体质, 角色选择界面, 古籍书页, 体质卡片, 平和质, 阴虚质, 气虚质, 国风游戏UI, 暗金边框, 纸张纹理`

负面词：

`现代体检报告, 医院诊断单, 真实疾病宣传图, 卡通头像墙, 错误中文文字, 乱码`

参考素材：

- `game/public/assets/constitution_select/background.png`
- `game/public/assets/constitutions/balanced.webp`
- `game/public/assets/constitutions/yin_deficiency.webp`
- `game/public/assets/constitutions/qi_deficiency.webp`
- `game/public/assets/constitutions/yang_deficiency.webp`
- `game/public/assets/constitutions/phlegm_dampness.webp`
- `game/public/assets/constitutions/damp_heat.webp`
- `game/public/assets/constitutions/blood_stasis.webp`
- `game/public/assets/constitutions/qi_stagnation.webp`
- `game/public/assets/constitutions/special_diathesis.webp`

建议叠加文案：

- `体质决定你的起手方向。`
- `新手建议先选平和质。`
- `熟悉规则后，再尝试偏攻、防守或状态流派。`

制作备注：

- 体质卡图用真实资源后期贴入。
- 如果要突出“推荐”，使用游戏内金边或朱砂印式标识，不用表情图标。

### 03. 认识卡牌

用途：帮助玩家看懂一张牌，不需要一开始记所有牌。

学习点：卡牌主要看费用、类型、目标、效果；药材牌进入牌组并出牌，药方牌来自合成，装备提供全局被动。

推荐构图：

- 左侧放一张真实药材牌作为主体。
- 旁边用 4-5 个后期标注框指向费用、类型、目标、效果、卡图。
- 下方并列展示药材牌、药方牌、装备牌三类差异。

生成关键词：

`中药材卡牌说明, 卡牌费用图标, 攻击技能能力分类, 药材牌, 药方牌, 装备牌, 卡牌结构教学, 古风卡牌UI, 金色标注线`

负面词：

`扑克牌, 现代集换式卡牌, 科幻卡面, 错误卡牌文字, 模糊小字, 乱码`

参考素材：

- `game/public/assets/cards_player/1.png`
- `game/public/assets/cards_formula_placeholders/gegen_tang.png`
- `game/public/assets/cards_equipment/zhiweibing.webp`

建议叠加文案：

- `先看费用，再看类型和目标。`
- `药材牌用于每回合出牌。`
- `药方靠合成获得，装备提供被动效果。`

制作备注：

- 卡牌本体必须使用现有真实卡图，避免 AI 生成错误牌面。
- 装备不按“每回合抽到手牌使用”来讲，应表达为获得后提供被动效果。

### 04. 看懂地图路线

用途：让玩家知道地图节点代表什么，以及为什么首领暂时进不去。

学习点：地图包含战斗、事件、药房、休息、首领通道；当前规则是击败 3 场战斗后解锁首领。

推荐构图：

- 用卷轴地图作为主背景。
- 后期圈出不同节点类型，并在首领进度板上强调 `0/3 -> 3/3`。
- 可在底部放一条简短路线示例。

生成关键词：

`卷轴地图路线, 节点选择, 战斗节点, 药房节点, 事件节点, 首领通道, 三胜解锁, 古风地图UI, 暗色金边`

负面词：

`开放世界地图, 现代导航地图, 科幻雷达, 过多小字, 错误中文文字, 乱码`

参考素材：

- `game/public/assets/background_map_act1.png`
- `game/public/assets/background_map_act2.png`
- `game/public/assets/map/v2/route_frame.png`
- `game/public/assets/map/v2/boss_progress_plate.png`
- `game/public/assets/map/v2/boss_lamp_pending.png`
- `game/public/assets/map/v2/boss_lamp_complete.png`
- `game/src/components/MapView.tsx`

建议叠加文案：

- `每个节点代表一次选择。`
- `普通战斗会推进首领解锁进度。`
- `击败 3 场战斗后，首领通道开放。`

制作备注：

- `3` 这个数字来自 `shared/core/gameCore.ts` 的 `getBossUnlockWinsRequired()`，后续如果规则改动，教程图文必须同步更新。

### 05. 战斗界面基础

用途：降低第一次进战斗时的信息压力。

学习点：先认识生命、格挡、真气、手牌、敌人意图和结束回合按钮。

推荐构图：

- 使用 `CombatView` 实机截图作为主体。
- 不要求展示完整规则，只用标注框框出 6 个基础区域。
- 右侧留白放“先看这几个地方”的说明。

生成关键词：

`卡牌战斗界面, 真气资源, 生命格挡, 敌人意图, 手牌区域, 结束回合按钮, 中医战斗UI, 冷灰色战斗场景, 暗金边框`

负面词：

`动作游戏HUD, 科幻机甲HUD, 过量粒子特效, 模糊文字, 错误中文UI, 乱码`

参考素材：

- `game/public/assets/combat/v2/background.png`
- `game/public/assets/combat/v2/player_resource_panel.png`
- `game/public/assets/combat/v2/hp_icon.png`
- `game/public/assets/combat/v2/qi_icon.png`
- `game/public/assets/combat/v2/intent_icon.png`
- `game/src/components/CombatView.tsx`
- `game/src/components/Hand.tsx`

建议叠加文案：

- `生命归零就失败。`
- `格挡抵消本回合伤害。`
- `真气决定本回合能打几张牌。`

制作备注：

- 当前没有 `hand_cards_base.png`，手牌区域必须来自实机截图或后期拼合。
- 敌人意图建议使用当前 UI 的真实图标和数值截图。

### 06. 打一回合示例

用途：教玩家第一回合的实际操作顺序。

学习点：先看敌人意图，再决定用真气攻击或叠格挡，最后结束回合。

推荐构图：

- 做成 1-2-3 步骤图。
- 左侧是敌人意图和玩家真气，中央是两张示例手牌，右侧是结束回合按钮。
- 用后期箭头表达顺序。

生成关键词：

`回合制卡牌教学, 出牌顺序, 敌人即将攻击, 使用格挡牌, 使用攻击牌, 新手教程箭头标注, 中医卡牌战斗`

负面词：

`实时动作战斗, 复杂连招表, 大量爆炸特效, 错误中文文字, 乱码, 模糊卡牌`

参考素材：

- `game/src/components/CombatView.tsx`
- `game/public/assets/combat/v2/background.png`
- `game/public/assets/cards_player/3.png`
- `game/public/assets/cards_player/21.png`
- `game/public/assets/combat/v2/end_turn_button.png`

建议叠加文案：

- `1. 先看敌人下一步。`
- `2. 用真气打出攻击或防守牌。`
- `3. 没有合适操作时结束回合。`

制作备注：

- 示例卡牌用真实卡图；如果卡牌效果后续调整，教程截图需要重新截。
- 不要在这张图解释所有状态，只讲“看意图 -> 出牌 -> 结束”。

### 07. 状态与体质特色

用途：让玩家知道状态图标和层数有意义，但不要求马上背规则。

学习点：热邪、寒邪、湿邪、血瘀、滋阴、温阳等状态先看图标和层数；体质会改变打法。

推荐构图：

- 使用战斗界面局部放大状态栏。
- 把状态图标做成一排，旁边显示层数角标。
- 背景可加入体质图标作为弱化纹样。

生成关键词：

`中医状态效果, buff debuff 图标, 热邪寒邪湿邪血瘀, 滋阴温阳, 层数提示, 状态栏教学, 中医卡牌游戏UI`

负面词：

`医学科普海报, 真实病理图片, 现代医院图标, 过量文字解释, 乱码, 错误中文UI`

参考素材：

- `game/public/assets/combat/v2/status_icon_1.png`
- `game/public/assets/combat/v2/status_icon_2.png`
- `game/public/assets/combat/v2/status_icon_3.png`
- `game/public/assets/constitutions/balanced.webp`
- `game/public/assets/constitutions/yin_deficiency.webp`
- `game/public/assets/constitutions/qi_deficiency.webp`
- `game/src/components/CombatView.tsx`
- `game/src/components/PassiveEffects.tsx`
- `game/src/data/codex.ts`

建议叠加文案：

- `状态看图标，强度看层数。`
- `红色或异常图标通常代表危险。`
- `体质被动会改变你的出牌收益。`

制作备注：

- 本图不列完整状态词典，避免新手负担过高。
- 详细状态说明以后放进图鉴或高级教程。

### 08. 战斗后奖励与构筑

用途：解释胜利后为什么要选择奖励，以及奖励如何改变后续战斗。

学习点：战斗后可以选卡、获得装备、录入药方蓝图；这些都会让牌组或被动能力变强。

推荐构图：

- 使用 `RewardView` 实机截图作为主体。
- 三选一卡牌放中央，装备或蓝图放侧边。
- 用箭头指向“加入牌组”“装备生效”“录入合成台”。

生成关键词：

`战斗奖励界面, 三选一卡牌奖励, 装备掉落, 药方蓝图, 牌组构筑, 奖励选择教学, 古风卡牌奖励UI`

负面词：

`抽卡十连界面, 现代商城弹窗, 夸张礼包广告, 错误中文文字, 乱码, 模糊卡牌`

参考素材：

- `game/src/components/RewardView.tsx`
- `game/public/assets/cards_equipment/*.webp`
- `game/public/assets/cards_formula_placeholders/*.png`
- `game/public/assets/cards_player/*.png`

建议叠加文案：

- `每次奖励都是一次构筑选择。`
- `选卡会改变后续手牌。`
- `蓝图先录入，之后才能合成对应药方。`

制作备注：

- 装备奖励在 UI 上应表达为“获得后生效/被动”，不要表现成普通手牌。
- 蓝图和药方牌要区分清楚：蓝图是配方信息，药方牌是合成后的牌组成员。

### 09. 药方合成

用途：解释游戏特色系统：不是直接获得所有药方，而是通过蓝图和药材合成。

学习点：已有蓝图 + 足够药材牌 -> 合成药方牌；合成成功会消耗所选药材实例，并把药方牌加入当前牌组。

推荐构图：

- 背景使用药房或合成台。
- 左侧为蓝图目录，中间为药材配方槽，右侧为合成出的药方牌。
- 下方加入汤头歌诀区域，体现中医药方特色。

生成关键词：

`中药方合成台, 药材配方, 蓝图解锁, 合成药方卡, 汤头歌诀卷轴, 古风药房, 药柜, 暗金色UI, 药材牌`

负面词：

`现代化学实验室, 炼金术魔法阵过重, 科幻制造台, 错误中文文字, 乱码, 模糊药方`

参考素材：

- `game/public/assets/bg_synthesis_1.png`
- `game/public/assets/bg_synthesis_2.png`
- `game/public/assets/cards_formula_placeholders/*.png`
- `game/public/assets/cards_player/*.png`
- `game/src/components/SynthesisBench.tsx`
- `shared/data/formulas.ts`

建议叠加文案：

- `先获得蓝图，再准备药材。`
- `选齐配方后，合成药方牌。`
- `药方会加入牌组，成为后续战斗的核心牌。`

制作备注：

- 合成规则应和 `SynthesisBench` 当前文案一致：合成成功会消耗所选药材实例，并把药方牌加入当前牌组。
- 汤头歌诀只作为特色信息，不要抢占合成步骤的视觉优先级。

## 后期合成流程

1. 截取当前游戏真实 UI：体质选择、地图、战斗、奖励、合成台。
2. 生成或整理每张图的背景氛围图。
3. 在 Figma、Photoshop 或同类工具中合成真实 UI、卡牌、箭头、框选和中文说明。
4. 导出初版 `1920x1080` 图片并对照当前规则检查。
5. 压缩成运行时素材，建议后续放入 `game/public/assets/tutorial/`。
6. 分层源文件、废稿、参考拼贴放入 `未使用/tutorial_art_sources/`，避免进入运行时资源加载范围。

## 建议文件命名

- `tutorial_01_overview.webp`
- `tutorial_02_constitution.webp`
- `tutorial_03_cards.webp`
- `tutorial_04_map.webp`
- `tutorial_05_combat_ui.webp`
- `tutorial_06_turn_example.webp`
- `tutorial_07_status.webp`
- `tutorial_08_rewards.webp`
- `tutorial_09_synthesis.webp`

## 落地入口建议

后续如果要接入游戏内，默认新增一个“新手教程”或“巡诊指南”入口，不建议强制每局弹出。

可选入口：

- `IntroView` 或 `StartMenu` 增加“巡诊指南”按钮。
- 首次进入体质选择前显示一次可跳过入口。
- 图鉴页增加“教程”分组，用于复看核心规则。

默认交互要求：

- 必须可跳过。
- 必须可复看。
- 不阻断玩家再次开局。
- 如果使用轮播图，需要支持上一页、下一页、关闭。

## 规则一致性检查

制作和上线前必须逐项确认：

- 9 张图覆盖路径：选体质、看地图、战斗、奖励、合成、首领目标。
- 地图图文明确：击败 3 场战斗后解锁首领。
- 卡牌图文明确：药材牌、药方牌、装备牌不是同一种获得和使用方式。
- 奖励图文明确：蓝图是录入合成台，不等同于直接获得药方牌。
- 合成图文明确：合成会消耗所选药材实例，并把药方牌加入当前牌组。
- 战斗图文明确：玩家先看敌人意图，再决定攻击、防守或结束回合。
- 图中文字没有遮挡真实 UI 的关键资源、生命、真气、敌人意图、卡牌费用。
- 所有参考素材路径存在；不存在的素材必须改用实机截图或后期合成。
- 最终图片压缩后清晰可读，无 404，无错误中文，无 AI 乱码小字。

## 后续待办

- 运行游戏并截取 5 个关键实机画面：体质选择、地图、战斗、奖励、合成台。
- 决定教程入口位置：主菜单入口、图鉴入口，或两者都保留。
- 生成第一批背景草图后，先评审 01、03、05 三张代表图，再批量制作剩余图片。
- 若后续做游戏内轮播，新增 `game/public/assets/tutorial/` 并确认不把源文件放入运行时 manifest。
