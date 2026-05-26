import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { resolveAssetBackground } from '../utils/assets';
import { CARD_LIBRARY } from '../data/cards';

const formatEffect = (e: { type: string; value?: number; count?: number; cardId?: string; equipmentId?: string; relicId?: string; rarity?: string; cardType?: string }): string | null => {
  const n = e.value ?? 0;
  switch (e.type) {
    case 'heal':
      return `回复 ${n} 生命`;
    case 'damage':
      return `受到 ${n} 点伤害`;
    case 'maxHpChange':
      return n > 0 ? `生命上限 +${n}` : `生命上限 ${n}`;
    case 'goldChange':
      return n > 0 ? `获得 ${n} 金币` : `失去 ${-n} 金币`;
    case 'shopPriceChange':
      return `商店价格 ${n > 0 ? '+' + n + '%' : n + '%'}`;
    case 'addCard': {
      const c = e.cardId ? CARD_LIBRARY[e.cardId] : null;
      return c ? `获得卡牌「${c.name}」` : '获得卡牌';
    }
    case 'addRelic':
    case 'addEquipment': {
      const c = e.relicId || e.equipmentId ? CARD_LIBRARY[e.relicId ?? e.equipmentId ?? ''] : null;
      return c ? `获得装备「${c.name}」` : '获得装备';
    }
    case 'removeCard':
      return `遗忘 ${e.count ?? 1} 张牌`;
    case 'randomCard': {
      const rar = e.rarity === 'rare' ? '稀有' : '普通';
      const tp = e.cardType === 'attack' ? '攻击' : e.cardType === 'skill' ? '技能' : '';
      return `获得随机${rar}${tp}药材卡`;
    }
    default:
      return null;
  }
};

const getOptionGoldCost = (effects: Array<{ type: string; value?: number }>) =>
  effects.reduce((total, effect) => (
    effect.type === 'goldChange' && (effect.value ?? 0) < 0
      ? total + Math.abs(effect.value ?? 0)
      : total
  ), 0);

export const EventView: React.FC = () => {
  const { player, currentEvent, eventChosenIndex, handleEventChoice, clearCurrentEvent, completeNonCombat } = useGameStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!currentEvent) {
    return (
      <div className="flex min-h-full items-center justify-center p-4" style={{ backgroundImage: `linear-gradient(180deg, rgba(8,11,18,0.46), rgba(6,8,14,0.9)), ${resolveAssetBackground('/assets/background_main_menu.png')}`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="max-w-lg mx-auto px-5 py-6 text-center">
          <div className="chapter-kicker mb-2">奇遇</div>
          <h2 className="text-2xl font-bold text-stone-100 mb-4">奇遇事件</h2>
          <div className="text-stone-400 text-sm leading-7">
            <div className="rounded-2xl border border-dashed border-amber-600/30 bg-amber-900/10 px-6 py-8 my-4">
              <div className="text-4xl mb-3">📜</div>
              <p className="text-amber-100/60 text-sm">
                此间风平浪静，无可述之事。
              </p>
            </div>
            <button
              type="button"
              onClick={() => completeNonCombat()}
              className="rounded-full border border-amber-400/40 bg-amber-400/15 px-6 py-2.5 text-sm font-bold text-amber-50 hover:bg-amber-400/25 active:scale-[0.97] transition-all duration-200"
            >
              继续前进
            </button>
          </div>
        </div>
      </div>
    );
  }

  const confirmed = eventChosenIndex != null;

  const canAffordOption = (index: number) => {
    const option = currentEvent.options[index];
    if (!option) return false;
    return player.gold >= getOptionGoldCost(option.effects);
  };

  const handleSelect = (index: number) => {
    if (confirmed) return;
    if (!canAffordOption(index)) return;
    setSelectedIndex(index);
  };

  const handleConfirm = () => {
    if (selectedIndex === null || confirmed) return;
    if (!canAffordOption(selectedIndex)) return;
    handleEventChoice(currentEvent.id, selectedIndex);
  };

  const handleContinue = () => {
    clearCurrentEvent();
    completeNonCombat();
  };

  const chosenOption = confirmed && eventChosenIndex !== undefined
    ? currentEvent.options[eventChosenIndex]
    : null;
  const effectLines = chosenOption
    ? chosenOption.effects.map(formatEffect).filter(Boolean) as string[]
    : [];

  return (
    <div className="flex min-h-full items-start justify-center p-4" style={{ backgroundImage: `linear-gradient(180deg, rgba(8,11,18,0.46), rgba(6,8,14,0.9)), ${resolveAssetBackground('/assets/background_main_menu.png')}`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="max-w-xl w-full mx-auto px-3 py-4">
        <div className="mb-4 text-center">
          <div className="chapter-kicker">奇遇</div>
          <h2 className="text-2xl font-bold text-stone-100 mt-1">{currentEvent.title}</h2>
          <div className="mt-4 rounded-2xl bg-amber-900/20 border border-amber-500/20 px-5 py-5 text-left">
            <p className="text-sm leading-7 text-amber-100/90 whitespace-pre-line">{currentEvent.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-0.5 text-xs font-semibold text-amber-100">
            生命 {player.hp}/{player.maxHp}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-0.5 text-xs font-semibold text-amber-100">
            金币 {player.gold}
          </span>
        </div>

        <div className="space-y-3">
          {currentEvent.options.map((opt, i) => {
            const isSelected = selectedIndex === i;
            const affordable = canAffordOption(i);
            const goldCost = getOptionGoldCost(opt.effects);
            return (
              <button
                key={i}
                type="button"
                disabled={confirmed || !affordable}
                onClick={() => handleSelect(i)}
                className={`w-full text-left rounded-2xl border px-5 py-4 transition-all duration-200 ${
                  isSelected
                    ? 'border-amber-400/60 bg-amber-400/15 ring-1 ring-amber-400/30'
                    : confirmed || !affordable
                      ? 'border-amber-600/20 bg-amber-700/10 opacity-40 cursor-not-allowed'
                      : 'border-amber-600/20 bg-amber-700/10 hover:border-amber-400/40 hover:bg-amber-500/15'
                }`}
              >
                <div className="text-base font-semibold text-amber-50">{opt.label}</div>
                {!affordable && goldCost > 0 ? (
                  <div className="mt-2 text-xs font-semibold text-red-200/80">金币不足：需要 {goldCost} 金币</div>
                ) : null}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {confirmed && chosenOption && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-5 py-4 space-y-3"
            >
              {effectLines.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {effectLines.map((line, i) => (
                    <span key={i} className="inline-block rounded-full border border-amber-500/30 bg-amber-600/15 px-3 py-0.5 text-xs font-semibold text-amber-100">
                      {line}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm leading-7 text-amber-100 whitespace-pre-line">{chosenOption.description}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5 flex justify-center">
          {confirmed ? (
            <button
              type="button"
              onClick={handleContinue}
              className="rounded-full border border-amber-400/40 bg-amber-400/15 px-6 py-2.5 text-sm font-bold text-amber-50 hover:bg-amber-400/25 active:scale-[0.97] transition-all duration-200"
            >
              继续
            </button>
          ) : (
            <button
              type="button"
              disabled={selectedIndex === null}
              onClick={handleConfirm}
              className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-200 ${
                selectedIndex === null
                  ? 'border border-amber-600/20 bg-amber-700/10 text-amber-100/30 cursor-not-allowed'
                  : 'border border-amber-400/40 bg-amber-400/15 text-amber-50 hover:bg-amber-400/25 active:scale-[0.97]'
              }`}
            >
              确认选择
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
