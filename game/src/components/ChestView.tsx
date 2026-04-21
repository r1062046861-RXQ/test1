import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { CARD_LIBRARY } from '../data/cards';
import { ActionButton, Badge, PageShell, Panel, SectionTitle } from './ui/PageShell';
import { resolveAssetBackground } from '../utils/assets';

export const ChestView: React.FC = () => {
  const { currentAct, addGold, addCardToDeck, completeNonCombat } = useGameStore();
  const [opened, setOpened] = useState(false);
  const [goldReward, setGoldReward] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);

  useEffect(() => {
    setOpened(false);
    setGoldReward(0);
    setChoices([]);
  }, []);

  const handleOpen = () => {
    if (opened) return;
    const gold = 40 + Math.floor(Math.random() * 41) + currentAct * 8;
    addGold(gold);
    setGoldReward(gold);

    const pool = Object.values(CARD_LIBRARY).filter((card) => (!card.act || card.act <= currentAct) && !card.unplayable);
    const picked: string[] = [];
    const copy = [...pool];
    while (picked.length < 3 && copy.length > 0) {
      const idx = Math.floor(Math.random() * copy.length);
      picked.push(copy.splice(idx, 1)[0].id);
    }
    setChoices(picked);
    setOpened(true);
  };

  const handleSelect = (cardId: string) => {
    addCardToDeck(cardId);
    completeNonCombat();
  };

  return (
    <PageShell
      tone="immersive"
      headerSurface="plain"
      headerClassName="immersive-page__header"
      title="宝箱奖励"
      subtitle="先拿金币，再从三张牌中补一张。"
      kicker="巡诊收获"
      style={{
        backgroundImage:
          `linear-gradient(180deg, rgba(8,11,18,0.46), rgba(6,8,14,0.9)), radial-gradient(circle at top, rgba(255,223,167,0.14), transparent 30%), ${resolveAssetBackground('/assets/background_main_menu.png')}`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      actions={opened ? <Badge variant="amber">获得 {goldReward} 金币</Badge> : undefined}
    >
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="flex min-h-0 flex-col px-5 py-5">
          {!opened ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 text-7xl">🧰</div>
              <SectionTitle title="尚未开启" className="text-center" />
              <p className="mt-3 max-w-xl text-sm leading-7 text-stone-300">宝箱会先给资源，再给一次短暂选牌机会。</p>
              <ActionButton variant="primary" className="mt-6 px-7 py-4 text-base" onClick={handleOpen}>
                开启宝箱
              </ActionButton>
            </div>
          ) : (
            <>
              <SectionTitle title="从三张牌中选择一张" hint="金币已直接获得，选牌后继续前进。" />
              <div className="mt-5 flex min-h-0 flex-1 flex-wrap items-center justify-center gap-5 overflow-y-auto ornate-scroll pr-2">
                {choices.map((cardId, index) => (
                  <motion.div
                    key={cardId}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, delay: index * 0.05 }}
                    className="cursor-pointer transition-transform hover:-translate-y-2"
                  >
                    <Card card={{ ...CARD_LIBRARY[cardId], id: `chest_${cardId}` }} onClick={() => handleSelect(cardId)} />
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </Panel>

        <Panel className="px-5 py-5">
          <SectionTitle title="宝箱提示" />
          <div className="space-y-3 text-sm leading-7 text-stone-300">
            <p>宝箱是一次轻量补给，不必每次都拿牌。</p>
            <p>如果当前牌组已经够紧，就拿金币继续前进。</p>
          </div>

          {opened ? (
            <ActionButton variant="secondary" className="mt-6 w-full justify-center py-3" onClick={completeNonCombat}>
              跳过卡牌奖励
            </ActionButton>
          ) : null}
        </Panel>
      </div>
    </PageShell>
  );
};
