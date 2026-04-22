import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Enemy as EnemyType, EnemyActionPhase, StatusEffect } from '../types';
import { cn } from '../utils/cn';
import { resolveAssetUrl } from '../utils/assets';

type CombatViewportTier = 'regular' | 'compact' | 'tight';

interface EnemyProps {
  enemy: EnemyType;
  onClick?: () => void;
  selected?: boolean;
  actionPhase?: EnemyActionPhase;
  viewportTier?: CombatViewportTier;
  preferSideRail?: boolean;
}

type FloatingPopupKind = 'hp-loss' | 'hp-gain' | 'block-loss' | 'block-gain';
type FrameBurstKind = FloatingPopupKind | 'status-buff' | 'status-debuff';

interface StatusNotice {
  id: number;
  label: string;
  type: StatusEffect['type'];
}

const STATUS_TYPE_LABELS: Record<StatusEffect['type'], string> = {
  buff: '增益',
  debuff: '减益',
};

const spriteVariants: Record<
  EnemyActionPhase | 'idle',
  { x: number; y: number; scaleX: number; scaleY: number; filter: string }
> = {
  idle: { x: 0, y: 0, scaleX: 1, scaleY: 1, filter: 'brightness(1) saturate(1)' },
  windup: { x: 24, y: 10, scaleX: 0.98, scaleY: 1.03, filter: 'brightness(0.72) saturate(1.04)' },
  lunge: { x: -56, y: -4, scaleX: 1.02, scaleY: 0.99, filter: 'brightness(1.06) saturate(1.14)' },
  impact: { x: -60, y: -4, scaleX: 1.03, scaleY: 0.98, filter: 'brightness(1.12) saturate(1.18)' },
  recover: { x: -8, y: 0, scaleX: 1, scaleY: 1, filter: 'brightness(1.02) saturate(1.05)' },
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
  reruyingxue: '/assets/cards_enemy/79.png',
  shenbunaqi: '/assets/cards_enemy/80.png',
  tanmengxinqiao: '/assets/cards_enemy/83.png',
  yangmingfushi: '/assets/cards_enemy/84.png',
};

const NOTICE_LIFETIME_MS = 950;
const STATUS_NOTICE_LIFETIME_MS = 1180;

const createStatusStackMap = (statusEffects: StatusEffect[]) =>
  new Map<string, number>(statusEffects.map((status) => [status.id, status.stacks]));

