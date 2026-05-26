# 五行医道平衡性调整手册

更新日期：2026-05-26

这份文档面向后续大量数值调整使用。它把玩家卡牌、敌方机制卡、起始牌组、药方蓝图、装备、敌人基础属性和敌方行动候选数值集中到一个地方。

数据来源：`shared/data/cards.ts`、`shared/data/formulas.ts`、`shared/data/enemies.ts`、`shared/core/enemyStrategies.ts`。

## 使用原则

- 调玩家卡牌：先看“玩家卡牌总表”和“效果 ID 索引”，再改 `shared/data/cards.ts` 与 `shared/core/gameCore.ts`。
- 调敌人：先看“敌人基础属性”和“敌方行动候选数值”，再改 `shared/data/enemies.ts` 与 `shared/core/enemyStrategies.ts`。
- 调体质开局强度：先看“起始牌组统计”，不要只看单卡。
- 调完规则必须补或改 `game/src/store/gameCore.test.ts`；涉及流程、奖励、合成或状态同步时再改 `game/src/store/gameStore.test.ts`。
- 不要为了平衡改 UI 表现层。战斗动画和浮字 cue 在 `CombatView.tsx`，不应影响结算。
- 第一轮平衡已取消“攻击牌实际费用强制为 0”的结算特例；所有攻击牌现在按印刷费用和费用修正正常消耗真气。

## 快速改数入口

| 目标 | 主要文件 | 需要同步检查 |
| --- | --- | --- |
| 玩家卡牌费用/文案/基础数值 | shared/data/cards.ts | effectId、effectValue、secondaryValue、target、description |
| 玩家卡牌实际结算 | shared/core/gameCore.ts | resolveCardPlay 中对应 effectId 分支、相关测试 |
| 药方配方和合成材料 | shared/data/formulas.ts | FORMULA_BLUEPRINTS、合成测试、图鉴展示 |
| 装备被动强度 | shared/data/cards.ts + shared/core/gameCore.ts | equipment_* effectId、countRelic/countEquipment 倍乘逻辑 |
| 敌人 HP/初始格挡/初始意图 | shared/data/enemies.ts | ENEMY_POOLS、管理员挑战列表、图鉴 |
| 敌人行动/攻击/负面效果 | shared/core/enemyStrategies.ts | getPrimaryIntent、getFollowUpIntent、executeIntent、getEnemyActionCount |
| 楼层缩放 | shared/core/gameCore.ts | getEnemyScaling；当前普通开战流程只实装 HP 缩放 |
| 起始牌组 | shared/data/cards.ts | STARTING_DECKS 与体质被动强度一起看 |

## 第一轮平衡记录（2026-05-26）

- 攻击牌不再被结算层强制改为 0 费；费用增加、费用减少、脾虚湿盛和 Boss 土相会正常影响攻击牌。
- 0 费高收益牌整体削峰：人参补气、豆豉宣郁、竹叶清心、天冬养阴、半夏燥湿、牛蒡解毒、苍术健脾、莪术破积、柴胡疏肝等已上调费用或下调数值。
- 苍术健脾从“格挡翻倍”改为“格挡 +50%”，且不与真武汤的格挡 +50% 叠乘。
- 朱砂安神攻击眩晕概率从 25% 降至 15%；半夏燥湿全体眩晕从 2 回合降至 1 回合。
- 气虚质、阳虚质、湿热质、血瘀质起始牌组已换牌，开局平均费用收敛到约 0.6-0.95。
- 普通敌 Act 2 双动概率从 65% 降至 45%；普通敌 Act 3 从固定双动改为 80% 概率双动。
- 装备仍可重复获得，但效果按有效层数上限结算：阴阳学说/辨证论治/气机升降/藏象学说/正邪相争/气血津液/子午流注最多 1 件生效，经络学说/天人相应/整体观念/治未病最多 2 件生效。

## 第二轮组合削峰记录（2026-05-26）

- 血瘀 0 费攻击链削峰：三棱破血、三七化瘀、川芎行气、白芍柔肝改为 1 费；血瘀质每回合只有前 2 张攻击牌会由体质被动叠加血瘀。
- 气郁抽牌循环削峰：枳实行气改为 1 费；点穴：合谷、肉桂引火、金银花露也改为 1 费，降低 0 费控制/抽牌/增伤攻击密度。
- 阴虚后期爆发削峰：杏仁降气从 8 伤降至 6 伤；五味敛阴从 5 滋阴/5 格挡降至 3 滋阴/4 格挡。
- 防守闭环削峰：熟地滋阴从“获得等量护盾”改为“额外获得 50% 护盾”；痰湿禁锢 3 层触发后只眩晕，不再额外附带虚弱。

## 第三轮敌人和装备曲线记录（2026-05-26）

- 敌人双动增加强干扰限频：同一敌人连续行动时，不再允许强负面/强特殊意图接另一个强干扰意图。
- 心神不交者、痰蒙心窍者的单次控制从复合负面改为单项负面，避免眩晕、禁格挡、少抽在一次行动内叠压。
- 脾虚湿盛者的 `cost_up` 从 3 回合可叠加改为 2 回合不可叠加；仍保留湿邪与在场费用光环。
- 肾不纳气者不再一次性叠加 `energy_drain`、`max_energy_down`、寒邪、虚弱；普通敌版本保留短期真气压制和寒邪。
- `max_energy_down` 只影响下回合真气回复，不再永久降低 `maxEnergy`。
- 装备战斗掉落改为按幕数分池：Act 1 只掉治未病/经络学说/天人相应，Act 2 增加整体观念/气血津液/正邪相争/藏象学说，Act 3 开放完整装备池。
- 装备掉率按幕数收紧：Act 1 普通/精英/Boss 为 6%/15%/35%，Act 2 为 8%/18%/45%，Act 3 保持 10%/20%/50%。
- 高影响装备事件延后或加成本：子午流注至少 Act 2 且继承损失最大生命；整体观念/气血津液/藏象学说至少 Act 2；辨证论治/阴阳学说/气机升降至少 Act 3。

## 第四轮事件与商店曲线记录（2026-05-26）

- 事件负金币选项改为真实成本：金币不足时 UI 禁用该选项，结算层也会拒绝执行，避免负金币被夹到 0 后免费获得强奖励。
- 本轮只对商店执行 Act 限池：药房购买池只刷新当前幕及以前的可打出药材牌。
- 药房合成目标也受当前 Act 限制，不能在 Act 1/2 用商店合成提前复制后期药材。
- 本轮未改战斗奖励、宝箱、事件随机牌、休憩或药方蓝图来源。

## 当前总体统计

| 维度 | 统计 |
| --- | --- |
| 卡牌模板总数 | 108 |
| 卡牌分类 | 敌方机制:10 / 装备被动:11 / 玩家药方:12 / 玩家药材:75 |
| 战斗类型 | 攻击:28 / 能力:36 / 技能:44 |
| 稀有度 | 普通:22 / 稀有:56 / 精良:30 |
| 费用曲线 | 0:36 / 1:53 / 2:15 / 3:4 |
| 目标类型 | 全体敌人:12 / 自身:72 / 单体敌人:24 |
| 敌人总数 | 20 |
| 敌方机制卡 | 10 |
| 起始牌组数量 | 10 |
| 药方蓝图数量 | 12 |

### 按卡牌分类统计

| 分类 | 数量 | 平均费用 | 类型分布 | 稀有度分布 | 费用分布 | 主数值范围/均值 | 副数值范围/均值 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 敌方机制 | 10 | 0 | 能力:10 | 稀有:10 | 0:10 | - | - |
| 装备被动 | 11 | 0 | 能力:11 | 普通:3 / 稀有:4 / 精良:4 | 0:11 | - | - |
| 玩家药方 | 12 | 1.0 | 攻击:5 / 能力:1 / 技能:6 | 稀有:12 | 0:1 / 1:10 / 2:1 | 5-10 / 均7.4 | 1-6 / 均2.1 |
| 玩家药材 | 75 | 1.1 | 攻击:23 / 能力:14 / 技能:38 | 普通:19 / 稀有:30 / 精良:26 | 0:14 / 1:43 / 2:14 / 3:4 | 0.3-20 / 均5.0 | 1-8 / 均3.0 |

### 按费用统计

| 费用 | 数量 | 占比 | 分类分布 | 类型分布 |
| --- | --- | --- | --- | --- |
| 0 | 36 | 36 (33.3%) | 敌方机制:10 / 装备被动:11 / 玩家药方:1 / 玩家药材:14 | 攻击:7 / 能力:23 / 技能:6 |
| 1 | 53 | 53 (49.1%) | 玩家药方:10 / 玩家药材:43 | 攻击:17 / 能力:5 / 技能:31 |
| 2 | 15 | 15 (13.9%) | 玩家药方:1 / 玩家药材:14 | 攻击:4 / 能力:7 / 技能:4 |
| 3 | 4 | 4 (3.7%) | 玩家药材:4 | 能力:1 / 技能:3 |

### 按战斗类型统计

| 类型 | 数量 | 占比 | 平均费用 | 分类分布 | 稀有度分布 |
| --- | --- | --- | --- | --- | --- |
| 攻击 | 28 | 28 (25.9%) | 0.9 | 玩家药方:5 / 玩家药材:23 | 普通:8 / 稀有:13 / 精良:7 |
| 能力 | 36 | 36 (33.3%) | 0.6 | 敌方机制:10 / 装备被动:11 / 玩家药方:1 / 玩家药材:14 | 普通:3 / 稀有:25 / 精良:8 |
| 技能 | 44 | 44 (40.7%) | 1.1 | 玩家药方:6 / 玩家药材:38 | 普通:11 / 稀有:18 / 精良:15 |

## 起始牌组统计

这里是每种体质开局 15 张卡的整体强度入口。调开局难度时，优先比较平均费用、攻击/技能/能力比例、0 费数量和重复卡。

