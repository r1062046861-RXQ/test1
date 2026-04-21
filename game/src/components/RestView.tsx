import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { ActionButton, Badge, PageShell, Panel, SectionTitle } from './ui/PageShell';
import { resolveAssetBackground } from '../utils/assets';

type RestMode = 'idle' | 'remove' | 'done';

export const RestView: React.FC = () => {
  const { player, currentNodeId, healPlayer, removeCardById, completeNonCombat } = useGameStore();
  const [mode, setMode] = useState<RestMode>('idle');
  const [result, setResult] = useState<string | null>(null);
  const [removedNames, setRemovedNames] = useState<string[]>([]);

  const healAmount = useMemo(() => Math.max(1, Math.floor(player.maxHp * 0.3)), [player.maxHp]);
  const canPurify = player.deck.length >= 2;
  const remainingRemovals = Math.max(0, 2 - removedNames.length);

  useEffect(() => {
    setMode('idle');
    setResult(null);
    setRemovedNames([]);
  }, [currentNodeId]);

  const handleRest = () => {
    healPlayer(healAmount);
    setResult(`你恢复了 ${healAmount} 点生命。`);
    setMode('done');
  };

  const handleRemove = (cardId: string, cardName: string) => {
    const nextRemovedNames = [...removedNames, cardName];
    removeCardById(cardId);
    setRemovedNames(nextRemovedNames);

    if (nextRemovedNames.length >= 2) {
      setResult(`你净去了「${nextRemovedNames[0]}」与「${nextRemovedNames[1]}」。`);
      setMode('done');
    }
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
    <PageShell
      tone="immersive"
      headerSurface="plain"
      footerSurface="plain"
      headerClassName="immersive-page__header"
      title="营地休憩"
      subtitle="短暂停靠一次，决定先稳住血线，还是趁机净去冗余旧牌。"
      footer={footer}
      style={{
        backgroundImage:
          `linear-gradient(180deg, rgba(8,11,18,0.46), rgba(6,8,14,0.9)), radial-gradient(circle at top, rgba(255,223,167,0.14), transparent 30%), ${resolveAssetBackground('/assets/background_main_menu.png')}`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="min-h-0 px-5 py-5">
          <SectionTitle
            title={
              mode === 'remove'
                ? remainingRemovals === 2
                  ? '选择第一张要移除的牌'
                  : '再选择一张牌移除'
                : mode === 'done'
                  ? '休憩完成'
                  : '休憩选项'
            }
          />

          {mode === 'idle' && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <button onClick={handleRest} className="inset-panel px-6 py-6 text-left transition hover:-translate-y-1">
                <div className="text-3xl font-bold text-amber-50">调息</div>
                <div className="mt-3 text-lg text-emerald-200">恢复 {healAmount} 点生命</div>
                <p className="mt-3 text-sm leading-7 text-stone-300">血线危险时优先稳住状态。</p>
              </button>
              <button
                onClick={() => setMode('remove')}
                disabled={!canPurify}
                className="inset-panel px-6 py-6 text-left transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <div className="text-3xl font-bold text-amber-50">净牌</div>
                <div className="mt-3 text-lg text-amber-200">连续移除 2 张牌</div>
                <p className="mt-3 text-sm leading-7 text-stone-300">
                  {canPurify ? '去掉冗余与过渡牌，让牌组更紧凑。' : '至少需要 2 张牌才可执行净牌。'}
                </p>
              </button>
            </div>
          )}

          {mode === 'remove' && (
            <div className="mt-5 flex h-[calc(100%-4rem)] min-h-0 flex-col">
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm leading-7 text-stone-300">
                  {remainingRemovals === 2
                    ? '先移除第一张冗余牌，随后还需再净去 1 张。'
                    : `已净去「${removedNames[0]}」，还需再移除 1 张牌。`}
                </p>
                {removedNames.length === 0 ? (
                  <ActionButton variant="ghost" onClick={() => setMode('idle')}>
                    返回
                  </ActionButton>
                ) : null}
              </div>
              <div className="ornate-scroll flex min-h-0 flex-1 flex-wrap gap-4 overflow-y-auto pr-2">
                {player.deck.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: index * 0.03 }}
                    className="cursor-pointer transition-transform hover:-translate-y-2"
                  >
                    <Card card={card} onClick={() => handleRemove(card.id, card.name)} descriptionModalEnabled={false} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {mode === 'done' && result && (
            <div className="mt-5 inset-panel px-5 py-5 text-base leading-8 text-stone-200">{result}</div>
          )}
        </Panel>

        <Panel className="px-5 py-5">
          <SectionTitle title="休憩提示" />
          <div className="space-y-3 text-sm leading-7 text-stone-300">
            <p>血线紧张先调息，路线已稳再净去多余卡牌。</p>
            <p>进精英或首领前，休憩通常是最后一次整队机会。</p>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
};
