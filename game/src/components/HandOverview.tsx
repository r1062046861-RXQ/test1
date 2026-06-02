import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollText, X } from 'lucide-react';
import { CARD_LIBRARY, countCardsByTemplate, getCardCategory } from '../data/cards';
import type { Card as CardData, CardCategory, CardRarity, CardTarget, CardType, Relic } from '../types';
import { resolveAssetUrl } from '../utils/assets';

type HandOverviewProps = {
  deck: CardData[];
  relics: Relic[];
  buttonLabel?: string;
  dialogTitle?: string;
  kicker?: string;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  buttonLabelClassName?: string;
  buttonCountClassName?: string;
  iconSize?: number;
};

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

const CARD_CATEGORY_LABELS: Record<CardCategory, string> = {
  herb: '药材牌',
  formula: '药方牌',
  equipment: '装备牌',
  enemy: '敌方牌',
};

const getCardTraits = (card: CardData) =>
  [
    card.unplayable ? '不可打出' : null,
    card.exhaust ? '打出后消耗' : null,
    getCardCategory(card) === 'equipment' ? '装备被动' : null,
  ].filter((trait): trait is string => Boolean(trait));

const getCardDetailRows = (card: CardData) => {
  const rows = [
    { label: '类别', value: CARD_CATEGORY_LABELS[getCardCategory(card)] },
    { label: '类型', value: CARD_TYPE_LABELS[card.type] },
    { label: '品质', value: CARD_RARITY_LABELS[card.rarity] },
    { label: '目标', value: CARD_TARGET_LABELS[card.target] },
    { label: '费用', value: `${card.cost} 费` },
  ];
  if (typeof card.effectValue === 'number') {
    rows.push({ label: '主要数值', value: String(card.effectValue) });
  }
  if (typeof card.secondaryValue === 'number') {
    rows.push({ label: '次级数值', value: String(card.secondaryValue) });
  }
  const traits = getCardTraits(card);
  if (traits.length > 0) {
    rows.push({ label: '特性', value: traits.join('、') });
  }
  return rows;
};