| 牌组 ID | 体质 | 张数 | 平均费用 | 类型分布 | 费用曲线 | 稀有度 | 卡牌组成 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| balanced | 平和质 | 15 | 1.1 | 攻击:5 / 能力:2 / 技能:8 | 0:3 / 1:8 / 2:4 | 普通:10 / 稀有:2 / 精良:3 | 白芍柔肝、陈皮理气、川芎行气、大枣养血、当归补血、甘草和中、葛根解肌、桂枝通络、黄连燥湿、黄芪固表、麻黄发汗、山药平补、山楂消食、薏苡除湿、针刺：足三里 |
| yin_deficiency | 阴虚质 | 15 | 1.0 | 攻击:4 / 能力:1 / 技能:10 | 0:4 / 1:7 / 2:4 | 普通:2 / 稀有:5 / 精良:8 | 百合安神、鳖甲软坚、金银花露、连翘解毒、麦冬滋阴、蒲公英消肿、人参补气、山萸肉固涩、生地凉血、石斛益胃、五味敛阴、杏仁降气、玄参泻火、玉竹生津、知母清热 |
| qi_deficiency | 气虚质 | 15 | 0.9 | 攻击:2 / 能力:1 / 技能:12 | 0:3 / 1:10 / 2:2 | 普通:7 / 稀有:3 / 精良:5 | 黄芪固表、党参补气、白术健脾、甘草和中、山药平补、大枣养血、防风祛风、竹叶清心、豆豉宣郁、天冬养阴、黄芩清肺、山楂消食、桂枝通络、薏苡除湿、陈皮理气 |
| yang_deficiency | 阳虚质 | 15 | 0.9 | 攻击:6 / 能力:2 / 技能:7 | 0:4 / 1:9 / 2:1 / 3:1 | 普通:9 / 稀有:3 / 精良:3 | 附子回阳、肉桂引火、艾灸：关元、陈皮理气、甘草和中、黄芩清肺、桂枝通络、生姜发散、大枣养血、麻黄发汗、细辛通窍、大黄攻下、山楂消食、茯苓渗湿、薄荷疏风 |
| phlegm_dampness | 痰湿质 | 15 | 1.0 | 攻击:3 / 能力:3 / 技能:9 | 0:2 / 1:11 / 2:2 | 普通:4 / 稀有:5 / 精良:6 | 白术健脾、半夏燥湿、苍术健脾、陈皮理气、点穴：合谷、耳穴：神门、防风祛风、茯苓渗湿、苏叶解表、酸枣仁安眠、天冬养阴、温针灸：三阴交、薏苡除湿、泽泻利水、枳实行气 |
| damp_heat | 湿热质 | 15 | 0.9 | 攻击:8 / 技能:7 | 0:4 / 1:9 / 2:2 | 普通:5 / 稀有:4 / 精良:6 | 板蓝根清热、黄连燥湿、金银花露、连翘解毒、石膏清热、牛蒡解毒、黄芩清肺、蒲公英消肿、大黄攻下、甘草和中、知母清热、生地凉血、玄参泻火、杏仁降气、刮痧：大椎 |
| blood_stasis | 血瘀质 | 15 | 1.1 | 攻击:10 / 能力:1 / 技能:4 | 0:2 / 1:11 / 2:1 / 3:1 | 普通:6 / 稀有:5 / 精良:4 | 薄荷疏风、川芎行气、大黄攻下、点穴：合谷、莪术破积、桂枝通络、厚朴行气、雷火灸：命门、白芍柔肝、肉桂引火、三棱破血、三七化瘀、生姜发散、细辛通窍、枳实行气 |
| qi_stagnation | 气郁质 | 15 | 0.9 | 攻击:4 / 能力:2 / 技能:9 | 0:2 / 1:12 / 2:1 | 普通:5 / 稀有:3 / 精良:7 | 白芍柔肝、陈皮理气、赤芍凉血、川芎行气、大枣养血、点穴：合谷、耳穴：神门、葛根解肌、刮痧：大椎、桔梗宣肺、酸枣仁安眠、天冬养阴、推拿：捏脊、泽泻利水、枳实行气 |
| special_diathesis | 特禀质 | 15 | 1.0 | 攻击:3 / 能力:8 / 技能:4 | 0:3 / 1:9 / 2:3 | 稀有:9 / 精良:6 | 艾灸：关元、拔罐：走罐、薄荷疏风、砭石：阿是穴、赤芍凉血、点穴：合谷、豆豉宣郁、耳穴：神门、干姜温中、桔梗宣肺、芥穗散风、酸枣仁安眠、推拿：捏脊、针刺：足三里、朱砂安神 |
| admin | 管理员 | 15 | 1.0 | 攻击:9 / 能力:1 / 技能:5 | 0:3 / 1:9 / 2:3 | 普通:8 / 稀有:2 / 精良:5 | 白芍柔肝、白术健脾、陈皮理气、川芎行气、党参补气、甘草和中、黄连燥湿、黄芪固表、金银花露、连翘解毒、麻黄发汗、人参补气、山药平补、山楂消食、石膏清热 |

### 起始牌组矩阵

列为所有出现在起始牌组里的卡牌，单元格为该体质初始拥有数量。第一轮平衡后，上方“起始牌组统计”和 `shared/data/cards.ts` 的 `STARTING_DECKS` 是当前真值；本矩阵主要用于快速横向扫视，后续若继续大规模换牌建议全量再生成。

| 体质 | 陈皮理气 | 三棱破血 | 山楂消食 | 薏苡除湿 | 生姜发散 | 金银花露 | 桂枝通络 | 白芍柔肝 | 川芎行气 | 葛根解肌 | 麻黄发汗 | 大黄攻下 | 黄连燥湿 | 黄芪固表 | 当归补血 | 针刺：足三里 | 板蓝根清热 | 茯苓渗湿 | 麦冬滋阴 | 三七化瘀 | 干姜温中 | 苍术健脾 | 生地凉血 | 知母清热 | 玄参泻火 | 玉竹生津 | 百合安神 | 鳖甲软坚 | 石斛益胃 | 山萸肉固涩 | 杏仁降气 | 白术健脾 | 甘草和中 | 山药平补 | 党参补气 | 大枣养血 | 防风祛风 | 熟地滋阴 | 附子回阳 | 朱砂安神 | 酸枣仁安眠 | 泽泻利水 | 枳实行气 | 连翘解毒 | 肉桂引火 | 细辛通窍 | 天冬养阴 | 赤芍凉血 | 五味敛阴 | 石膏清热 | 厚朴行气 | 苏叶解表 | 人参补气 | 竹叶清心 | 豆豉宣郁 | 芥穗散风 | 莪术破积 | 牛蒡解毒 | 半夏燥湿 | 柴胡疏肝 | 蒲公英消肿 | 桔梗宣肺 | 薄荷疏风 | 艾灸：关元 | 推拿：捏脊 | 拔罐：走罐 | 耳穴：神门 | 刮痧：大椎 | 温针灸：三阴交 | 点穴：合谷 | 雷火灸：命门 | 砭石：阿是穴 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 平和质 | 1 |  | 1 | 1 |  |  | 1 | 1 | 1 | 1 | 1 |  | 1 | 1 | 1 | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 | 1 |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 阴虚质 |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |  |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  | 1 |  |  |  | 1 |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |  |  |
| 气虚质 |  |  | 1 | 1 |  |  | 1 |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 | 1 | 1 | 1 | 1 | 1 | 1 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  | 1 | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 阳虚质 |  |  |  |  | 1 |  | 1 |  |  |  | 1 | 1 |  |  |  |  |  |  |  |  | 1 | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  | 1 |  |  |  |  |  | 1 | 1 |  |  |  |  |  |  |  |  |  |  | 1 |  |  | 1 |  |  | 1 | 1 |  |  |  |  |  |  | 1 |  |
| 痰湿质 | 1 |  |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  | 1 |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  | 1 |  |  |  | 1 | 1 | 1 |  |  |  | 1 |  |  |  |  | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  | 1 |  | 1 | 1 |  |  |
| 湿热质 |  |  |  |  |  | 1 |  |  |  |  |  | 1 | 1 |  |  |  | 1 |  |  |  |  |  | 1 | 1 | 1 |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  | 1 |  |  | 1 |  |  |  | 1 | 1 |  |  | 1 |  |  |  |  |  |  | 1 |  |  |  |  |
| 血瘀质 |  | 1 |  |  | 1 |  | 1 |  | 1 |  |  | 1 |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |  | 1 | 1 |  |  |  |  | 1 |  | 1 |  |  |  | 1 |  |  |  |  |  | 1 |  |  |  |  |  |  | 1 | 1 |  |
| 气郁质 | 1 |  |  |  |  |  |  | 1 | 1 | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  | 1 | 1 | 1 |  |  |  | 1 | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  | 1 |  | 1 | 1 |  | 1 |  |  |
| 特禀质 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  | 1 | 1 |  |  |  |  |  | 1 | 1 | 1 | 1 | 1 | 1 |  |  | 1 |  | 1 |
| 管理员 | 1 |  | 1 |  |  | 1 |  | 1 | 1 |  | 1 |  | 1 | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 | 1 | 1 | 1 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  | 1 |  |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## 效果 ID 索引

同一个 `effectId` 可能被多张卡复用。批量调平衡时，优先检查同 effectId 的费用和数值是否形成异常断层。

