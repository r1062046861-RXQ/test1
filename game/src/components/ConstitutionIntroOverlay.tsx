import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
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
}

interface ConstitutionIntroOverlayProps {
  stage: ConstitutionIntroStage;
  options: ConstitutionOption[];
  onSkip: () => void;
  onClose: () => void;
  onSelect: (constitution: Constitution) => void;
}

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

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;
const FALLBACK_CARD_IMAGE = '/assets/cards_player/1.png';

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

const SELECT_CARD_CLASSES = [
  'md:-rotate-[3deg]',
  'md:rotate-[1deg]',
  'md:rotate-[3deg]',
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

function getDealtCardInitial(index: number, isMobile: boolean) {
  if (isMobile) {
    return {
      x: 0,
      y: -190,
      rotate: index === 1 ? 0 : index === 0 ? -7 : 7,
      scale: 0.9,
    };
  }

  return [
    { x: 308, y: -238, rotate: 16, scale: 0.9 },
    { x: 0, y: -252, rotate: 3, scale: 0.92 },
    { x: -308, y: -238, rotate: -15, scale: 0.9 },
  ][index]!;
}

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
  const frontMotion = reducedMotion || card.flashStart === null
    ? { opacity: 0, rotateY: -180, y: 0 }
    : {
        opacity: [0, 0, 0.98, 0.98, 0],
        rotateY: [-180, -180, -10, 0, -180],
        y: [0, 0, -10 - cardIndex * 2, -10 - cardIndex * 2, 0],
      };

  const frontTransition = reducedMotion || card.flashStart === null
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

const DeckRemnant: React.FC = () => (
  <div className="constitution-remnant-deck" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((index) => (
      <div
        key={index}
        className="constitution-remnant-deck__card"
        style={
          {
            '--constitution-remnant-index': `${index}`,
          } as React.CSSProperties
        }
      >
        <div className="constitution-remnant-deck__back">
          <div className="constitution-remnant-deck__sigil" />
        </div>
      </div>
    ))}
  </div>
);

export const ConstitutionIntroOverlay: React.FC<ConstitutionIntroOverlayProps> = ({
  stage,
  options,
  onSkip,
  onClose,
  onSelect,
}) => {
  const reducedMotion = useReducedMotion();
  const isMobile = useMediaQuery('(max-width: 768px)');

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (stage === 'cinematic') {
        onSkip();
        return;
      }

      onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, onSkip, stage]);

  return (
    <motion.div
      className="constitution-flow custom-scrollbar"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT }}
      onClick={stage === 'select' ? onClose : undefined}
    >
      <div className="constitution-flow__vignette" />
      <div className="constitution-flow__grain" />
      <div className="constitution-flow__halo constitution-flow__halo--top" />
      <div className="constitution-flow__halo constitution-flow__halo--bottom" />

      <div className="constitution-flow__shell">
        <div className="constitution-flow__controls">
          {stage === 'cinematic' ? (
            <button type="button" className="constitution-flow__text-action" onClick={onSkip}>
              跳过
            </button>
          ) : (
            <button type="button" className="constitution-flow__icon-action" onClick={onClose} aria-label="关闭体质选择">
              <X size={18} />
            </button>
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {stage === 'cinematic' ? (
            <motion.div
              key="cinematic"
              className="constitution-shuffle-stage"
              onClick={(event) => event.stopPropagation()}
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
          ) : (
            <motion.div
              key="select"
              className="constitution-select-stage"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.32, ease: EASE_OUT }}
            >
              <div className="constitution-select-stage__hero">
                <motion.div
                  className="constitution-select-stage__remnant"
                  initial={{ opacity: 0, y: 42, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.28, ease: EASE_OUT }}
                >
                  <DeckRemnant />
                </motion.div>

                <motion.div
                  className="constitution-select-stage__heading"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: 0.06, ease: EASE_OUT }}
                >
                  <div className="constitution-select-stage__kicker">
                    <Sparkles size={14} />
                    体质择定
                  </div>
                  <h2 className="constitution-select-stage__title">选择体质</h2>
                  <p className="constitution-select-stage__subtitle">
                    体质决定起手被动与牌组方向，选定后直接进入第一幕。
                  </p>
                </motion.div>
              </div>

              <div className="constitution-select-stage__grid">
                {options.map((option, index) => {
                  const initialMotion = getDealtCardInitial(index, isMobile);

                  return (
                    <motion.button
                      key={option.id}
                      type="button"
                      onClick={() => onSelect(option.id)}
                      className={cn(
                        'constitution-choice-card group',
                        `constitution-choice-card--${PACKET_TONES[index]}`,
                        SELECT_CARD_CLASSES[index],
                      )}
                      initial={{
                        opacity: 0,
                        x: initialMotion.x,
                        y: initialMotion.y,
                        rotate: initialMotion.rotate,
                        scale: initialMotion.scale,
                      }}
                      animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
                      transition={{
                        duration: 0.38,
                        delay: 0.12 + index * 0.09,
                        ease: EASE_OUT,
                      }}
                      whileHover={reducedMotion ? undefined : { y: -4, scale: 1.008 }}
                      whileTap={reducedMotion ? undefined : { scale: 0.988 }}
                    >
                      <div className="constitution-choice-card__frame" />
                      <div className="constitution-choice-card__sheen" />
                      <div className="constitution-choice-card__art">
                        <img
                          src={resolveAssetUrl(option.image)}
                          alt={option.title}
                          className="constitution-choice-card__image"
                          onError={(event) => {
                            const target = event.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="constitution-choice-card__body">
                        <div className="constitution-choice-card__name">{option.title}</div>
                        <p className="constitution-choice-card__subtitle">{option.subtitle}</p>
                        <div className="constitution-choice-card__badge">{option.passive}</div>
                        <p className="constitution-choice-card__detail">{option.detail}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
