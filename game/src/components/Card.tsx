import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { Card as CardType } from '../types';
import { cn } from '../utils/cn';
import { resolveAssetUrl } from '../utils/assets';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  interactive?: boolean;
  hoverLift?: boolean;
  visualTone?: 'default' | 'playable' | 'focus' | 'muted';
  layoutVariant?: 'default' | 'hand' | 'reward' | 'codex';
  descriptionModalEnabled?: boolean;
  className?: string;
}

const TYPE_LABELS = {
  attack: '攻击',
  skill: '技能',
  power: '能力',
} satisfies Record<CardType['type'], string>;

const costTheme: Record<CardType['type'], string> = {
  attack: 'border-red-800/40 bg-gradient-to-b from-red-950/80 to-red-900/80 text-red-200 shadow-[0_10px_20px_rgba(127,29,29,0.3)]',
  skill: 'border-amber-400/30 bg-gradient-to-b from-yellow-100/90 to-amber-100/80 text-amber-950 shadow-[0_10px_20px_rgba(120,80,20,0.15)]',
  power: 'border-purple-800/40 bg-gradient-to-b from-purple-950/80 to-violet-900/80 text-violet-200 shadow-[0_10px_20px_rgba(76,29,149,0.3)]',
};

const typeTheme: Record<CardType['type'], string> = {
  attack: 'from-red-950/60 to-red-900/40 border-red-800/35',
  skill: 'from-amber-100/55 to-yellow-50/40 border-amber-400/40',
  power: 'from-purple-950/60 to-violet-900/40 border-purple-800/35',
};

const rarityLabel = {
  common: '普通',
  uncommon: '非凡',
  rare: '稀有',
} satisfies Record<CardType['rarity'], string>;

const targetLabelShort = {
  single_enemy: '单体',
  all_enemies: '全体',
  self: '自身',
  random: '随机',
} satisfies Record<CardType['target'], string>;