| effectId | 卡数 | 分类 | 类型 | 费用 | 主数值范围/均值 | 副数值范围/均值 | 涉及卡牌 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| status_enemy | 10 | 敌方机制:10 | 能力:10 | 0:10 | - | - | 肝火旺、脾虚湿困、风寒束表、热入营血、肾不纳气、气滞血瘀、心肾不交、痰蒙心窍、阳明腑实、冲任不固 |
| block | 2 | 玩家药材:2 | 技能:2 | 1:1 / 2:1 | 10-14 / 均12 | - | 黄芪固表、竹叶清心 |
| heal_draw | 2 | 玩家药材:2 | 技能:2 | 1:2 | 4-12 / 均8 | 1-2 / 均1.5 | 甘草和中、豆豉宣郁 |
| aoe_damage | 1 | 玩家药材:1 | 攻击:1 | 0:1 | 5-5 / 均5 | - | 拔罐：走罐 |
| aoe_damage_cleanse | 1 | 玩家药材:1 | 攻击:1 | 1:1 | 3-3 / 均3 | - | 金银花露 |
| aoe_damage_cleanse_all_buffs | 1 | 玩家药材:1 | 攻击:1 | 2:1 | 8-8 / 均8 | - | 牛蒡解毒 |
| aoe_damage_cleanse_heat | 1 | 玩家药材:1 | 攻击:1 | 0:1 | 4-4 / 均4 | - | 连翘解毒 |
| aoe_damage_heat | 1 | 玩家药材:1 | 攻击:1 | 1:1 | 7-7 / 均7 | 1-1 / 均1 | 石膏清热 |
| aoe_debuff_heat | 1 | 玩家药材:1 | 技能:1 | 1:1 | 1-1 / 均1 | - | 板蓝根清热 |
| aoe_stun | 1 | 玩家药材:1 | 攻击:1 | 2:1 | 1-1 / 均1 | - | 半夏燥湿 |
| apply_weak | 1 | 玩家药材:1 | 攻击:1 | 1:1 | 2-2 / 均2 | - | 点穴：合谷 |
| attack_pierce_all | 1 | 玩家药材:1 | 攻击:1 | 1:1 | - | - | 细辛通窍 |
| attack_stun_chance | 1 | 玩家药材:1 | 能力:1 | 1:1 | - | - | 朱砂安神 |
| block_apply_vulnerable | 1 | 玩家药材:1 | 技能:1 | 1:1 | 7-7 / 均7 | - | 防风祛风 |
| block_cleanse_self | 1 | 玩家药材:1 | 技能:1 | 1:1 | 4-4 / 均4 | - | 薏苡除湿 |
| block_draw_cleanse_damp | 1 | 玩家药材:1 | 技能:1 | 1:1 | 5-5 / 均5 | - | 茯苓渗湿 |
| block_echo_power | 1 | 玩家药材:1 | 能力:1 | 3:1 | - | - | 熟地滋阴 |
| block_if_no_damage_strength | 1 | 玩家药材:1 | 技能:1 | 1:1 | 6-6 / 均6 | 2-2 / 均2 | 白术健脾 |
| block_next_skill_bonus | 1 | 玩家药材:1 | 技能:1 | 1:1 | 4-4 / 均4 | 2-2 / 均2 | 党参补气 |
| block_per_card | 1 | 玩家药材:1 | 技能:1 | 1:1 | 3-3 / 均3 | - | 艾叶温经 |
| block_pierce_buff | 1 | 玩家药材:1 | 技能:1 | 1:1 | 3-3 / 均3 | 3-3 / 均3 | 桂枝通络 |
| block_reduce_next_damage | 1 | 玩家药材:1 | 能力:1 | 0:1 | 5-5 / 均5 | 3-3 / 均3 | 耳穴：神门 |
| block_to_strength | 1 | 玩家药材:1 | 能力:1 | 1:1 | - | - | 升麻升提 |
| buff_attack | 1 | 玩家药材:1 | 技能:1 | 0:1 | 3-3 / 均3 | - | 生姜发散 |
| buff_yin | 1 | 玩家药材:1 | 技能:1 | 1:1 | 2-2 / 均2 | - | 麦冬滋阴 |
| cleanse_damp_convert_block | 1 | 玩家药材:1 | 技能:1 | 1:1 | - | - | 泽泻利水 |
| cleanse_draw | 1 | 玩家药材:1 | 技能:1 | 0:1 | 3-3 / 均3 | - | 赤芍凉血 |
| cleanse_enemy_buffs | 1 | 玩家药材:1 | 攻击:1 | 0:1 | - | - | 厚朴行气 |
| cleanse_heat_aoe_damage | 1 | 玩家药材:1 | 技能:1 | 1:1 | - | - | 蒲公英消肿 |
| cleanse_heat_cold | 1 | 玩家药材:1 | 技能:1 | 1:1 | - | - | 刮痧：大椎 |
| cleanse_self_heal | 1 | 玩家药材:1 | 技能:1 | 0:1 | 10-10 / 均10 | - | 苏叶解表 |
| cleanse_two_draw | 1 | 玩家药材:1 | 技能:1 | 1:1 | - | - | 推拿：捏脊 |
| copy_buff_exhaust | 1 | 玩家药材:1 | 能力:1 | 0:1 | - | - | 砭石：阿是穴 |
| cost_reduction_turn | 1 | 玩家药材:1 | 能力:1 | 1:1 | - | - | 薄荷疏风 |
| dahuang_effect | 1 | 玩家药材:1 | 攻击:1 | 1:1 | 10-10 / 均10 | 2-2 / 均2 | 大黄攻下 |
| damage_block | 1 | 玩家药材:1 | 攻击:1 | 0:1 | 3-3 / 均3 | 5-5 / 均5 | 山楂消食 |
| damage_cleanse_buff | 1 | 玩家药材:1 | 攻击:1 | 0:1 | 6-6 / 均6 | - | 黄连燥湿 |
| damage_conditional_stasis | 1 | 玩家药材:1 | 攻击:1 | 1:1 | 5-5 / 均5 | 5-5 / 均5 | 三七化瘀 |
| damage_debuff_stasis | 1 | 玩家药材:1 | 攻击:1 | 1:1 | 7-7 / 均7 | 1-1 / 均1 | 三棱破血 |
| damage_draw | 1 | 玩家药材:1 | 攻击:1 | 1:1 | 5-5 / 均5 | - | 川芎行气 |
| danggui_effect | 1 | 玩家药材:1 | 技能:1 | 1:1 | 5-5 / 均5 | - | 当归补血 |
| debuff_weak_draw | 1 | 玩家药材:1 | 攻击:1 | 1:1 | 1-1 / 均1 | - | 白芍柔肝 |
| double_block_buff | 1 | 玩家药材:1 | 能力:1 | 2:1 | - | - | 苍术健脾 |
| draw_discard | 1 | 玩家药材:1 | 技能:1 | 1:1 | 2-2 / 均2 | 1-1 / 均1 | 陈皮理气 |
| draw_if_attack | 1 | 玩家药材:1 | 技能:1 | 1:1 | - | - | 枳实行气 |
| draw_to_hand | 1 | 玩家药材:1 | 能力:1 | 1:1 | - | - | 桔梗宣肺 |
| end_turn_heal_power | 1 | 玩家药材:1 | 能力:1 | 2:1 | 2-2 / 均2 | - | 山药平补 |
| energy_max_heal | 1 | 玩家药材:1 | 能力:1 | 2:1 | 1-1 / 均1 | 3-3 / 均3 | 艾灸：关元 |
| equipment_bianzheng | 1 | 装备被动:1 | 能力:1 | 0:1 | - | - | 辨证论治 |
| equipment_jingluo | 1 | 装备被动:1 | 能力:1 | 0:1 | - | - | 经络学说 |
| equipment_qiji | 1 | 装备被动:1 | 能力:1 | 0:1 | - | - | 气机升降 |
| equipment_qixue_jinye | 1 | 装备被动:1 | 能力:1 | 0:1 | - | - | 气血津液 |
| equipment_tianren | 1 | 装备被动:1 | 能力:1 | 0:1 | - | - | 天人相应 |
| equipment_yinyang | 1 | 装备被动:1 | 能力:1 | 0:1 | - | - | 阴阳学说 |
| equipment_zangxiang | 1 | 装备被动:1 | 能力:1 | 0:1 | - | - | 藏象学说 |
| equipment_zhengti | 1 | 装备被动:1 | 能力:1 | 0:1 | - | - | 整体观念 |
| equipment_zhengxie | 1 | 装备被动:1 | 能力:1 | 0:1 | - | - | 正邪相争 |
| equipment_zhiweibing | 1 | 装备被动:1 | 能力:1 | 0:1 | - | - | 治未病 |
| equipment_ziwuliuzhu | 1 | 装备被动:1 | 能力:1 | 0:1 | - | - | 子午流注 |
| formula_banxia_houpu_tang | 1 | 玩家药方:1 | 攻击:1 | 1:1 | 8-8 / 均8 | 2-2 / 均2 | 半夏厚朴汤 |
| formula_gegen_tang | 1 | 玩家药方:1 | 技能:1 | 1:1 | 8-8 / 均8 | 1-1 / 均1 | 葛根汤 |
| formula_jiaotai_wan | 1 | 玩家药方:1 | 技能:1 | 0:1 | 6-6 / 均6 | - | 交泰丸 |
| formula_lizhong_wan | 1 | 玩家药方:1 | 技能:1 | 1:1 | 8-8 / 均8 | 1-1 / 均1 | 理中丸 |
| formula_mahuang_tang | 1 | 玩家药方:1 | 攻击:1 | 1:1 | - | - | 麻黄汤 |
| formula_maxing_shigan_tang | 1 | 玩家药方:1 | 攻击:1 | 1:1 | 10-10 / 均10 | 2-2 / 均2 | 麻杏石甘汤 |
| formula_sijunzi_tang | 1 | 玩家药方:1 | 技能:1 | 1:1 | 10-10 / 均10 | 6-6 / 均6 | 四君子汤 |
| formula_suanzaoren_tang | 1 | 玩家药方:1 | 技能:1 | 1:1 | 5-5 / 均5 | 1-1 / 均1 | 酸枣仁汤 |
| formula_xiaochaihu_tang | 1 | 玩家药方:1 | 技能:1 | 1:1 | 6-6 / 均6 | 2-2 / 均2 | 小柴胡汤 |
| formula_xiaoqinglong_tang | 1 | 玩家药方:1 | 攻击:1 | 1:1 | 7-7 / 均7 | 3-3 / 均3 | 小青龙汤 |
| formula_yinqiao_san | 1 | 玩家药方:1 | 攻击:1 | 1:1 | 6-6 / 均6 | 1-1 / 均1 | 银翘散 |
| formula_zhenwu_tang | 1 | 玩家药方:1 | 能力:1 | 2:1 | - | - | 真武汤 |
| heal_block | 1 | 玩家药材:1 | 技能:1 | 1:1 | 12-12 / 均12 | 4-4 / 均4 | 天冬养阴 |
| heal_block_exhaust | 1 | 玩家药材:1 | 技能:1 | 0:1 | 2-2 / 均2 | 2-2 / 均2 | 大枣养血 |
| heal_draw_block | 1 | 玩家药材:1 | 技能:1 | 2:1 | 5-5 / 均5 | 4-4 / 均4 | 葛根解肌 |
| huangqin_effect | 1 | 玩家药材:1 | 攻击:1 | 0:1 | 4-4 / 均4 | 1-1 / 均1 | 黄芩清肺 |
| mahuang_effect | 1 | 玩家药材:1 | 攻击:1 | 1:1 | 8-8 / 均8 | 4-4 / 均4 | 麻黄发汗 |
| percent_damage | 1 | 玩家药材:1 | 攻击:1 | 2:1 | 0.25-0.25 / 均0.25 | - | 莪术破积 |
| retain_block_power | 1 | 玩家药材:1 | 能力:1 | 1:1 | - | - | 温针灸：三阴交 |
| revive_buff | 1 | 玩家药材:1 | 能力:1 | 2:1 | 20-20 / 均20 | - | 干姜温中 |
| sleep_debuff | 1 | 玩家药材:1 | 攻击:1 | 1:1 | - | - | 酸枣仁安眠 |
| steal_buffs | 1 | 玩家药材:1 | 技能:1 | 1:1 | - | - | 芥穗散风 |
| strength_block | 1 | 玩家药材:1 | 技能:1 | 3:1 | 3-3 / 均3 | 5-5 / 均5 | 雷火灸：命门 |
| strength_dex_block | 1 | 玩家药材:1 | 技能:1 | 3:1 | 1-1 / 均1 | 5-5 / 均5 | 附子回阳 |
| strength_dex_heal | 1 | 玩家药材:1 | 技能:1 | 3:1 | 2-2 / 均2 | 8-8 / 均8 | 柴胡疏肝 |
| strength_temp | 1 | 玩家药材:1 | 攻击:1 | 1:1 | 3-3 / 均3 | - | 肉桂引火 |
| true_damage | 1 | 玩家药材:1 | 攻击:1 | 2:1 | 18-18 / 均18 | - | 人参补气 |
| yin_attack_virtual_heat | 1 | 玩家药材:1 | 技能:1 | 1:1 | 1-1 / 均1 | - | 知母清热 |
| yin_block | 1 | 玩家药材:1 | 技能:1 | 0:1 | 3-3 / 均3 | 4-4 / 均4 | 五味敛阴 |
| yin_block_scaling | 1 | 玩家药材:1 | 技能:1 | 2:1 | 5-5 / 均5 | - | 鳖甲软坚 |
| yin_cap_increase | 1 | 玩家药材:1 | 技能:1 | 0:1 | 1-1 / 均1 | - | 石斛益胃 |
| yin_cleanse | 1 | 玩家药材:1 | 技能:1 | 1:1 | - | - | 百合安神 |
| yin_gain_exhaust | 1 | 玩家药材:1 | 技能:1 | 2:1 | 4-4 / 均4 | - | 生地凉血 |
| yin_heal_scaling | 1 | 玩家药材:1 | 技能:1 | 1:1 | 3-3 / 均3 | - | 山萸肉固涩 |
| yin_power_energy | 1 | 玩家药材:1 | 能力:1 | 2:1 | - | - | 玉竹生津 |
| yin_spend_damage_random | 1 | 玩家药材:1 | 技能:1 | 1:1 | - | - | 玄参泻火 |
| yin_spend_double_damage | 1 | 玩家药材:1 | 攻击:1 | 0:1 | 6-6 / 均6 | - | 杏仁降气 |
| zusanli_effect | 1 | 玩家药材:1 | 能力:1 | 2:1 | 1-1 / 均1 | - | 针刺：足三里 |

## 玩家与敌方机制卡总表

说明：`值1` 对应 `effectValue`，`值2` 对应 `secondaryValue`。实际含义以 `effectId` 在 `shared/core/gameCore.ts` 的分支为准。

