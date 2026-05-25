import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CARD_LIBRARY } from '../data/cards';
import type { Constitution } from '../types';
import { cn } from '../utils/cn';
import { resolveAssetUrl } from '../utils/assets';

export const CONSTITUTION_CINEMATIC_MS = 2200;
export const CONSTITUTION_REDUCED_MOTION_MS = 220;

export type ConstitutionIntroStage = 'cinematic' | 'select';

export interface ConstitutionOption {
  id: Constitution;
  title: string;
  subtitle: string;
  passive: string;
  detail: string;
  accent: string;
  image: string;
  locked?: boolean;
}

interface ConstitutionIntroOverlayProps {
  stage: ConstitutionIntroStage;
  options: ConstitutionOption[];
  onSkip: () => void;
  onClose: () => void;
  onSelect: (constitution: Constitution) => void;
}

const ASSET_BASE = '/assets/constitution_select';
const PAGE_SIZE = 3;
const REF_W = 1920;
const REF_H = 1080;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN_OUT = [0.45, 0, 0.2, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;
const FALLBACK_CARD_IMAGE = '/assets/cards_player/1.png';

type CardTone = 'emerald' | 'crimson' | 'amber';

interface PacketCardModel {
  id: string;
  name: string;
  image: string;
  flashStart: number | null;
  flashEnd: number | null;
}

interface PacketModel {
  id: string;
  tone: CardTone;
  cards: PacketCardModel[];
}

const CARD_SLOTS = [
  { left: 407, top: 388, width: 354, height: 477 },
  { left: 801, top: 388, width: 354, height: 477 },
  { left: 1198, top: 388, width: 354, height: 477 },
] as const;

const CENTERED_SINGLE_CARD_SLOT = { left: 783, top: 388, width: 354, height: 477 } as const;

const PACKET_TONES: CardTone[] = ['emerald', 'crimson', 'amber'];

const SHOWCASE_PACKET_CARD_IDS = [
  ['mahuang', 'chuanxiong', 'huanglian', 'chenpi'],
  ['huangqi', 'danggui', 'guizhi', 'baishao'],
  ['danshen', 'yiyi', 'jinyinhua', 'xiaochaihu'],
] as const;

const FLASH_WINDOWS = [
  [
    { start: 0.24, end: 0.38 },
    { start: 0.38, end: 0.5 },
    { start: 0.5, end: 0.6 },
    null,
  ],
  [
    { start: 0.3, end: 0.44 },
    { start: 0.44, end: 0.56 },
    null,
    null,
  ],
  [
    { start: 0.34, end: 0.48 },
    { start: 0.48, end: 0.58 },
    { start: 0.58, end: 0.68 },
    null,
  ],
] as const;

const SHOWCASE_PACKETS: PacketModel[] = SHOWCASE_PACKET_CARD_IDS.map((packetIds, packetIndex) => ({
  id: `packet-${packetIndex + 1}`,
  tone: PACKET_TONES[packetIndex],
  cards: packetIds.map((cardId, cardIndex) => {
    const card = CARD_LIBRARY[cardId];
    const flashWindow = FLASH_WINDOWS[packetIndex][cardIndex];

    return {
      id: cardId,
      name: card.name,
      image: resolveAssetUrl(card.image ?? FALLBACK_CARD_IMAGE),
      flashStart: flashWindow?.start ?? null,
      flashEnd: flashWindow?.end ?? null,
    };
  }),
}));

function percent(value: number, base: number) {
  return `${(value / base) * 100}%`;
}

function toSlotStyle(slot: { left: number; top: number; width: number; height: number }): React.CSSProperties {
  return {
    left: percent(slot.left, REF_W),
    top: percent(slot.top, REF_H),
    width: percent(slot.width, REF_W),
    height: percent(slot.height, REF_H),
  };
}

function getCardSlot(index: number, count: number) {
  if (count === 1) {
    return CENTERED_SINGLE_CARD_SLOT;
  }

  return CARD_SLOTS[index] ?? CARD_SLOTS[0];
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(query);
    const onChange = () => setMatches(mediaQuery.matches);

    onChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, [query]);

  return matches;
}

