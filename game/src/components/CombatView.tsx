import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hourglass, RefreshCw, Trash2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { cn } from '../utils/cn';
import { Card } from './Card';
import type { Card as CardType } from '../types';
import { CARD_LIBRARY } from '../data/cards';
import { CombatLog } from './CombatLog';
import { Enemy } from './Enemy';
import { Hand } from './Hand';
import { PassiveEffects } from './PassiveEffects';
import { PlayerStats } from './PlayerStats';
import { ActionButton, Badge } from './ui/PageShell';
import { panelSettleVariants, turnBannerVariants } from './ui/motionPresets';
import { resolveAssetUrl } from '../utils/assets';
import { playSfx } from '../services/audioService';

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
    getHandLimit,
    bossKills,
    discardOverflowCard,
    completeCombat,
  } = useGameStore();

  const [turnBanner, setTurnBanner] = useState<{ token: number; label: string; hint: string } | null>(null);
  const [longHoveredCard, setLongHoveredCard] = useState<CardType | null>(null);
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
  const visiblePlayerStatusEffects = useMemo(() => player.statusEffects.filter((effect) => !effect.hidden), [player.statusEffects]);

  return (
    <div
      className={cn(
        'combat-view relative flex h-screen w-screen flex-col overflow-hidden text-stone-100',
        `combat-view--${viewportTier}`,
      )}
      style={{ backgroundImage: `url("${backgroundImage}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,6,3,0.40),rgba(4,2,1,0.78))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.06),transparent_24%)]" />
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
            className="combat-view__sidebar grid min-h-0 xl:grid-rows-[auto_auto_minmax(0,1fr)]"
          >
            <div className="combat-view__context">
              <div className="combat-view__title-row mt-2 flex flex-wrap items-center gap-2">
                <h2 className="combat-view__title text-3xl font-bold text-stone-100">战斗</h2>
                <Badge variant={combatTurn === 0 ? 'blue' : 'crimson'}>{turnLabel}</Badge>
                <Badge variant="slate">第 {currentAct} 幕</Badge>
                {bossKills > 0 && (
                  <Badge variant="blue">已斩首领 {bossKills}</Badge>
                )}
              </div>
              {bossKills > 0 && (
                <p className="combat-view__hint mt-1 text-sm text-stone-400">
                  手牌上限{8 + Math.min(bossKills, 2)} · 补牌{3 + Math.min(bossKills, 2)}/回合
                </p>
              )}
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

            {visiblePlayerStatusEffects.length > 0 ? (
              <PassiveEffects className="h-full" compact />
            ) : (
              <div className="flex min-h-0 flex-col px-3 py-3 text-stone-100">
                <div className="mb-2 border-b border-white/10 pb-2 text-[12px] uppercase tracking-[0.24em] text-stone-300">
                  被动属性
                </div>
                <div className="combat-parchment-inset flex flex-1 items-center justify-center px-4 py-4 text-center text-sm leading-6 text-stone-300">
                  当前没有持续生效的被动属性。
                </div>
              </div>
            )}
            {(player.relics ?? []).length > 0 && (
              <div className="flex min-h-0 flex-col overflow-hidden px-3 py-3">
                <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                  <div className="text-[12px] uppercase tracking-[0.24em] text-stone-300">装备遗物</div>
                </div>
                <div className="ornate-scroll flex flex-col gap-1.5 overflow-y-auto pr-1">
                  {(player.relics ?? []).map((relic) => {
                    const card = CARD_LIBRARY[relic.id];
                    if (!card) return null;
                    return (
                      <div key={relic.id} className="combat-parchment-inset flex items-center gap-2 px-2.5 py-1.5 text-stone-100">
                        {card.image && (
                          <img src={resolveAssetUrl(card.image)} alt="" className="h-7 w-5 shrink-0 rounded object-cover" />
                        )}
                        <div className="min-w-0 flex-1 text-[11px] leading-[1.35] text-stone-300/90">{card.description}</div>
                      </div>
                    );
                  })}
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
            <div className="flex min-h-0 gap-3">
              <div className="combat-view__combat-log flex w-52 shrink-0 flex-col">
                <CombatLog className="h-full" />
              </div>
              <div className="relative min-h-0 flex-1">
                <AnimatePresence>
                  {longHoveredCard && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.2 }}
                      className="pointer-events-none absolute right-[7rem] top-[calc(50%-10rem)] z-50"
                    >
                      <div className="scale-[1.15] rounded-[24px] border-2 border-stone-400/25 bg-[linear-gradient(180deg,rgba(22,20,28,0.96),rgba(14,12,18,0.97))] shadow-[0_22px_48px_rgba(0,0,0,0.40)] p-0">
                        <Card
                          card={longHoveredCard}
                          interactive={false}
                          hoverLift={false}
                          layoutVariant="default"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="combat-view__arena relative min-h-0 flex-1 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.06),transparent_28%)]" />
            <div className="absolute inset-x-[12%] top-5 h-24 rounded-full bg-stone-400/6 blur-3xl" />
              <div className="combat-view__arena-controls absolute right-4 top-4 z-20 flex items-center gap-3">
                <Badge variant="slate">敌 {visibleEnemies.length}</Badge>
                {player.constitution === 'admin' && (
                  <ActionButton variant="secondary" onClick={() => completeCombat()}>
                    跳过战斗
                  </ActionButton>
                )}
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
                    <div className="rounded-full border border-stone-400/20 bg-[linear-gradient(180deg,rgba(20,18,24,0.96),rgba(12,10,14,0.94))] px-5 py-2.5 text-center shadow-[0_16px_30px_rgba(0,0,0,0.28)]">
                      <div className="text-[12px] uppercase tracking-[0.28em] text-stone-400">回合提示</div>
                      <div className="mt-1 text-lg font-bold tracking-[0.18em] text-stone-100">{turnBanner.label}</div>
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
                      'combat-view__enemy-row relative flex flex-wrap items-end justify-center',
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
              </div>
            </div>

            <div className="relative px-4 pb-3 pt-2">
              <div className="mx-auto flex max-w-3xl flex-col items-center gap-3">
                <div className="combat-view__hand-frame w-full">
                  <Hand viewportTier={viewportTier} onLongHoverCard={setLongHoveredCard} />
                </div>
              </div>
              <div className="absolute right-4 bottom-3 z-20">
                <ActionButton
                  variant={combatTurn === 1 ? 'ghost' : 'danger'}
                  disabled={combatTurn === 1}
                  className="min-w-[7rem] px-4 py-2 text-sm"
                  onClick={() => { playSfx('confirm'); endTurn(); }}
                >
                  {combatTurn === 1 ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                        <Hourglass size={14} />
                      </motion.div>
                      敌方行动中
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      结束回合
                    </>
                  )}
                </ActionButton>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {combatTurn === 0 && player.hand.length > getHandLimit() && (
          <motion.div
            className="immersive-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="immersive-modal w-full max-w-[64rem] px-6 py-6"
            >
              <div className="immersive-modal__header mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="immersive-modal__kicker text-[12px] font-semibold tracking-[0.18em]">手牌超限</div>
                  <h2 className="immersive-modal__title mt-2 text-2xl font-bold">丢弃卡牌</h2>
                  <p className="immersive-modal__copy mt-2 text-sm leading-7">
                    手牌上限 {getHandLimit()} 张，当前 {player.hand.length} 张。请丢弃 {player.hand.length - getHandLimit()} 张。
                  </p>
                </div>
                <div className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs tracking-[0.2em] text-red-300">
                  溢 {player.hand.length - getHandLimit()}
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 justify-items-center max-h-[60vh] overflow-y-auto ornate-scroll p-2">
                {player.hand.map((cardData) => (
                  <button
                    key={cardData.id}
                    type="button"
                    onClick={() => discardOverflowCard(cardData.id)}
                    className="group relative transition hover:scale-[1.02]"
                  >
                    <div className="relative">
                      <Card
                        card={cardData}
                        interactive={false}
                        hoverLift={false}
                        layoutVariant="hand"
                        descriptionModalEnabled={false}
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-2 ring-red-500/0 transition group-hover:ring-red-500/40" />
                      <div className="absolute -top-1 -right-1 z-20 rounded-full bg-red-600 p-1 text-white shadow-lg transition group-hover:scale-110">
                        <Trash2 size={14} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
