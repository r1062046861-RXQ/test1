import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, ScrollText, ShieldAlert, X } from 'lucide-react';
import type { Card as CardData, CardRarity, CardTarget, CardType, Enemy } from '../types';
import { Card } from './Card';
import { useGameStore } from '../store/gameStore';
import { CARD_LIBRARY } from '../data/cards';
import { ENEMIES } from '../data/enemies';
import {
  CARD_ACT_LABELS,
  ENEMY_ACT_LABELS,
  ENEMY_CODEX_DETAILS,
  ENEMY_TIER_LABELS,
  GLOSSARY_CATEGORY_LABELS,
  GLOSSARY_ENTRIES,
  GLOSSARY_TARGET_LABELS,
  type EnemyTier,
  type GlossaryCategory,
  type GlossaryEntry,
} from '../data/codex';
import { ActionButton, Badge, PageShell, Panel, SectionTitle } from './ui/PageShell';
import { detailRevealVariants, panelSettleVariants } from './ui/motionPresets';
import { resolveAssetUrl } from '../utils/assets';

type CodexSectionKey = 'cards' | 'enemies' | 'glossary';
type ActiveEntry =
  | { kind: 'card'; id: string }
  | { kind: 'enemy'; id: string }
  | { kind: 'glossary'; id: string }
  | null;

const CARD_TYPE_LABELS: Record<CardType, string> = {
  attack: '攻击',
  skill: '技能',
  power: '能力',
};

const CARD_RARITY_LABELS: Record<CardRarity, string> = {
  common: '普通',
  uncommon: '非凡',
  rare: '稀有',
};

const CARD_TARGET_LABELS: Record<CardTarget, string> = {
  single_enemy: '单体敌人',
  all_enemies: '全体敌人',
  self: '自身',
  random: '随机目标',
};

const SECTION_LABELS: Record<CodexSectionKey, string> = {
  cards: '卡牌图鉴',
  enemies: '敌人图鉴',
  glossary: '状态词典',
};

const SECTION_HINTS: Record<CodexSectionKey, string> = {
  cards: '按幕次与牌型回看药牌结构、效果走向与构筑线索。',
  enemies: '按幕次与定位查看巡诊途中会遇到的证候与敌势。',
  glossary: '汇总核心状态、资源与规则，方便对照理解关键概念。',
};

const ACT_ORDER: Array<1 | 2 | 3> = [1, 2, 3];
const TYPE_ORDER: CardType[] = ['attack', 'skill', 'power'];
const RARITY_ORDER: CardRarity[] = ['common', 'uncommon', 'rare'];
const ENEMY_TIER_ORDER: EnemyTier[] = ['common', 'elite', 'boss'];
const GLOSSARY_ORDER: GlossaryCategory[] = ['resource', 'buff', 'debuff', 'mechanic'];

const badgeVariantByCategory: Record<GlossaryCategory, 'amber' | 'emerald' | 'crimson' | 'blue'> = {
  resource: 'blue',
  buff: 'emerald',
  debuff: 'crimson',
  mechanic: 'amber',
};

const badgeVariantByTier: Record<EnemyTier, 'slate' | 'crimson' | 'amber'> = {
  common: 'slate',
  elite: 'crimson',
  boss: 'amber',
};

const rarityRank = (rarity: CardRarity) => RARITY_ORDER.indexOf(rarity);
const typeRank = (type: CardType) => TYPE_ORDER.indexOf(type);

const getCardAct = (card: CardData): 1 | 2 | 3 => (card.act === 2 || card.act === 3 ? card.act : 1);
const getEnemyAct = (enemy: Enemy): 1 | 2 | 3 => ENEMY_CODEX_DETAILS[enemy.id]?.act ?? 1;
const getEnemyTier = (enemy: Enemy): EnemyTier => ENEMY_CODEX_DETAILS[enemy.id]?.tier ?? 'common';

const formatIntent = (enemy: Enemy): string => {
  const { intent } = enemy;
  if (!intent.value) return intent.description;
  if (intent.hits && intent.hits > 1) return `${intent.description} · ${intent.value}×${intent.hits}`;
  return `${intent.description} · ${intent.value}`;
};

