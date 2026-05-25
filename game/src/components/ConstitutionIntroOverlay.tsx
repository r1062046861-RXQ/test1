import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Constitution } from '../types';
import { cn } from '../utils/cn';
import { resolveAssetUrl } from '../utils/assets';

export const CONSTITUTION_CINEMATIC_MS = 3600;
export const CONSTITUTION_REDUCED_MOTION_MS = 3400;

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

const DEAL_SLOTS = [
  { x: 584, y: 626 },
  { x: 978, y: 626 },
  { x: 1375, y: 626 },
] as const;

const CARD_BACKS = [
  { x: 188, y: 141, rotate: -8, delay: 0.28 },
  { x: 198, y: 136, rotate: -4, delay: 0.36 },
  { x: 208, y: 132, rotate: 0, delay: 0.44 },
  { x: 218, y: 136, rotate: 4, delay: 0.52 },
  { x: 228, y: 141, rotate: 8, delay: 0.6 },
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
}> = ({ src, className, alt = '' }) => (
  <img src={resolveAssetUrl(src)} alt={alt} aria-hidden={alt ? undefined : true} className={className} draggable={false} />
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
  x: number;
  y: number;
  rotate: number;
  delay: number;
  reducedMotion: boolean;
}> = ({ index, x, y, rotate, delay, reducedMotion }) => (
  <motion.div
    className="constitution-cinematic-cardback"
    style={{
      left: percent(198, REF_W),
      top: percent(124, REF_H),
      width: percent(180, REF_W),
      height: percent(243, REF_H),
      zIndex: 10 + index,
    }}
    initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.98 }}
    animate={
      reducedMotion
        ? {
            opacity: [0, 0.88, 0.78],
            x: [0, x - 198, 0],
            y: [0, y - 124, 0],
            rotate: [0, rotate * 0.55, index * 1.5],
            scale: [0.98, 1, 0.98],
          }
        : {
            opacity: [0, 1, 1, 1, 0.78],
            x: [0, x - 198, 492 + index * 24, x - 198, 0],
            y: [0, y - 124, 274 + Math.sin(index) * 30, y - 124, 0],
            rotate: [0, rotate, 18 - index * 9, rotate, index * 1.5],
            scale: [0.96, 1, 1.02, 1, 0.98],
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
}> = ({ option, index, reducedMotion }) => (
  <motion.div
    className="constitution-cinematic-preview"
    style={{
      left: percent(200, REF_W),
      top: percent(126, REF_H),
      width: percent(220, REF_W),
      height: percent(296, REF_H),
      zIndex: 30 + index,
    }}
    initial={{ opacity: 0, x: 0, y: 0, rotateY: -180, rotate: -8, scale: 0.68 }}
    animate={
      reducedMotion
        ? {
            opacity: [0, 0.5, 0.92],
            x: [0, 116 + index * 18, DEAL_SLOTS[index].x - 200],
            y: [0, 152 + index * 10, DEAL_SLOTS[index].y - 126],
            rotateY: [-18, -8, 0],
            rotate: [-3, index === 0 ? -4 : index === 2 ? 4 : 0, 0],
            scale: [0.82, 0.9, 1],
          }
        : {
            opacity: [0, 0.18, 1, 1, 1],
            x: [0, 118 + index * 18, DEAL_SLOTS[index].x - 200, DEAL_SLOTS[index].x - 200, DEAL_SLOTS[index].x - 200],
            y: [0, 134 + index * 10, DEAL_SLOTS[index].y - 126, DEAL_SLOTS[index].y - 126, DEAL_SLOTS[index].y - 126],
            rotateY: [-180, -112, 0, 0, 0],
            rotate: [-8, index === 0 ? -11 : index === 2 ? 11 : 0, index === 0 ? -2 : index === 2 ? 2 : 0, 0, 0],
            scale: [0.68, 0.82, 1, 1, 1],
          }
    }
    transition={
      reducedMotion
        ? { duration: 1.45, delay: 0.52 + index * 0.14, times: [0, 0.38, 1], ease: EASE_OUT }
        : { duration: 2.45, delay: 0.68 + index * 0.16, times: [0, 0.2, 0.42, 0.78, 1], ease: EASE_OUT }
    }
  >
    <div className="constitution-cinematic-preview__surface">
      <img src={resolveAssetUrl(option.image)} alt="" aria-hidden="true" className="constitution-cinematic-preview__art" />
      <div className="constitution-cinematic-preview__label">{option.title}</div>
    </div>
  </motion.div>
);

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
      <AssetImage src={`${ASSET_BASE}/deck_icon.png`} className="constitution-cinematic__source-deck" />
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