| ID | 名称 | 分类 | 类型 | 稀有度 | 费用 | 目标 | Act | effectId | 值1 | 值2 | 不可打出 | 描述 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| huangqin | 黄芩清肺 | 玩家药材 | 攻击 | 普通 | 0 | 单体敌人 | 1 | huangqin_effect | 4 | 1 |  | 造成4点伤害，并施加1层热邪。 |
| jinyinhua | 金银花露 | 玩家药材 | 攻击 | 普通 | 1 | 全体敌人 | 1 | aoe_damage_cleanse | 3 |  |  | 对所有敌人造成3点伤害，并清除每个敌人的1层正面状态。 |
| shengjiang | 生姜发散 | 玩家药材 | 技能 | 普通 | 0 | 自身 | 1 | buff_attack | 3 |  |  | 本回合，你的下一张攻击卡额外造成3点伤害。消耗。 |
| banlangen | 板蓝根清热 | 玩家药材 | 技能 | 普通 | 1 | 全体敌人 | 1 | aoe_debuff_heat | 1 |  |  | 给予所有敌人1层热邪，抽1张牌。 |
| fuling | 茯苓渗湿 | 玩家药材 | 技能 | 普通 | 1 | 自身 | 1 | block_draw_cleanse_damp | 5 |  |  | 获得5点格挡。抽1张牌。消耗1层自身湿邪(如有)。 |
| zouguan | 拔罐：走罐 | 玩家药材 | 攻击 | 精良 | 0 | 全体敌人 | 2 | aoe_damage | 5 |  |  | 对所有敌人造成5点伤害。 |
| chuanxiongcha | 薄荷疏风 | 玩家药材 | 能力 | 稀有 | 1 | 自身 | 2 | cost_reduction_turn |  |  |  | 本回合你的卡牌消耗减少1点（最低为0）。消耗。 |
| xiaoyao | 赤芍凉血 | 玩家药材 | 技能 | 稀有 | 0 | 自身 | 2 | cleanse_draw | 3 |  |  | 清除所有负面状态，抽3张牌。消耗。 |
| dazao | 大枣养血 | 玩家药材 | 技能 | 普通 | 0 | 自身 | 2 | heal_block_exhaust | 2 | 2 |  | 恢复2点生命，获得2点格挡。消耗。 |
| hegu | 点穴：合谷 | 玩家药材 | 攻击 | 精良 | 1 | 单体敌人 | 2 | apply_weak | 2 |  |  | 使一个敌人虚弱2回合。 |
| guipi | 豆豉宣郁 | 玩家药材 | 技能 | 稀有 | 1 | 自身 | 2 | heal_draw | 12 | 2 |  | 恢复12点生命，并抽2张牌。消耗。 |
| shenmen | 耳穴：神门 | 玩家药材 | 能力 | 精良 | 0 | 自身 | 2 | block_reduce_next_damage | 5 | 3 |  | 获得5点格挡。本回合敌人第一次伤害减少3点。 |
| xuefu | 厚朴行气 | 玩家药材 | 攻击 | 稀有 | 0 | 全体敌人 | 2 | cleanse_enemy_buffs |  |  |  | 清除所有敌人正面状态。消耗。 |
| baohe | 桔梗宣肺 | 玩家药材 | 能力 | 稀有 | 1 | 自身 | 2 | draw_to_hand |  |  |  | 抽牌直到手牌达到5张。消耗。 |
| lianqiao | 连翘解毒 | 玩家药材 | 攻击 | 精良 | 0 | 全体敌人 | 2 | aoe_damage_cleanse_heat | 4 |  |  | 对所有敌人造成4点伤害，并清除1层热邪。 |
| rougui | 肉桂引火 | 玩家药材 | 攻击 | 精良 | 1 | 自身 | 2 | strength_temp | 3 |  |  | 获得3点力量。本回合结束时失去3点力量。 |
| sanqi | 三七化瘀 | 玩家药材 | 攻击 | 精良 | 1 | 单体敌人 | 2 | damage_conditional_stasis | 5 | 5 |  | 造成5点伤害。如果目标有血瘀，则额外造成5点伤害。 |
| yinqiao | 石膏清热 | 玩家药材 | 攻击 | 稀有 | 1 | 全体敌人 | 2 | aoe_damage_heat | 7 | 1 |  | 对所有敌人造成7点伤害，并施加1层热邪。消耗。 |
| shihu | 石斛益胃 | 玩家药材 | 技能 | 精良 | 0 | 自身 | 2 | yin_cap_increase | 1 |  |  | 获得1层滋阴。本场战斗中，滋阴层数上限+2。消耗。 |
| huoxiang | 苏叶解表 | 玩家药材 | 技能 | 稀有 | 0 | 自身 | 2 | cleanse_self_heal | 10 |  |  | 清除所有负面状态，并恢复10点生命。消耗。 |
| suanzaoren | 酸枣仁安眠 | 玩家药材 | 攻击 | 精良 | 1 | 单体敌人 | 2 | sleep_debuff |  |  |  | 使一个敌人获得1层困倦（下回合跳过行动）。 |
| sijunzi | 天冬养阴 | 玩家药材 | 技能 | 稀有 | 1 | 自身 | 2 | heal_block | 12 | 4 |  | 恢复12点生命，并获得4点格挡。消耗。 |
| mahuangtang | 细辛通窍 | 玩家药材 | 攻击 | 稀有 | 1 | 自身 | 2 | attack_pierce_all |  |  |  | 本回合攻击卡无视敌人所有格挡。消耗。 |
| qinggusan | 杏仁降气 | 玩家药材 | 攻击 | 稀有 | 0 | 单体敌人 | 2 | yin_spend_double_damage | 6 |  |  | 造成6点伤害。消耗3层滋阴使伤害翻倍。 |
| zhishi | 枳实行气 | 玩家药材 | 技能 | 普通 | 1 | 自身 | 2 | draw_if_attack |  |  |  | 抽1张牌。如果本回合已打出攻击牌，额外抽1张。 |
| yupingfeng | 竹叶清心 | 玩家药材 | 技能 | 稀有 | 1 | 自身 | 2 | block | 14 |  |  | 获得14点格挡。消耗。 |
| aiye | 艾叶温经 | 玩家药材 | 技能 | 普通 | 1 | 自身 | 2 | block_per_card | 3 |  |  | 获得3点格挡。本回合每打出一张卡牌，获得1点格挡。 |
| baizhu | 白术健脾 | 玩家药材 | 技能 | 精良 | 1 | 自身 | 2 | block_if_no_damage_strength | 6 | 2 |  | 获得6点格挡。如果本回合未受到攻击伤害，获得2点力量。 |
| baihe | 百合安神 | 玩家药材 | 技能 | 普通 | 1 | 自身 | 2 | yin_cleanse |  |  |  | 移除自身1个负面状态。若有至少3层滋阴，改为移除所有负面状态。 |
| dangshen | 党参补气 | 玩家药材 | 技能 | 精良 | 1 | 自身 | 2 | block_next_skill_bonus | 4 | 2 |  | 获得4点格挡。下回合第一张技能卡效果+2。 |
| fangfeng | 防风祛风 | 玩家药材 | 技能 | 精良 | 1 | 单体敌人 | 2 | block_apply_vulnerable | 7 |  |  | 获得7点格挡。赋予一个敌人易伤。 |
| gancao | 甘草和中 | 玩家药材 | 技能 | 普通 | 1 | 自身 | 2 | heal_draw | 4 | 1 |  | 恢复4点生命，抽1张牌。 |
| guasha | 刮痧：大椎 | 玩家药材 | 技能 | 精良 | 1 | 自身 | 2 | cleanse_heat_cold |  |  |  | 移除自身所有热邪和寒邪。 |
| maidong | 麦冬滋阴 | 玩家药材 | 技能 | 精良 | 1 | 自身 | 2 | buff_yin | 2 |  |  | 获得2层滋阴。抽1张牌。 |
| shanyurou | 山萸肉固涩 | 玩家药材 | 技能 | 精良 | 1 | 自身 | 2 | yin_heal_scaling | 3 |  |  | 恢复3点生命，并额外恢复等同于滋阴层数的生命值。 |
| shengma | 升麻升提 | 玩家药材 | 能力 | 精良 | 1 | 自身 | 2 | block_to_strength |  |  |  | 本回合每次获得格挡，获得1点临时力量。 |
| tuina | 推拿：捏脊 | 玩家药材 | 技能 | 精良 | 1 | 自身 | 2 | cleanse_two_draw |  |  |  | 移除自身2个负面状态，抽1张牌。 |
| xuanshen | 玄参泻火 | 玩家药材 | 技能 | 精良 | 1 | 全体敌人 | 2 | yin_spend_damage_random |  |  |  | 消耗所有滋阴。每消耗1层，对随机敌人造成3点伤害。 |
| zexie | 泽泻利水 | 玩家药材 | 技能 | 精良 | 1 | 自身 | 2 | cleanse_damp_convert_block |  |  |  | 移除自身所有湿邪，每层获得2点格挡。 |
| zhimu | 知母清热 | 玩家药材 | 技能 | 精良 | 1 | 自身 | 2 | yin_attack_virtual_heat | 1 |  |  | 获得1层滋阴。本回合你的攻击卡额外施加1层虚热。 |
| zhusha | 朱砂安神 | 玩家药材 | 能力 | 稀有 | 1 | 自身 | 2 | attack_stun_chance |  |  |  | (能力)攻击卡有15%几率使敌人眩晕。 |
| aijiu | 艾灸：关元 | 玩家药材 | 能力 | 精良 | 2 | 自身 | 2 | energy_max_heal | 1 | 3 |  | 获得1点真气上限，并恢复3点生命。 |
| biejia | 鳖甲软坚 | 玩家药材 | 技能 | 精良 | 2 | 自身 | 2 | yin_block_scaling | 5 |  |  | 获得5点格挡。每有1层滋阴，额外获得1点格挡。 |
| shanyao | 山药平补 | 玩家药材 | 能力 | 精良 | 2 | 自身 | 2 | end_turn_heal_power | 2 |  |  | (能力)回合结束时恢复2点生命。 |
| shengdi | 生地凉血 | 玩家药材 | 技能 | 精良 | 2 | 自身 | 2 | yin_gain_exhaust | 4 |  |  | 获得4层滋阴。消耗。 |
| yuzhu | 玉竹生津 | 玩家药材 | 能力 | 稀有 | 2 | 自身 | 2 | yin_power_energy |  |  |  | (能力)回合开始时若有滋阴，获得1点真气。 |
| fuzi | 附子回阳 | 玩家药材 | 技能 | 稀有 | 3 | 自身 | 2 | strength_dex_block | 1 | 5 |  | 获得1点力量和1点敏捷，获得5点格挡。消耗。 |
| banxia | 半夏燥湿 | 玩家药材 | 攻击 | 稀有 | 2 | 全体敌人 | 3 | aoe_stun | 1 |  |  | 使所有敌人眩晕1回合。消耗。 |
| bianshi | 砭石：阿是穴 | 玩家药材 | 能力 | 稀有 | 0 | 自身 | 3 | copy_buff_exhaust |  |  |  | 复制自身一个正面状态。消耗。 |
| zhenwu | 苍术健脾 | 玩家药材 | 能力 | 稀有 | 2 | 自身 | 3 | double_block_buff |  |  |  | 本场战斗中，你的格挡效果 +50%。消耗。 |
| jinkui | 柴胡疏肝 | 玩家药材 | 技能 | 稀有 | 3 | 自身 | 3 | strength_dex_heal | 2 | 8 |  | 获得2点力量和2点敏捷，恢复8点生命。消耗。 |
| dachengqi | 莪术破积 | 玩家药材 | 攻击 | 稀有 | 2 | 单体敌人 | 3 | percent_damage | 0.25 |  |  | 对一个敌人造成其当前生命值25%的伤害。消耗。 |
| angong | 干姜温中 | 玩家药材 | 能力 | 稀有 | 2 | 自身 | 3 | revive_buff | 20 |  |  | 使你在本场战斗中免疫下一次死亡，并恢复20%生命。消耗。 |
| wumei | 芥穗散风 | 玩家药材 | 技能 | 稀有 | 1 | 单体敌人 | 3 | steal_buffs |  |  |  | 偷取一个敌人所有正面状态。消耗。 |
| huanglianjiedu | 牛蒡解毒 | 玩家药材 | 攻击 | 稀有 | 2 | 全体敌人 | 3 | aoe_damage_cleanse_all_buffs | 8 |  |  | 对所有敌人造成8点伤害，并清除其所有正面状态。消耗。 |
| qingying | 蒲公英消肿 | 玩家药材 | 技能 | 稀有 | 1 | 全体敌人 | 3 | cleanse_heat_aoe_damage |  |  |  | 清除场上所有热邪，每清除1层对所有敌人造成2点伤害。消耗。 |
| longdan | 人参补气 | 玩家药材 | 攻击 | 稀有 | 2 | 单体敌人 | 3 | true_damage | 18 |  |  | 对一个敌人造成18点真实伤害。消耗。 |
| liuwei | 五味敛阴 | 玩家药材 | 技能 | 稀有 | 0 | 自身 | 3 | yin_block | 3 | 4 |  | 获得3层滋阴和4点格挡。消耗。 |
| sanyinjiao | 温针灸：三阴交 | 玩家药材 | 能力 | 稀有 | 1 | 自身 | 3 | retain_block_power |  |  |  | (能力)回合结束时若有格挡，则格挡不消失。 |
| mingmen | 雷火灸：命门 | 玩家药材 | 技能 | 稀有 | 3 | 自身 | 3 | strength_block | 3 | 5 |  | 获得3点力量和5点格挡。 |
| buzhongyiqi | 熟地滋阴 | 玩家药材 | 能力 | 稀有 | 3 | 自身 | 3 | block_echo_power |  |  |  | (能力)每当你获得格挡时，额外获得50%护盾。 |
| baishao | 白芍柔肝 | 玩家药材 | 攻击 | 普通 | 1 | 单体敌人 |  | debuff_weak_draw | 1 |  |  | 使一个敌人虚弱(造成的伤害减少25%)，抽1张牌。 |
| chuanxiong | 川芎行气 | 玩家药材 | 攻击 | 普通 | 1 | 单体敌人 |  | damage_draw | 5 |  |  | 造成5点伤害，抽1张牌。 |
| dahuang | 大黄攻下 | 玩家药材 | 攻击 | 精良 | 1 | 单体敌人 |  | dahuang_effect | 10 | 2 |  | 造成 10 点伤害，给予敌人 2 层“泄下”。 |
| huanglian | 黄连燥湿 | 玩家药材 | 攻击 | 普通 | 0 | 单体敌人 |  | damage_cleanse_buff | 6 |  |  | 造成6点伤害，并清除目标1层正面状态。 |
| mahuang | 麻黄发汗 | 玩家药材 | 攻击 | 普通 | 1 | 单体敌人 |  | mahuang_effect | 8 | 4 |  | 造成 8 点伤害。如果敌人有“寒邪”，额外造成 4 点伤害。 |
| danshen | 三棱破血 | 玩家药材 | 攻击 | 普通 | 1 | 单体敌人 |  | damage_debuff_stasis | 7 | 1 |  | 造成7点伤害。给予目标1层血瘀。 |
| shanzha | 山楂消食 | 玩家药材 | 攻击 | 普通 | 0 | 单体敌人 |  | damage_block | 3 | 5 |  | 造成3点伤害，获得5点格挡。 |
| chenpi | 陈皮理气 | 玩家药材 | 技能 | 普通 | 1 | 自身 |  | draw_discard | 2 | 1 |  | 抽2张牌，丢弃1张牌。 |
| danggui | 当归补血 | 玩家药材 | 技能 | 稀有 | 1 | 自身 |  | danggui_effect | 5 |  |  | 恢复 5 点生命。如果生命已满，改为获得 5 点护盾。 |
| guizhi | 桂枝通络 | 玩家药材 | 技能 | 普通 | 1 | 自身 |  | block_pierce_buff | 3 | 3 |  | 获得3点格挡，本回合你的攻击卡无视敌人3点格挡。 |
| yiyi | 薏苡除湿 | 玩家药材 | 技能 | 普通 | 1 | 自身 |  | block_cleanse_self | 4 |  |  | 获得4点格挡，并移除自身的1个负面状态。 |
| xiaochaihu | 葛根解肌 | 玩家药材 | 技能 | 精良 | 2 | 自身 |  | heal_draw_block | 5 | 4 |  | 恢复5点生命，抽2张牌，获得4点格挡。 |
| huangqi | 黄芪固表 | 玩家药材 | 技能 | 精良 | 2 | 自身 |  | block | 10 |  |  | 获得 10 点护盾。 |
| zusanli | 针刺：足三里 | 玩家药材 | 能力 | 稀有 | 2 | 自身 |  | zusanli_effect | 1 |  |  | (能力)每当你打出攻击卡时，每层恢复1点生命。 |
| formula_placeholder_06 | 交泰丸 | 玩家药方 | 技能 | 稀有 | 0 | 自身 | 1 | formula_jiaotai_wan | 6 |  |  | 获得6点格挡，清除自身1个负面状态。消耗。 |
| formula_placeholder_11 | 麻黄汤 | 玩家药方 | 攻击 | 稀有 | 1 | 自身 | 1 | formula_mahuang_tang |  |  |  | 本回合攻击无视格挡，抽1张牌。消耗。 |
| formula_placeholder_05 | 半夏厚朴汤 | 玩家药方 | 攻击 | 稀有 | 1 | 单体敌人 | 1 | formula_banxia_houpu_tang | 8 | 2 |  | 对单体造成8点伤害，施加2回合虚弱；若目标有痰湿禁锢或湿邪，额外抽1张。 |
| formula_placeholder_01 | 葛根汤 | 玩家药方 | 技能 | 稀有 | 1 | 自身 | 1 | formula_gegen_tang | 8 | 1 |  | 获得8点格挡，清除自身1个负面状态，抽1张牌。 |
| formula_placeholder_04 | 理中丸 | 玩家药方 | 技能 | 稀有 | 1 | 自身 | 1 | formula_lizhong_wan | 8 | 1 |  | 恢复8点生命，获得1点力量。 |
| formula_placeholder_02 | 麻杏石甘汤 | 玩家药方 | 攻击 | 稀有 | 1 | 单体敌人 | 1 | formula_maxing_shigan_tang | 10 | 2 |  | 对单体造成10点伤害，并施加2层热邪。 |
| formula_placeholder_07 | 四君子汤 | 玩家药方 | 技能 | 稀有 | 1 | 自身 | 1 | formula_sijunzi_tang | 10 | 6 |  | 恢复10点生命，获得6点格挡。 |
| formula_placeholder_10 | 酸枣仁汤 | 玩家药方 | 技能 | 稀有 | 1 | 单体敌人 | 1 | formula_suanzaoren_tang | 5 | 1 |  | 使一个敌人困倦1回合，恢复5点生命。 |
| formula_placeholder_03 | 小柴胡汤 | 玩家药方 | 技能 | 稀有 | 1 | 自身 | 1 | formula_xiaochaihu_tang | 6 | 2 |  | 恢复6点生命，抽2张牌，清除自身1个负面状态。 |
| formula_placeholder_09 | 小青龙汤 | 玩家药方 | 攻击 | 稀有 | 1 | 全体敌人 | 1 | formula_xiaoqinglong_tang | 7 | 3 |  | 对所有敌人造成7点伤害；若目标有寒邪，额外3点伤害。 |
| formula_placeholder_12 | 银翘散 | 玩家药方 | 攻击 | 稀有 | 1 | 全体敌人 | 1 | formula_yinqiao_san | 6 | 1 |  | 对所有敌人造成6点伤害并施加1层热邪，清除敌人1层正面状态。 |
| formula_placeholder_08 | 真武汤 | 玩家药方 | 能力 | 稀有 | 2 | 自身 | 1 | formula_zhenwu_tang |  |  |  | 本场战斗格挡效果 +50%，回合开始获得1点格挡。 |
| equipment_bianzheng | 辨证论治 | 装备被动 | 能力 | 稀有 | 0 | 自身 |  | equipment_bianzheng |  |  | 是 | 装备牌：回合开始自动择策，低血回复，否则补盾或得临时力量，最多1件生效。 |
| equipment_zangxiang | 藏象学说 | 装备被动 | 能力 | 精良 | 0 | 自身 |  | equipment_zangxiang |  |  | 是 | 装备牌：每回合结束积1层脏腑精气，满3层清空并恢复4点生命，最多1件生效。 |
| equipment_jingluo | 经络学说 | 装备被动 | 能力 | 普通 | 0 | 自身 |  | equipment_jingluo |  |  | 是 | 装备牌：每回合第一次打出技能牌时获得2点格挡，最多2件生效。 |
| equipment_qiji | 气机升降 | 装备被动 | 能力 | 稀有 | 0 | 自身 |  | equipment_qiji |  |  | 是 | 装备牌：回合开始清除1个负面状态，若成功则恢复1点生命，最多1件生效。 |
| equipment_qixue_jinye | 气血津液 | 装备被动 | 能力 | 精良 | 0 | 自身 |  | equipment_qixue_jinye |  |  | 是 | 装备牌：每获得5点格挡就恢复1点生命，单次最多恢复2点，最多1件生效。 |
| equipment_tianren | 天人相应 | 装备被动 | 能力 | 精良 | 0 | 自身 |  | equipment_tianren |  |  | 是 | 装备牌：奇数玩家回合攻击+1，偶数玩家回合开始恢复2点生命，最多2件生效。 |
| equipment_yinyang | 阴阳学说 | 装备被动 | 能力 | 稀有 | 0 | 自身 |  | equipment_yinyang |  |  | 是 | 装备牌：半血以上格挡+1，半血以下攻击+1；每场战斗免疫第一次眩晕，最多1件生效。 |
| equipment_zhengti | 整体观念 | 装备被动 | 能力 | 普通 | 0 | 自身 |  | equipment_zhengti |  |  | 是 | 装备牌：受到生命伤害时减免1点，治疗效果+1，最多2件生效。 |
| equipment_zhengxie | 正邪相争 | 装备被动 | 能力 | 稀有 | 0 | 自身 |  | equipment_zhengxie |  |  | 是 | 装备牌：敌方攻击造成生命伤害后获得1层正气，最多3层；每层使格挡+1，最多1件生效。 |
| equipment_zhiweibing | 治未病 | 装备被动 | 能力 | 普通 | 0 | 自身 |  | equipment_zhiweibing |  |  | 是 | 装备牌：每场战斗开始获得5点格挡。全局被动生效，最多2件生效。 |
| equipment_ziwuliuzhu | 子午流注 | 装备被动 | 能力 | 精良 | 0 | 自身 |  | equipment_ziwuliuzhu |  |  | 是 | 装备牌：非首回合的玩家回合开始额外抽1张牌，最多1件生效。 |
| chongrenbugu | 冲任不固 | 敌方机制 | 能力 | 稀有 | 0 | 单体敌人 |  | status_enemy |  |  | 是 | (敌方技能)使玩家失去所有正面状态。 |
| fenghanshubiao | 风寒束表 | 敌方机制 | 能力 | 稀有 | 0 | 单体敌人 |  | status_enemy |  |  | 是 | (敌方技能)对玩家施加寒邪与虚弱。 |
| ganhuowang | 肝火旺 | 敌方机制 | 能力 | 稀有 | 0 | 自身 |  | status_enemy |  |  | 是 | (敌方能力)每回合开始，自身攻击力+2。 |
| pixushikun | 脾虚湿困 | 敌方机制 | 能力 | 稀有 | 0 | 自身 |  | status_enemy |  |  | 是 | (敌方能力)玩家卡牌消耗增加1点。 |
| qizhixueyu | 气滞血瘀 | 敌方机制 | 能力 | 稀有 | 0 | 自身 |  | status_enemy |  |  | 是 | (敌方能力)玩家每打出一张牌受到1点伤害。 |
| reruyingxue | 热入营血 | 敌方机制 | 能力 | 稀有 | 0 | 自身 |  | status_enemy |  |  | 是 | (敌方能力)回合结束时造成热邪层数的伤害。 |
| shenbunaqi | 肾不纳气 | 敌方机制 | 能力 | 稀有 | 0 | 单体敌人 |  | status_enemy |  |  | 是 | (敌方技能)偷取玩家1点真气上限。 |
| tanmengxinqiao | 痰蒙心窍 | 敌方机制 | 能力 | 稀有 | 0 | 单体敌人 |  | status_enemy |  |  | 是 | (敌方技能)使玩家眩晕1回合。 |
| xinshenbujiao | 心肾不交 | 敌方机制 | 能力 | 稀有 | 0 | 单体敌人 |  | status_enemy |  |  | 是 | (敌方技能)下回合无法获得格挡。 |
| yangmingfushi | 阳明腑实 | 敌方机制 | 能力 | 稀有 | 0 | 自身 |  | status_enemy |  |  | 是 | (敌方能力)回合结束时清除玩家所有护盾。 |

