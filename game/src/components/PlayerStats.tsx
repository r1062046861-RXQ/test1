import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

type FloatingTextLane = 'hp' | 'block' | 'energy';
type FloatingTextVariant = 'damage' | 'heal' | 'block-loss' | 'block-gain' | 'energy-loss' | 'energy-gain';

interface FloatingTextItem {
  id: number;
  text: string;
  lane: FloatingTextLane;
  variant: FloatingTextVariant;
  colorClass: string;
  icon?: string;
}

interface PanelBurstItem {
  id: number;
  lane: FloatingTextLane;
  variant: FloatingTextVariant;
}

const FLOATING_TEXT_LIFETIME_MS: Record<FloatingTextVariant, number> = {
  damage: 760,
  heal: 860,
  'block-loss': 660,
  'block-gain': 760,
  'energy-loss': 700,
  'energy-gain': 760,
};

const FLOATING_TEXT_DELAY_MS = {
  hpAfterBlockLoss: 100,
};

const PANEL_BURST_LIFETIME_MS = 420;
const PULSE_LIFETIME_MS = 520;

const getFloatingMotion = (variant: FloatingTextVariant) => {
  switch (variant) {
    case 'damage':
      return {
        initial: { opacity: 0, y: 18, scale: 0.64 },
        animate: { opacity: [0, 1, 1, 0], y: [18, -8, -28, -42], scale: [0.64, 1.28, 1.12, 0.96] },
        transition: { duration: 0.68, ease: 'easeOut' as const },
      };
    case 'heal':
      return {
        initial: { opacity: 0, y: 12, scale: 0.72 },
        animate: { opacity: [0, 1, 1, 0], y: [12, -6, -24, -34], scale: [0.72, 1.14, 1.06, 0.98] },
        transition: { duration: 0.78, ease: 'easeOut' as const },
      };
    case 'block-loss':
      return {
        initial: { opacity: 0, y: 12, scale: 0.76 },
        animate: { opacity: [0, 0.96, 0.92, 0], y: [12, -4, -18, -26], scale: [0.76, 1.08, 1.02, 0.97] },
        transition: { duration: 0.58, ease: 'easeOut' as const },
      };
    case 'energy-loss':
      return {
        initial: { opacity: 0, y: 10, scale: 0.74 },
        animate: { opacity: [0, 0.98, 0.92, 0], y: [10, -4, -18, -28], scale: [0.74, 1.1, 1.02, 0.97] },
        transition: { duration: 0.64, ease: 'easeOut' as const },
      };
    case 'block-gain':
    case 'energy-gain':
    default:
      return {
        initial: { opacity: 0, y: 10, scale: 0.76 },
        animate: { opacity: [0, 0.96, 0.9, 0], y: [10, -2, -16, -24], scale: [0.76, 1.08, 1.02, 0.98] },
        transition: { duration: 0.62, ease: 'easeOut' as const },
      };
  }
};

const getFloatingBadgeTone = (variant: FloatingTextVariant) => {
  switch (variant) {
    case 'damage':
      return 'border-red-200/55 bg-red-950/78';
    case 'heal':
      return 'border-emerald-200/50 bg-emerald-950/74';
    case 'block-loss':
      return 'border-stone-100/45 bg-slate-950/82';
    case 'block-gain':
      return 'border-cyan-100/45 bg-cyan-950/74';
    case 'energy-loss':
      return 'border-sky-100/45 bg-sky-950/76';
    case 'energy-gain':
    default:
      return 'border-cyan-100/45 bg-cyan-950/74';
  }
};