export const Card: React.FC<CardProps> = ({
  card,
  onClick,
  disabled,
  selected,
  interactive = true,
  hoverLift = true,
  visualTone = 'default',
  layoutVariant = 'default',
  descriptionModalEnabled = true,
  className,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [showTextModal, setShowTextModal] = React.useState(false);
  const resolvedImage = card.image ? resolveAssetUrl(card.image) : '';
  const modalTitleId = React.useId();

  React.useEffect(() => {
    setImageError(false);
  }, [resolvedImage]);

  React.useEffect(() => {
    if (!showTextModal) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowTextModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTextModal]);

  const playable = visualTone === 'playable';
  const focus = visualTone === 'focus';
  const muted = visualTone === 'muted';
  const handLayout = layoutVariant === 'hand';
  const rewardLayout = layoutVariant === 'reward';
  const codexLayout = layoutVariant === 'codex';
  const compactLayout = handLayout || codexLayout;
  const showMeta = !handLayout;
  const showDescription = !codexLayout;
  const showNote = !handLayout && !codexLayout && Boolean(card.tcmNote);
  const allowDescriptionModal =
    descriptionModalEnabled && !handLayout && !codexLayout && Boolean(card.description || card.tcmNote);
  const metaBadges = codexLayout
    ? [rarityLabel[card.rarity], targetLabelShort[card.target]]
    : [TYPE_LABELS[card.type], rarityLabel[card.rarity], targetLabelShort[card.target]];

  const handleDescriptionOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setShowTextModal(true);
  };

  const detailModal =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {showTextModal ? (
              <motion.div
                className="card-text-modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={() => setShowTextModal(false)}
              >
                <motion.div
                  className="card-text-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={modalTitleId}
                  initial={{ opacity: 0, scale: 0.96, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 10 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="card-text-modal__header">
                    <div className="min-w-0">
                      <div className="card-text-modal__kicker">完整说明</div>
                      <h3 id={modalTitleId} className="card-text-modal__title">
                        {card.name}
                      </h3>
                      <div className="card-text-modal__meta">
                        <span>{TYPE_LABELS[card.type]}</span>
                        <span>·</span>
                        <span>{rarityLabel[card.rarity]}</span>
                        <span>·</span>
                        <span>{targetLabelShort[card.target]}</span>
                        <span>·</span>
                        <span>{card.cost} 费</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="card-text-modal__close"
                      aria-label={`关闭${card.name}完整说明`}
                      onClick={() => setShowTextModal(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="card-text-modal__scroll ornate-scroll">
                    <section className="card-text-modal__section">
                      <div className="card-text-modal__section-title">效果说明</div>
                      <p className="card-text-modal__copy">{card.description}</p>
                    </section>

                    {card.tcmNote ? (
                      <section className="card-text-modal__section">
                        <div className="card-text-modal__section-title">中医说明</div>
                        <p className="card-text-modal__copy">{card.tcmNote}</p>
                      </section>
                    ) : null}
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        className={cn(
          'combat-card group relative isolate overflow-hidden rounded-[22px] border bg-gradient-to-b shadow-[0_18px_30px_rgba(35,22,10,0.2)] transition-all duration-200 select-none',
          'flex min-h-0 flex-col justify-between',
          handLayout && 'border-[1.5px] combat-card--hand',
          !handLayout && !codexLayout && (rewardLayout ? 'h-[20.75rem] w-[13.75rem] border-2' : 'h-[18rem] w-48 border-2'),
          rewardLayout && 'combat-card--reward',
          codexLayout && 'combat-card--codex',
          typeTheme[card.type],
          interactive && !disabled ? 'cursor-pointer' : 'cursor-default',
          interactive && hoverLift && !disabled ? 'hover:-translate-y-3 hover:shadow-[0_24px_34px_rgba(35,22,10,0.28)]' : '',
          disabled && 'cursor-not-allowed grayscale opacity-55',
          selected && 'ring-4 ring-amber-300/90 -translate-y-2 shadow-[0_26px_36px_rgba(35,22,10,0.3)]',
          playable && 'border-amber-500/75 shadow-[0_20px_36px_rgba(168,110,29,0.24)]',
          focus && 'border-amber-600/80 shadow-[0_24px_42px_rgba(168,110,29,0.3)]',
          muted && 'brightness-[0.96] saturate-[0.9] opacity-[0.94]',
          className,
        )}
        style={handLayout ? { width: 'var(--combat-hand-card-width, 11.5rem)', height: 'var(--combat-hand-card-height, 16.75rem)' } : undefined}
        onClick={!disabled ? onClick : undefined}
      >
        <div className="combat-card__art-shell">
          {card.image && !imageError ? (
            <>
              <img
                src={resolvedImage}
                alt=""
                aria-hidden="true"
                className="combat-card__art-backdrop"
                loading={codexLayout ? 'lazy' : undefined}
                decoding="async"
                onError={() => setImageError(true)}
              />
              <img
                src={resolvedImage}
                alt={card.name}
                className="combat-card__art-image"
                loading={codexLayout ? 'lazy' : undefined}
                decoding="async"
                onError={() => setImageError(true)}
              />
            </>
          ) : (
            <div
              className={cn(
                'combat-card__fallback flex h-full w-full items-center justify-center font-semibold tracking-[0.22em]',
                compactLayout ? 'text-[12px]' : 'text-sm',
              )}
            >
              {TYPE_LABELS[card.type]}
            </div>
          )}
          <div className="combat-card__art-ink" />
        </div>

        <div className="combat-card__frame" />
        <div className="combat-card__edge-glow" />
        <div className="combat-card__top-scrim" />
        <div className="combat-card__bottom-scrim" />
        {(playable || focus) && <div className="combat-card__focus-halo" />}

        <div className="combat-card__header relative z-10">
          <div className="combat-card__header-row">
            <div className={cn('combat-card__cost', costTheme[card.type])}>
              {card.type === 'attack' ? '攻' : card.cost}
            </div>

            <div className="combat-card__title-pill">
              <div className="combat-card__title">{card.name}</div>
            </div>
          </div>
        </div>

        <div className="combat-card__footer relative z-10">
          {showMeta ? (
            <div className="combat-card__meta">
              {metaBadges.map((badge) => (
                <span key={`${card.id}_${badge}`} className="combat-card__meta-badge">
                  {badge}
                </span>
              ))}
            </div>
          ) : null}

          {showDescription ? (
            allowDescriptionModal ? (
              <button
                type="button"
                className="combat-card__details-button"
                aria-label={`查看${card.name}完整说明`}
                onClick={handleDescriptionOpen}
              >
                <div className="combat-card__description text-stone-900">
                  <span className={cn('combat-card__description-copy', handLayout ? 'line-clamp-2' : rewardLayout ? 'line-clamp-4' : 'line-clamp-4')}>
                    {card.description}
                  </span>
                </div>

                {showNote ? (
                  <div className="combat-card__note">
                    <span className="line-clamp-1">{card.tcmNote}</span>
                  </div>
                ) : null}
              </button>
            ) : (
              <div className="combat-card__description text-stone-900">
                <span className={cn('combat-card__description-copy', handLayout ? 'line-clamp-2' : rewardLayout ? 'line-clamp-4' : 'line-clamp-4')}>
                  {card.description}
                </span>
              </div>
            )
          ) : null}
        </div>
      </div>

      {detailModal}
    </>
  );
};
