import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Enemy as EnemyType, EnemyActionPhase } from '../types';
import { cn } from '../utils/cn';
import { resolveAssetUrl } from '../utils/assets';

type CombatViewportTier = 'regular' | 'compact' | 'tight';

interface EnemyProps {
  enemy: EnemyType;
  onClick?: () => void;
  selected?: boolean;
  actionPhase?: EnemyActionPhase;
  viewportTier?: CombatViewportTier;
}

type FloatingPopupKind = 'hp-loss' | 'hp-gain' | 'block-loss' | 'block-gain';

const spriteVariants: Record<EnemyActionPhase | 'idle', { x: number; y: number; scaleX: number; scaleY: number; filter: string }> = {
  idle: { x: 0, y: 0, scaleX: 1, scaleY: 1, filter: 'brightness(1) saturate(1)' },
  windup: { x: 28, y: 12, scaleX: 0.95, scaleY: 1.06, filter: 'brightness(0.68) saturate(1.03)' },
  lunge: { x: -74, y: -4, scaleX: 1.04, scaleY: 0.985, filter: 'brightness(1.08) saturate(1.14)' },
  impact: { x: -78, y: -4, scaleX: 1.06, scaleY: 0.98, filter: 'brightness(1.14) saturate(1.18)' },
  recover: { x: -10, y: 0, scaleX: 1, scaleY: 1, filter: 'brightness(1.02) saturate(1.05)' },
};

const phaseTransition: Record<EnemyActionPhase | 'idle', { duration: number; ease: number[] }> = {
  idle: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  windup: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  lunge: { duration: 0.125, ease: [0.12, 0.82, 0.18, 1] },
  impact: { duration: 0.135, ease: [0.2, 0.9, 0.3, 1] },
  recover: { duration: 0.17, ease: [0.22, 1, 0.36, 1] },
};

const FALLBACK_IMAGES: Record<string, string> = {
  wind_cold_guest: '/assets/cards_enemy/89.png',
  wind_heat_attack: '/assets/cards_enemy/90.png',
  damp_turbidity: '/assets/cards_enemy/91.png',
  external_combination: '/assets/cards_enemy/92.png',
  boss_wind_cold: '/assets/cards_enemy/93.png',
  boss_liver_fire: '/assets/cards_enemy/94.png',
  qi_blood_stasis: '/assets/cards_enemy/95.png',
  spleen_dampness: '/assets/cards_enemy/96.png',
  heart_kidney_gap: '/assets/cards_enemy/97.png',
  phlegm_stasis: '/assets/cards_enemy/98.png',
  boss_spleen_damp: '/assets/cards_enemy/99.png',
  yin_yang_split: '/assets/cards_enemy/100.png',
  chong_ren_instability: '/assets/cards_enemy/101.png',
  jueyin_complex: '/assets/cards_enemy/102.png',
  boss_five_elements: '/assets/cards_enemy/103.png',
};