export const HandOverview: React.FC<HandOverviewProps> = ({
  deck,
  relics,
  buttonLabel = '查看现有手牌',
  dialogTitle = '查看现有手牌',
  kicker = '巡诊行囊',
  buttonClassName = 'hand-overview-button hand-overview-button--inline',
  buttonStyle,
  buttonLabelClassName = 'hand-overview-button__label',
  buttonCountClassName = 'hand-overview-button__count',
  iconSize = 20,
}) => {
  const [open, setOpen] = React.useState(false);
  const [detailCard, setDetailCard] = React.useState<CardData | null>(null);
  const detailTitleId = React.useId();
  const templateCounts = React.useMemo(() => countCardsByTemplate(deck), [deck]);
  const sorted = React.useMemo(
    () => Object.entries(templateCounts).sort(([, a], [, b]) => b.count - a.count),
    [templateCounts],
  );
  const relicCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    relics.forEach((relic) => counts.set(relic.id, (counts.get(relic.id) ?? 0) + 1));
    return Array.from(counts.entries()).sort(([, a], [, b]) => b - a);
  }, [relics]);

  const closeOverview = React.useCallback(() => {
    setDetailCard(null);
    setOpen(false);
  }, []);

  React.useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (detailCard) {
        setDetailCard(null);
        return;
      }
      closeOverview();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeOverview, detailCard, open]);

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        style={buttonStyle}
        aria-label={`查看牌组，当前 ${deck.length} 张牌`}
        onClick={() => setOpen(true)}
      >
        <ScrollText size={iconSize} aria-hidden="true" />
        <span className={buttonLabelClassName}>{buttonLabel}</span>
        <span className={buttonCountClassName}>{deck.length} 牌</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="synthesis-bench-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={closeOverview}
          >
            <motion.div
              className="synthesis-bench"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
              style={{ maxWidth: '680px', maxHeight: 'min(600px, calc(100vh - 36px))' }}
            >
              <div className="synthesis-bench__header">
                <div className="min-w-0">
                  <div className="chapter-kicker">{kicker}</div>
                  <h2 className="synthesis-bench__title">{dialogTitle}</h2>
                </div>
                <button type="button" className="synthesis-bench__close" aria-label="关闭" onClick={closeOverview}>
                  <X size={18} />
                </button>
              </div>
              <div className="ornate-scroll p-4" style={{ overflowY: 'auto', flex: 1 }}>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                  {sorted.map(([templateId, templateCount]) => {
                    const card = CARD_LIBRARY[templateId] ?? templateCount.card;
                    if (!card) return null;
                    return (
                      <button
                        key={templateId}
                        type="button"
                        className="hand-overview-card-row flex w-full items-center gap-3 rounded-xl border border-amber-500/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-left"
                        aria-label={`查看${card.name}详细属性，当前 ${templateCount.count} 张`}
                        onClick={() => setDetailCard(card)}
                      >
                        {card.image ? (
                          <img src={resolveAssetUrl(card.image)} alt="" className="h-12 w-8 shrink-0 rounded-md object-cover" />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-amber-100">{card.name}</div>
                          <div className="text-xs text-stone-400">x{templateCount.count}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {relicCounts.length > 0 ? (
                  <>
                    <div className="chapter-kicker mt-5 mb-2">已获装备</div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                      {relicCounts.map(([relicId, count]) => {
                        const relic = relics.find((entry) => entry.id === relicId);
                        if (!relic) return null;
                        const relicCard = CARD_LIBRARY[relicId];
                        return (
                          <button
                            key={relicId}
                            type="button"
                            className="hand-overview-card-row flex w-full items-center gap-3 rounded-xl border border-amber-500/15 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-left"
                            aria-label={`查看${relic.name}详细属性，当前 ${count} 张`}
                            onClick={() => relicCard && setDetailCard(relicCard)}
                          >
                            {relicCard?.image ? (
                              <img src={resolveAssetUrl(relicCard.image)} alt="" className="h-12 w-8 shrink-0 rounded-md object-cover" />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-bold text-amber-100">{relic.name}</div>
                              <div className="text-xs text-stone-400">x{count}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : null}
                {sorted.length === 0 && relicCounts.length === 0 ? (
                  <div className="py-12 text-center text-stone-400">牌组为空</div>
                ) : null}
              </div>
            </motion.div>

            <AnimatePresence>
              {detailCard ? (
                <motion.div
                  className="card-text-modal-backdrop"
                  style={{ zIndex: 110 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setDetailCard(null);
                  }}
                >
                  <motion.div
                    className="card-text-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={detailTitleId}
                    initial={{ opacity: 0, scale: 0.96, y: 14 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="card-text-modal__header">
                      <div className="min-w-0">
                        <div className="card-text-modal__kicker">详细属性</div>
                        <h3 id={detailTitleId} className="card-text-modal__title">
                          {detailCard.name}
                        </h3>
                        <div className="card-text-modal__meta">
                          <span>{CARD_CATEGORY_LABELS[getCardCategory(detailCard)]}</span>
                          <span>·</span>
                          <span>{CARD_TYPE_LABELS[detailCard.type]}</span>
                          <span>·</span>
                          <span>{CARD_RARITY_LABELS[detailCard.rarity]}</span>
                          <span>·</span>
                          <span>{CARD_TARGET_LABELS[detailCard.target]}</span>
                          <span>·</span>
                          <span>{detailCard.cost} 费</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="card-text-modal__close"
                        aria-label={`关闭${detailCard.name}详细属性`}
                        onClick={() => setDetailCard(null)}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="card-text-modal__scroll ornate-scroll">
                      <div className={`hand-overview-detail__layout ${detailCard.image ? '' : 'hand-overview-detail__layout--single'}`}>
                        {detailCard.image ? (
                          <div className="hand-overview-detail__art">
                            <img src={resolveAssetUrl(detailCard.image)} alt={detailCard.name} />
                          </div>
                        ) : null}

                        <section className="card-text-modal__section">
                          <div className="card-text-modal__section-title">卡牌属性</div>
                          <div className="hand-overview-detail__attributes">
                            {getCardDetailRows(detailCard).map((row) => (
                              <div key={row.label} className="hand-overview-detail__attribute">
                                <span>{row.label}</span>
                                <strong>{row.value}</strong>
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>

                      <section className="card-text-modal__section">
                        <div className="card-text-modal__section-title">效果说明</div>
                        <p className="card-text-modal__copy">{detailCard.description}</p>
                      </section>

                      {detailCard.tcmNote ? (
                        <section className="card-text-modal__section">
                          <div className="card-text-modal__section-title">中医说明</div>
                          <p className="card-text-modal__copy">{detailCard.tcmNote}</p>
                        </section>
                      ) : null}
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};
