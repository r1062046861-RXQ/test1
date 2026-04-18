import React from 'react';
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
  layoutVariant?: 'default' | 'hand' | 'reward';
  imageTreatment?: 'default' | 'muted';
  className?: string;
}

const TYPE_LABELS = {
  attack: '攻击',
  skill: '技能',
  power: '能力',
} satisfies Record<CardType['type'], string>;

const typeTheme: Record<CardType['type'], string> = {
  attack: 'from-red-100 to-red-50 border-red-900/55',
  skill: 'from-sky-100 to-slate-50 border-sky-900/50',
  power: 'from-amber-100 to-yellow-50 border-yellow-900/55',
};

const rarityLabel = {
  common: '普通',
  uncommon: '非凡',
  rare: '稀有',
} satisfies Record<CardType['rarity'], string>;

export const Card: React.FC<CardProps> = ({
  card,
  onClick,
  disabled,
  selected,
  interactive = true,
  hoverLift = true,
  visualTone = 'default',
  layoutVariant = 'default',
  imageTreatment = 'default',
  className,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const resolvedImage = card.image ? resolveAssetUrl(card.image) : '';

  const playable = visualTone === 'playable';
  const focus = visualTone === 'focus';
  const muted = visualTone === 'muted';
  const handLayout = layoutVariant === 'hand';
  const rewardLayout = layoutVariant === 'reward';
  const compactLayout = handLayout || rewardLayout;
  const mutedImage = handLayout && imageTreatment === 'muted';

  return (
    <div
      className={cn(
        'combat-card group relative overflow-hidden rounded-[22px] border-2 bg-gradient-to-b shadow-[0_18px_30px_rgba(35,22,10,0.2)] transition-all duration-200 select-none',
        'flex flex-col',
        !handLayout && (rewardLayout ? 'h-[20.75rem] w-[13.75rem]' : 'h-[18rem] w-48'),
        handLayout && 'combat-card--hand',
        rewardLayout && 'combat-card--reward',
        mutedImage && 'combat-card--image-muted',
        typeTheme[card.type],
        interactive && !disabled ? 'cursor-pointer' : 'cursor-default',
        interactive && hoverLift && !disabled ? 'hover:-translate-y-3 hover:shadow-[0_24px_34px_rgba(35,22,10,0.28)]' : '',
        disabled && 'cursor-not-allowed grayscale opacity-55',
        selected && 'ring-4 ring-amber-300/90 -translate-y-2 shadow-[0_26px_36px_rgba(35,22,10,0.3)]',
        playable && 'border-amber-500/75 shadow-[0_20px_36px_rgba(168,110,29,0.24)]',
        focus && 'border-amber-600/80 shadow-[0_24px_42px_rgba(168,110,29,0.3)]',
        muted && 'brightness-[0.94] saturate-[0.82] opacity-[0.92]',
        className,
      )}
      style={handLayout ? { width: 'var(--combat-hand-card-width, 11.5rem)', height: 'var(--combat-hand-card-height, 16.75rem)' } : undefined}
      onClick={!disabled ? onClick : undefined}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.45),transparent_28%,rgba(78,48,18,0.05)_100%)]" />
      {(playable || focus) && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(252,211,77,0.18),transparent_32%)]" />
      )}

      {mutedImage ? (
        <div className="combat-card__watermark pointer-events-none absolute inset-x-2 top-[3.25rem] bottom-[2.9rem] overflow-hidden rounded-[18px]">
          {card.image && !imageError ? (
            <img
              src={resolvedImage}
              alt=""
              aria-hidden="true"
              className="combat-card__watermark-image absolute inset-0 h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="combat-card__watermark-fallback absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/55 to-stone-200/35 font-semibold tracking-[0.22em] text-stone-500/55">
              {TYPE_LABELS[card.type]}
            </div>
          )}
          <div className="combat-card__watermark-veil absolute inset-0" />
        </div>
      ) : null}

      <div className="combat-card__header relative z-10 px-3 pb-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              'combat-card__cost flex shrink-0 items-center justify-center rounded-full border-2 font-bold text-white shadow-md transition-all',
              compactLayout ? 'h-9 w-9 text-base' : 'h-10 w-10 text-lg',
              playable || focus
                ? 'border-amber-100 bg-gradient-to-b from-amber-400 to-amber-700 shadow-[0_8px_18px_rgba(180,83,9,0.28)]'
                : 'border-white/80 bg-gradient-to-b from-blue-600 to-blue-800',
            )}
          >
            {card.cost}
          </div>
          <div
            className={cn(
              'combat-card__title-pill min-w-0 flex-1 rounded-xl border border-stone-900/10 bg-white/45 text-center shadow-sm',
              handLayout ? 'px-2.5 py-1.5' : rewardLayout ? 'px-3 py-1.5' : 'px-3 py-2',
            )}
          >
            <div className={cn('combat-card__title truncate font-bold text-stone-900', handLayout ? 'text-[15px]' : rewardLayout ? 'text-[16px]' : 'text-base')}>
              {card.name}
            </div>
          </div>
        </div>
      </div>

      {!mutedImage ? (
        <div className="combat-card__art relative z-10 mx-3 overflow-hidden rounded-2xl border border-stone-900/15 bg-stone-100 shadow-inner">
          {card.image && !imageError ? (
            <img
              src={resolvedImage}
              alt={card.name}
              className={cn(
                'w-full object-cover transition-transform duration-300',
                handLayout ? 'h-24' : rewardLayout ? 'h-32' : 'h-32',
                interactive && hoverLift && !disabled ? 'group-hover:scale-[1.04]' : '',
              )}
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className={cn(
                'flex w-full items-center justify-center bg-gradient-to-b from-white to-stone-200 font-semibold tracking-[0.22em] text-stone-500',
                handLayout ? 'h-24 text-[14px]' : rewardLayout ? 'h-32 text-[15px]' : 'h-32 text-sm',
              )}
            >
              {TYPE_LABELS[card.type]}
            </div>
          )}
        </div>
      ) : (
        <div className="combat-card__divider relative z-10 mx-4 mt-1 h-px bg-gradient-to-r from-transparent via-stone-700/18 to-transparent" />
      )}

      <div
        className={cn(
          'combat-card__meta relative z-10 flex items-center justify-center gap-2 px-3 font-semibold uppercase tracking-[0.15em] text-stone-600',
          handLayout ? 'pt-1.5 text-[12px]' : rewardLayout ? 'pt-2 text-[13px]' : 'pt-2 text-[13px]',
        )}
      >
        <span>{TYPE_LABELS[card.type]}</span>
        <span className="text-stone-400">•</span>
        <span>{rarityLabel[card.rarity]}</span>
      </div>

      <div
        className={cn(
          'combat-card__description relative z-10 flex min-h-0 flex-1 items-center text-center text-stone-800',
          handLayout ? 'px-3 pb-2 pt-1 text-[14px] leading-[1.46]' : rewardLayout ? 'px-4 pb-3 pt-2 text-[15px] leading-7' : 'px-4 pb-3 pt-2 text-sm leading-6',
        )}
      >
        <div className={cn('w-full', handLayout ? 'line-clamp-3' : rewardLayout ? 'line-clamp-4' : 'line-clamp-4')}>
          {card.description}
        </div>
      </div>

      <div
        className={cn(
          'combat-card__note relative z-10 mt-auto border-t border-amber-900/10 bg-[rgba(255,247,227,0.82)] text-center italic text-amber-900/90',
          handLayout ? 'px-3 py-1.5 text-[12px] leading-[1.4]' : rewardLayout ? 'px-3 py-2 text-[13px] leading-6' : 'px-3 py-2 text-[13px] leading-6',
        )}
      >
        <div className={cn(handLayout ? 'line-clamp-2' : rewardLayout ? 'line-clamp-2' : '')}>{card.tcmNote}</div>
      </div>
    </div>
  );
};
