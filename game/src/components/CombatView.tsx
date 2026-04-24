import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hourglass, RefreshCw, ScrollText, Swords } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { cn } from '../utils/cn';
import { CombatLog } from './CombatLog';
import { Enemy } from './Enemy';
import { Hand } from './Hand';
import { PassiveEffects } from './PassiveEffects';
import { PlayerStats } from './PlayerStats';
import { ActionButton, Badge } from './ui/PageShell';
import { panelSettleVariants, turnBannerVariants } from './ui/motionPresets';
import { resolveAssetUrl } from '../utils/assets';

type CombatViewportTier = 'regular' | 'compact' | 'tight';
type EnemyLayoutMode = 'default' | 'crowded' | 'packed';

const getCombatViewportTier = (height: number): CombatViewportTier => {
  if (height <= 780) return 'tight';
  if (height <= 900) return 'compact';
  return 'regular';
};

export const CombatView: React.FC = () => {
  const {
    enemies,
    endTurn,
    combatTurn,
    setPhase,
    currentAct,
    selectedEnemyId,
    selectEnemy,
    enemyActionCue,
    playerImpactCue,
    player,
  } = useGameStore();

  const [turnBanner, setTurnBanner] = useState<{ token: number; label: string; hint: string } | null>(null);
  const [viewportTier, setViewportTier] = useState<CombatViewportTier>(() =>
    typeof window === 'undefined' ? 'regular' : getCombatViewportTier(window.innerHeight),
  );
  const [preferSideRail, setPreferSideRail] = useState<boolean>(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 1280,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncViewportTier = () => {
      setViewportTier(getCombatViewportTier(window.innerHeight));
      setPreferSideRail(window.innerWidth >= 1280);
    };

    syncViewportTier();
    window.addEventListener('resize', syncViewportTier);
    return () => window.removeEventListener('resize', syncViewportTier);
  }, []);

  useEffect(() => {
    const token = Date.now();
    const banner =
      combatTurn === 0
        ? { token, label: '我方回合', hint: '调整手牌与真气后再出手。' }
        : { token, label: '敌方回合', hint: '留意意图与命中时机。' };
    setTurnBanner(banner);

    const timeout = window.setTimeout(() => {
      setTurnBanner((current) => (current?.token === token ? null : current));
    }, combatTurn === 0 ? 900 : 700);

    return () => window.clearTimeout(timeout);
  }, [combatTurn]);

  const getBackground = () => {
    if (currentAct === 1) return '/assets/background_combat_act1.png';
    if (currentAct === 2) return '/assets/background_combat_act2.png';
    if (currentAct === 3) return '/assets/background_combat_act3.png';
    return '/assets/background_combat_act1.png';
  };
  const backgroundImage = resolveAssetUrl(getBackground());

  const playerShake = playerImpactCue
    ? playerImpactCue.kind === 'block'
      ? { x: [0, -5, 4, -3, 1, 0], rotate: [0, -0.28, 0.18, 0], scale: [1, 0.992, 1] }
      : { x: [0, -10, 7, -5, 2, 0], rotate: [0, -0.78, 0.46, -0.12, 0], scale: [1, 0.982, 1.006, 1] }
    : { x: 0, rotate: 0, scale: 1 };

  const playerShakeDuration = playerImpactCue?.kind === 'block' ? 0.13 : 0.17;
  const turnLabel = combatTurn === 0 ? '我方回合' : '敌方回合';
  const turnHint = combatTurn === 0 ? '选择卡牌并规划回合。' : '观察敌方出手与受击反馈。';
  const enemyCountLabel = `敌人 ${enemies.length}`;
  const visibleEnemies = useMemo(() => enemies.filter((enemy) => enemy.currentHp > 0), [enemies]);
  const activeSelectedEnemyId =
    selectedEnemyId && visibleEnemies.some((enemy) => enemy.id === selectedEnemyId)
      ? selectedEnemyId
      : visibleEnemies[0]?.id ?? null;
  void enemyCountLabel;
  const contentKey = useMemo(() => `combat-act-${currentAct}`, [currentAct]);
  const enemyLayoutMode: EnemyLayoutMode =
    visibleEnemies.length >= 4 ? 'packed' : visibleEnemies.length >= 3 ? 'crowded' : 'default';

  return (
    <div
      className={cn(
        'combat-view relative flex h-screen w-screen flex-col overflow-hidden text-stone-100',
        `combat-view--${viewportTier}`,
      )}
      style={{ backgroundImage: `url("${backgroundImage}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(19,13,9,0.24),rgba(14,10,7,0.78))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,227,171,0.18),transparent_24%)]" />
      <div className="page-shell__grain" />

      <AnimatePresence>
        {playerImpactCue && (
          <motion.div
            key={`player-impact-${playerImpactCue.token}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, playerImpactCue.kind === 'block' ? 0.08 : 0.15, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: playerShakeDuration, ease: 'easeOut' }}
            className={`pointer-events-none absolute inset-0 z-30 ${playerImpactCue.kind === 'block' ? 'bg-sky-100/10' : 'bg-red-100/14'}`}
          />
        )}
      </AnimatePresence>

      <div className="combat-view__shell relative z-10 mx-auto flex h-full w-full max-w-[1600px] flex-col">
        <div className="combat-view__layout grid min-h-0 flex-1 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <motion.div
            variants={panelSettleVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.06 }}
            className="combat-view__sidebar grid min-h-0 xl:grid-rows-[auto_auto_minmax(0,1fr)_minmax(0,0.72fr)]"
          >
            <div className="combat-view__context ornate-panel">
              <div className="chapter-kicker">战斗章节</div>
              <div className="combat-view__title-row mt-2 flex flex-wrap items-center gap-2">
                <h2 className="combat-view__title text-3xl font-bold text-amber-50">战斗</h2>
                <Badge variant={combatTurn === 0 ? 'amber' : 'crimson'}>{turnLabel}</Badge>
                <Badge variant="slate">第 {currentAct} 幕</Badge>
              </div>
              <p className="combat-view__hint mt-1 text-sm text-stone-300">{turnHint}</p>
            </div>

            <motion.div animate={playerShake} transition={{ duration: playerShakeDuration, ease: 'easeOut' }} className="relative">
              <AnimatePresence>
                {playerImpactCue && (
                  <motion.div
                    key={`player-ring-${playerImpactCue.token}`}
                    initial={{ opacity: playerImpactCue.kind === 'block' ? 0.18 : 0.24, scale: 0.94 }}
                    animate={{ opacity: 0, scale: 1.08 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: playerShakeDuration, ease: 'easeOut' }}
                    className={`pointer-events-none absolute -inset-2 rounded-[30px] ${playerImpactCue.kind === 'block' ? 'bg-sky-200/8 shadow-[0_0_18px_rgba(125,211,252,0.24)]' : 'bg-red-300/10 shadow-[0_0_22px_rgba(252,165,165,0.26)]'}`}
                  />
                )}
              </AnimatePresence>
              <PlayerStats />
            </motion.div>

            <CombatLog className="h-full" />

            {player.statusEffects.length > 0 ? (
              <PassiveEffects className="h-full" compact />
            ) : (
              <div className="combat-parchment-panel flex min-h-0 flex-col px-3 py-3 text-stone-100">
                <div className="mb-2 border-b border-white/10 pb-2 text-[12px] uppercase tracking-[0.24em] text-stone-300">
                  被动属性
                </div>
                <div className="combat-parchment-inset flex flex-1 items-center justify-center px-4 py-4 text-center text-sm leading-6 text-stone-300">
                  当前没有持续生效的被动属性。
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            key={contentKey}
            variants={panelSettleVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.08 }}
            className="combat-view__stage grid min-h-0 xl:grid-rows-[minmax(0,1fr)_auto]"
          >
            <div className="combat-view__arena relative min-h-0 overflow-hidden rounded-[30px] border border-amber-500/15 bg-[linear-gradient(180deg,rgba(22,15,11,0.68),rgba(10,7,6,0.84))] shadow-[0_25px_50px_rgba(0,0,0,0.3)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,223,169,0.14),transparent_28%)]" />
              <div className="absolute inset-x-[12%] top-5 h-24 rounded-full bg-amber-300/8 blur-3xl" />
              <div className="combat-view__arena-controls absolute right-4 top-4 z-20 flex items-center gap-3">
                <Badge variant="slate">{`鏁屼汉 ${visibleEnemies.length}`}</Badge>
                <ActionButton variant="secondary" onClick={() => setPhase('map')}>
                  返回地图
                </ActionButton>
              </div>

              <AnimatePresence>
                {turnBanner && (
                  <motion.div
                    key={turnBanner.token}
                    variants={turnBannerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="combat-view__turn-banner pointer-events-none absolute left-1/2 top-3 z-30 w-[min(26rem,calc(100%-2rem))] -translate-x-1/2"
                  >
                    <div className="rounded-full border border-amber-300/25 bg-[linear-gradient(180deg,rgba(52,36,24,0.96),rgba(24,17,13,0.94))] px-5 py-2.5 text-center shadow-[0_16px_30px_rgba(0,0,0,0.28)]">
                      <div className="text-[12px] uppercase tracking-[0.28em] text-amber-300/80">回合提示</div>
                      <div className="mt-1 text-lg font-bold tracking-[0.18em] text-amber-50">{turnBanner.label}</div>
                      <div className="mt-1 text-[12px] tracking-[0.14em] text-stone-300">{turnBanner.hint}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="combat-view__arena-body relative z-10 flex h-full min-h-0 flex-col">
                <div
                  className={cn(
                    'combat-view__arena-center pointer-events-none flex min-h-0 flex-1 justify-center',
                    enemyLayoutMode === 'crowded' && 'combat-view__arena-center--crowded',
                    enemyLayoutMode === 'packed' && 'combat-view__arena-center--packed',
                  )}
                >
                  <div
                    className={cn(
                      'combat-view__enemy-row flex flex-wrap items-end justify-center',
                      enemyLayoutMode === 'crowded' && 'combat-view__enemy-row--crowded',
                      enemyLayoutMode === 'packed' && 'combat-view__enemy-row--packed',
                    )}
                  >
                    {visibleEnemies.map((enemy) => (
                      <Enemy
                        key={enemy.id}
                        enemy={enemy}
                        viewportTier={viewportTier}
                        preferSideRail={preferSideRail}
                        layoutMode={enemyLayoutMode}
                        selected={enemy.id === activeSelectedEnemyId}
                        actionPhase={enemyActionCue?.enemyId === enemy.id ? enemyActionCue.phase : 'idle'}
                        onClick={() => selectEnemy(enemy.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="combat-view__hand-shell rounded-[28px] border border-amber-500/18 bg-[linear-gradient(180deg,rgba(27,18,13,0.92),rgba(13,9,7,0.94))] shadow-[0_18px_36px_rgba(0,0,0,0.3)]">
              <div className="combat-view__hand-layout grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                <div className="combat-view__hand-panel rounded-[24px] border border-amber-500/10 bg-[linear-gradient(180deg,rgba(36,24,17,0.82),rgba(16,11,8,0.88))] px-3 pb-2 pt-3 shadow-[inset_0_1px_0_rgba(255,244,220,0.05)]">
                  <div className="mb-2 flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.24em] text-amber-200/70">
                      <ScrollText size={14} />
                      手牌带
                    </div>
                    <div className="flex items-center gap-2 text-[12px] tracking-[0.16em] text-stone-400">
                      <Swords size={12} />
                      悬停 / 出牌 / 提交
                    </div>
                  </div>
                  <div className="combat-view__hand-frame w-full">
                    <Hand viewportTier={viewportTier} />
                  </div>
                </div>

                <motion.div
                  className="combat-view__end-turn flex justify-end xl:pb-2"
                  whileHover={combatTurn === 0 ? { y: -2, scale: 1.01 } : undefined}
                  whileTap={combatTurn === 0 ? { y: 0, scale: 0.985 } : undefined}
                >
                  <div className="relative">
                    {combatTurn === 0 ? (
                      <motion.div
                        className="pointer-events-none absolute inset-0 rounded-full bg-amber-300/12 blur-xl"
                        animate={{ opacity: [0.55, 0.9, 0.55], scale: [0.96, 1.02, 0.96] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    ) : null}
                    <ActionButton
                      variant={combatTurn === 1 ? 'ghost' : 'danger'}
                      disabled={combatTurn === 1}
                      className="relative min-w-[11rem] px-6 py-4 text-base"
                      onClick={endTurn}
                    >
                      {combatTurn === 1 ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                            <Hourglass size={18} />
                          </motion.div>
                          敌方行动中
                        </>
                      ) : (
                        <>
                          <RefreshCw size={18} />
                          结束回合
                        </>
                      )}
                    </ActionButton>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