const joinCardNames = (cardIds: string[]) =>
  cardIds.map((id) => CARD_LIBRARY[id]?.name).filter((name): name is string => Boolean(name)).join('、');

const joinEnemyNames = (enemyIds: string[]) =>
  enemyIds.map((id) => ENEMIES[id]?.name).filter((name): name is string => Boolean(name)).join('、');

const DetailBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Panel inset className="px-4 py-4">
    <div className="text-[12px] font-semibold uppercase tracking-[0.26em] text-amber-800/80">{title}</div>
    <div className="mt-3 text-sm leading-7 text-stone-700 md:text-base">{children}</div>
  </Panel>
);

const JumpButton: React.FC<{
  title: string;
  hint: string;
  count: string;
  onClick: () => void;
}> = ({ title, hint, count, onClick }) => (
  <button type="button" onClick={onClick} className="codex-directory__jump">
    <div className="codex-directory__jump-copy">
      <div className="codex-directory__jump-title">{title}</div>
      <div className="codex-directory__jump-hint">{hint}</div>
    </div>
    <Badge variant="slate">{count}</Badge>
  </button>
);

const CodexTile: React.FC<{
  eyebrow?: string;
  title: string;
  summary: string;
  media?: React.ReactNode;
  badges?: React.ReactNode;
  onClick: () => void;
  className?: string;
}> = ({ eyebrow, title, summary, media, badges, onClick, className }) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileHover={{ y: -3, scale: 1.008 }}
    whileTap={{ scale: 0.99 }}
    className={['codex-tile', className].filter(Boolean).join(' ')}
  >
    {media ? <div className="codex-tile__media">{media}</div> : null}
    <div className="codex-tile__body">
      {eyebrow ? <div className="codex-tile__eyebrow">{eyebrow}</div> : null}
      <div className="codex-tile__title line-clamp-2">{title}</div>
      {badges ? <div className="mt-3 flex flex-wrap gap-1.5">{badges}</div> : null}
      <div className="codex-tile__summary line-clamp-2">{summary}</div>
    </div>
  </motion.button>
);

const CodexModalShell: React.FC<{
  title: string;
  subtitle: string;
  badge: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, badge, onClose, children }) => (
  <motion.div
    className="codex-modal-backdrop"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.18, ease: 'easeOut' }}
    onClick={onClose}
  >
    <motion.div
      className="codex-modal"
      role="dialog"
      aria-modal="true"
      variants={detailRevealVariants}
      initial="enter"
      animate="center"
      exit="exit"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="codex-modal__header">
        <div className="min-w-0">
          <div className="codex-modal__kicker">详情审阅</div>
          <h2 className="codex-modal__title">{title}</h2>
          <p className="codex-modal__subtitle">{subtitle}</p>
        </div>
        <div className="codex-modal__actions">
          {badge}
          <button type="button" className="codex-modal__close" onClick={onClose} aria-label="关闭详情">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="codex-modal__scroll ornate-scroll">{children}</div>
    </motion.div>
  </motion.div>
);

