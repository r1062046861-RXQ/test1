import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hourglass, RefreshCw, Trash2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { CARD_LIBRARY } from '../data/cards';
import type { Card as CardType, Enemy as EnemyType, StatusEffect } from '../types';
import { resolveAssetUrl } from '../utils/assets';
import { playSfx } from '../services/audioService';
import { Card } from './Card';
import { Hand } from './Hand';

const COMBAT_ASSET = '/assets/combat/v2/';
const asset = (name: string) => resolveAssetUrl(`${COMBAT_ASSET}${name}`);

const ACT_LABELS: Record<number, string> = {
  1: '第一幕',
  2: '第二幕',
  3: '第三幕',
};

const CONSTITUTION_ICON_BY_PASSIVE_ID: Record<string, string> = {
  balanced_passive: '/assets/constitutions/balanced.webp',
  yin_deficiency_passive: '/assets/constitutions/yin_deficiency.webp',
  qi_deficiency_passive: '/assets/constitutions/qi_deficiency.webp',
  yang_deficiency_passive: '/assets/constitutions/yang_deficiency.webp',
  phlegm_dampness_passive: '/assets/constitutions/phlegm_dampness.webp',
  damp_heat_passive: '/assets/constitutions/damp_heat.webp',
  blood_stasis_passive: '/assets/constitutions/blood_stasis.webp',
  qi_stagnation_passive: '/assets/constitutions/qi_stagnation.webp',
  special_diathesis_passive: '/assets/constitutions/special_diathesis.webp',
};

type CombatViewportTier = 'regular' | 'compact' | 'tight';

const getCombatViewportTier = (height: number): CombatViewportTier => {
  if (height <= 780) return 'tight';
  if (height <= 900) return 'compact';
  return 'regular';
};

const INTENT_TYPE_LABELS: Record<EnemyType['intent']['type'], string> = {
  attack: '攻势',
  defend: '防守',
  buff: '强化',
  debuff: '施邪',
  special: '异动',
};

type FloatingTextLane = 'hp' | 'block' | 'energy';
type FloatingTextKind = 'loss' | 'gain';

type FloatingTextItem = {
  id: number;
  lane: FloatingTextLane;
  kind: FloatingTextKind;
  value: number;
};

type EnemyFloatingTextKind = 'hp-loss' | 'hp-gain' | 'block-loss' | 'block-gain' | 'debuff';

type EnemyFloatingTextItem = {
  id: number;
  enemyId: string;
  kind: EnemyFloatingTextKind;
  value?: number;
  label?: string;
};

type EnemySnapshot = {
  hp: number;
  block: number;
  debuffs: Map<string, { name: string; stacks: number }>;
};

const getEnemySnapshot = (enemy: EnemyType): EnemySnapshot => ({
  hp: enemy.currentHp,
  block: enemy.block,
  debuffs: new Map(
    enemy.statusEffects
      .filter((effect) => effect.type === 'debuff')
      .map((effect) => [effect.id, { name: effect.name, stacks: effect.stacks }]),
  ),
});

const getIntentExplanation = (intent: EnemyType['intent']) => {
  const value = intent.value || 0;
  const hits = intent.hits || 1;

  if (intent.type === 'attack') {
    if (hits > 1) return value > 0 ? `将造成 ${value}x${hits} 连击` : `将进行 ${hits} 段攻击`;
    return value > 0 ? `将造成 ${value} 点伤害` : '将发动攻击';
  }
  if (intent.type === 'defend') {
    return value > 0 ? `将获得 ${value} 点格挡` : '将进行防御';
  }
  if (intent.type === 'buff') return '将强化自身';
  if (intent.type === 'debuff') return '将施加负面状态';
  return '将发动特殊机制';
};

const getEnemyActionClass = (phase?: string, intentType?: EnemyType['intent']['type']) => {
  const phaseClass =
    phase === 'windup'
      ? 'combat-v2-enemy--windup'
      : phase === 'lunge' || phase === 'impact'
        ? 'combat-v2-enemy--lunge'
        : phase === 'recover'
          ? 'combat-v2-enemy--recover'
          : '';
  const intentClass = phaseClass && intentType ? `combat-v2-enemy--intent-${intentType}` : '';
  return `${phaseClass} ${intentClass}`.trim();
};

