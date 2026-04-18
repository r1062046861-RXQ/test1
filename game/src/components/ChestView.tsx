import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { CARD_LIBRARY } from '../data/cards';
import { ActionButton, Badge, PageShell, Panel, SectionTitle } from './ui/PageShell';

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
      title="宝箱奖励"
      subtitle="开启宝箱后获得金币，并从三张牌中选择一张。"
      kicker="巡诊收获"
      actions={opened ? <Badge variant="amber">获得 {goldReward} 金币</Badge> : undefined}
    >
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="flex min-h-0 flex-col px-5 py-5">
          {!opened ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 text-7xl">🧰</div>
              <SectionTitle title="尚未开启" className="text-center" />
              <p className="mt-3 max-w-xl text-sm leading-7 text-stone-700">宝箱会先提供额外资源，再给你一次短暂的选牌机会。</p>
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
          <SectionTitle title="宝箱说明" />
          <div className="space-y-3 text-sm leading-7 text-stone-700">
            <p>宝箱节点提供路线中的额外增益：先补金币，再进行一次轻量选牌。</p>
            <p>它更像一次短暂停顿，让你在不进入战斗的情况下微调接下来的构筑方向。</p>
            <p>如果当前牌组已经足够紧凑，也可以直接跳过卡牌奖励。</p>
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