## 药方蓝图与药方牌

药方牌只能通过合成台按蓝图消耗材料获得。平衡药方时需要同时看：配方材料数量、材料稀缺度、药方牌自身费用和战斗效果。

| 蓝图 ID | 蓝图名 | 药方牌 | 难度 | 材料数 | 材料 | 药方费用 | effectId | 值1 | 值2 | 药方效果 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| blueprint_formula_placeholder_01 | 葛根汤蓝图 | 葛根汤(formula_placeholder_01) | 简单 | 7 | 葛根解肌、麻黄发汗、桂枝通络、赤芍凉血、甘草和中、生姜发散、大枣养血 | 1 | formula_gegen_tang | 8 | 1 | 获得8点格挡，清除自身1个负面状态，抽1张牌。 |
| blueprint_formula_placeholder_02 | 麻杏石甘汤蓝图 | 麻杏石甘汤(formula_placeholder_02) | 简单 | 4 | 麻黄发汗、杏仁降气、石膏清热、甘草和中 | 1 | formula_maxing_shigan_tang | 10 | 2 | 对单体造成10点伤害，并施加2层热邪。 |
| blueprint_formula_placeholder_03 | 小柴胡汤蓝图 | 小柴胡汤(formula_placeholder_03) | 中等 | 7 | 柴胡疏肝、黄芩清肺、人参补气、半夏燥湿、甘草和中、生姜发散、大枣养血 | 1 | formula_xiaochaihu_tang | 6 | 2 | 恢复6点生命，抽2张牌，清除自身1个负面状态。 |
| blueprint_formula_placeholder_04 | 理中丸蓝图 | 理中丸(formula_placeholder_04) | 简单 | 4 | 人参补气、白术健脾、干姜温中、甘草和中 | 1 | formula_lizhong_wan | 8 | 1 | 恢复8点生命，获得1点力量。 |
| blueprint_formula_placeholder_05 | 半夏厚朴汤蓝图 | 半夏厚朴汤(formula_placeholder_05) | 中等 | 5 | 半夏燥湿、厚朴行气、茯苓渗湿、生姜发散、苏叶解表 | 1 | formula_banxia_houpu_tang | 8 | 2 | 对单体造成8点伤害，施加2回合虚弱；若目标有痰湿禁锢或湿邪，额外抽1张。 |
| blueprint_formula_placeholder_06 | 交泰丸蓝图 | 交泰丸(formula_placeholder_06) | 极简 | 2 | 黄连燥湿、肉桂引火 | 0 | formula_jiaotai_wan | 6 |  | 获得6点格挡，清除自身1个负面状态。消耗。 |
| blueprint_formula_placeholder_07 | 四君子汤蓝图 | 四君子汤(formula_placeholder_07) | 简单 | 4 | 人参补气、白术健脾、茯苓渗湿、甘草和中 | 1 | formula_sijunzi_tang | 10 | 6 | 恢复10点生命，获得6点格挡。 |
| blueprint_formula_placeholder_08 | 真武汤蓝图 | 真武汤(formula_placeholder_08) | 偏难 | 5 | 茯苓渗湿、白芍柔肝、生姜发散、白术健脾、附子回阳 | 2 | formula_zhenwu_tang |  |  | 本场战斗格挡效果 +50%，回合开始获得1点格挡。 |
| blueprint_formula_placeholder_09 | 小青龙汤蓝图 | 小青龙汤(formula_placeholder_09) | 偏难 | 8 | 麻黄发汗、白芍柔肝、五味敛阴、干姜温中、甘草和中、细辛通窍、桂枝通络、半夏燥湿 | 1 | formula_xiaoqinglong_tang | 7 | 3 | 对所有敌人造成7点伤害；若目标有寒邪，额外3点伤害。 |
| blueprint_formula_placeholder_10 | 酸枣仁汤蓝图 | 酸枣仁汤(formula_placeholder_10) | 中等 | 5 | 酸枣仁安眠、甘草和中、知母清热、茯苓渗湿、川芎行气 | 1 | formula_suanzaoren_tang | 5 | 1 | 使一个敌人困倦1回合，恢复5点生命。 |
| blueprint_formula_placeholder_11 | 麻黄汤蓝图 | 麻黄汤(formula_placeholder_11) | 极简 | 4 | 麻黄发汗、桂枝通络、甘草和中、杏仁降气 | 1 | formula_mahuang_tang |  |  | 本回合攻击无视格挡，抽1张牌。消耗。 |
| blueprint_formula_placeholder_12 | 银翘散蓝图 | 银翘散(formula_placeholder_12) | 简单 | 9 | 连翘解毒、金银花露、桔梗宣肺、薄荷疏风、竹叶清心、甘草和中、芥穗散风、豆豉宣郁、牛蒡解毒 | 1 | formula_yinqiao_san | 6 | 1 | 对所有敌人造成6点伤害并施加1层热邪，清除敌人1层正面状态。 |

