import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import { CARD_LIBRARY, isHerbCard } from '../data/cards';
import { FORMULA_BLUEPRINT_BY_ID } from '../data/formulas';
import { ActionButton, Panel, SectionTitle } from './ui/PageShell';
import { Check, ScrollText, X } from 'lucide-react';
import { ensureOffensiveOffer } from '../utils/cardBalance';
import { HandOverview } from './HandOverview';

export const RewardView: React.FC = () => {
  const {
    addCardToDeck,
    setPhase,
    player,
    pendingEquipmentRewardId,
    pendingFormulaBlueprintId,
    recordFormulaBlueprint,
    clearPendingEquipmentReward,
    clearPendingFormulaBlueprintReward,
  } = useGameStore();
  const [rewardIds, setRewardIds] = useState<string[]>([]);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [blueprintTaken, setBlueprintTaken] = useState(false);
  const [blueprintMessage, setBlueprintMessage] = useState('');
  const [skipConfirm, setSkipConfirm] = useState(false);

  const availableCards = useMemo(
    () => Object.values(CARD_LIBRARY).filter((card) => isHerbCard(card) && !card.unplayable),
    [],
  );

  useEffect(() => {
    const pool = [...availableCards];
    const pickedCards: typeof availableCards = [];
    while (pickedCards.length < 3 && pool.length > 0) {
      const index = Math.floor(Math.random() * pool.length);
      pickedCards.push(pool.splice(index, 1)[0]);
    }
    const balancedPicked = ensureOffensiveOffer(pickedCards, availableCards, player.deck);
    setRewardIds(balancedPicked.map(card => card.id));
    setTaken(new Set());
    setRejected(new Set());
    setBlueprintTaken(false);
    setSkipConfirm(false);
  }, [availableCards]);

  const acceptCard = (cardId: string) => {
    addCardToDeck(cardId);
    setTaken(prev => new Set([...prev, cardId]));
  };

  const rejectCard = (cardId: string) => {
    setRejected(prev => new Set([...prev, cardId]));
  };

  const pendingEquipment = pendingEquipmentRewardId ? CARD_LIBRARY[pendingEquipmentRewardId] : null;
  const pendingBlueprint = pendingFormulaBlueprintId ? FORMULA_BLUEPRINT_BY_ID[pendingFormulaBlueprintId] : null;
  const pendingFormulaCard = pendingBlueprint ? CARD_LIBRARY[pendingBlueprint.formulaCardId] : null;
  const blueprintRecorded = pendingBlueprint
    ? (player.knownFormulaBlueprintIds ?? []).includes(pendingBlueprint.id)
    : false;

  const progressTotal = (pendingBlueprint ? 1 : 0) + rewardIds.length;
  const progressDone = rewardIds.filter(id => taken.has(id) || rejected.has(id)).length + (blueprintTaken ? 1 : 0);
  const allRewardsResolved = progressDone >= progressTotal;

  useEffect(() => {
    setBlueprintMessage('');
    if (blueprintRecorded) setBlueprintTaken(true);
  }, [pendingFormulaBlueprintId]);

  const acceptBlueprint = () => {
    if (!pendingBlueprint) return;
    const result = recordFormulaBlueprint(pendingBlueprint.id);
    setBlueprintMessage(result.message);
    setBlueprintTaken(true);
  };

  const returnToMap = () => {
    if (pendingBlueprint && !blueprintRecorded) {
      recordFormulaBlueprint(pendingBlueprint.id);
    }
    clearPendingEquipmentReward();
    clearPendingFormulaBlueprintReward();
    setPhase('map');
  };

  const handleSkipAll = () => {
    if (!skipConfirm) {
      setSkipConfirm(true);
      return;
    }
    returnToMap();
  };

  return (
    <div className="flex min-h-full items-start justify-center p-4">
      <Panel className="max-w-5xl mx-auto px-5 py-5 w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="chapter-kicker">战斗奖励</div>
            <h2 className="text-3xl font-bold text-stone-950 mt-1">战利品</h2>
            <p className="text-sm text-stone-700 mt-1">选择需要的卡牌加入牌组，或拒绝继续。</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <HandOverview deck={player.deck} relics={player.relics ?? []} />
            {!allRewardsResolved ? (
              <ActionButton variant="secondary" onClick={handleSkipAll}>
                {skipConfirm ? '确定跳过全部？' : '跳过全部'}
              </ActionButton>
            ) : null}
          </div>
        </div>

        <SectionTitle title="卡牌奖励与药方蓝图" hint="点击 ✓ 拿取，点击 ✗ 放弃。药方蓝图点击录入即可。" />

        <div className="grid grid-cols-1 gap-4 mt-3 sm:grid-cols-2 lg:grid-cols-5">
          {pendingEquipment ? (
            <div className="flex flex-col items-center">
              <Card card={pendingEquipment} interactive={false} hoverLift={false} />
              <div className="mt-2 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-3 py-1 text-[10px] font-bold text-emerald-800">本次获得装备</div>
            </div>
          ) : null}

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

          {pendingBlueprint ? (
            <div className="flex flex-col items-center">
              <div className="w-48 aspect-[2/3] rounded-[22px] border-2 border-amber-400/35 bg-[linear-gradient(145deg,rgba(84,51,12,0.88),rgba(24,18,12,0.96))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
                <div className="flex items-center justify-between text-amber-100">
                  <span className="rounded-full border border-amber-300/30 bg-amber-400/15 px-2 py-1 text-[10px] font-bold">蓝图</span>
                  <ScrollText size={20} />
                </div>
                <div className="mt-4 text-lg font-bold leading-tight text-white">{pendingFormulaCard?.name ?? pendingBlueprint.name}</div>
                <div className="mt-2 text-[11px] leading-5 text-white/85 line-clamp-4">{pendingBlueprint.description}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[10px] text-amber-100">{pendingBlueprint.difficulty}</span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] text-white/70">{pendingBlueprint.ingredientCardIds.length} 味</span>
                </div>
                <div className="mt-3 text-[10px] leading-4 text-white/65 line-clamp-3">{pendingBlueprint.fullCompositionText}</div>
              </div>
              <div className="mt-2 flex flex-col items-center gap-1">
                <button
                  type="button"
                  disabled={blueprintRecorded || blueprintTaken}
                  onClick={acceptBlueprint}
                  className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                    blueprintRecorded || blueprintTaken
                      ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-200 cursor-default'
                      : 'border-2 border-amber-400/50 bg-amber-500/20 text-amber-100 hover:bg-amber-500/40 hover:border-amber-400'
                  }`}
                >
                  {blueprintRecorded || blueprintTaken ? '已录入合成台' : '录入蓝图'}
                </button>
                {blueprintMessage ? <div className="text-[10px] text-stone-400">{blueprintMessage}</div> : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <span>奖励进度</span>
            <div className="h-2 w-32 rounded-full bg-stone-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(progressDone / Math.max(progressTotal, 1)) * 100}%` }}
              />
            </div>
            <span>{progressDone}/{progressTotal}</span>
          </div>
          <ActionButton
            variant="primary"
            className="px-8"
            disabled={!allRewardsResolved}
            onClick={returnToMap}
          >
            继续前行
          </ActionButton>
        </div>
      </Panel>
    </div>
  );
};
