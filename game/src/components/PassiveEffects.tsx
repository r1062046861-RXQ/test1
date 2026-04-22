import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { cn } from '../utils/cn';

interface PassiveEffectsProps {
  className?: string;
  compact?: boolean;
}

interface StatusNotice {
  id: number;
  label: string;
  type: 'buff' | 'debuff';
}

const STATUS_NOTICE_LIFETIME_MS = 1180;

const createStatusStackMap = (statusEffects: ReturnType<typeof useGameStore.getState>['player']['statusEffects']) =>
  new Map(statusEffects.map((status) => [status.id, status.stacks]));

export const PassiveEffects: React.FC<PassiveEffectsProps> = ({ className, compact = false }) => {
  const { player } = useGameStore();
  const [statusNotices, setStatusNotices] = useState<StatusNotice[]>([]);
  const [highlightedStatusIds, setHighlightedStatusIds] = useState<string[]>([]);
  const prevStatusMapRef = useRef(createStatusStackMap(player.statusEffects));

  useEffect(() => {
    const previousStacks = prevStatusMapRef.current;
    const nextStacks = createStatusStackMap(player.statusEffects);
    const addedOrRaised = player.statusEffects.filter((status) => {
      const previous = previousStacks.get(status.id);
      return previous === undefined || status.stacks > previous;
    });

    prevStatusMapRef.current = nextStacks;
    if (addedOrRaised.length === 0) {
      return undefined;
    }

    const noticeSeed = Date.now();
    const nextNotices = addedOrRaised.slice(0, 3).map((status, index) => ({
      id: noticeSeed + index + Math.random(),
      label: status.name,
      type: status.type,
    }));
    const highlightIds = addedOrRaised.map((status) => status.id);

    setHighlightedStatusIds(highlightIds);
    setStatusNotices((prev) => [...prev, ...nextNotices]);

    const timeout = window.setTimeout(() => {
      setHighlightedStatusIds((current) => current.filter((id) => !highlightIds.includes(id)));
      setStatusNotices((prev) => prev.filter((notice) => !nextNotices.some((entry) => entry.id === notice.id)));
    }, STATUS_NOTICE_LIFETIME_MS);

    return () => window.clearTimeout(timeout);
  }, [player.statusEffects]);

  const highlightedStatusSet = useMemo(() => new Set(highlightedStatusIds), [highlightedStatusIds]);

  if (player.statusEffects.length === 0) return null;

  return (
    <div className={cn('combat-parchment-panel relative flex min-h-0 flex-col overflow-hidden px-3 py-3', className)}>
      <AnimatePresence>
        {statusNotices.map((notice, index) => (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, x: 10, y: 8 }}
            animate={{
              opacity: [0, 1, 1, 0],
              x: [10, 2, 0, -6],
              y: [8, -4 - index * 18, -18 - index * 18, -30 - index * 18],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={cn(
              'pointer-events-none absolute right-3 top-3 z-20 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.18em] shadow-[0_10px_22px_rgba(0,0,0,0.22)]',
              notice.type === 'debuff'
                ? 'border-red-300/35 bg-red-500/18 text-red-100'
                : 'border-emerald-200/30 bg-emerald-400/16 text-emerald-100',
            )}
          >
            +{notice.label}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
        <Sparkles size={16} className="text-amber-300" />
        <div className="text-[12px] uppercase tracking-[0.24em] text-stone-300">被动效果</div>
      </div>

      <div
        className={cn(
          'ornate-scroll combat-passives-grid min-h-0 flex-1 overflow-y-auto pr-1',
          compact && 'combat-passives-grid--compact',
        )}
      >
        {player.statusEffects.map((effect) => {
          const highlighted = highlightedStatusSet.has(effect.id);
          return (
            <motion.div
              key={effect.id}
              layout
              animate={highlighted ? { scale: [1, 1.02, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
              transition={{ duration: highlighted ? 0.52 : 0.18, ease: 'easeOut' }}
              className={cn(
                'combat-parchment-inset combat-passives-grid__item px-2.5 py-2 text-stone-100 transition-all duration-200',
                highlighted &&
                  (effect.type === 'debuff'
                    ? 'border-red-300/30 bg-red-950/26 shadow-[0_0_0_1px_rgba(248,113,113,0.16),0_10px_22px_rgba(0,0,0,0.18)]'
                    : 'border-emerald-300/26 bg-emerald-950/20 shadow-[0_0_0_1px_rgba(74,222,128,0.14),0_10px_22px_rgba(0,0,0,0.18)]'),
              )}
            >
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-bold text-white transition-all duration-200',
                    effect.type === 'buff'
                      ? 'bg-emerald-700 shadow-[0_8px_16px_rgba(16,185,129,0.18)]'
                      : 'bg-red-700 shadow-[0_8px_16px_rgba(239,68,68,0.18)]',
                    highlighted && 'scale-110 ring-2 ring-white/20',
                  )}
                >
                  {effect.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="combat-passives-grid__title-row">
                    <div className="font-bold text-stone-50">
                      {effect.name}
                      {effect.stacks > 0 ? ` ×${effect.stacks}` : ''}
                    </div>
                    <div className="combat-passives-grid__type">{effect.type === 'buff' ? '增益' : '减益'}</div>
                  </div>
                  <div
                    className={cn(
                      'combat-passives-grid__description mt-1 text-stone-300/90',
                      compact ? 'text-[11px] leading-5' : 'text-sm leading-5',
                    )}
                  >
                    {effect.description}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