## 装备被动表

装备不会进手牌，获得后作为当前跑图被动，可重复获得；结算时通过 `EQUIPMENT_EFFECT_CAPS` 限制有效层数。调装备时要特别检查重复获取后的上限与描述是否一致。

| ID | 名称 | effectId | 稀有度 | 描述 |
| --- | --- | --- | --- | --- |
| equipment_bianzheng | 辨证论治 | equipment_bianzheng | 稀有 | 装备牌：回合开始自动择策，低血回复，否则补盾或得临时力量，最多1件生效。 |
| equipment_zangxiang | 藏象学说 | equipment_zangxiang | 精良 | 装备牌：每回合结束积1层脏腑精气，满3层清空并恢复4点生命，最多1件生效。 |
| equipment_jingluo | 经络学说 | equipment_jingluo | 普通 | 装备牌：每回合第一次打出技能牌时获得2点格挡，最多2件生效。 |
| equipment_qiji | 气机升降 | equipment_qiji | 稀有 | 装备牌：回合开始清除1个负面状态，若成功则恢复1点生命，最多1件生效。 |
| equipment_qixue_jinye | 气血津液 | equipment_qixue_jinye | 精良 | 装备牌：每获得5点格挡就恢复1点生命，单次最多恢复2点，最多1件生效。 |
| equipment_tianren | 天人相应 | equipment_tianren | 精良 | 装备牌：奇数玩家回合攻击+1，偶数玩家回合开始恢复2点生命，最多2件生效。 |
| equipment_yinyang | 阴阳学说 | equipment_yinyang | 稀有 | 装备牌：半血以上格挡+1，半血以下攻击+1；每场战斗免疫第一次眩晕，最多1件生效。 |
| equipment_zhengti | 整体观念 | equipment_zhengti | 普通 | 装备牌：受到生命伤害时减免1点，治疗效果+1，最多2件生效。 |
| equipment_zhengxie | 正邪相争 | equipment_zhengxie | 稀有 | 装备牌：敌方攻击造成生命伤害后获得1层正气，最多3层；每层使格挡+1，最多1件生效。 |
| equipment_zhiweibing | 治未病 | equipment_zhiweibing | 普通 | 装备牌：每场战斗开始获得5点格挡。全局被动生效，最多2件生效。 |
| equipment_ziwuliuzhu | 子午流注 | equipment_ziwuliuzhu | 精良 | 装备牌：非首回合的玩家回合开始额外抽1张牌，最多1件生效。 |

## 敌方机制卡表

这些卡在 `CARD_LIBRARY` 中标记为敌方机制，用于图鉴/展示语义，不等同于敌人实际行动结算。实际行动看后面的 `enemyStrategies` 表。

| ID | 名称 | 类型 | 稀有度 | 费用 | effectId | 描述 |
| --- | --- | --- | --- | --- | --- | --- |
| chongrenbugu | 冲任不固 | 能力 | 稀有 | 0 | status_enemy | (敌方技能)使玩家失去所有正面状态。 |
| fenghanshubiao | 风寒束表 | 能力 | 稀有 | 0 | status_enemy | (敌方技能)对玩家施加寒邪与虚弱。 |
| ganhuowang | 肝火旺 | 能力 | 稀有 | 0 | status_enemy | (敌方能力)每回合开始，自身攻击力+2。 |
| pixushikun | 脾虚湿困 | 能力 | 稀有 | 0 | status_enemy | (敌方能力)玩家卡牌消耗增加1点。 |
| qizhixueyu | 气滞血瘀 | 能力 | 稀有 | 0 | status_enemy | (敌方能力)玩家每打出一张牌受到1点伤害。 |
| reruyingxue | 热入营血 | 能力 | 稀有 | 0 | status_enemy | (敌方能力)回合结束时造成热邪层数的伤害。 |
| shenbunaqi | 肾不纳气 | 能力 | 稀有 | 0 | status_enemy | (敌方技能)偷取玩家1点真气上限。 |
| tanmengxinqiao | 痰蒙心窍 | 能力 | 稀有 | 0 | status_enemy | (敌方技能)使玩家眩晕1回合。 |
| xinshenbujiao | 心肾不交 | 能力 | 稀有 | 0 | status_enemy | (敌方技能)下回合无法获得格挡。 |
| yangmingfushi | 阳明腑实 | 能力 | 稀有 | 0 | status_enemy | (敌方能力)回合结束时清除玩家所有护盾。 |

## 敌人基础属性

当前普通开战流程只应用 HP 缩放：`ceil(baseHp * (1 + floor * 0.05))`。`damageBonus` 在 `getEnemyScaling()` 中存在，但普通开战流程尚未把它应用到敌人伤害。

| 敌人 ID | 名称 | 幕 | 层级 | 基础 HP | 初始格挡 | 初始意图 | 初始值 | 连击 | 初始描述 | behavior | meta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wind_cold_guest | 风寒客 | 1 | common | 30 | 0 | attack | 5 |  | 寒邪侵袭 | wind_cold_guest |  |
| wind_heat_attack | 风热袭 | 1 | common | 28 | 0 | attack | 3 |  | 热邪灼烧 | wind_heat_attack |  |
| damp_turbidity | 湿浊缠 | 1 | common | 35 | 0 | debuff | 0 |  | 湿邪困脾 | damp_turbidity |  |
| external_combination | 外感合病 | 1 | elite | 80 | 10 | special | 0 |  | 形态切换 | external_combination | {"form":"cold","formTurns":3} |
| boss_wind_cold | 风寒束表 | 1 | boss | 150 | 0 | attack | 12 |  | 寒凝血瘀 | boss_wind_cold |  |
| boss_liver_fire | 肝火炽盛 | 1 | boss | 140 | 0 | attack | 8 |  | 火旺伤阴 | boss_liver_fire |  |
| qi_blood_stasis | 气滞血瘀者 | 2 | common | 50 | 5 | attack | 8 |  | 郁而作痛 | qi_blood_stasis |  |
| spleen_dampness | 脾虚湿盛者 | 2 | common | 55 | 8 | debuff | 0 |  | 湿困中焦 | spleen_dampness |  |
| heart_kidney_gap | 心神不交者 | 2 | common | 45 | 0 | debuff | 0 |  | 心悸不安 | heart_kidney_gap |  |
| tanmengxinqiao | 痰蒙心窍者 | 2 | common | 52 | 0 | debuff | 0 |  | 痰蒙心窍 | tanmengxinqiao | {"turn":0} |
| phlegm_stasis | 痰瘀互结 | 2 | elite | 120 | 15 | buff | 0 |  | 痰凝血瘀 | phlegm_stasis |  |
| boss_spleen_damp | 脾虚湿困 | 2 | boss | 250 | 20 | special | 0 |  | 水湿不运 | boss_spleen_damp | {"turn":0} |
| damp_minion | 水湿小怪 | 2 | 召唤 | 20 | 0 | debuff | 0 |  | 湿邪侵体 | damp_minion | {} |
| yin_yang_split | 阴阳离决者 | 3 | common | 70 | 0 | special | 0 |  | 阴阳格拒 | yin_yang_split | {"form":"yin"} |
| chong_ren_instability | 冲任不固者 | 3 | common | 65 | 0 | debuff | 0 |  | 崩漏不止 | chong_ren_instability |  |
| reruyingxue | 热入营血者 | 3 | common | 72 | 0 | debuff | 0 |  | 热入营血 | reruyingxue | {"turn":0} |
| shenbunaqi | 肾不纳气者 | 3 | common | 68 | 6 | debuff | 0 |  | 肾不纳气 | shenbunaqi | {"turn":0} |
| yangmingfushi | 阳明腑实者 | 3 | common | 78 | 8 | special | 0 |  | 阳明腑实 | yangmingfushi | {"turn":0} |
| jueyin_complex | 厥阴复杂症 | 3 | elite | 180 | 20 | debuff | 0 |  | 寒热错杂 | jueyin_complex | {"turn":0} |
| boss_five_elements | 五行失调 | 3 | boss | 500 | 50 | special | 0 |  | 五行流转 | boss_five_elements | {"phase":"wood"} |