export const Enemy: React.FC<EnemyProps> = ({
  enemy,
  onClick,
  selected,
  actionPhase = 'idle',
  viewportTier = 'regular',
}) => {
  const [floatingValues, setFloatingValues] = useState<Array<{ value: number; id: number; kind: FloatingPopupKind }>>([]);
  const [statPulse, setStatPulse] = useState<FloatingPopupKind | null>(null);
  const prevHpRef = useRef(enemy.currentHp);
  const prevBlockRef = useRef(enemy.block);

  useEffect(() => {
    const hpDelta = enemy.currentHp - prevHpRef.current;
    const blockDelta = enemy.block - prevBlockRef.current;
    const nextPopups: Array<{ value: number; id: number; kind: FloatingPopupKind }> = [];

    if (hpDelta !== 0) {
      nextPopups.push({
        value: Math.abs(hpDelta),
        id: Date.now() + Math.random(),
        kind: hpDelta < 0 ? 'hp-loss' : 'hp-gain',
      });
      setStatPulse(hpDelta < 0 ? 'hp-loss' : 'hp-gain');
    } else if (blockDelta !== 0) {
      setStatPulse(blockDelta < 0 ? 'block-loss' : 'block-gain');
    }

    if (blockDelta !== 0) {
      nextPopups.push({
        value: Math.abs(blockDelta),
        id: Date.now() + Math.random() + 1,
        kind: blockDelta < 0 ? 'block-loss' : 'block-gain',
      });
    }

    if (nextPopups.length > 0) {
      setFloatingValues((prev) => [...prev, ...nextPopups]);
      const timeout = window.setTimeout(() => {
        setFloatingValues((prev) => prev.filter((entry) => !nextPopups.some((popup) => popup.id === entry.id)));
        setStatPulse(null);
      }, 900);
      prevHpRef.current = enemy.currentHp;
      prevBlockRef.current = enemy.block;
      return () => window.clearTimeout(timeout);
    }

    prevHpRef.current = enemy.currentHp;
    prevBlockRef.current = enemy.block;
    return undefined;
  }, [enemy.block, enemy.currentHp]);

  const imageSrc = resolveAssetUrl(enemy.image || FALLBACK_IMAGES[enemy.id] || FALLBACK_IMAGES[enemy.behavior ?? '']);

  const frameTone = useMemo(() => {
    if (enemy.id.includes('boss')) return 'from-red-950/90 to-stone-950 border-red-500/35';
    if (enemy.id.includes('elite') || enemy.id === 'external_combination' || enemy.id === 'phlegm_stasis' || enemy.id === 'jueyin_complex') {
      return 'from-violet-950/85 to-stone-950 border-violet-400/30';
    }
    return 'from-stone-900/90 to-black border-amber-500/25';
  }, [enemy.id]);

  const enemyTag = useMemo(() => {
    if (enemy.id.includes('boss')) return 'Boss';
    if (enemy.id.includes('elite') || enemy.id === 'external_combination' || enemy.id === 'phlegm_stasis' || enemy.id === 'jueyin_complex') {
      return '精英';
    }
    return '病邪';
  }, [enemy.id]);

  const portraitSigil = useMemo(() => {
    switch (enemy.intent.type) {
      case 'attack':
        return '杀';
      case 'buff':
        return '护';
      case 'debuff':
        return '乱';
      case 'special':
      default:
        return '术';
    }
  }, [enemy.intent.type]);

  const activeSpritePose = spriteVariants[actionPhase] ?? spriteVariants.idle;
  const activeTransition = phaseTransition[actionPhase] ?? phaseTransition.idle;
  const intentHighlight = actionPhase === 'windup';
  const impactBurst = actionPhase === 'impact';
  const tookHpHit = floatingValues.some((popup) => popup.kind === 'hp-loss');

  return (
    <div className={cn('combat-enemy relative flex flex-col items-center transition-transform', `combat-enemy--${viewportTier}`, selected && 'scale-[1.02]')}>
      <AnimatePresence>
        {floatingValues.map((popup) => (
          <motion.div
            key={popup.id}
            initial={{ opacity: 1, y: popup.kind.startsWith('block') ? 18 : 0, scale: 0.66 }}
            animate={{ opacity: 0, y: popup.kind.startsWith('block') ? -12 : -40, scale: popup.kind.startsWith('block') ? 1.08 : 1.18 }}
            exit={{ opacity: 0 }}
            className={cn(
              'pointer-events-none absolute z-50 font-bold drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]',
              popup.kind === 'hp-loss'
                ? '-top-8 text-4xl text-red-400'
                : popup.kind === 'hp-gain'
                  ? '-top-8 text-3xl text-emerald-300'
                  : 'bottom-20 right-3 text-2xl text-cyan-200',
            )}
          >
            {popup.kind === 'hp-loss' || popup.kind === 'block-loss' ? '-' : '+'}
            {popup.kind.startsWith('block') ? '盾 ' : ''}
            {popup.value}
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={onClick}
        animate={activeSpritePose}
        transition={activeTransition}
        className={cn(
          `combat-enemy__frame relative border bg-gradient-to-b ${frameTone} shadow-[0_18px_32px_rgba(0,0,0,0.35)]`,
          selected && 'ring-4 ring-amber-300/80',
        )}
      >
        <AnimatePresence>
          {impactBurst && (
            <motion.div
              key={`impact-${enemy.id}`}
              initial={{ opacity: 0.7, scale: 0.72 }}
              animate={{ opacity: 0, scale: 1.22 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-2 rounded-xl bg-white/35 blur-md"
            />
          )}
        </AnimatePresence>

        <div className="combat-enemy__intent-slot">
          <motion.div
            animate={
              intentHighlight
                ? {
                    y: [-2, -8, -6],
                    scale: [1, 1.03, 1.015],
                    boxShadow: [
                      '0 0 0 rgba(248, 250, 252, 0)',
                      '0 0 18px rgba(250, 204, 21, 0.48)',
                      '0 0 6px rgba(250, 204, 21, 0.22)',
                    ],
                  }
                : { y: 0, scale: 1, boxShadow: '0 0 0 rgba(248, 250, 252, 0)' }
            }
            transition={{ duration: intentHighlight ? 0.28 : 0.16 }}
            className={cn(
              'combat-enemy__intent rounded-full border px-4 py-2 text-sm font-semibold tracking-[0.14em] text-stone-100',
              intentHighlight ? 'border-amber-300 bg-amber-400/16' : 'border-white/10 bg-black/30',
            )}
          >
            {enemy.intent.description}
            {typeof enemy.intent.value === 'number' ? ` · ${enemy.intent.value}${enemy.intent.hits ? `×${enemy.intent.hits}` : ''}` : ''}
          </motion.div>
        </div>

        <div className="combat-enemy__header">
          <div className="combat-enemy__nameplate">
            <div className="combat-enemy__tag">{enemyTag}</div>
            <div className="combat-enemy__name">{enemy.name}</div>
          </div>

          {enemy.statusEffects.length > 0 ? (
            <div className="combat-enemy__status-row">
              {enemy.statusEffects.map((status) => (
                <div key={status.id} className="group relative">
                  <div
                    className={cn(
                      'combat-enemy__status-icon flex items-center justify-center rounded-full border-2 border-white/60 text-sm font-bold text-white shadow-md',
                      status.type === 'debuff' ? 'bg-purple-700' : 'bg-emerald-700',
                    )}
                  >
                    {status.name[0]}
                  </div>
                  {status.stacks > 0 ? (
                    <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-red-500 text-[12px]">
                      {status.stacks}
                    </div>
                  ) : null}
                  <div className="pointer-events-none absolute right-[calc(100%+0.5rem)] top-0 z-50 w-40 rounded-xl border border-white/10 bg-black/90 p-2 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="font-bold text-yellow-300">{status.name}</div>
                    <div className="mt-1 leading-5 text-stone-200">{status.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <motion.div
          animate={tookHpHit ? { x: [0, -5, 5, -4, 4, 0], rotate: [0, -0.8, 0.8, -0.4, 0.4, 0] } : { x: 0, rotate: 0 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="combat-enemy__portrait relative overflow-hidden rounded-[18px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,241,208,0.06),rgba(10,7,5,0.56)_72%)]"
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt=""
              aria-hidden="true"
              className="combat-enemy__watermark absolute inset-0 h-full w-full object-cover"
              onError={(event) => {
                const target = event.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_28%,rgba(10,8,7,0.72)_100%)]" />
          <div className="absolute inset-[8%] rounded-[18px] border border-amber-100/10 bg-[radial-gradient(circle_at_50%_26%,rgba(255,229,176,0.16),rgba(17,13,9,0.08)_42%,rgba(11,8,6,0.26)_100%)]" />
          <div className="combat-enemy__sigil absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber-200/18 bg-black/25 text-amber-100/68 shadow-[inset_0_1px_0_rgba(255,245,220,0.08)]">
            <span>{portraitSigil}</span>
          </div>
        </motion.div>
      </motion.button>

      <div
        className={cn(
          'combat-enemy__stats rounded-[20px] border px-3 py-3 shadow-[0_12px_24px_rgba(0,0,0,0.25)] transition-all duration-200',
          statPulse === 'hp-loss'
            ? 'border-red-400/55 bg-red-950/35 shadow-[0_0_0_1px_rgba(248,113,113,0.2),0_12px_24px_rgba(0,0,0,0.25)]'
            : statPulse === 'hp-gain'
              ? 'border-emerald-300/55 bg-emerald-950/25 shadow-[0_0_0_1px_rgba(74,222,128,0.16),0_12px_24px_rgba(0,0,0,0.25)]'
              : statPulse === 'block-gain'
                ? 'border-cyan-200/50 bg-cyan-950/22 shadow-[0_0_0_1px_rgba(103,232,249,0.16),0_12px_24px_rgba(0,0,0,0.25)]'
                : statPulse === 'block-loss'
                  ? 'border-stone-200/40 bg-slate-950/26 shadow-[0_0_0_1px_rgba(226,232,240,0.12),0_12px_24px_rgba(0,0,0,0.25)]'
                  : 'border-amber-500/20 bg-black/35',
        )}
      >
        <div className="mb-2 flex items-center justify-between text-sm uppercase tracking-[0.18em] text-stone-200/78">
          <span>HP</span>
          <span>格挡 {enemy.block}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/8">
          <div
            className={`h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300 ${statPulse === 'hp-loss' ? 'brightness-125 saturate-125' : ''}`}
            style={{ width: `${(enemy.currentHp / enemy.maxHp) * 100}%` }}
          />
        </div>
        <div className="mt-2 text-center text-base font-semibold text-stone-100">
          {enemy.currentHp} / {enemy.maxHp}
        </div>
      </div>
    </div>
  );
};
