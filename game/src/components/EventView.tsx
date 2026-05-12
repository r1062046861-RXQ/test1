import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { ActionButton, Badge } from './ui/PageShell';
import { resolveAssetBackground } from '../utils/assets';

export const EventView: React.FC = () => {
  const { player, currentEvent, handleEventChoice, completeNonCombat } = useGameStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!currentEvent) {
    return (
      <div className="flex min-h-full items-center justify-center p-4" style={{ backgroundImage: `linear-gradient(180deg, rgba(8,11,18,0.46), rgba(6,8,14,0.9)), ${resolveAssetBackground('/assets/background_main_menu.png')}`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="max-w-lg mx-auto px-5 py-6 text-center">
          <div className="chapter-kicker mb-2">奇遇</div>
          <h2 className="text-2xl font-bold text-stone-100 mb-4">奇遇事件</h2>
          <div className="text-stone-400 text-sm leading-7">
            <div className="rounded-2xl border border-dashed border-stone-700/40 bg-stone-900/30 px-6 py-8 my-4">
              <div className="text-4xl mb-3">📜</div>
              <p className="text-stone-500 text-sm">
                此间风平浪静，无可述之事。
              </p>
            </div>
            <ActionButton onClick={() => completeNonCombat()}>继续前进</ActionButton>
          </div>
        </div>
      </div>
    );
  }

  const handleSelect = (index: number) => {
    if (selectedIndex !== null) return;
    setSelectedIndex(index);
  };

  const handleConfirm = () => {
    if (selectedIndex === null) return;
    handleEventChoice(currentEvent.id, selectedIndex);
  };

  const option = selectedIndex !== null ? currentEvent.options[selectedIndex] : null;

  return (
    <div className="flex min-h-full items-start justify-center p-4" style={{ backgroundImage: `linear-gradient(180deg, rgba(8,11,18,0.46), rgba(6,8,14,0.9)), ${resolveAssetBackground('/assets/background_main_menu.png')}`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="max-w-xl w-full mx-auto px-3 py-4">
        <div className="mb-4 text-center">
          <div className="chapter-kicker">奇遇</div>
          <h2 className="text-2xl font-bold text-stone-100 mt-1">{currentEvent.title}</h2>
          <div className="mt-4 rounded-2xl bg-stone-900/40 border border-stone-700/30 px-5 py-5 text-left">
            <p className="text-sm leading-7 text-stone-300 whitespace-pre-line">{currentEvent.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <Badge variant="slate">生命 {player.hp}/{player.maxHp}</Badge>
          <Badge variant="amber">金币 {player.gold}</Badge>
        </div>

        <div className="space-y-3">
          {currentEvent.options.map((opt, i) => {
            const isSelected = selectedIndex === i;
            const isOtherSelected = selectedIndex !== null && selectedIndex !== i;
            return (
              <button
                key={i}
                type="button"
                disabled={selectedIndex !== null}
                onClick={() => handleSelect(i)}
                className={`w-full text-left rounded-2xl border px-5 py-4 transition-all duration-200 ${
                  isSelected
                    ? 'border-stone-400/40 bg-stone-400/10 ring-1 ring-stone-400/30'
                    : isOtherSelected
                      ? 'border-stone-700/30 bg-stone-900/20 opacity-40'
                      : 'border-stone-700/30 bg-stone-900/20 hover:border-stone-500/40 hover:bg-stone-800/30'
                }`}
              >
                <div className="text-base font-semibold text-stone-100">{opt.label}</div>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {option && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="mt-4 rounded-2xl border border-stone-500/20 bg-stone-800/40 px-5 py-4"
            >
              <p className="text-sm leading-7 text-stone-200 whitespace-pre-line">{option.description}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5 flex justify-center">
          <ActionButton
            disabled={selectedIndex === null}
            onClick={handleConfirm}
          >
            确认选择
          </ActionButton>
        </div>
      </div>
    </div>
  );
};