const getStatusIconName = (effect: StatusEffect, index: number) => {
  if (effect.type === 'debuff') return index % 2 === 0 ? 'status_icon_2.png' : 'status_icon_1.png';
  return index % 2 === 0 ? 'status_icon_3.png' : 'status_icon_1.png';
};

const EnemyStatusIcon: React.FC<{
  effect: StatusEffect;
  index: number;
}> = ({ effect, index }) => {
  const icon = getStatusIconName(effect, index);
  const constitutionIcon = CONSTITUTION_ICON_BY_PASSIVE_ID[effect.id];
  const label = effect.name;
  const stacks = effect.stacks;

  return (
    <div
      className={`combat-v2-status-icon ${constitutionIcon ? 'combat-v2-status-icon--constitution' : ''}`}
      title={effect.description || label}
    >
      <img src={constitutionIcon ? resolveAssetUrl(constitutionIcon) : asset(icon)} alt="" aria-hidden="true" />
      {!constitutionIcon && stacks > 0 ? <span>{stacks}</span> : null}
    </div>
  );
};

const AssetButton: React.FC<{
  className: string;
  src: string;
  label: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
}> = ({ className, src, label, onClick, disabled, busy }) => (
  <button
    type="button"
    className={`${className} combat-v2-image-button ${disabled ? 'combat-v2-image-button--disabled' : ''}`}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
  >
    <img src={asset(src)} alt="" aria-hidden="true" />
    <span className={busy ? 'combat-v2-button-label combat-v2-button-label--busy' : 'combat-v2-button-label'}>
      {label}
    </span>
  </button>
);

const ResourcePill: React.FC<{
  src: string;
  label: string;
  value: React.ReactNode;
  className?: string;
}> = ({ src, label, value, className }) => (
  <div className={`combat-v2-resource-pill ${className ?? ''}`}>
    <img src={asset(src)} alt="" aria-hidden="true" />
    <span className="combat-v2-resource-pill__label">{label}</span>
    <span className="combat-v2-resource-pill__value">{value}</span>
  </div>
);

const PlayerResources: React.FC = () => {
  const { player, getHandLimit, getDrawPerTurn } = useGameStore();

  return (
    <section className="combat-v2-panel combat-v2-player-resources" aria-label="巡诊者资源">
      <img className="combat-v2-panel__bg" src={asset('player_resource_panel.png')} alt="" aria-hidden="true" />
      <h2>巡诊者</h2>
      <div className="combat-v2-turn-resource">
        <img src={asset('turn_resource_frame.png')} alt="" aria-hidden="true" />
        <span>回合资源</span>
      </div>
      <div className="combat-v2-resource-grid">
        <ResourcePill src="deck_frame_icon.png" label="牌组" value={player.deck.length} />
        <ResourcePill src="gold_frame_icon.png" label="金币" value={player.gold} />
        <ResourcePill src="discard_frame_icon.png" label="弃牌堆" value={player.discardPile.length} />
        <ResourcePill src="draw_frame_icon.png" label="抽牌堆" value={player.drawPile.length} />
        <ResourcePill src="hand_frame_icon.png" label="手牌" value={`${player.hand.length}/${getHandLimit()}`} />
        <ResourcePill src="draw_per_turn_frame_icon.png" label="补牌" value={`${getDrawPerTurn()}/回合`} />
      </div>
    </section>
  );
};

