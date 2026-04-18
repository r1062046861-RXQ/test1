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

const FLOATING_TEXT_LIFETIME_MS: Record<FloatingTextVariant, number> = {
  damage: 620,
  heal: 760,
  'block-loss': 540,
  'block-gain': 640,
  'energy-loss': 620,
  'energy-gain': 680,
};

const FLOATING_TEXT_DELAY_MS = {
  hpAfterBlockLoss: 90,
};

const getFloatingMotion = (variant: FloatingTextVariant) => {
  switch (variant) {
    case 'damage':
      return {
        initial: { opacity: 0, y: 12, scale: 0.72 },
        animate: { opacity: [0, 1, 1, 0], y: [12, -6, -22, -32], scale: [0.72, 1.18, 1.06, 0.96] },
        transition: { duration: 0.58, ease: 'easeOut' as const },
      };
    case 'heal':
      return {
        initial: { opacity: 0, y: 8, scale: 0.78 },
        animate: { opacity: [0, 1, 1, 0], y: [8, -4, -18, -26], scale: [0.78, 1.06, 1.02, 0.98] },
        transition: { duration: 0.68, ease: 'easeOut' as const },
      };
    case 'block-loss':
      return {
        initial: { opacity: 0, y: 8, scale: 0.82 },
        animate: { opacity: [0, 0.95, 0.9, 0], y: [8, -2, -16, -24], scale: [0.82, 1.02, 0.99, 0.96] },
        transition: { duration: 0.5, ease: 'easeOut' as const },
      };
    case 'block-gain':
    case 'energy-gain':
    default:
      return {
        initial: { opacity: 0, y: 8, scale: 0.8 },
        animate: { opacity: [0, 0.92, 0.88, 0], y: [8, -2, -14, -20], scale: [0.8, 1.02, 1, 0.98] },
        transition: { duration: 0.56, ease: 'easeOut' as const },
      };
    case 'energy-loss':
      return {
        initial: { opacity: 0, y: 8, scale: 0.78 },
        animate: { opacity: [0, 0.95, 0.92, 0], y: [8, -4, -18, -26], scale: [0.78, 1.06, 1.01, 0.98] },
        transition: { duration: 0.6, ease: 'easeOut' as const },
      };
  }
};

const PULSE_LIFETIME_MS = 420;

