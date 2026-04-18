import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { ActionButton, Badge, PageShell, Panel, SectionTitle } from './ui/PageShell';

type RestMode = 'idle' | 'upgrade' | 'done';

export const RestView: React.FC = () => {
  const { player, currentNodeId, healPlayer, upgradeCardById, completeNonCombat } = useGameStore();
  const [mode, setMode] = useState<RestMode>('idle');
  const [result, setResult] = useState<string | null>(null);

  const healAmount = useMemo(() => Math.max(1, Math.floor(player.maxHp * 0.3)), [player.maxHp]);
  const upgradeableCards = useMemo(() => player.deck.filter((card) => !card.upgraded), [player.deck]);

  useEffect(() => {
    setMode('idle');
    setResult(null);
  }, [currentNodeId]);

  const handleRest = () => {
    healPlayer(healAmount);
    setResult(`你恢复了 ${healAmount} 点生命。`);
    setMode('done');
  };

  const handleUpgrade = (cardId: string, cardName: string) => {
    upgradeCardById(cardId);
    setResult(`你将「${cardName}」锻造成了强化版本。`);
    setMode('done');
  };

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="emerald">生命 {player.hp}/{player.maxHp}</Badge>
        <Badge variant="amber">金币 {player.gold}</Badge>
      </div>
      <ActionButton onClick={completeNonCombat}>继续前进</ActionButton>
    </div>
  );

  return (
    <PageShell title="营地休憩" subtitle="在短暂停靠中决定调息养身，还是为关键卡牌做一次锻炼。" footer={footer}>
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="min-h-0 px-5 py-5">
          <SectionTitle title={mode === 'upgrade' ? '选择一张牌升级' : '休憩选项'} />

          {mode === 'idle' && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <button onClick={handleRest} className="inset-panel px-6 py-6 text-left transition hover:-translate-y-1">
                <div className="text-3xl font-bold text-stone-900">调息</div>
                <div className="mt-3 text-lg text-emerald-800">恢复 {healAmount} 点生命</div>
                <p className="mt-3 text-sm leading-7 text-stone-700">适合在进入精英、Boss 或高压地图分支前稳住血线。</p>
              </button>
              <button
                onClick={() => setMode('upgrade')}
                disabled={upgradeableCards.length === 0}
                className="inset-panel px-6 py-6 text-left transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <div className="text-3xl font-bold text-stone-900">锻牌</div>
                <div className="mt-3 text-lg text-amber-800">升级 1 张未强化卡牌</div>
                <p className="mt-3 text-sm leading-7 text-stone-700">
                  {upgradeableCards.length > 0 ? `当前可升级 ${upgradeableCards.length} 张牌。` : '当前没有可升级卡牌。'}
                </p>
              </button>
            </div>
          )}

          {mode === 'upgrade' && (
            <div className="mt-5 flex h-[calc(100%-4rem)] min-h-0 flex-col">
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm leading-7 text-stone-700">升级会强化关键数值与效果，让核心牌更早成形。</p>
                <ActionButton variant="ghost" onClick={() => setMode('idle')}>
                  返回
                </ActionButton>
              </div>
              <div className="ornate-scroll flex min-h-0 flex-1 flex-wrap gap-4 overflow-y-auto pr-2">
                {upgradeableCards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: index * 0.03 }}
                    className="cursor-pointer transition-transform hover:-translate-y-2"
                  >
                    <Card card={card} onClick={() => handleUpgrade(card.id, card.name)} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {mode === 'done' && result && (
            <div className="mt-5 inset-panel px-5 py-5 text-base leading-8 text-stone-800">{result}</div>
          )}
        </Panel>

        <Panel className="px-5 py-5">
          <SectionTitle title="休憩说明" />
          <div className="space-y-3 text-sm leading-7 text-stone-700">
            <p>休憩点让你在调息与锻牌之间做取舍，是巡诊中重新整顿节奏的关键节点。</p>
            <p>如果当前血线吃紧，先稳住状态；如果构筑方向已经清晰，强化核心牌通常会带来更高回报。</p>
            <p>这一页的重点不是停留，而是判断眼前更需要补足体力还是补足牌组强度。</p>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
};
