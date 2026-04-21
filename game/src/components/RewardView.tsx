import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { CARD_LIBRARY } from '../data/cards';
import { ActionButton, PageShell, Panel, SectionTitle } from './ui/PageShell';
import { resolveAssetBackground } from '../utils/assets';

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
      tone="immersive"
      headerSurface="plain"
      title="战斗奖励"
      subtitle="从三张药牌中挑选一张，补进接下来的巡诊节奏。"
      headerClassName="immersive-page__header"
      style={{
        backgroundImage:
          `linear-gradient(180deg, rgba(8,11,18,0.46), rgba(6,8,14,0.9)), radial-gradient(circle at top, rgba(255,223,167,0.14), transparent 30%), ${resolveAssetBackground('/assets/background_main_menu.png')}`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      actions={<ActionButton onClick={() => setPhase('map')}>跳过奖励</ActionButton>}
    >
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="flex min-h-0 flex-col px-5 py-5">
          <SectionTitle title="选择一张牌" hint="奖励三选一，围绕当前体质与牌组方向补足下一步。" />
          <div className="reward-view__choices mt-5 min-h-0 flex-1 overflow-y-auto ornate-scroll pr-2">
            {rewardIds.map((cardId, index) => (
              <motion.div
                key={cardId}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                className="reward-view__choice cursor-pointer transition duration-200 hover:scale-[1.018] hover:drop-shadow-[0_22px_34px_rgba(0,0,0,0.28)]"
              >
                <Card
                  card={{ ...CARD_LIBRARY[cardId], id: `reward_${cardId}` }}
                  onClick={() => handlePick(cardId)}
                  layoutVariant="reward"
                  hoverLift={false}
                />
              </motion.div>
            ))}
          </div>
        </Panel>

        <Panel className="px-5 py-5">
          <SectionTitle title="结算提示" />
          <div className="space-y-3 text-sm leading-7 text-stone-300">
            <p>优先补当前最缺的一环，拿不到合适的牌就直接跳过。</p>
            <p>保持牌组紧凑，通常比硬拿一张普通补丁更值。</p>
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