const PassiveEquipmentPanel: React.FC = () => {
  const { player } = useGameStore();
  const [activeTab, setActiveTab] = useState<'passive' | 'equipment'>('passive');
  const visibleEffects = player.statusEffects.filter((effect) => !effect.hidden);
  const relics = player.relics ?? [];
  const equipmentRows = useMemo(() => {
    const grouped = new Map<string, { relic: (typeof relics)[number]; count: number }>();

    relics.forEach((relic) => {
      const entry = grouped.get(relic.id);
      if (entry) {
        entry.count += 1;
        return;
      }
      grouped.set(relic.id, { relic, count: 1 });
    });

    return Array.from(grouped.values());
  }, [relics]);

  return (
    <section className="combat-v2-panel combat-v2-passive-panel" aria-label="被动效果与装备">
      <img className="combat-v2-panel__bg" src={asset('passive_panel.png')} alt="" aria-hidden="true" />
      <div className="combat-v2-passive-tabs">
        <button
          type="button"
          className={`combat-v2-passive-tab ${activeTab === 'passive' ? 'combat-v2-passive-tab--active' : ''}`}
          onClick={() => setActiveTab('passive')}
          aria-pressed={activeTab === 'passive'}
        >
          {activeTab === 'passive' ? (
            <img className="combat-v2-passive-tab__frame" src={asset('passive_tab_frame.png')} alt="" aria-hidden="true" />
          ) : (
            <img className="combat-v2-passive-tab__single-icon" src={asset('passive_unselected_marker.png')} alt="" aria-hidden="true" />
          )}
          <span>被动效果</span>
        </button>
        <button
          type="button"
          className={`combat-v2-passive-tab combat-v2-passive-tab--equipment ${activeTab === 'equipment' ? 'combat-v2-passive-tab--active' : ''}`}
          onClick={() => setActiveTab('equipment')}
          aria-pressed={activeTab === 'equipment'}
        >
          {activeTab === 'equipment' ? (
            <img className="combat-v2-passive-tab__frame" src={asset('equipment_tab_frame.png')} alt="" aria-hidden="true" />
          ) : (
            <img className="combat-v2-passive-tab__single-icon" src={asset('equipment_icon.png')} alt="" aria-hidden="true" />
          )}
          <span>装备</span>
        </button>
      </div>
      <img className="combat-v2-passive-divider" src={asset('divider_line.png')} alt="" aria-hidden="true" />
      <div className="combat-v2-passive-content">
        {activeTab === 'passive' ? (
          visibleEffects.length > 0 ? (
            visibleEffects.slice(0, 6).map((effect, index) => (
              <div key={effect.id} className="combat-v2-passive-row">
                <EnemyStatusIcon effect={effect} index={index} />
                <div className="combat-v2-passive-row__copy">
                  <strong>
                    {effect.name}
                    {effect.stacks > 0 ? ` x${effect.stacks}` : ''}
                  </strong>
                  <span>{effect.description}</span>
                </div>
                <em>{effect.type === 'buff' ? '增益' : '减益'}</em>
              </div>
            ))
          ) : (
            <div className="combat-v2-passive-empty">
              <img src={asset('passive_unselected_marker.png')} alt="" aria-hidden="true" />
              <span>当前没有持续生效的被动效果</span>
            </div>
          )
        ) : equipmentRows.length > 0 ? (
          <div className="combat-v2-equipment-page">
            {equipmentRows.map(({ relic, count }) => {
              const card = CARD_LIBRARY[relic.id];
              const image = card?.image ? resolveAssetUrl(card.image) : null;
              return (
                <div key={relic.id} className="combat-v2-equipment-row">
                  {image ? <img src={image} alt="" aria-hidden="true" /> : <img src={asset('equipment_icon.png')} alt="" aria-hidden="true" />}
                  <div className="combat-v2-equipment-row__copy">
                    <strong>
                      {card?.name ?? relic.name}
                      {count > 1 ? ` x${count}` : ''}
                    </strong>
                    <span>{card?.description ?? relic.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="combat-v2-passive-empty">
            <img src={asset('equipment_icon.png')} alt="" aria-hidden="true" />
            <span>当前没有装备牌被动效果</span>
          </div>
        )}
      </div>
    </section>
  );
};

const PlayerHealthPanel: React.FC<{
  floatingTexts: FloatingTextItem[];
}> = ({ floatingTexts }) => {
  const { player } = useGameStore();
  const hpRatio = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  const blockRatio = Math.max(0, Math.min(100, (player.block / 9) * 100));
  const energyRatio = Math.max(0, Math.min(100, (player.energy / Math.max(1, player.maxEnergy)) * 100));
  const blockValueClass =
    player.block >= 1000
      ? 'combat-v2-block-value combat-v2-block-value--tiny'
      : player.block >= 100
        ? 'combat-v2-block-value combat-v2-block-value--small'
        : 'combat-v2-block-value';

  const renderFloating = (lane: FloatingTextLane) => (
    <AnimatePresence>
      {floatingTexts
        .filter((item) => item.lane === lane)
        .map((item) => (
          <motion.div
            key={item.id}
            className={`combat-v2-floating combat-v2-floating--${lane} combat-v2-floating--${item.kind}`}
            initial={{ opacity: 0, y: 14, scale: 0.78 }}
            animate={{ opacity: [0, 1, 1, 0], y: [16, -14, -34, -54], scale: [0.72, 1.2, 1.08, 0.92] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, times: [0, 0.12, 0.6, 1], ease: 'easeOut' }}
          >
            {item.kind === 'gain' ? '+' : '-'}
            {Math.abs(item.value)}
          </motion.div>
        ))}
    </AnimatePresence>
  );

  return (
    <section className="combat-v2-panel combat-v2-player-health" aria-label="玩家状态">
      <img className="combat-v2-panel__bg" src={asset('player_health_panel.png')} alt="" aria-hidden="true" />
      <div className="combat-v2-health-row combat-v2-health-row--hp">
        <img className="combat-v2-health-icon" src={asset('hp_icon.png')} alt="" aria-hidden="true" />
        <span className="combat-v2-health-label">生命值</span>
        <div className="combat-v2-bar combat-v2-bar--hp">
          <img className="combat-v2-bar__frame" src={asset('hp_bar_frame.png')} alt="" aria-hidden="true" />
          <img className="combat-v2-bar__fill" src={asset('red_bar.png')} alt="" aria-hidden="true" style={{ width: `${hpRatio}%` }} />
          <strong>{player.hp}/{player.maxHp}</strong>
        </div>
        {renderFloating('hp')}
      </div>
      <div className="combat-v2-health-separator" />
      <div className="combat-v2-health-row combat-v2-health-row--block">
        <img className="combat-v2-health-icon" src={asset('qi_icon.png')} alt="" aria-hidden="true" />
        <span className="combat-v2-health-label">格挡</span>
        <div className="combat-v2-bar combat-v2-bar--block">
          <img className="combat-v2-bar__fill" src={asset('green_bar.png')} alt="" aria-hidden="true" style={{ width: `${blockRatio}%` }} />
          <strong className={blockValueClass}>{player.block}</strong>
        </div>
        {renderFloating('block')}
      </div>
      <div className="combat-v2-health-row combat-v2-health-row--energy">
        <span className="combat-v2-health-label">真气值</span>
        <div className="combat-v2-qi-value">
          <span>{player.energy}</span>
          <small>/{player.maxEnergy}</small>
        </div>
        <div className="combat-v2-qi-meter" style={{ '--qi-ratio': `${energyRatio}%` } as React.CSSProperties} />
        {renderFloating('energy')}
      </div>
    </section>
  );
};

const EnemyCardV2: React.FC<{
  enemy: EnemyType;
  selected: boolean;
  actionPhase?: string;
  actionIntentType?: EnemyType['intent']['type'];
  floatingTexts: EnemyFloatingTextItem[];
  onClick: () => void;
}> = ({ enemy, selected, actionPhase, actionIntentType, floatingTexts, onClick }) => {
  const hpRatio = Math.max(0, Math.min(100, (enemy.currentHp / enemy.maxHp) * 100));
  const visibleStatuses = enemy.statusEffects.slice(0, 3);
  const enemyImage = enemy.image ? resolveAssetUrl(enemy.image) : '';
  const posterImage = enemy.posterImage ? resolveAssetUrl(enemy.posterImage) : enemyImage;
  const isHit = floatingTexts.some((item) => item.kind === 'hp-loss' || item.kind === 'block-loss');
  const isDebuffed = floatingTexts.some((item) => item.kind === 'debuff');

  return (
    <div className={`combat-v2-enemy ${selected ? 'combat-v2-enemy--selected' : ''} ${isHit ? 'combat-v2-enemy--hit' : ''} ${isDebuffed ? 'combat-v2-enemy--debuffed' : ''} ${getEnemyActionClass(actionPhase, actionIntentType)}`}>
      <button type="button" className="combat-v2-enemy-card" onClick={onClick} aria-label={`选择敌人 ${enemy.name}`}>
        {posterImage ? <img className="combat-v2-enemy-card__backdrop" src={posterImage} alt="" aria-hidden="true" /> : null}
        {enemyImage ? <img className="combat-v2-enemy-card__art" src={enemyImage} alt={enemy.name} /> : null}
      </button>
      <div className="combat-v2-enemy-name">
        <img src={asset('pathogen_icon.png')} alt="" aria-hidden="true" />
        <span>病邪</span>
        <strong>{enemy.name}</strong>
      </div>
      <div className="combat-v2-enemy-hp">
        <img className="combat-v2-enemy-hp__icon" src={asset('hp_icon.png')} alt="" aria-hidden="true" />
        <div className="combat-v2-enemy-hp__bar">
          <img className="combat-v2-bar__frame" src={asset('hp_bar_frame.png')} alt="" aria-hidden="true" />
          <img className="combat-v2-bar__fill" src={asset('red_bar.png')} alt="" aria-hidden="true" style={{ width: `${hpRatio}%` }} />
        </div>
        <strong className="combat-v2-enemy-hp__value">{enemy.currentHp}/{enemy.maxHp}</strong>
      </div>
      <div className="combat-v2-enemy-info">
        <div className="combat-v2-enemy-block">
          <img src={asset('qi_icon.png')} alt="" aria-hidden="true" />
          <span>格挡</span>
          <strong>{enemy.block}</strong>
        </div>
        <div className="combat-v2-enemy-intent">
          <img src={asset('intent_icon.png')} alt="" aria-hidden="true" />
          <span>意图</span>
          <strong>{enemy.intent.description}</strong>
          <small>{INTENT_TYPE_LABELS[enemy.intent.type]} · {getIntentExplanation(enemy.intent)}</small>
        </div>
        {visibleStatuses.length > 0 ? (
          <div className="combat-v2-enemy-statuses" aria-label="敌人状态">
            <span>状态</span>
            <div>
              {visibleStatuses.map((effect, index) => (
                <EnemyStatusIcon key={effect.id} effect={effect} index={index} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <AnimatePresence>
        {floatingTexts.map((item) => (
          <motion.div
            key={item.id}
            className={`combat-v2-enemy-floating combat-v2-enemy-floating--${item.kind}`}
            initial={{ opacity: 0, y: 8, scale: 0.82 }}
            animate={{ opacity: [0, 1, 1, 0], y: [10, -16, -38, -58], scale: [0.76, 1.24, 1.08, 0.92] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.45, times: [0, 0.12, 0.6, 1], ease: 'easeOut' }}
          >
            {item.kind === 'debuff' ? (
              <>
                <span className="combat-v2-enemy-floating__tag">负面</span>
                {item.label}
                {item.value ? ` +${item.value}` : ''}
              </>
            ) : (
              <>
                {item.kind.endsWith('gain') ? '+' : '-'}
                {item.value}
              </>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const CombatLogV2: React.FC = () => {
  const combatLog = useGameStore((state) => state.combatLog);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [combatLog]);

  return (
    <section className="combat-v2-log" aria-label="战斗记录">
      <img className="combat-v2-log__bg" src={asset('combat_log_panel.png')} alt="" aria-hidden="true" />
      <h2>战斗记录</h2>
      <div className="combat-v2-log__entries">
        {combatLog.length > 0 ? (
          combatLog.map((log, index) => (
            <div key={`${index}-${log}`} className="combat-v2-log__entry">
              {log}
            </div>
          ))
        ) : (
          <div className="combat-v2-log__empty">等待战斗记录</div>
        )}
        <div ref={logEndRef} />
      </div>
    </section>
  );
};

const OverflowDiscardModal: React.FC = () => {
  const { player, getHandLimit, discardOverflowCard } = useGameStore();

  if (player.hand.length <= getHandLimit()) return null;

  return (
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
            溢出 {player.hand.length - getHandLimit()}
          </div>
        </div>
        <div className="grid max-h-[60vh] grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] justify-items-center gap-3 overflow-y-auto ornate-scroll p-2">
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
                <div className="absolute -right-1 -top-1 z-20 rounded-full bg-red-600 p-1 text-white shadow-lg transition group-hover:scale-110">
                  <Trash2 size={14} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
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
    bossKills,
    completeCombat,
  } = useGameStore();

  const [longHoveredCard, setLongHoveredCard] = useState<CardType | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);
  const [enemyFloatingTexts, setEnemyFloatingTexts] = useState<EnemyFloatingTextItem[]>([]);
  const [viewportTier, setViewportTier] = useState<CombatViewportTier>(() =>
    typeof window === 'undefined' ? 'regular' : getCombatViewportTier(window.innerHeight),
  );
  const prevStatsRef = useRef({
    hp: player.hp,
    block: player.block,
    energy: player.energy,
  });
  const prevEnemyStatsRef = useRef(
    new Map(enemies.map((enemy) => [enemy.id, getEnemySnapshot(enemy)])),
  );

  useEffect(() => {
    const previous = prevStatsRef.current;
    const nextItems: FloatingTextItem[] = [];

    const pushDelta = (lane: FloatingTextLane, delta: number) => {
      if (delta === 0) return;
      nextItems.push({
        id: Date.now() + Math.random(),
        lane,
        kind: delta > 0 ? 'gain' : 'loss',
        value: Math.abs(delta),
      });
    };

    pushDelta('hp', player.hp - previous.hp);
    pushDelta('block', player.block - previous.block);
    pushDelta('energy', player.energy - previous.energy);

    prevStatsRef.current = {
      hp: player.hp,
      block: player.block,
      energy: player.energy,
    };

    if (nextItems.length === 0) return undefined;

    setFloatingTexts((current) => [...current, ...nextItems]);
    const timeout = window.setTimeout(() => {
      setFloatingTexts((current) => current.filter((item) => !nextItems.some((next) => next.id === item.id)));
    }, 1600);

    return () => window.clearTimeout(timeout);
  }, [player.block, player.energy, player.hp]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncViewportTier = () => setViewportTier(getCombatViewportTier(window.innerHeight));
    syncViewportTier();
    window.addEventListener('resize', syncViewportTier);
    return () => window.removeEventListener('resize', syncViewportTier);
  }, []);

  useEffect(() => {
    const previous = prevEnemyStatsRef.current;
    const nextPrevious = new Map(enemies.map((enemy) => [enemy.id, getEnemySnapshot(enemy)]));
    const nextItems: EnemyFloatingTextItem[] = [];

    enemies.forEach((enemy) => {
      const before = previous.get(enemy.id);
      if (!before) return;

      const hpDelta = enemy.currentHp - before.hp;
      const blockDelta = enemy.block - before.block;

      if (hpDelta !== 0) {
        nextItems.push({
          id: Date.now() + Math.random(),
          enemyId: enemy.id,
          kind: hpDelta > 0 ? 'hp-gain' : 'hp-loss',
          value: Math.abs(hpDelta),
        });
      }

      if (blockDelta !== 0) {
        nextItems.push({
          id: Date.now() + Math.random(),
          enemyId: enemy.id,
          kind: blockDelta > 0 ? 'block-gain' : 'block-loss',
          value: Math.abs(blockDelta),
        });
      }

      enemy.statusEffects
        .filter((effect) => effect.type === 'debuff')
        .forEach((effect) => {
          const beforeDebuff = before.debuffs.get(effect.id);
          const stackDelta = effect.stacks - (beforeDebuff?.stacks ?? 0);
          if (!beforeDebuff || stackDelta > 0) {
            nextItems.push({
              id: Date.now() + Math.random(),
              enemyId: enemy.id,
              kind: 'debuff',
              label: effect.name,
              value: Math.max(1, stackDelta || effect.stacks),
            });
          }
        });
    });

    prevEnemyStatsRef.current = nextPrevious;

    if (nextItems.length === 0) return undefined;

    setEnemyFloatingTexts((current) => [...current, ...nextItems]);
    const timeout = window.setTimeout(() => {
      setEnemyFloatingTexts((current) => current.filter((item) => !nextItems.some((next) => next.id === item.id)));
    }, 1650);

    return () => window.clearTimeout(timeout);
  }, [enemies]);

  const visibleEnemies = useMemo(() => enemies.filter((enemy) => enemy.currentHp > 0), [enemies]);
  const activeSelectedEnemyId =
    selectedEnemyId && visibleEnemies.some((enemy) => enemy.id === selectedEnemyId)
      ? selectedEnemyId
      : visibleEnemies[0]?.id ?? null;
  const actLabel = ACT_LABELS[currentAct] ?? `第${currentAct}幕`;
  const turnLabel = combatTurn === 0 ? '我方回合' : '敌方回合';
  const enemyLayoutClass = visibleEnemies.length >= 2 ? 'combat-v2-enemy-zone--duo' : 'combat-v2-enemy-zone--single';

  const playerImpactClass = playerImpactCue
    ? playerImpactCue.kind === 'block'
      ? 'combat-v2--player-block'
      : 'combat-v2--player-hit'
    : '';

  return (
    <div className={`combat-v2 ${playerImpactClass}`}>
      <div className="combat-v2__viewport">
        <div className="combat-v2__canvas">
          <img className="combat-v2__background" src={asset('background.png')} alt="" aria-hidden="true" />
          <div className="combat-v2__vignette" />

          <div className="combat-v2-title">战斗</div>
          <div className="combat-v2-top-badge combat-v2-top-badge--turn">
            <img src={asset('turn_player_frame.png')} alt="" aria-hidden="true" />
            <span>{turnLabel}</span>
          </div>
          <div className="combat-v2-top-badge combat-v2-top-badge--act">
            <img src={asset('act_frame.png')} alt="" aria-hidden="true" />
            <span>{actLabel}</span>
          </div>
          {bossKills > 0 ? <div className="combat-v2-boss-kills">已斩首领 {bossKills}</div> : null}

          <PlayerResources />
          <PassiveEquipmentPanel />
          <PlayerHealthPanel floatingTexts={floatingTexts} />

          <div className={`combat-v2-enemy-zone ${enemyLayoutClass}`}>
            {visibleEnemies.map((enemy) => (
              <EnemyCardV2
                key={enemy.id}
                enemy={enemy}
                selected={enemy.id === activeSelectedEnemyId}
                actionPhase={enemyActionCue?.enemyId === enemy.id ? enemyActionCue.phase : 'idle'}
                actionIntentType={enemyActionCue?.enemyId === enemy.id ? enemyActionCue.intentType : undefined}
                floatingTexts={enemyFloatingTexts.filter((item) => item.enemyId === enemy.id)}
                onClick={() => selectEnemy(enemy.id)}
              />
            ))}
          </div>

          <div className="combat-v2-hand" aria-label="手牌">
            <Hand viewportTier={viewportTier} onLongHoverCard={setLongHoveredCard} />
          </div>

          <AssetButton
            className="combat-v2-back-map"
            src="back_map_button.png"
            label="返回地图"
            onClick={() => setPhase('map')}
          />

          <CombatLogV2 />

          <AssetButton
            className="combat-v2-end-turn"
            src="end_turn_button.png"
            disabled={combatTurn === 1}
            busy={combatTurn === 1}
            label={
              combatTurn === 1 ? (
                <>
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Hourglass size={18} />
                  </motion.span>
                  敌方行动中
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  结束回合
                </>
              )
            }
            onClick={() => {
              playSfx('confirm');
              endTurn();
            }}
          />

          {player.constitution === 'admin' ? (
            <button type="button" className="combat-v2-admin-skip" onClick={() => completeCombat()}>
              跳过战斗
            </button>
          ) : null}

          <AnimatePresence>
            {longHoveredCard ? (
              <motion.div
                className="combat-v2-card-preview"
                initial={{ opacity: 0, scale: 0.85, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 10 }}
                transition={{ duration: 0.18 }}
              >
                <Card card={longHoveredCard} interactive={false} hoverLift={false} layoutVariant="default" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        <OverflowDiscardModal />
      </AnimatePresence>
    </div>
  );
};