export const CardCodexView: React.FC = () => {
  const setPhase = useGameStore((state) => state.setPhase);
  const [activeEntry, setActiveEntry] = useState<ActiveEntry>(null);

  const allCards = useMemo(
    () =>
      Object.values(CARD_LIBRARY).sort((left, right) => {
        const actDelta = getCardAct(left) - getCardAct(right);
        if (actDelta !== 0) return actDelta;
        const rarityDelta = rarityRank(left.rarity) - rarityRank(right.rarity);
        if (rarityDelta !== 0) return rarityDelta;
        const typeDelta = typeRank(left.type) - typeRank(right.type);
        if (typeDelta !== 0) return typeDelta;
        return left.name.localeCompare(right.name, 'zh-CN');
      }),
    [],
  );

  const allEnemies = useMemo(
    () =>
      Object.values(ENEMIES).sort((left, right) => {
        const actDelta = getEnemyAct(left) - getEnemyAct(right);
        if (actDelta !== 0) return actDelta;
        const tierDelta = ENEMY_TIER_ORDER.indexOf(getEnemyTier(left)) - ENEMY_TIER_ORDER.indexOf(getEnemyTier(right));
        if (tierDelta !== 0) return tierDelta;
        return left.name.localeCompare(right.name, 'zh-CN');
      }),
    [],
  );

  const allGlossaryEntries = useMemo(
    () =>
      [...GLOSSARY_ENTRIES].sort((left, right) => {
        const categoryDelta = GLOSSARY_ORDER.indexOf(left.category) - GLOSSARY_ORDER.indexOf(right.category);
        if (categoryDelta !== 0) return categoryDelta;
        return left.name.localeCompare(right.name, 'zh-CN');
      }),
    [],
  );

  const glossaryById = useMemo(
    () =>
      Object.fromEntries(allGlossaryEntries.map((entry) => [entry.id, entry])) as Record<string, GlossaryEntry>,
    [allGlossaryEntries],
  );

  const activeCard = activeEntry?.kind === 'card' ? CARD_LIBRARY[activeEntry.id] ?? null : null;
  const activeEnemy = activeEntry?.kind === 'enemy' ? ENEMIES[activeEntry.id] ?? null : null;
  const activeGlossary = activeEntry?.kind === 'glossary' ? glossaryById[activeEntry.id] ?? null : null;
  const modalOpen = activeEntry !== null;

  useEffect(() => {
    if (!modalOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveEntry(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen]);

  useEffect(() => {
    const state = {
      phase: 'card_codex',
      layout: 'single-page-grid',
      sectionCounts: {
        cards: allCards.length,
        enemies: allEnemies.length,
        glossary: allGlossaryEntries.length,
      },
      modalOpen,
      activeEntryId: activeEntry?.id ?? null,
      activeEntryKind: activeEntry?.kind ?? null,
    };

    (window as Window & { __cardCodexState?: unknown }).__cardCodexState = state;
    return () => {
      delete (window as Window & { __cardCodexState?: unknown }).__cardCodexState;
    };
  }, [activeEntry, allCards.length, allEnemies.length, allGlossaryEntries.length, modalOpen]);

  const openEntry = (kind: NonNullable<ActiveEntry>['kind'], id: string) => {
    setActiveEntry({ kind, id });
  };

  const closeEntry = () => {
    setActiveEntry(null);
  };

  const scrollToSection = (sectionId: CodexSectionKey) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderCardDetail = (card: CardData) => (
    <div className="codex-modal__content">
      <div className="codex-modal__hero">
        <div className="codex-modal__card-preview">
          <div className="origin-top scale-[0.92]">
            <Card card={card} interactive={false} hoverLift={false} />
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="amber">{card.cost} 费</Badge>
            <Badge variant="slate">{CARD_TYPE_LABELS[card.type]}</Badge>
            <Badge variant="slate">{CARD_RARITY_LABELS[card.rarity]}</Badge>
            <Badge variant="blue">{CARD_TARGET_LABELS[card.target]}</Badge>
            <Badge variant="emerald">{CARD_ACT_LABELS[getCardAct(card)]}</Badge>
            {card.exhaust ? <Badge variant="crimson">消耗</Badge> : null}
            {card.unplayable ? <Badge variant="slate">无法直接打出</Badge> : null}
            {card.upgraded ? <Badge variant="amber">已升级</Badge> : null}
          </div>
          <DetailBlock title="效果说明">{card.description}</DetailBlock>
          <DetailBlock title="中医说明">{card.tcmNote}</DetailBlock>
          <DetailBlock title="实现备注">
            effectId：<span className="font-mono text-stone-900">{card.effectId}</span>
          </DetailBlock>
        </div>
      </div>
    </div>
  );

  const renderEnemyDetail = (enemy: Enemy) => {
    const meta = ENEMY_CODEX_DETAILS[enemy.id];
    return (
      <div className="codex-modal__content">
        <div className="codex-modal__hero">
          <div className="codex-modal__enemy-preview">
            {enemy.image ? (
              <img src={resolveAssetUrl(enemy.image)} alt={enemy.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-stone-100 text-stone-400">暂无敌人图像</div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="amber">HP {enemy.maxHp}</Badge>
              <Badge variant="slate">初始格挡 {enemy.block}</Badge>
              <Badge variant="emerald">{ENEMY_ACT_LABELS[getEnemyAct(enemy)]}</Badge>
              <Badge variant={badgeVariantByTier[getEnemyTier(enemy)]}>{ENEMY_TIER_LABELS[getEnemyTier(enemy)]}</Badge>
            </div>
            <DetailBlock title="初始意图">{formatIntent(enemy)}</DetailBlock>
            <DetailBlock title="核心机制">
              <div>{meta?.summary ?? '暂无额外机制说明。'}</div>
              {meta?.mechanics?.length ? (
                <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
                  {meta.mechanics.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 text-amber-600">◆</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </DetailBlock>
            {meta?.tags?.length ? (
              <DetailBlock title="行为标签">
                <div className="flex flex-wrap gap-2">
                  {meta.tags.map((tag) => (
                    <Badge key={tag} variant="slate">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </DetailBlock>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderGlossaryDetail = (entry: GlossaryEntry) => {
    const relatedCards = entry.relatedCardIds ? joinCardNames(entry.relatedCardIds) : '';
    const relatedEnemies = entry.relatedEnemyIds ? joinEnemyNames(entry.relatedEnemyIds) : '';

    return (
      <div className="codex-modal__content codex-modal__content--glossary">
        <div className="flex flex-wrap gap-2">
          <Badge variant={badgeVariantByCategory[entry.category]}>
            {GLOSSARY_CATEGORY_LABELS[entry.category]}
          </Badge>
          <Badge variant="slate">{GLOSSARY_TARGET_LABELS[entry.target]}</Badge>
        </div>
        <DetailBlock title="简要效果">{entry.summary}</DetailBlock>
        <DetailBlock title="叠层 / 持续规则">{entry.rules}</DetailBlock>
        {relatedCards || relatedEnemies ? (
          <DetailBlock title="关联对象">
            <div className="space-y-3 text-sm leading-6 text-stone-700">
              {relatedCards ? (
                <div>
                  <span className="font-semibold text-stone-900">代表卡牌：</span>
                  {relatedCards}
                </div>
              ) : null}
              {relatedEnemies ? (
                <div>
                  <span className="font-semibold text-stone-900">关联敌人：</span>
                  {relatedEnemies}
                </div>
              ) : null}
            </div>
          </DetailBlock>
        ) : null}
      </div>
    );
  };

  const renderModal = () => {
    if (activeCard) {
      return (
        <CodexModalShell
          title={activeCard.name}
          subtitle="卡牌详情"
          badge={<Badge variant="amber">卡牌图鉴</Badge>}
          onClose={closeEntry}
        >
          {renderCardDetail(activeCard)}
        </CodexModalShell>
      );
    }

    if (activeEnemy) {
      return (
        <CodexModalShell
          title={activeEnemy.name}
          subtitle="敌人详情"
          badge={<Badge variant="crimson">敌人图鉴</Badge>}
          onClose={closeEntry}
        >
          {renderEnemyDetail(activeEnemy)}
        </CodexModalShell>
      );
    }

    if (activeGlossary) {
      return (
        <CodexModalShell
          title={activeGlossary.name}
          subtitle="状态词典"
          badge={<Badge variant="blue">状态词典</Badge>}
          onClose={closeEntry}
        >
          {renderGlossaryDetail(activeGlossary)}
        </CodexModalShell>
      );
    }

    return null;
  };

  return (
    <PageShell
      title="图鉴总览"
      subtitle="沿卡牌、敌人、状态词典连续浏览，回看五行医道中的药理线索与巡诊知识。"
      scrollable
      actions={
        <>
          <Badge variant="blue">{allCards.length} 张卡</Badge>
          <Badge variant="crimson">{allEnemies.length} 个敌人</Badge>
          <Badge variant="emerald">{allGlossaryEntries.length} 条术语</Badge>
          <ActionButton variant="secondary" onClick={() => setPhase('start_menu')}>
            返回开始菜单
          </ActionButton>
        </>
      }
      contentClassName="flex flex-col gap-4 pb-4"
    >
      <motion.div variants={panelSettleVariants} initial="hidden" animate="visible">
        <Panel className="codex-directory__navigator px-4 py-4 md:px-5">
          <div className="codex-directory__navigator-kicker">卷内索引</div>
          <div className="codex-directory__jump-grid mt-4">
            <JumpButton
              title={SECTION_LABELS.cards}
              hint={SECTION_HINTS.cards}
              count={`${allCards.length} 张`}
              onClick={() => scrollToSection('cards')}
            />
            <JumpButton
              title={SECTION_LABELS.enemies}
              hint={SECTION_HINTS.enemies}
              count={`${allEnemies.length} 个`}
              onClick={() => scrollToSection('enemies')}
            />
            <JumpButton
              title={SECTION_LABELS.glossary}
              hint={SECTION_HINTS.glossary}
              count={`${allGlossaryEntries.length} 条`}
              onClick={() => scrollToSection('glossary')}
            />
          </div>
        </Panel>
      </motion.div>

      <div className="codex-directory__content space-y-5 pb-3">
        <motion.section
            id="cards"
            variants={panelSettleVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.04 }}
            className="scroll-mt-6"
          >
            <Panel className="codex-section px-4 py-4 md:px-5">
              <div className="codex-section__header">
                <div className="codex-section__title-wrap">
                  <div className="codex-section__icon">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <div className="codex-section__kicker">目录一</div>
                    <h2 className="codex-section__title">{SECTION_LABELS.cards}</h2>
                    <p className="codex-section__subtitle">{SECTION_HINTS.cards}</p>
                  </div>
                </div>
                <Badge variant="amber">{allCards.length} 张</Badge>
              </div>

              <div className="mt-6 space-y-6">
                {ACT_ORDER.map((act) => {
                  const actCards = allCards.filter((card) => getCardAct(card) === act);
                  if (actCards.length === 0) return null;

                  return (
                    <section key={act} className="space-y-4">
                      <SectionTitle title={CARD_ACT_LABELS[act]} hint="按攻击 / 技能 / 能力分组浏览" />
                      <div className="space-y-4">
                        {TYPE_ORDER.map((type) => {
                          const typedCards = actCards.filter((card) => card.type === type);
                          if (typedCards.length === 0) return null;

                          return (
                            <div key={type} className="space-y-3">
                              <div className="codex-section__subgroup">
                                <div className="text-sm font-semibold text-amber-950">{CARD_TYPE_LABELS[type]}</div>
                                <Badge variant="slate">{typedCards.length}</Badge>
                              </div>
                              <div className="codex-grid codex-grid--cards">
                                {typedCards.map((card) => (
                                  <CodexTile
                                    key={card.id}
                                    className="codex-tile--card"
                                    eyebrow={CARD_TYPE_LABELS[card.type]}
                                    title={card.name}
                                    summary={card.description}
                                    onClick={() => openEntry('card', card.id)}
                                    media={
                                      <div className="codex-tile__media-frame codex-tile__media-frame--card">
                                        {card.image ? (
                                          <img src={resolveAssetUrl(card.image)} alt={card.name} className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="codex-tile__fallback">{CARD_TYPE_LABELS[card.type]}</div>
                                        )}
                                      </div>
                                    }
                                    badges={
                                      <>
                                        <Badge variant="amber">{card.cost} 费</Badge>
                                        <Badge variant="slate">{CARD_RARITY_LABELS[card.rarity]}</Badge>
                                        <Badge variant="blue">{CARD_TARGET_LABELS[card.target]}</Badge>
                                      </>
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </Panel>
          </motion.section>

        <motion.section
            id="enemies"
            variants={panelSettleVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.08 }}
            className="scroll-mt-6"
          >
            <Panel className="codex-section px-4 py-4 md:px-5">
              <div className="codex-section__header">
                <div className="codex-section__title-wrap">
                  <div className="codex-section__icon">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <div className="codex-section__kicker">目录二</div>
                    <h2 className="codex-section__title">{SECTION_LABELS.enemies}</h2>
                    <p className="codex-section__subtitle">{SECTION_HINTS.enemies}</p>
                  </div>
                </div>
                <Badge variant="crimson">{allEnemies.length} 个</Badge>
              </div>

              <div className="mt-6 space-y-6">
                {ACT_ORDER.map((act) => {
                  const actEnemies = allEnemies.filter((enemy) => getEnemyAct(enemy) === act);
                  if (actEnemies.length === 0) return null;

                  return (
                    <section key={act} className="space-y-4">
                      <SectionTitle title={ENEMY_ACT_LABELS[act]} hint="按普通 / 精英 / Boss 分组浏览" />
                      <div className="space-y-4">
                        {ENEMY_TIER_ORDER.map((tier) => {
                          const tierEnemies = actEnemies.filter((enemy) => getEnemyTier(enemy) === tier);
                          if (tierEnemies.length === 0) return null;

                          return (
                            <div key={tier} className="space-y-3">
                              <div className="codex-section__subgroup">
                                <div className="text-sm font-semibold text-amber-950">{ENEMY_TIER_LABELS[tier]}</div>
                                <Badge variant={badgeVariantByTier[tier]}>{tierEnemies.length}</Badge>
                              </div>
                              <div className="codex-grid codex-grid--enemies">
                                {tierEnemies.map((enemy) => (
                                  <CodexTile
                                    key={enemy.id}
                                    eyebrow={ENEMY_TIER_LABELS[getEnemyTier(enemy)]}
                                    title={enemy.name}
                                    summary={formatIntent(enemy)}
                                    onClick={() => openEntry('enemy', enemy.id)}
                                    media={
                                      <div className="codex-tile__media-frame codex-tile__media-frame--enemy">
                                        {enemy.image ? (
                                          <img src={resolveAssetUrl(enemy.image)} alt={enemy.name} className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="codex-tile__fallback">敌人</div>
                                        )}
                                      </div>
                                    }
                                    badges={
                                      <>
                                        <Badge variant={badgeVariantByTier[getEnemyTier(enemy)]}>
                                          {ENEMY_TIER_LABELS[getEnemyTier(enemy)]}
                                        </Badge>
                                        <Badge variant="amber">HP {enemy.maxHp}</Badge>
                                        <Badge variant="slate">格挡 {enemy.block}</Badge>
                                      </>
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </Panel>
          </motion.section>

        <motion.section
            id="glossary"
            variants={panelSettleVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.12 }}
            className="scroll-mt-6"
          >
            <Panel className="codex-section px-4 py-4 md:px-5">
              <div className="codex-section__header">
                <div className="codex-section__title-wrap">
                  <div className="codex-section__icon">
                    <ScrollText size={20} />
                  </div>
                  <div>
                    <div className="codex-section__kicker">目录三</div>
                    <h2 className="codex-section__title">{SECTION_LABELS.glossary}</h2>
                    <p className="codex-section__subtitle">{SECTION_HINTS.glossary}</p>
                  </div>
                </div>
                <Badge variant="emerald">{allGlossaryEntries.length} 条</Badge>
              </div>

              <div className="mt-6 space-y-6">
                {GLOSSARY_ORDER.map((category) => {
                  const categoryEntries = allGlossaryEntries.filter((entry) => entry.category === category);
                  if (categoryEntries.length === 0) return null;

                  return (
                    <section key={category} className="space-y-4">
                      <SectionTitle title={GLOSSARY_CATEGORY_LABELS[category]} />
                      <div className="codex-grid codex-grid--glossary">
                        {categoryEntries.map((entry) => (
                          <CodexTile
                            key={entry.id}
                            eyebrow={GLOSSARY_CATEGORY_LABELS[entry.category]}
                            title={entry.name}
                            summary={entry.summary}
                            onClick={() => openEntry('glossary', entry.id)}
                            media={
                              <div className="codex-tile__media-frame codex-tile__media-frame--glossary">
                                <div className="codex-tile__glossary-sigil">{entry.name.slice(0, 2)}</div>
                              </div>
                            }
                            badges={
                              <>
                                <Badge variant={badgeVariantByCategory[entry.category]}>
                                  {GLOSSARY_CATEGORY_LABELS[entry.category]}
                                </Badge>
                                <Badge variant="slate">{GLOSSARY_TARGET_LABELS[entry.target]}</Badge>
                              </>
                            }
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </Panel>
          </motion.section>
      </div>
      <AnimatePresence>{modalOpen ? renderModal() : null}</AnimatePresence>
    </PageShell>
  );
};
