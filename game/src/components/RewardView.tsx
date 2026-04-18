import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { CARD_LIBRARY } from '../data/cards';
import { ActionButton, PageShell, Panel, SectionTitle } from './ui/PageShell';

export const RewardView: React.FC = () => {
  const { addCardToDeck, currentAct, setPhase } = useGameStore();
  const [rewardIds, setRewardIds] = useState<string[]>([]);

  const availableCards = useMemo(
    () => Object.values(CARD_LIBRARY).filter((card) => (!card.act || card.act <= currentAct) && !card.unplayable),
    [currentAct],
  );

  useEffect(() => {
    const pool = [...availableCards];
    const picked: string[] = [];
    while (picked.length < 3 && pool.length > 0) {
      const index = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(index, 1)[0].id);
    }
    setRewardIds(picked);
  }, [availableCards]);

  const handlePick = (cardId: string) => {
    addCardToDeck(cardId);
    setPhase('map');
  };

  return (
    <PageShell
      title="战斗奖励"
      subtitle="从三张药牌中挑选一张纳入牌组，让每次战后选择都服务下一段巡诊。"
      actions={<ActionButton onClick={() => setPhase('map')}>跳过奖励</ActionButton>}
    >
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="flex min-h-0 flex-col px-5 py-5">
          <SectionTitle title="选择一张牌" hint="奖励三选一，围绕当前体质与牌组方向补足下一步。" />
          <div className="mt-5 flex min-h-0 flex-1 flex-wrap items-start justify-center gap-6 overflow-y-auto ornate-scroll px-1 pr-2">
            {rewardIds.map((cardId, index) => (
              <motion.div
                key={cardId}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                className="cursor-pointer transition-transform hover:-translate-y-2"
              >
                <Card
                  card={{ ...CARD_LIBRARY[cardId], id: `reward_${cardId}` }}
                  onClick={() => handlePick(cardId)}
                  layoutVariant="reward"
                />
              </motion.div>
            ))}
          </div>
        </Panel>

        <Panel className="px-5 py-5">
          <SectionTitle title="胜利结算" />
          <div className="space-y-3 text-sm leading-7 text-stone-700">
            <p>战斗后的三选一奖励是牌组成长的重要节点，决定你接下来强化哪种药性与打法。</p>
            <p>你可以直接跳过，维持牌组密度；也可以补曲线、补联动，或为后续章节提前埋下方向。</p>
            <p>这一页的节奏很短，但每次取舍都会慢慢塑造你的五行巡诊路径。</p>
          </div>

          <div className="mt-6">
            <ActionButton variant="secondary" className="w-full justify-center py-3" onClick={() => setPhase('map')}>
              不拿牌，直接继续
            </ActionButton>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
};
