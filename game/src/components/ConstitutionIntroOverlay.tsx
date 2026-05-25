import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Constitution } from '../types';
import { cn } from '../utils/cn';
import { resolveAssetUrl } from '../utils/assets';

export const CONSTITUTION_CINEMATIC_MS = 2850;
export const CONSTITUTION_REDUCED_MOTION_MS = 2450;

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

const CARD_SLOTS = [
  { left: 407, top: 388, width: 354, height: 477 },
  { left: 801, top: 388, width: 354, height: 477 },
  { left: 1198, top: 388, width: 354, height: 477 },
] as const;

const CENTERED_SINGLE_CARD_SLOT = { left: 783, top: 388, width: 354, height: 477 } as const;

const CINEMATIC_SOURCE_DECK = { left: 164, top: 116, width: 282, height: 380 } as const;
const CINEMATIC_SHUFFLE_CARD = { left: 196, top: 132, width: 244, height: 329 } as const;
const CINEMATIC_PREVIEW_START = { left: 222, top: 152, width: 354, height: 477 } as const;

const DEAL_SLOTS = [
  { x: 407, y: 388 },
  { x: 801, y: 388 },
  { x: 1198, y: 388 },
] as const;

const DEAL_ARCS = [
  { x: 282, y: 220, rotate: -10 },
  { x: 350, y: 234, rotate: 0 },
  { x: 418, y: 248, rotate: 10 },
] as const;

const CARD_BACKS = [
  { fanX: 146, fanY: 150, fanRotate: -15, cutX: 368, cutY: 156, cutRotate: -18, delay: 0.14 },
  { fanX: 164, fanY: 134, fanRotate: -8, cutX: 410, cutY: 142, cutRotate: -8, delay: 0.22 },
  { fanX: 192, fanY: 124, fanRotate: -1, cutX: 452, cutY: 150, cutRotate: 2, delay: 0.3 },
  { fanX: 224, fanY: 130, fanRotate: 7, cutX: 494, cutY: 166, cutRotate: 12, delay: 0.38 },
  { fanX: 254, fanY: 150, fanRotate: 15, cutX: 536, cutY: 186, cutRotate: 22, delay: 0.46 },
] as const;

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

const ShuffleBackCard: React.FC<{
  index: number;
  fanX: number;
  fanY: number;
  fanRotate: number;
  cutX: number;
  cutY: number;
  cutRotate: number;
  delay: number;
  reducedMotion: boolean;
}> = ({ index, fanX, fanY, fanRotate, cutX, cutY, cutRotate, delay, reducedMotion }) => (
  <motion.div
    className="constitution-cinematic-cardback"
    style={{
      left: percent(CINEMATIC_SHUFFLE_CARD.left, REF_W),
      top: percent(CINEMATIC_SHUFFLE_CARD.top, REF_H),
      width: percent(CINEMATIC_SHUFFLE_CARD.width, REF_W),
      height: percent(CINEMATIC_SHUFFLE_CARD.height, REF_H),
      zIndex: 10 + index,
    }}
    initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.98 }}
    animate={
      reducedMotion
        ? {
            opacity: [0, 0.88, 0.78],
            x: [0, (fanX - CINEMATIC_SHUFFLE_CARD.left) * 0.72, 0],
            y: [0, (fanY - CINEMATIC_SHUFFLE_CARD.top) * 0.72, 0],
            rotate: [0, fanRotate * 0.38, index * 1.4],
            scale: [0.98, 1, 0.98],
          }
        : {
            opacity: [0, 1, 1, 1, 0.8],
            x: [
              0,
              fanX - CINEMATIC_SHUFFLE_CARD.left,
              cutX - CINEMATIC_SHUFFLE_CARD.left,
              fanX - CINEMATIC_SHUFFLE_CARD.left,
              0,
            ],
            y: [
              0,
              fanY - CINEMATIC_SHUFFLE_CARD.top,
              cutY - CINEMATIC_SHUFFLE_CARD.top,
              fanY - CINEMATIC_SHUFFLE_CARD.top,
              0,
            ],
            rotate: [0, fanRotate, cutRotate, fanRotate * 0.55, index * 1.2],
            scale: [0.96, 1.04, 1.08, 1.02, 0.98],
          }
    }
    transition={
      reducedMotion
        ? { duration: 1.35, delay: delay * 0.45, times: [0, 0.55, 1], ease: EASE_IN_OUT }
        : { duration: 2.2, delay, times: [0, 0.24, 0.54, 0.78, 1], ease: EASE_IN_OUT }
    }
  >
    <AssetImage src={`${ASSET_BASE}/deck_icon.png`} className="constitution-cinematic-cardback__image" />
  </motion.div>
);

