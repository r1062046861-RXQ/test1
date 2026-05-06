import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { CARD_LIBRARY } from '../data/cards';
import { ActionButton, Panel, SectionTitle } from './ui/PageShell';
import { Check, X } from 'lucide-react';

export const RewardView: React.FC = () => {
  const { addCardToDeck, setPhase } = useGameStore();
  const [rewardIds, setRewardIds] = useState<string[]>([]);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());

  const availableCards = useMemo(
    () => Object.values(CARD_LIBRARY).filter((card) => !card.unplayable),
    [],
  );

  useEffect(() => {
    const pool = [...availableCards];
    const picked: string[] = [];
    while (picked.length < 3 && pool.length > 0) {
      const index = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(index, 1)[0].id);
    }
    setRewardIds(picked);
    setTaken(new Set());
    setRejected(new Set());
  }, [availableCards]);

  const acceptCard = (cardId: string) => {
    addCardToDeck(cardId);
    setTaken(prev => new Set([...prev, cardId]));
  };

  const rejectCard = (cardId: string) => {
    setRejected(prev => new Set([...prev, cardId]));
  };

  const allDone = rewardIds.every(id => taken.has(id) || rejected.has(id));

  return (
    <div className="flex min-h-full items-start justify-center p-4">
      <Panel className="max-w-5xl mx-auto px-5 py-5 w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="chapter-kicker">战斗奖励</div>
            <h2 className="text-3xl font-bold text-amber-50 mt-1">战利品</h2>
            <p className="text-sm text-stone-300 mt-1">选择需要的卡牌加入牌组，或拒绝继续。</p>
          </div>
          <ActionButton variant="secondary" onClick={() => setPhase('map')}>跳过全部</ActionButton>
        </div>

        <SectionTitle title="卡牌奖励" hint="点击 ✓ 拿取，点击 ✗ 放弃。全部决定后继续。" />

        <div className="grid grid-cols-4 gap-4 mt-3">
          {rewardIds.map((cardId) => {
            const card = CARD_LIBRARY[cardId];
            if (!card) return null;
            const isTaken = taken.has(cardId);
            const isRejected = rejected.has(cardId);
            const decided = isTaken || isRejected;

            return (
              <div key={cardId} className={`relative flex flex-col items-center transition ${decided ? 'opacity-50' : ''}`}>
                <Card card={card} interactive={false} hoverLift={false} />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    disabled={decided}
                    onClick={() => acceptCard(cardId)}
                    className={`rounded-full p-2 transition ${isTaken ? 'bg-emerald-600 text-white' : decided ? 'bg-stone-800 text-stone-600' : 'bg-stone-800 text-emerald-400 hover:bg-emerald-700 hover:text-white'}`}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={decided}
                    onClick={() => rejectCard(cardId)}
                    className={`rounded-full p-2 transition ${isRejected ? 'bg-red-700 text-white' : decided ? 'bg-stone-800 text-stone-600' : 'bg-stone-800 text-red-400 hover:bg-red-700 hover:text-white'}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}

          <div className="flex flex-col items-center">
            <div className="w-48 aspect-[2/3] rounded-[22px] border-2 border-dashed border-amber-500/30 bg-amber-950/20 flex flex-col items-center justify-center gap-2">
              <div className="text-3xl">📋</div>
              <div className="text-xs text-amber-300/60 text-center px-2">XX药方蓝图</div>
              <div className="text-[10px] text-stone-500">尚未设计</div>
            </div>
            <div className="mt-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-[10px] text-amber-300/60">
              占位
            </div>
          </div>
        </div>

        {allDone && (
          <div className="mt-4 flex justify-center">
            <ActionButton variant="primary" className="px-8" onClick={() => setPhase('map')}>
              继续前行
            </ActionButton>
          </div>
        )}
      </Panel>
    </div>
  );
};