### 敌池统计

| 幕 | 层级 | 数量 | 平均 HP | HP 范围 | 平均初始格挡 | 敌人 |
| --- | --- | --- | --- | --- | --- | --- |
| act1 | common | 3 | 31 | 28-35 | 0 | 风寒客、风热袭、湿浊缠 |
| act1 | elite | 1 | 80 | 80-80 | 10 | 外感合病 |
| act1 | boss | 2 | 145 | 140-150 | 0 | 风寒束表、肝火炽盛 |
| act2 | common | 4 | 50.5 | 45-55 | 3.3 | 气滞血瘀者、脾虚湿盛者、心神不交者、痰蒙心窍者 |
| act2 | elite | 1 | 120 | 120-120 | 15 | 痰瘀互结 |
| act2 | boss | 1 | 250 | 250-250 | 20 | 脾虚湿困 |
| act3 | common | 5 | 70.6 | 65-78 | 2.8 | 阴阳离决者、冲任不固者、热入营血者、肾不纳气者、阳明腑实者 |
| act3 | elite | 1 | 180 | 180-180 | 20 | 厥阴复杂症 |
| act3 | boss | 1 | 500 | 500-500 | 50 | 五行失调 |
| act2 | summon | 1 | 20 | 20-20 | 0 | 水湿小怪 |

### 敌方行动次数规则

| 敌人层级/幕 | 行动次数 |
| --- | --- |
| 普通敌 Act 1 | 1 次 |
| 普通敌 Act 2 | 45% 概率 2 次，否则 1 次 |
| 普通敌 Act 3 | 80% 概率 2 次，否则 1 次 |
| 精英 | 2 次 |
| Boss | 2 次 |

## 敌方行动候选数值

下表来自 `getPrimaryIntent` 和 `getFollowUpIntent`。`值` 和 `连击` 若是表达式，表示该行动会随形态、层数、回合或血量动态变化。

| behavior | 行动槽 | 类型 | 值 | 连击 | 描述 |
| --- | --- | --- | --- | --- | --- |
| wind_cold_guest | 主行动 | attack | 7 | 1 | 寒邪侵袭 |
| wind_cold_guest | 主行动 | debuff | 0 | 1 | 风寒束表 |
| wind_cold_guest | 追加行动 | debuff | 0 | 1 | 风寒束表 |
| wind_cold_guest | 追加行动 | attack | 6 | 1 | 寒邪追袭 |
| wind_heat_attack | 主行动 | attack | 4 | 2 | 热邪连袭 |
| wind_heat_attack | 主行动 | debuff | 0 | 1 | 热邪灼络 |
| wind_heat_attack | 追加行动 | debuff | 0 | 1 | 热邪灼络 |
| wind_heat_attack | 追加行动 | attack | 4 | 2 | 火毒追击 |
| damp_turbidity | 主行动 | attack | 6 | 1 | 湿浊侵身 |
| damp_turbidity | 主行动 | debuff | 0 | 1 | 湿邪困脾 |
| damp_turbidity | 追加行动 | debuff | 0 | 1 | 湿邪困脾 |
| damp_turbidity | 追加行动 | defend | 6 | 1 | 浊气护体 |
| damp_minion | 主行动 | debuff | 0 | 1 | 湿邪侵体 |
| damp_minion | 主行动 | attack | 5 | 1 | 浊气扑袭 |
| damp_minion | 追加行动 | attack | 4 | 1 | 浊气扑袭 |
| damp_minion | 追加行动 | debuff | 0 | 1 | 湿邪侵体 |
| external_combination | 主行动 | attack | 9 | 1 | 寒邪裹体 |
| external_combination | 主行动 | debuff | 0 | 1 | 风寒束表 |
| external_combination | 主行动 | debuff | 0 | 1 | 热邪蒸腾 |
| external_combination | 主行动 | attack | 5 + _ctx.getStacks(enemy, 'heat_evil') | 2 | 热邪连袭 |
| external_combination | 追加行动 | debuff | 0 | 1 | form === 'cold' ? '风寒束表' : '热邪蒸腾' |
| external_combination | 追加行动 | attack | form === 'cold' ? 8 : 4 + ctx.getStacks(enemy, 'heat_evil') | form === 'cold' ? 1 : 2 | form === 'cold' ? '寒袭追打' : '热邪连袭' |
| qi_blood_stasis | 主行动 | debuff | 0 | 1 | 气滞血瘀 |
| qi_blood_stasis | 主行动 | attack | 10 | 1 | 郁阻作痛 |
| qi_blood_stasis | 追加行动 | attack | 10 | 1 | 瘀阻重击 |
| qi_blood_stasis | 追加行动 | debuff | 0 | 1 | 气滞血瘀 |
| spleen_dampness | 主行动 | attack | 8 | 1 | 湿浊压身 |
| spleen_dampness | 主行动 | defend | 10 | 1 | 脾虚护体 |
| spleen_dampness | 主行动 | debuff | 0 | 1 | 湿困中焦 |
| spleen_dampness | 追加行动 | attack | 8 | 1 | 湿浊压身 |
| spleen_dampness | 追加行动 | debuff | 0 | 1 | 湿困中焦 |
| spleen_dampness | 追加行动 | attack | 8 | 1 | 浊气扑压 |
| heart_kidney_gap | 主行动 | debuff | 0 | 1 | 心悸不安 |
| heart_kidney_gap | 主行动 | attack | 8 | 1 | 神乱冲心 |
| heart_kidney_gap | 追加行动 | attack | 8 | 1 | 心肾失衡 |
| heart_kidney_gap | 追加行动 | debuff | 0 | 1 | 心悸不安 |
| tanmengxinqiao | 主行动 | attack | 10 | 1 | 窍闭冲击 |
| tanmengxinqiao | 主行动 | debuff | 0 | 1 | 痰蒙心窍 |
| tanmengxinqiao | 主行动 | attack | 9 | 1 | 窍闭失神 |
| tanmengxinqiao | 追加行动 | attack | 9 | 1 | 迷窍冲心 |
| tanmengxinqiao | 追加行动 | debuff | 0 | 1 | 迷窍封格 |
| phlegm_stasis | 主行动 | attack | 12 | 1 | 痰瘀互结 |
| phlegm_stasis | 主行动 | defend | 14 | 1 | 痰凝护体 |
| phlegm_stasis | 追加行动 | attack | 11 | 1 | 痰瘀镇压 |
| phlegm_stasis | 追加行动 | defend | 12 | 1 | 痰凝护体 |
| chong_ren_instability | 主行动 | debuff | 0 | 1 | 冲任不固 |
| chong_ren_instability | 主行动 | attack | 9 | 1 | 逆乱冲袭 |
| chong_ren_instability | 追加行动 | attack | 9 | 1 | 逆乱冲袭 |
| chong_ren_instability | 追加行动 | debuff | 0 | 1 | 冲任不固 |
| reruyingxue | 主行动 | debuff | 0 | 1 | 热入营血 |
| reruyingxue | 主行动 | attack | 10 + Math.min(4, playerHeat) | 1 | 营热灼袭 |
| reruyingxue | 追加行动 | attack | 8 + Math.min(3, ctx.getStacks(ctx.player, 'heat_evil')) | 1 | 营热追袭 |
| reruyingxue | 追加行动 | debuff | 0 | 1 | 热入营血 |
| shenbunaqi | 主行动 | debuff | 0 | 1 | 肾不纳气 |
| shenbunaqi | 主行动 | attack | 11 | 1 | 纳气失司 |
| shenbunaqi | 追加行动 | attack | 10 | 1 | 逆气冲胸 |
| shenbunaqi | 追加行动 | debuff | 0 | 1 | 肾不纳气 |
| yangmingfushi | 主行动 | special | 0 | 1 | 阳明腑实 |
| yangmingfushi | 主行动 | attack | 13 | 1 | 腑实压顶 |
| yangmingfushi | 追加行动 | attack | 12 | 1 | 腑实追压 |
| yangmingfushi | 追加行动 | special | 0 | 1 | 阳明腑实 |
| yangmingfushi | 追加行动 | attack | 11 | 1 | 燥结逼压 |
| jueyin_complex | 主行动 | debuff | 0 | 1 | 寒邪+虚弱 |
| jueyin_complex | 主行动 | debuff | 0 | 1 | 热邪+易伤 |
| jueyin_complex | 追加行动 | attack | 12 | 1 | 厥阴交错 |
| yin_yang_split | 主行动 | defend | 8 | 1 | 阴守 |
| yin_yang_split | 主行动 | attack | 11 | 1 | 阳攻 |
| yin_yang_split | 追加行动 | attack | 9 | 1 | 阳袭 |
| yin_yang_split | 追加行动 | defend | 7 | 1 | 阴守 |
| boss_wind_cold | 主行动 | special | 0 | 1 | 寒凝血瘀 |
| boss_wind_cold | 主行动 | debuff | 0 | 1 | 风寒束表 |
| boss_wind_cold | 主行动 | attack | phaseTwo ? 16 : 13 | 1 | 寒邪侵袭 |
| boss_wind_cold | 追加行动 | attack | phaseTwo ? 15 : 13 | 1 | 寒邪崩压 |
| boss_wind_cold | 追加行动 | debuff | 0 | 1 | 风寒束表 |
| boss_wind_cold | 追加行动 | attack | phaseTwo ? 15 : 13 | 1 | 寒邪侵袭 |
| boss_liver_fire | 主行动 | special | 0 | 1 | 火旺伤阴 |
| boss_liver_fire | 主行动 | debuff | 0 | 1 | 热邪炽盛 |
| boss_liver_fire | 主行动 | attack | 9 + heatGrowth | phaseTwo ? 2 : 1 | 肝火灼袭 |
| boss_liver_fire | 追加行动 | attack | 10 + heatGrowth | phaseTwo ? 2 : 1 | 火势追袭 |
| boss_liver_fire | 追加行动 | debuff | 0 | 1 | 热邪炽盛 |
| boss_liver_fire | 追加行动 | attack | 10 + heatGrowth | phaseTwo ? 2 : 1 | 肝火灼袭 |
| boss_spleen_damp | 主行动 | special | 0 | 1 | 水湿不运 |
| boss_spleen_damp | 主行动 | special | 0 | 1 | 化热 |
| boss_spleen_damp | 主行动 | debuff | 0 | 1 | 湿困中焦 |
| boss_spleen_damp | 主行动 | attack | 14 | 1 | 湿浊扑袭 |
| boss_spleen_damp | 追加行动 | attack | 15 | 1 | 湿热压顶 |
| boss_spleen_damp | 追加行动 | debuff | 0 | 1 | 湿困中焦 |
| boss_spleen_damp | 追加行动 | attack | 14 | 1 | 湿浊扑袭 |
| boss_five_elements | 主行动 | attack | 7 | 2 | 风木摇动 |
| boss_five_elements | 主行动 | debuff | 0 | 1 | 热入营血 |
| boss_five_elements | 主行动 | debuff | 0 | 1 | 湿浊中阻 |
| boss_five_elements | 主行动 | special | 0 | 1 | 燥邪伤肺 |
| boss_five_elements | 主行动 | special | 0 | 1 | 寒水泛溢 |
| boss_five_elements | 追加行动 | debuff | 0 | 1 | 木郁乘土 |
| boss_five_elements | 追加行动 | attack | 12 | 1 | 火势焚袭 |
| boss_five_elements | 追加行动 | attack | 11 | 1 | 湿土镇压 |
| boss_five_elements | 追加行动 | attack | 10 | 2 | 金风肃杀 |
| boss_five_elements | 追加行动 | debuff | 0 | 1 | 寒水逼压 |
| default | 主行动 | attack | 7 | 1 | 攻击 |
| default | 主行动 | defend | 5 | 1 | 格挡 |
| default | 追加行动 | defend | 4 | 1 | 格挡 |
| default | 追加行动 | attack | 6 | 1 | 攻击 |