const DealtPreviewCard: React.FC<{
  option: ConstitutionOption;
  index: number;
  reducedMotion: boolean;
}> = ({ option, index, reducedMotion }) => {
  const slot = DEAL_SLOTS[index];
  const arc = DEAL_ARCS[index];
  const endX = slot.x - CINEMATIC_PREVIEW_START.left;
  const endY = slot.y - CINEMATIC_PREVIEW_START.top;

  return (
    <motion.div
      className="constitution-cinematic-preview"
      style={{
        left: percent(CINEMATIC_PREVIEW_START.left, REF_W),
        top: percent(CINEMATIC_PREVIEW_START.top, REF_H),
        width: percent(CINEMATIC_PREVIEW_START.width, REF_W),
        height: percent(CINEMATIC_PREVIEW_START.height, REF_H),
        zIndex: 30 + index,
      }}
      initial={{ opacity: 0, x: 0, y: 0, rotateY: -180, rotate: -8, scale: 0.42 }}
      animate={
        reducedMotion
          ? {
              opacity: [0, 0.55, 0.96],
              x: [0, arc.x - CINEMATIC_PREVIEW_START.left, endX],
              y: [0, arc.y - CINEMATIC_PREVIEW_START.top + 44, endY],
              rotateY: [-20, -8, 0],
              rotate: [-3, arc.rotate * 0.45, 0],
              scale: [0.58, 0.78, 1],
            }
          : {
              opacity: [0, 0.24, 1, 1, 1],
              x: [0, arc.x - CINEMATIC_PREVIEW_START.left, endX, endX, endX],
              y: [0, arc.y - CINEMATIC_PREVIEW_START.top, endY, endY, endY],
              rotateY: [-180, -112, 0, 0, 0],
              rotate: [-8, arc.rotate, index === 0 ? -2 : index === 2 ? 2 : 0, 0, 0],
              scale: [0.42, 0.68, 1, 1, 1],
            }
      }
      transition={
        reducedMotion
          ? { duration: 1.44, delay: 0.48 + index * 0.1, times: [0, 0.42, 1], ease: EASE_OUT }
          : { duration: 1.9, delay: 0.48 + index * 0.1, times: [0, 0.24, 0.5, 0.66, 1], ease: EASE_OUT }
      }
    >
      <div className="constitution-cinematic-preview__surface">
        <img src={resolveAssetUrl(option.image)} alt="" aria-hidden="true" className="constitution-cinematic-preview__art" />
        <div className="constitution-cinematic-preview__label">{option.title}</div>
      </div>
    </motion.div>
  );
};

const CinematicStage: React.FC<{
  options: ConstitutionOption[];
  onSkip: () => void;
}> = ({ options, onSkip }) => {
  const reducedMotion = Boolean(useReducedMotion());
  const previewOptions = options.slice(0, PAGE_SIZE);

  return (
    <CanvasShell>
      <button type="button" className="constitution-cinematic__skip" onClick={onSkip}>
        跳过
      </button>
      <AssetImage
        src={`${ASSET_BASE}/deck_icon.png`}
        className="constitution-cinematic__source-deck"
        style={{
          left: percent(CINEMATIC_SOURCE_DECK.left, REF_W),
          top: percent(CINEMATIC_SOURCE_DECK.top, REF_H),
          width: percent(CINEMATIC_SOURCE_DECK.width, REF_W),
          height: percent(CINEMATIC_SOURCE_DECK.height, REF_H),
          filter:
            'drop-shadow(0 28px 46px rgba(0, 0, 0, 0.56)) drop-shadow(0 0 24px rgba(224, 184, 96, 0.16))',
        }}
      />
      <div className="constitution-cinematic__copy">
        <div className="constitution-cinematic__kicker">体质择定</div>
        <h2 className="constitution-cinematic__title">切牌起局</h2>
        <p className="constitution-cinematic__subtitle">洗牌、切牌、发牌，择定这一轮巡诊的起手方向。</p>
      </div>

      {CARD_BACKS.map((card, index) => (
        <ShuffleBackCard key={index} index={index} reducedMotion={reducedMotion} {...card} />
      ))}

      {previewOptions.map((option, index) => (
        <DealtPreviewCard key={option.id} option={option} index={index} reducedMotion={reducedMotion} />
      ))}
    </CanvasShell>
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
      className="constitution-flow"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
    >
      <AnimatePresence mode="wait">
        {stage === 'cinematic' ? (
          <motion.div
            key="cinematic"
            className="constitution-flow__stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18, ease: EASE_IN_OUT } }}
          >
            <CinematicStage options={options} onSkip={onSkip} />
          </motion.div>
        ) : (
          <motion.div
            key="select"
            className="constitution-flow__stage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
          >
            <SelectStage options={options} page={page} setPage={setPage} onClose={onClose} onSelect={onSelect} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