export const PlayerStats: React.FC = () => {
  const { player } = useGameStore();
  const prevHpRef = useRef(player.hp);
  const prevBlockRef = useRef(player.block);
  const prevEnergyRef = useRef(player.energy);
  const timeoutIdsRef = useRef<number[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
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
  };

  const clearAllTimeouts = () => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
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
          ? 'text-red-300'
          : variant === 'heal'
            ? 'text-emerald-300'
            : variant === 'block-loss'
              ? 'text-sky-200'
              : variant === 'energy-loss'
                ? 'text-sky-100'
                : 'text-cyan-200',
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
      setPulseState((prev) => ({ ...prev, block: 'block-loss' }));
    } else if (blockDelta > 0) {
      queueFloatingText('block', 'block-gain', blockDelta);
      setPulseState((prev) => ({ ...prev, block: 'block-gain' }));
    }

    const hpDelay = hpDelta < 0 && blockDelta < 0 ? FLOATING_TEXT_DELAY_MS.hpAfterBlockLoss : 0;
    if (hpDelta < 0) {
      queueFloatingText('hp', 'damage', hpDelta, hpDelay);
      setPulseState((prev) => ({ ...prev, hp: 'damage' }));
    } else if (hpDelta > 0) {
      queueFloatingText('hp', 'heal', hpDelta);
      setPulseState((prev) => ({ ...prev, hp: 'heal' }));
    }

    if (energyDelta < 0) {
      queueFloatingText('energy', 'energy-loss', energyDelta);
      setPulseState((prev) => ({ ...prev, energy: 'energy-loss' }));
    } else if (energyDelta > 0) {
      queueFloatingText('energy', 'energy-gain', energyDelta);
      setPulseState((prev) => ({ ...prev, energy: 'energy-gain' }));
    }

    prevHpRef.current = player.hp;
    prevBlockRef.current = player.block;
    prevEnergyRef.current = player.energy;

    const pulseTimeout = window.setTimeout(() => {
      setPulseState({ hp: null, energy: null, block: null });
    }, PULSE_LIFETIME_MS);
    timeoutIdsRef.current.push(pulseTimeout);
  }, [player.block, player.energy, player.hp]);

  const getPanelTone = (lane: FloatingTextLane) => {
    const pulse = pulseState[lane];
    if (lane === 'hp') {
      return pulse === 'damage'
        ? 'border-red-400/60 bg-red-500/20 shadow-[0_0_0_1px_rgba(248,113,113,0.24),0_0_24px_rgba(248,113,113,0.2)]'
        : pulse === 'heal'
          ? 'border-emerald-400/45 bg-emerald-500/16 shadow-[0_0_0_1px_rgba(52,211,153,0.2),0_0_24px_rgba(52,211,153,0.16)]'
          : 'border-red-400/20 bg-red-500/8';
    }
    if (lane === 'energy') {
      return pulse === 'energy-loss'
        ? 'border-sky-300/60 bg-sky-500/18 shadow-[0_0_0_1px_rgba(125,211,252,0.22),0_0_24px_rgba(56,189,248,0.18)]'
        : pulse === 'energy-gain'
          ? 'border-cyan-300/65 bg-cyan-400/18 shadow-[0_0_0_1px_rgba(103,232,249,0.24),0_0_24px_rgba(34,211,238,0.18)]'
          : 'border-sky-400/20 bg-sky-500/8';
    }
    return pulse === 'block-loss'
      ? 'border-stone-300/45 bg-white/10 shadow-[0_0_0_1px_rgba(226,232,240,0.18),0_0_20px_rgba(148,163,184,0.16)]'
      : pulse === 'block-gain'
        ? 'border-cyan-200/55 bg-cyan-300/12 shadow-[0_0_0_1px_rgba(165,243,252,0.18),0_0_20px_rgba(103,232,249,0.14)]'
        : 'border-stone-200/10 bg-white/5';
  };

  return (
    <div className="relative w-[21rem] rounded-[26px] border border-amber-500/20 bg-[linear-gradient(180deg,rgba(42,30,22,0.94),rgba(18,12,9,0.96))] px-4 py-4 text-stone-100 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none absolute inset-0 rounded-[26px] border border-white/5" />
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.28em] text-amber-300/75">Player</div>
          <div className="mt-1 text-2xl font-bold text-amber-50">巡诊者</div>
        </div>
        <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs tracking-[0.2em] text-amber-100">
          回合资源
        </div>
      </div>

      <div className="grid grid-cols-[1.2fr_0.9fr_0.8fr] gap-3">
        <div className={`relative rounded-2xl border px-3 py-3 transition-all duration-200 ${getPanelTone('hp')}`}>
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
                    className={`pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 font-bold drop-shadow-md ${item.variant === 'damage' ? 'text-3xl' : 'text-2xl'} ${item.colorClass}`}
                  >
                    {item.text}
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>

        <div className={`relative rounded-2xl border px-3 py-3 transition-all duration-200 ${getPanelTone('energy')}`}>
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
                    className={`pointer-events-none absolute -top-1 left-1/2 flex -translate-x-1/2 items-center gap-1 font-bold drop-shadow-md text-2xl ${item.colorClass}`}
                  >
                    <span>气</span>
                    <span>{item.text}</span>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>

        <div className={`relative rounded-2xl border px-3 py-3 transition-all duration-200 ${getPanelTone('block')}`}>
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
                    className={`pointer-events-none absolute -top-1 left-1/2 flex -translate-x-1/2 items-center gap-1 font-bold drop-shadow-md ${item.variant === 'block-loss' ? 'text-2xl' : 'text-xl'} ${item.colorClass}`}
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
        <div className="rounded-full border border-white/8 bg-white/5 px-3 py-2">抽牌堆 {player.drawPile.length}</div>
        <div className="rounded-full border border-white/8 bg-white/5 px-3 py-2">弃牌堆 {player.discardPile.length}</div>
      </div>
    </div>
  );
};