## 敌方状态与特殊效果索引

这里列出 `enemyStrategies` 中直接施加的状态。部分特殊效果还包含清空格挡、移除 buff、召唤小怪、形态切换、治疗等逻辑，见下一节备注。

| behavior | 方法 | 目标 | 动作 | 状态 ID | 名称 | 类型 | 层数 | 持续 | 说明 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wind_cold_guest | executeIntent | 玩家 | 施加负面/状态 | cold_evil | 寒邪 | debuff | 1 |  | 寒邪缠身 |
| wind_cold_guest | executeIntent | 玩家 | 施加负面/状态 | weak | 虚弱 | debuff | 1 | 2 | 造成伤害降低25% |
| wind_heat_attack | executeIntent | 玩家 | 施加负面/状态 | heat_evil | 热邪 | debuff | 2 |  | 回合结束受到伤害 |
| damp_turbidity | executeIntent | 玩家 | 施加负面/状态 | dampness_evil | 湿邪 | debuff | 1 |  | 格挡获得降低 |
| damp_minion | executeIntent | 玩家 | 施加负面/状态 | dampness_evil | 湿邪 | debuff | 1 |  | 格挡获得降低 |
| external_combination | executeIntent | 玩家 | 施加负面/状态 | cold_evil | 寒邪 | debuff | 1 |  | 寒邪缠身 |
| external_combination | executeIntent | 玩家 | 施加负面/状态 | weak | 虚弱 | debuff | 1 | 2 | 造成伤害降低25% |
| external_combination | executeIntent | 玩家 | 施加负面/状态 | heat_evil | 热邪 | debuff | 2 |  | 回合结束受到伤害 |
| qi_blood_stasis | executeIntent | 玩家 | 施加负面/状态 | cost_up_next | 气滞 | debuff | 1 |  | 下一张卡牌消耗 +1 |
| qi_blood_stasis | executeIntent | 玩家 | 施加负面/状态 | blood_stasis | 血瘀 | debuff | 1 |  | 受到伤害增加 |
| spleen_dampness | executeIntent | 玩家 | 施加负面/状态 | cost_up | 脾虚湿困 | debuff | 1 | 3 | 卡牌消耗增加 |
| spleen_dampness | executeIntent | 玩家 | 施加负面/状态 | dampness_evil | 湿邪 | debuff | 1 |  | 格挡获得降低 |
| heart_kidney_gap | executeIntent | 玩家 | 施加负面/状态 | draw_down | 心悸不安 | debuff | 1 | 1 | 下回合少抽牌 |
| heart_kidney_gap | executeIntent | 玩家 | 施加负面/状态 | no_block | 心肾不交 | debuff | 1 | 1 | 下回合无法获得格挡 |
| heart_kidney_gap | executeIntent | 玩家 | 施加负面/状态 | stun | 痰蒙心窍 | debuff | 1 | 1 | 跳过行动 |
| tanmengxinqiao | executeIntent | 玩家 | 施加负面/状态 | stun | 痰蒙心窍 | debuff | 1 | 1 | 跳过行动 |
| tanmengxinqiao | executeIntent | 玩家 | 施加负面/状态 | draw_down | 神志昏蒙 | debuff | 1 | 1 | 下回合少抽牌 |
| tanmengxinqiao | executeIntent | 玩家 | 施加负面/状态 | no_block | 窍闭失固 | debuff | 1 | 1 | 下回合无法获得格挡 |
| phlegm_stasis | onTurnStart | 敌人自身 | 添加状态 | strength | 力量 | buff | 1 |  | 攻击伤害提高 |
| reruyingxue | executeIntent | 玩家 | 施加负面/状态 | heat_evil | 热邪 | debuff | 2 |  | 回合结束受到伤害 |
| shenbunaqi | executeIntent | 玩家 | 施加负面/状态 | energy_drain | 肾不纳气 | debuff | 1 | 2 | 真气上限降低 |
| shenbunaqi | executeIntent | 玩家 | 施加负面/状态 | max_energy_down | 纳气失司 | debuff | 1 | 1 | 下回合真气上限 -1 |
| shenbunaqi | executeIntent | 玩家 | 施加负面/状态 | cold_evil | 寒邪 | debuff | 1 |  | 寒邪缠身 |
| shenbunaqi | executeIntent | 玩家 | 施加负面/状态 | weak | 气虚失摄 | debuff | 1 | 1 | 造成伤害降低25% |
| yangmingfushi | executeIntent | 玩家 | 施加负面/状态 | remove_block_end | 阳明腑实 | debuff | 1 | 1 | 回合结束时清空格挡 |
| jueyin_complex | executeIntent | 玩家 | 施加负面/状态 | cold_evil | 寒邪 | debuff | 1 |  | 寒邪缠身 |
| jueyin_complex | executeIntent | 玩家 | 施加负面/状态 | weak | 虚弱 | debuff | 1 | 2 | 造成伤害降低25% |
| jueyin_complex | executeIntent | 玩家 | 施加负面/状态 | heat_evil | 热邪 | debuff | 1 |  | 回合结束受到伤害 |
| jueyin_complex | executeIntent | 玩家 | 施加负面/状态 | vulnerable | 易伤 | debuff | 1 |  | 下次受伤增加50% |
| boss_wind_cold | executeIntent | 玩家 | 施加负面/状态 | cold_evil | 寒邪 | debuff | 2 |  | 寒邪缠身 |
| boss_wind_cold | executeIntent | 玩家 | 施加负面/状态 | weak | 虚弱 | debuff | 1 | 2 | 造成伤害降低25% |
| boss_wind_cold | executeIntent | 玩家 | 施加负面/状态 | blood_stasis | 血瘀 | debuff | 1 |  | 受到伤害增加 |
| boss_liver_fire | onTurnStart | 敌人自身 | 添加状态 | fire_growth | 肝火势 | buff | 1 |  | 攻击力提高 |
| boss_liver_fire | executeIntent | 玩家 | 施加负面/状态 | heat_evil | 热邪 | debuff | 2 |  | 回合结束受到伤害 |
| boss_liver_fire | executeIntent | 玩家 | 施加负面/状态 | no_yin_gain | 伤阴 | debuff | 1 | 1 | 下回合无法获得滋阴 |
| boss_spleen_damp | onTurnStart | 敌人自身 | 添加状态 | dampness_evil | 湿邪 | buff | 1 |  | 化热前积蓄湿邪 |
| boss_spleen_damp | executeIntent | 玩家 | 施加负面/状态 | dampness_evil | 湿邪 | debuff | 2 |  | 格挡获得降低 |
| boss_spleen_damp | executeIntent | 玩家 | 施加负面/状态 | max_energy_down | 真气受阻 | debuff | 1 | 1 | 下回合真气上限 -1 |
| boss_spleen_damp | executeIntent | 玩家 | 施加负面/状态 | heat_evil | 热邪 | debuff | damp |  | 回合结束受到伤害 |
| boss_five_elements | onTurnStart | 敌人自身 | 添加状态 | strength | 木势 | buff | 2 |  | 攻击力提高 |
| boss_five_elements | onTurnStart | 敌人自身 | 添加状态 | dampness_evil | 湿邪 | buff | 1 |  | 湿郁化热 |
| boss_five_elements | executeIntent | 玩家 | 施加负面/状态 | heat_evil | 热邪 | debuff | 2 |  | 回合结束受到伤害 |
| boss_five_elements | executeIntent | 玩家 | 施加负面/状态 | dampness_evil | 湿邪 | debuff | 1 |  | 格挡获得降低 |
| boss_five_elements | executeIntent | 敌人自身 | 添加状态 | dampness_evil | 湿邪 | buff | 1 |  | 可转化为热邪 |
| boss_five_elements | executeIntent | 玩家 | 施加负面/状态 | cold_evil | 寒邪 | debuff | 1 |  | 寒邪缠身 |
| boss_five_elements | executeIntent | 玩家 | 施加负面/状态 | weak | 虚弱 | debuff | 1 | 2 | 造成伤害降低25% |
| boss_five_elements | executeIntent | 玩家 | 施加负面/状态 | max_energy_down | 肾不纳气 | debuff | 1 | 1 | 下回合真气上限 -1 |
| boss_five_elements | executeIntent | 玩家 | 施加负面/状态 | weak | 木郁 | debuff | 1 | 1 | 造成伤害降低25% |
| boss_five_elements | executeIntent | 玩家 | 施加负面/状态 | lung_dryness | 燥邪伤肺 | debuff | 1 | 2 | 治疗与格挡效果下降 |
| boss_five_elements | executeIntent | 玩家 | 施加负面/状态 | energy_drain | 肾不纳气 | debuff | 1 | 2 | 真气上限降低 |
| boss_five_elements | executeIntent | 玩家 | 施加负面/状态 | max_energy_down | 寒水泛溢 | debuff | 1 | 1 | 下回合真气上限 -1 |

### 敌方特殊逻辑备注

| behavior | 源码中检测到的非普通状态操作 |
| --- | --- |
| chong_ren_instability | executeIntent: removeBuffs(ctx.player) |
| yangmingfushi | executeIntent: ctx.player.block = 0 |
| boss_wind_cold | executeIntent: removeStatus(ctx.player, 'cold_evil') |
| boss_liver_fire | executeIntent: removeStatus(ctx.player, 'yin') |
| boss_spleen_damp | executeIntent: removeStatus(enemy, 'dampness_evil') |

## 平衡调整建议模板

建议每次调数都在 issue、提交说明或单独笔记中记录下面字段，避免后续不知道为什么改。

| 字段 | 填写建议 |
| --- | --- |
| 目标 | 例如：Act 1 普通战斗平均回合数从 5 降到 4；或湿热质首回合爆发降低 15%。 |
| 影响范围 | 玩家单卡 / 起始牌组 / 某体质 / 某敌人 / 某幕敌池 / 奖励经济。 |
| 改动点 | 写清文件、ID、旧值、新值。 |
| 预期指标 | 回合数、玩家平均掉血、胜率、每回合伤害、每回合格挡、状态层数峰值。 |
| 验证方法 | 单测、手动跑图、管理员指定敌人挑战、截图或日志。 |
| 回滚条件 | 例如：Act 1 首领前平均 HP < 35% 或某体质明显碾压。 |

## 建议优先观察的指标

- **每费用收益**：攻击卡看伤害/费，防御卡看格挡/费，抽牌卡看净手牌/费，治疗卡看治疗/费。
- **0 费密度**：当前 0 费卡很多，任何“抽牌、回能、状态叠层”类 0 费卡都要警惕循环。
- **起始牌组平均费用**：体质强度不只来自被动，也来自 0 费和攻击/技能比例。
- **敌人双行动峰值**：Act 2 普通敌有概率双动，Act 3/精英/Boss 默认双动，平衡时要按一回合总威胁看，不要只看单个 intent。
- **持续负面状态**：寒邪、热邪、湿邪、虚弱、易伤、真气上限降低、不能格挡等效果会跨回合放大，不能只按即时伤害估值。
- **装备有效层数上限**：装备可重复获得，但超过 `EQUIPMENT_EFFECT_CAPS` 的部分不再继续放大效果；调装备时先看上限是否合适。
- **药方获取成本**：药方牌强度要和配方材料数、材料稀缺度、合成机会成本一起看。

## 建议测试命令

```powershell
cd game
npm test -- --run
npm run build
```

## 后续可以补充的人工数据

- 每个体质各跑 5-10 局，记录 Act 1/2/3 的胜率、平均战斗回合数、首领前 HP。
- 管理员指定敌人挑战，记录每个敌人在标准 15 张起始牌组下的平均掉血和回合数。
- 每张卡的“实际抓取率/打出率/胜率贡献”，后续如果接入埋点，可追加到本文件或单独 CSV。