export const Enemy: React.FC<EnemyProps> = ({
  enemy,
  onClick,
  selected,
  actionPhase = 'idle',
  viewportTier = 'regular',
  preferSideRail = false,
}) => {
  const [floatingValues, setFloatingValues] = useState<Array<{ value: number; id: number; kind: FloatingPopupKind }>>(
    [],
  );
  const [statusNotices, setStatusNotices] = useState<StatusNotice[]>([]);
  const [highlightedStatusIds, setHighlightedStatusIds] = useState<string[]>([]);
  const [statPulse, setStatPulse] = useState<FloatingPopupKind | null>(null);
  const [frameBurst, setFrameBurst] = useState<{ id: number; kind: FrameBurstKind } | null>(null);
  const [imageErrored, setImageErrored] = useState(false);
  const [activeStatusId, setActiveStatusId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const prevHpRef = useRef(enemy.currentHp);
  const prevBlockRef = useRef(enemy.block);
  const prevStatusMapRef = useRef<Map<string, number>>(createStatusStackMap(enemy.statusEffects));

  useEffect(() => {
    const hpDelta = enemy.currentHp - prevHpRef.current;
    const blockDelta = enemy.block - prevBlockRef.current;
    const nextPopups: Array<{ value: number; id: number; kind: FloatingPopupKind }> = [];
    let nextBurstKind: FloatingPopupKind | null = null;

    if (hpDelta !== 0) {
      nextPopups.push({
        value: Math.abs(hpDelta),
        id: Date.now() + Math.random(),
        kind: hpDelta < 0 ? 'hp-loss' : 'hp-gain',
      });
      nextBurstKind = hpDelta < 0 ? 'hp-loss' : 'hp-gain';
      setStatPulse(hpDelta < 0 ? 'hp-loss' : 'hp-gain');
    } else if (blockDelta !== 0) {
      nextBurstKind = blockDelta < 0 ? 'block-loss' : 'block-gain';
      setStatPulse(blockDelta < 0 ? 'block-loss' : 'block-gain');
    }

    if (blockDelta !== 0) {
      nextPopups.push({
        value: Math.abs(blockDelta),
        id: Date.now() + Math.random() + 1,
        kind: blockDelta < 0 ? 'block-loss' : 'block-gain',
      });
    }

    if (nextBurstKind) {
      setFrameBurst({
        id: Date.now() + Math.random(),
        kind: nextBurstKind,
      });
    }

    if (nextPopups.length > 0) {
      setFloatingValues((prev) => [...prev, ...nextPopups]);
      const timeout = window.setTimeout(() => {
        setFloatingValues((prev) => prev.filter((entry) => !nextPopups.some((popup) => popup.id === entry.id)));
        setStatPulse(null);
      }, NOTICE_LIFETIME_MS);
      prevHpRef.current = enemy.currentHp;
      prevBlockRef.current = enemy.block;
      return () => window.clearTimeout(timeout);
    }

    prevHpRef.current = enemy.currentHp;
    prevBlockRef.current = enemy.block;
    return undefined;
  }, [enemy.block, enemy.currentHp]);

  useEffect(() => {
    const previousStacks = prevStatusMapRef.current;
    const nextStacks = createStatusStackMap(enemy.statusEffects);
    const addedOrRaised = enemy.statusEffects.filter((status) => {
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
    setFrameBurst({
      id: noticeSeed + Math.random(),
      kind: addedOrRaised.some((status) => status.type === 'debuff') ? 'status-debuff' : 'status-buff',
    });

    const timeout = window.setTimeout(() => {
      setHighlightedStatusIds((current) => current.filter((id) => !highlightIds.includes(id)));
      setStatusNotices((prev) => prev.filter((notice) => !nextNotices.some((entry) => entry.id === notice.id)));
    }, STATUS_NOTICE_LIFETIME_MS);

    return () => window.clearTimeout(timeout);
  }, [enemy.statusEffects]);

  const imageSrc = resolveAssetUrl(enemy.image || FALLBACK_IMAGES[enemy.id] || FALLBACK_IMAGES[enemy.behavior ?? '']);

  useEffect(() => {
    setImageErrored(false);
  }, [imageSrc]);

  useEffect(() => {
    if (activeStatusId && !enemy.statusEffects.some((status) => status.id === activeStatusId)) {
      setActiveStatusId(null);
    }
  }, [activeStatusId, enemy.statusEffects]);

  useEffect(() => {
    if (!activeStatusId) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }
      setActiveStatusId(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveStatusId(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeStatusId]);

  const frameTone = useMemo(() => {
    if (enemy.id.includes('boss')) return 'from-red-950/90 to-stone-950 border-red-500/35';
    if (
      enemy.id.includes('elite') ||
      enemy.id === 'external_combination' ||
      enemy.id === 'phlegm_stasis' ||
      enemy.id === 'jueyin_complex'
    ) {
      return 'from-violet-950/85 to-stone-950 border-violet-400/30';
    }
    return 'from-stone-900/90 to-black border-amber-500/25';
  }, [enemy.id]);

  const enemyTag = useMemo(() => {
    if (enemy.id.includes('boss')) return '首领';
    if (
      enemy.id.includes('elite') ||
      enemy.id === 'external_combination' ||
      enemy.id === 'phlegm_stasis' ||
      enemy.id === 'jueyin_complex'
    ) {
      return '精英';
    }
    return '病邪';
  }, [enemy.id]);

  const activeSpritePose = spriteVariants[actionPhase] ?? spriteVariants.idle;
  const activeTransition = phaseTransition[actionPhase] ?? phaseTransition.idle;
  const intentHighlight = actionPhase === 'windup';
  const impactBurst = actionPhase === 'impact';
  const tookHpHit = floatingValues.some((popup) => popup.kind === 'hp-loss');
  const sideRail = viewportTier !== 'tight' || preferSideRail;
  const hpRatio = Math.max(0, Math.min(100, (enemy.currentHp / enemy.maxHp) * 100));
  const showPortraitArt = Boolean(imageSrc) && !imageErrored;
  const highlightedStatusSet = useMemo(() => new Set(highlightedStatusIds), [highlightedStatusIds]);
  const hpNotices = floatingValues.filter((popup) => popup.kind === 'hp-loss' || popup.kind === 'hp-gain');
  const blockNotices = floatingValues.filter((popup) => popup.kind === 'block-loss' || popup.kind === 'block-gain');
  const activeStatus = useMemo(
    () => enemy.statusEffects.find((status) => status.id === activeStatusId) ?? null,
    [activeStatusId, enemy.statusEffects],
  );

  const handleFrameClick = () => {
    setActiveStatusId(null);
    onClick?.();
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        'combat-enemy relative transition-transform',
        `combat-enemy--${viewportTier}`,
        sideRail ? 'combat-enemy--side' : 'combat-enemy--stack',
        selected && 'scale-[1.02]',
      )}
    >
      <div className="combat-enemy__layout">
        <motion.button
          type="button"
          onClick={handleFrameClick}
          animate={activeSpritePose}
          transition={activeTransition}
          className={cn(
            `combat-enemy__frame relative isolate overflow-hidden border bg-gradient-to-b ${frameTone} shadow-[0_18px_32px_rgba(0,0,0,0.35)]`,
            selected && 'ring-4 ring-amber-300/80',
          )}
        >
          <AnimatePresence>
            {impactBurst && (
              <motion.div
                key={`impact-${enemy.id}`}
                initial={{ opacity: 0.72, scale: 0.74 }}
                animate={{ opacity: 0, scale: 1.2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="pointer-events-none absolute inset-0 rounded-[inherit] bg-white/28 blur-md"
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {frameBurst ? (
              <motion.div
                key={`${frameBurst.kind}-${frameBurst.id}`}
                initial={{ opacity: 0.68, scale: 0.92 }}
                animate={{ opacity: 0, scale: 1.08 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.38, ease: 'easeOut' }}
                className={cn(
                  'combat-enemy__frame-burst',
                  frameBurst.kind === 'hp-loss' && 'combat-enemy__frame-burst--hp-loss',
                  frameBurst.kind === 'hp-gain' && 'combat-enemy__frame-burst--hp-gain',
                  frameBurst.kind === 'block-loss' && 'combat-enemy__frame-burst--block-loss',
                  frameBurst.kind === 'block-gain' && 'combat-enemy__frame-burst--block-gain',
                  frameBurst.kind === 'status-buff' && 'combat-enemy__frame-burst--status-buff',
                  frameBurst.kind === 'status-debuff' && 'combat-enemy__frame-burst--status-debuff',
                )}
              />
            ) : null}
          </AnimatePresence>

          <motion.div
            animate={
              tookHpHit
                ? { x: [0, -6, 6, -4, 4, 0], rotate: [0, -0.8, 0.8, -0.4, 0.4, 0] }
                : { x: 0, rotate: 0 }
            }
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="combat-enemy__portrait absolute inset-0"
          >
            {showPortraitArt ? (
              <>
                <img
                  src={imageSrc}
                  alt=""
                  aria-hidden="true"
                  className="combat-enemy__art-backdrop absolute inset-0 h-full w-full object-cover"
                />
                <div className="combat-enemy__art-stage">
                  <img
                    src={imageSrc}
                    alt={enemy.name}
                    className="combat-enemy__art"
                    loading="eager"
                    onError={() => setImageErrored(true)}
                  />
                </div>
              </>
            ) : (
              <div className="combat-enemy__portrait-fallback absolute inset-0 flex items-center justify-center text-sm font-semibold tracking-[0.18em] text-stone-200">
                暂无立绘
              </div>
            )}
          </motion.div>

          <div className="combat-enemy__portrait-scrim absolute inset-0" />
          <div className="combat-enemy__portrait-glow absolute inset-0" />

          <AnimatePresence>
            {hpNotices.map((popup) => (
              <motion.div
                key={popup.id}
                initial={{ opacity: 0, y: 14, scale: 0.72 }}
                animate={{ opacity: [0, 1, 1, 0], y: [14, -6, -24, -40], scale: [0.72, 1.14, 1.08, 0.96] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className={cn(
                  'pointer-events-none absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center rounded-full border px-3 py-1 font-bold shadow-[0_14px_26px_rgba(0,0,0,0.34)]',
                  popup.kind === 'hp-loss'
                    ? 'border-red-200/55 bg-red-950/78 text-[2.25rem] text-red-100'
                    : 'border-emerald-200/50 bg-emerald-950/72 text-[2rem] text-emerald-100',
                )}
              >
                {popup.kind === 'hp-loss' ? '-' : '+'}
                {popup.value}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.button>

        <div className="combat-enemy__info">
          <AnimatePresence>
            {statusNotices.map((notice, index) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, x: -12, y: 8 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  x: [0, 8, 10, 14],
                  y: [0, -6 - index * 18, -18 - index * 18, -30 - index * 18],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={cn(
                  'pointer-events-none absolute left-0 top-0 z-20 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.18em] shadow-[0_10px_22px_rgba(0,0,0,0.22)]',
                  notice.type === 'debuff'
                    ? 'border-red-300/35 bg-red-500/18 text-red-100'
                    : 'border-emerald-200/30 bg-emerald-400/16 text-emerald-100',
                )}
              >
                +{notice.label}
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="combat-enemy__line combat-enemy__line--header">
            <span className="combat-enemy__tag">{enemyTag}</span>
            <span className="combat-enemy__name" title={enemy.name}>
              {enemy.name}
            </span>
          </div>

          <motion.div
            animate={
              intentHighlight
                ? {
                    x: [0, 6, 0],
                    scale: [1, 1.02, 1],
                    opacity: [0.86, 1, 0.94],
                  }
                : { x: 0, scale: 1, opacity: 1 }
            }
            transition={{ duration: intentHighlight ? 0.28 : 0.16 }}
            className="combat-enemy__line combat-enemy__line--intent"
            title={enemy.intent.description}
          >
            <span className="combat-enemy__line-label">意图</span>
            <span className="combat-enemy__line-copy">{enemy.intent.description}</span>
          </motion.div>

          <div className="combat-enemy__status-zone">
            <div className="combat-enemy__line combat-enemy__line--status">
            <span className="combat-enemy__line-label">状态</span>
            {enemy.statusEffects.length > 0 ? (
              <div className="combat-enemy__status-wrap">
                {enemy.statusEffects.map((status) => {
                  const isActive = activeStatus?.id === status.id;
                  return (
                    <button
                      key={status.id}
                      type="button"
                      aria-pressed={isActive}
                      aria-label={`${status.name} 详情`}
                      onClick={() => setActiveStatusId((current) => (current === status.id ? null : status.id))}
                      className={cn(
                        'combat-enemy__status-chip',
                        status.type === 'debuff' ? 'combat-enemy__status-chip--debuff' : 'combat-enemy__status-chip--buff',
                        highlightedStatusSet.has(status.id) && 'combat-enemy__status-chip--highlight',
                        isActive && 'combat-enemy__status-chip--active',
                      )}
                    >
                      <span className="combat-enemy__status-chip-letter">{status.name[0]}</span>
                      {status.stacks > 0 ? <span className="combat-enemy__status-chip-stack">{status.stacks}</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="combat-enemy__status-empty">暂无</span>
            )}
          </div>

          <AnimatePresence>
            {activeStatus ? (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="combat-enemy__status-detail"
              >
                <div className="combat-enemy__status-detail-header">
                  <div className="combat-enemy__status-detail-title">{activeStatus.name}</div>
                  <div className="combat-enemy__status-detail-meta">
                    <span>{STATUS_TYPE_LABELS[activeStatus.type]}</span>
                    {activeStatus.stacks > 0 ? <span>层数 {activeStatus.stacks}</span> : null}
                  </div>
                </div>
                <div className="combat-enemy__status-detail-copy">{activeStatus.description}</div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          </div>
        </div>

        <div
          className={cn(
            'combat-enemy__stats relative transition-all duration-200',
            statPulse === 'hp-loss' && 'combat-enemy__stats--hp-loss',
            statPulse === 'hp-gain' && 'combat-enemy__stats--hp-gain',
            statPulse === 'block-gain' && 'combat-enemy__stats--block-gain',
            statPulse === 'block-loss' && 'combat-enemy__stats--block-loss',
          )}
        >
          <AnimatePresence>
            {blockNotices.map((popup) => (
              <motion.div
                key={popup.id}
                initial={{ opacity: 0, y: 12, scale: 0.72 }}
                animate={{ opacity: [0, 1, 1, 0], y: [12, -4, -20, -28], scale: [0.72, 1.06, 1.02, 0.96] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.66, ease: 'easeOut' }}
                className={cn(
                  'pointer-events-none absolute -top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border px-2.5 py-1 font-bold shadow-[0_10px_20px_rgba(0,0,0,0.3)]',
                  popup.kind === 'block-loss'
                    ? 'border-stone-100/45 bg-slate-950/80 text-xl text-stone-100'
                    : 'border-cyan-100/45 bg-cyan-950/72 text-xl text-cyan-100',
                )}
              >
                <span>盾</span>
                <span>
                  {popup.kind === 'block-loss' ? '-' : '+'}
                  {popup.value}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="combat-enemy__stats-body">
            <div className="combat-enemy__hp-track">
              <div
                className={cn(
                  'combat-enemy__hp-fill',
                  statPulse === 'hp-loss' && 'brightness-125 saturate-125',
                  statPulse === 'hp-gain' && 'brightness-110 saturate-110',
                )}
                style={{ height: `${hpRatio}%` }}
              />
            </div>

            <div className="combat-enemy__stats-copy">
              <div className="combat-enemy__stats-row">
                <span className="combat-enemy__stats-key">生命</span>
                <span className="combat-enemy__stats-value">
                  {enemy.currentHp} / {enemy.maxHp}
                </span>
              </div>
              <div className="combat-enemy__stats-row">
                <span className="combat-enemy__stats-key">格挡</span>
                <span className="combat-enemy__stats-value">{enemy.block}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