export const PlayerStats: React.FC = () => {
  const { player, getHandLimit, getDrawPerTurn } = useGameStore();
  const prevHpRef = useRef(player.hp);
  const prevBlockRef = useRef(player.block);
  const prevEnergyRef = useRef(player.energy);
  const timeoutIdsRef = useRef<number[]>([]);
  const pulseResetTimeoutRef = useRef<number | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const [panelBursts, setPanelBursts] = useState<PanelBurstItem[]>([]);
  const [pulseState, setPulseState] = useState<Record<FloatingTextLane, FloatingTextVariant | null>>({
    hp: null,
    energy: null,
    block: null,
  });

  const scheduleTimeout = (callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
      callback();
    }, delay);
    timeoutIdsRef.current.push(timeoutId);
    return timeoutId;
  };

  const clearTrackedTimeout = (timeoutId: number | null) => {
    if (timeoutId == null) return;
    window.clearTimeout(timeoutId);
    timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
  };

  const clearAllTimeouts = () => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
    pulseResetTimeoutRef.current = null;
  };

  const queuePanelBurst = (lane: FloatingTextLane, variant: FloatingTextVariant, delay = 0) => {
    const burst: PanelBurstItem = {
      id: Date.now() + Math.random(),
      lane,
      variant,
    };

    scheduleTimeout(() => {
      setPanelBursts((prev) => [...prev, burst]);
      scheduleTimeout(() => {
        setPanelBursts((prev) => prev.filter((entry) => entry.id !== burst.id));
      }, PANEL_BURST_LIFETIME_MS);
    }, delay);
  };

  const queueFloatingText = (lane: FloatingTextLane, variant: FloatingTextVariant, value: number, delay = 0) => {
    const text = value > 0 ? `+${value}` : `-${Math.abs(value)}`;
    const item: FloatingTextItem = {
      id: Date.now() + Math.random(),
      text,
      lane,
      variant,
      colorClass:
        variant === 'damage'
          ? 'text-red-200'
          : variant === 'heal'
            ? 'text-emerald-200'
            : variant === 'block-loss'
              ? 'text-stone-100'
              : variant === 'energy-loss'
                ? 'text-sky-100'
                : variant === 'block-gain'
                  ? 'text-cyan-100'
                  : 'text-cyan-50',
      icon: lane === 'block' ? '盾' : lane === 'energy' ? '气' : undefined,
    };

    scheduleTimeout(() => {
      setFloatingTexts((prev) => [...prev, item]);
      scheduleTimeout(() => {
        setFloatingTexts((prev) => prev.filter((entry) => entry.id !== item.id));
      }, FLOATING_TEXT_LIFETIME_MS[variant]);
    }, delay);
  };

  useEffect(() => () => clearAllTimeouts(), []);

  useEffect(() => {
    const hpDelta = player.hp - prevHpRef.current;
    const blockDelta = player.block - prevBlockRef.current;
    const energyDelta = player.energy - prevEnergyRef.current;

    if (blockDelta < 0) {
      queueFloatingText('block', 'block-loss', blockDelta);
      queuePanelBurst('block', 'block-loss');
      setPulseState((prev) => ({ ...prev, block: 'block-loss' }));
    } else if (blockDelta > 0) {
      queueFloatingText('block', 'block-gain', blockDelta);
      queuePanelBurst('block', 'block-gain');
      setPulseState((prev) => ({ ...prev, block: 'block-gain' }));
    }

    const hpDelay = hpDelta < 0 && blockDelta < 0 ? FLOATING_TEXT_DELAY_MS.hpAfterBlockLoss : 0;
    if (hpDelta < 0) {
      queueFloatingText('hp', 'damage', hpDelta, hpDelay);
      queuePanelBurst('hp', 'damage', hpDelay);
      setPulseState((prev) => ({ ...prev, hp: 'damage' }));
    } else if (hpDelta > 0) {
      queueFloatingText('hp', 'heal', hpDelta);
      queuePanelBurst('hp', 'heal');
      setPulseState((prev) => ({ ...prev, hp: 'heal' }));
    }

    if (energyDelta < 0) {
      queueFloatingText('energy', 'energy-loss', energyDelta);
      queuePanelBurst('energy', 'energy-loss');
      setPulseState((prev) => ({ ...prev, energy: 'energy-loss' }));
    } else if (energyDelta > 0) {
      queueFloatingText('energy', 'energy-gain', energyDelta);
      queuePanelBurst('energy', 'energy-gain');
      setPulseState((prev) => ({ ...prev, energy: 'energy-gain' }));
    }

    prevHpRef.current = player.hp;
    prevBlockRef.current = player.block;
    prevEnergyRef.current = player.energy;

    clearTrackedTimeout(pulseResetTimeoutRef.current);
    pulseResetTimeoutRef.current = scheduleTimeout(() => {
      setPulseState({ hp: null, energy: null, block: null });
      pulseResetTimeoutRef.current = null;
    }, PULSE_LIFETIME_MS);
  }, [player.block, player.energy, player.hp]);

  const getPanelTone = (lane: FloatingTextLane) => {
    const pulse = pulseState[lane];
    if (lane === 'hp') {
      return pulse === 'damage'
        ? 'border-red-300/70 bg-red-500/24 shadow-[0_0_0_1px_rgba(252,165,165,0.28),0_0_30px_rgba(248,113,113,0.24)]'
        : pulse === 'heal'
          ? 'border-emerald-300/60 bg-emerald-500/20 shadow-[0_0_0_1px_rgba(110,231,183,0.24),0_0_28px_rgba(52,211,153,0.2)]'
          : 'border-red-400/20 bg-red-500/8';
    }
    if (lane === 'energy') {
      return pulse === 'energy-loss'
        ? 'border-sky-200/68 bg-sky-500/22 shadow-[0_0_0_1px_rgba(125,211,252,0.24),0_0_28px_rgba(56,189,248,0.22)]'
        : pulse === 'energy-gain'
          ? 'border-cyan-200/68 bg-cyan-400/20 shadow-[0_0_0_1px_rgba(103,232,249,0.24),0_0_28px_rgba(34,211,238,0.2)]'
          : 'border-sky-400/20 bg-sky-500/8';
    }
    return pulse === 'block-loss'
      ? 'border-stone-200/55 bg-white/12 shadow-[0_0_0_1px_rgba(226,232,240,0.2),0_0_24px_rgba(148,163,184,0.18)]'
      : pulse === 'block-gain'
        ? 'border-cyan-100/62 bg-cyan-300/16 shadow-[0_0_0_1px_rgba(165,243,252,0.2),0_0_24px_rgba(103,232,249,0.18)]'
        : 'border-stone-200/10 bg-white/5';
  };

  const getPanelBurstTone = (variant: FloatingTextVariant) => {
    switch (variant) {
      case 'damage':
        return 'border-red-200/65 bg-red-400/12';
      case 'heal':
        return 'border-emerald-200/60 bg-emerald-400/12';
      case 'block-loss':
        return 'border-stone-100/50 bg-stone-200/10';
      case 'block-gain':
        return 'border-cyan-100/58 bg-cyan-300/10';
      case 'energy-loss':
        return 'border-sky-100/60 bg-sky-300/12';
      case 'energy-gain':
      default:
        return 'border-cyan-100/58 bg-cyan-300/10';
    }
  };

  const renderPanelBurst = (lane: FloatingTextLane) => (
    <AnimatePresence>
      {panelBursts
        .filter((burst) => burst.lane === lane)
        .map((burst) => (
          <motion.div
            key={burst.id}
            initial={{ opacity: 0.7, scale: 0.86 }}
            animate={{ opacity: 0, scale: 1.12 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
            className={`pointer-events-none absolute inset-[-6px] rounded-[1.25rem] border ${getPanelBurstTone(burst.variant)}`}
          />
        ))}
    </AnimatePresence>
  );

  return (
    <div className="relative w-[21rem] rounded-[26px] border border-amber-500/20 bg-[linear-gradient(180deg,rgba(42,30,22,0.94),rgba(18,12,9,0.96))] px-4 py-4 text-stone-100 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none absolute inset-0 rounded-[26px] border border-white/5" />
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] tracking-[0.28em] text-amber-300/75">巡诊者</div>
          <div className="mt-1 text-2xl font-bold text-amber-50">巡诊者</div>
        </div>
        <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs tracking-[0.2em] text-amber-100">
          回合资源
        </div>
      </div>

      <div className="grid grid-cols-[1.2fr_0.9fr_0.8fr] gap-3">
        <div className={`relative overflow-hidden rounded-2xl border px-3 py-3 transition-all duration-200 ${getPanelTone('hp')}`}>
          {renderPanelBurst('hp')}
          <div className="text-[13px] uppercase tracking-[0.18em] text-red-100/80">生命</div>
          <div className="mt-1 text-3xl font-bold text-red-200">
            {player.hp}
            <span className="ml-1 text-base text-red-100/75">/ {player.maxHp}</span>
          </div>
          <AnimatePresence>
            {floatingTexts
              .filter((item) => item.lane === 'hp')
              .map((item) => {
                const motionProps = getFloatingMotion(item.variant);
                return (
                  <motion.div
                    key={item.id}
                    initial={motionProps.initial}
                    animate={motionProps.animate}
                    exit={{ opacity: 0 }}
                    transition={motionProps.transition}
                    className={`pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-full border px-3 py-1 font-bold drop-shadow-[0_12px_22px_rgba(0,0,0,0.34)] ${item.variant === 'damage' ? 'text-4xl' : 'text-3xl'} ${item.colorClass} ${getFloatingBadgeTone(item.variant)}`}
                  >
                    {item.text}
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>

        <div className={`relative overflow-hidden rounded-2xl border px-3 py-3 transition-all duration-200 ${getPanelTone('energy')}`}>
          {renderPanelBurst('energy')}
          <div className="text-[13px] uppercase tracking-[0.18em] text-sky-100/80">真气</div>
          <div className="mt-1 text-3xl font-bold text-sky-200">
            {player.energy}
            <span className="ml-1 text-base text-sky-100/75">/ {player.maxEnergy}</span>
          </div>
          <AnimatePresence>
            {floatingTexts
              .filter((item) => item.lane === 'energy')
              .map((item) => {
                const motionProps = getFloatingMotion(item.variant);
                return (
                  <motion.div
                    key={item.id}
                    initial={motionProps.initial}
                    animate={motionProps.animate}
                    exit={{ opacity: 0 }}
                    transition={motionProps.transition}
                    className={`pointer-events-none absolute -top-1 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border px-3 py-1 font-bold drop-shadow-[0_12px_22px_rgba(0,0,0,0.34)] text-[1.7rem] ${item.colorClass} ${getFloatingBadgeTone(item.variant)}`}
                  >
                    <span>气</span>
                    <span>{item.text}</span>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>

        <div className={`relative overflow-hidden rounded-2xl border px-3 py-3 transition-all duration-200 ${getPanelTone('block')}`}>
          {renderPanelBurst('block')}
          <div className="text-[13px] uppercase tracking-[0.18em] text-stone-300/78">格挡</div>
          <div className="mt-1 text-3xl font-bold text-stone-100">{player.block}</div>
          <AnimatePresence>
            {floatingTexts
              .filter((item) => item.lane === 'block')
              .map((item) => {
                const motionProps = getFloatingMotion(item.variant);
                return (
                  <motion.div
                    key={item.id}
                    initial={motionProps.initial}
                    animate={motionProps.animate}
                    exit={{ opacity: 0 }}
                    transition={motionProps.transition}
                    className={`pointer-events-none absolute -top-1 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border px-3 py-1 font-bold drop-shadow-[0_12px_22px_rgba(0,0,0,0.34)] ${item.variant === 'block-loss' ? 'text-[1.65rem]' : 'text-[1.5rem]'} ${item.colorClass} ${getFloatingBadgeTone(item.variant)}`}
                  >
                    {item.icon ? <span>{item.icon}</span> : null}
                    <span>{item.text}</span>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs tracking-[0.18em] text-stone-300/75">
        <div className="rounded-full border border-white/8 bg-white/5 px-3 py-2">牌组 {player.deck.length}</div>
        <div className="rounded-full border border-white/8 bg-white/5 px-3 py-2">金币 {player.gold}</div>
        <div className="rounded-full border border-white/8 bg-white/5 px-3 py-2">弃牌堆 {player.discardPile.length}</div>
        <div className="rounded-full border border-white/8 bg-white/5 px-3 py-2">抽牌堆 {player.drawPile.length}</div>
      </div>
      <div className="mt-2 flex gap-2 text-xs tracking-[0.14em]">
        <div className="flex-1 rounded-full border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-center text-amber-200/80">
          手牌 {player.hand.length}/{getHandLimit()}
        </div>
        <div className="flex-1 rounded-full border border-sky-500/20 bg-sky-500/8 px-3 py-2 text-center text-sky-200/80">
          补牌 {getDrawPerTurn()}/回合
        </div>
      </div>
    </div>
  );
};