const AssetImage: React.FC<{
  src: string;
  className: string;
  alt?: string;
  style?: React.CSSProperties;
}> = ({ src, className, alt = '', style }) => (
  <img
    src={resolveAssetUrl(src)}
    alt={alt}
    aria-hidden={alt ? undefined : true}
    className={className}
    draggable={false}
    style={style}
  />
);

const CanvasShell: React.FC<{
  children: React.ReactNode;
  onBackgroundClick?: () => void;
}> = ({ children, onBackgroundClick }) => (
  <div className="constitution-ui" onClick={onBackgroundClick}>
    <div className="constitution-ui__canvas">
      <AssetImage src={`${ASSET_BASE}/background.png`} className="constitution-ui__background" />
      {children}
    </div>
  </div>
);

const SelectHeader: React.FC = () => (
  <>
    <AssetImage src={`${ASSET_BASE}/deck_icon.png`} className="constitution-ui__deck-icon" />
    <div className="constitution-ui__heading">
      <div className="constitution-ui__kicker">
        <span className="constitution-ui__sparkles" aria-hidden="true">
          ✦
        </span>
        体质择定
      </div>
      <h2 className="constitution-ui__title">选择体质</h2>
      <p className="constitution-ui__subtitle">体质决定起手被动与牌组方向，选定后直接进入第一幕。</p>
    </div>
  </>
);

const BackToMenuButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" className="constitution-ui__back-button" onClick={onClick} aria-label="返回主菜单">
    <AssetImage src={`${ASSET_BASE}/back_to_menu.png`} className="constitution-ui__back-image" />
  </button>
);

const ConstitutionCard: React.FC<{
  option: ConstitutionOption;
  slotIndex: number;
  slotCount: number;
  onSelect: (constitution: Constitution) => void;
}> = ({ option, slotIndex, slotCount, onSelect }) => {
  const isLocked = option.locked;
  const slot = getCardSlot(slotIndex, slotCount);
  const style = toSlotStyle(slot);

  return (
    <motion.button
      key={option.id}
      type="button"
      className={cn('constitution-ui-card', isLocked && 'constitution-ui-card--locked')}
      style={style}
      onClick={isLocked ? undefined : () => onSelect(option.id)}
      aria-label={isLocked ? `${option.title}，未解锁` : `选择${option.title}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.28, delay: slotIndex * 0.06, ease: EASE_OUT }}
      whileTap={isLocked ? undefined : { scale: 0.985 }}
    >
      <span className="constitution-ui-card__default">
        <span className="constitution-ui-card__art-shell">
          <img
            src={resolveAssetUrl(option.image)}
            alt=""
            aria-hidden="true"
            className="constitution-ui-card__art"
            draggable={false}
            onError={(event) => {
              const target = event.currentTarget;
              target.style.display = 'none';
            }}
          />
          <span className="constitution-ui-card__shade" />
          <span className="constitution-ui-card__inner-line" />
        </span>
        <span className="constitution-ui-card__default-copy">
          <span className="constitution-ui-card__name">{isLocked ? '???' : option.title}</span>
          <span className="constitution-ui-card__subtitle">{isLocked ? '完成更多巡诊后解锁' : option.subtitle}</span>
          <span className="constitution-ui-card__button">
            <AssetImage src={`${ASSET_BASE}/choice_button_frame.png`} className="constitution-ui-card__button-frame" />
            <span className="constitution-ui-card__button-label">{isLocked ? '未解锁' : option.passive}</span>
          </span>
        </span>
      </span>

      <span className="constitution-ui-card__hover">
        <AssetImage src={`${ASSET_BASE}/hover_frame.png`} className="constitution-ui-card__hover-frame" />
        <span className="constitution-ui-card__detail">{isLocked ? '完成更多巡诊后解锁。' : option.detail}</span>
        <span className="constitution-ui-card__hover-copy">
          <span className="constitution-ui-card__hover-name">{isLocked ? '???' : option.title}</span>
          <span className="constitution-ui-card__hover-subtitle">{isLocked ? '未解锁' : option.subtitle}</span>
          <span className="constitution-ui-card__button constitution-ui-card__button--hover">
            <AssetImage src={`${ASSET_BASE}/choice_button_frame.png`} className="constitution-ui-card__button-frame" />
            <span className="constitution-ui-card__button-label">{isLocked ? '未解锁' : option.passive}</span>
          </span>
        </span>
      </span>
    </motion.button>
  );
};

const Pagination: React.FC<{
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}> = ({ page, totalPages, onPrev, onNext }) => {
  const isFirst = page === 0;
  const isLast = page >= totalPages - 1;

  return (
    <div className="constitution-ui-pagination">
      <AssetImage src={`${ASSET_BASE}/page_controls_hover.png`} className="constitution-ui-pagination__hover-strip" />
      <button
        type="button"
        className="constitution-ui-pagination__button constitution-ui-pagination__button--left"
        onClick={onPrev}
        disabled={isFirst}
        aria-label="上一页体质"
      >
        <AssetImage src={`${ASSET_BASE}/page_left.png`} className="constitution-ui-pagination__icon" />
      </button>
      <div className="constitution-ui-pagination__count" aria-live="polite">
        {page + 1} / {totalPages}
      </div>
      <button
        type="button"
        className="constitution-ui-pagination__button constitution-ui-pagination__button--right"
        onClick={onNext}
        disabled={isLast}
        aria-label="下一页体质"
      >
        <AssetImage src={`${ASSET_BASE}/page_right.png`} className="constitution-ui-pagination__icon" />
      </button>
    </div>
  );
};

const ShuffleCard: React.FC<{
  card: PacketCardModel;
  tone: CardTone;
  packetIndex: number;
  cardIndex: number;
}> = ({ card, tone, packetIndex, cardIndex }) => {
  const reducedMotion = useReducedMotion();
  const cardStyle = {
    '--constitution-card-offset': `${cardIndex}`,
    zIndex: 12 - cardIndex,
  } as React.CSSProperties;

  const flashStart = card.flashStart ?? 0;
  const flashEnd = card.flashEnd ?? 0;
  const frontMotion =
    reducedMotion || card.flashStart === null
      ? { opacity: 0, rotateY: -180, y: 0 }
      : {
          opacity: [0, 0, 0.98, 0.98, 0],
          rotateY: [-180, -180, -10, 0, -180],
          y: [0, 0, -10 - cardIndex * 2, -10 - cardIndex * 2, 0],
        };

  const frontTransition =
    reducedMotion || card.flashStart === null
      ? { duration: 0 }
      : {
          duration: 1.88,
          delay: 0.14 + packetIndex * 0.04,
          times: [0, flashStart - 0.06, flashStart, flashEnd, flashEnd + 0.06],
          ease: EASE_OUT,
        };

  return (
    <div className={cn('constitution-shuffle-card', `constitution-shuffle-card--${tone}`)} style={cardStyle}>
      <div className="constitution-shuffle-card__shadow" />
      <div className="constitution-shuffle-card__back">
        <div className="constitution-shuffle-card__back-inner">
          <div className="constitution-shuffle-card__sigil" />
          <div className="constitution-shuffle-card__back-copy">五行医道</div>
        </div>
      </div>
      <motion.div
        className="constitution-shuffle-card__front"
        initial={{ opacity: 0, rotateY: -180, y: 0 }}
        animate={frontMotion}
        transition={frontTransition}
      >
        <img src={card.image} alt={card.name} className="constitution-shuffle-card__front-image" />
      </motion.div>
    </div>
  );
};

const DeckPacket: React.FC<{
  packet: PacketModel;
  packetIndex: number;
  isMobile: boolean;
}> = ({ packet, packetIndex, isMobile }) => {
  const reducedMotion = useReducedMotion();
  const choreographyClass = `${isMobile ? 'mobile' : 'desktop'}-${packetIndex + 1}`;

  return (
    <div
      className={cn(
        'constitution-deck-packet-shell',
        `constitution-deck-packet-shell--${choreographyClass}`,
        reducedMotion && 'constitution-deck-packet-shell--reduced',
      )}
      style={{ zIndex: 30 - packetIndex }}
    >
      <div
        className={cn(
          'constitution-deck-packet',
          `constitution-deck-packet--${packet.tone}`,
          `constitution-deck-packet--${choreographyClass}`,
          reducedMotion && 'constitution-deck-packet--reduced',
        )}
      >
        {packet.cards.map((card, cardIndex) => (
          <ShuffleCard key={card.id} card={card} tone={packet.tone} packetIndex={packetIndex} cardIndex={cardIndex} />
        ))}
      </div>
    </div>
  );
};

const CinematicStage: React.FC<{
  onSkip: () => void;
}> = ({ onSkip }) => {
  const reducedMotion = useReducedMotion();
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <>
      <div className="constitution-flow__vignette" />
      <div className="constitution-flow__grain" />
      <div className="constitution-flow__halo constitution-flow__halo--top" />
      <div className="constitution-flow__halo constitution-flow__halo--bottom" />

      <div className="constitution-flow__shell">
        <div className="constitution-flow__controls">
          <button type="button" className="constitution-flow__text-action" onClick={onSkip}>
            跳过
          </button>
        </div>

        <motion.div
          className="constitution-shuffle-stage"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18, transition: { duration: 0.16, ease: EASE_IN } }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
        >
          <div className="constitution-shuffle-stage__deck">
            {SHOWCASE_PACKETS.map((packet, packetIndex) => (
              <DeckPacket key={packet.id} packet={packet} packetIndex={packetIndex} isMobile={isMobile} />
            ))}
          </div>

          <motion.div
            className="constitution-shuffle-stage__copy"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reducedMotion ? 0.18 : 0.28,
              delay: reducedMotion ? 0.04 : 1.58,
              ease: EASE_OUT,
            }}
          >
            <div className="constitution-shuffle-stage__kicker">五行起局</div>
            <h2 className="constitution-shuffle-stage__title">切牌起局</h2>
            <p className="constitution-shuffle-stage__subtitle">
              三张体质牌会从整叠牌中依次发出，决定你这一轮巡诊的起手方向与五行节奏。
            </p>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

const SelectStage: React.FC<{
  options: ConstitutionOption[];
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
  onSelect: (constitution: Constitution) => void;
}> = ({ options, page, setPage, onClose, onSelect }) => {
  const totalPages = Math.ceil(options.length / PAGE_SIZE);
  const currentOptions = options.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  React.useEffect(() => {
    if (page <= totalPages - 1) {
      return;
    }
    setPage(Math.max(0, totalPages - 1));
  }, [page, setPage, totalPages]);

  return (
    <CanvasShell onBackgroundClick={onClose}>
      <div className="constitution-ui__content" onClick={(event) => event.stopPropagation()}>
        <SelectHeader />
        <BackToMenuButton onClick={onClose} />
        <motion.div
          key={page}
          className="constitution-ui__cards"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
        >
          {currentOptions.map((option, index) => (
            <ConstitutionCard
              key={option.id}
              option={option}
              slotIndex={index}
              slotCount={currentOptions.length}
              onSelect={onSelect}
            />
          ))}
        </motion.div>
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((current) => Math.max(0, current - 1))}
            onNext={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
          />
        )}
      </div>
    </CanvasShell>
  );
};

export const ConstitutionIntroOverlay: React.FC<ConstitutionIntroOverlayProps> = ({
  stage,
  options,
  onSkip,
  onClose,
  onSelect,
}) => {
  const [page, setPage] = useState(0);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (stage === 'cinematic') {
          onSkip();
          return;
        }
        onClose();
        return;
      }

      if (stage !== 'select') {
        return;
      }

      const totalPages = Math.ceil(options.length / PAGE_SIZE);
      if (event.key === 'ArrowLeft') {
        setPage((current) => Math.max(0, current - 1));
      } else if (event.key === 'ArrowRight') {
        setPage((current) => Math.min(totalPages - 1, current + 1));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, onSkip, options.length, stage]);

  return (
    <motion.div
      className={cn(
        'constitution-flow',
        stage === 'cinematic' && 'constitution-flow--legacy-cinematic custom-scrollbar',
        stage === 'select' && 'constitution-flow--select',
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
    >
      <AnimatePresence initial={false}>
        {stage === 'cinematic' ? (
          <motion.div
            key="cinematic"
            className="constitution-flow__stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18, ease: EASE_IN_OUT } }}
          >
            <CinematicStage onSkip={onSkip} />
          </motion.div>
        ) : (
          <motion.div
            key="select"
            className="constitution-flow__stage"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: EASE_OUT }}
          >
            <SelectStage options={options} page={page} setPage={setPage} onClose={onClose} onSelect={onSelect} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
