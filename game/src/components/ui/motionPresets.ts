import type { Transition, Variants } from 'framer-motion';

const springFast: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 24,
};

const springSettle: Transition = {
  type: 'spring',
  stiffness: 180,
  damping: 22,
};

export const pageRevealVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
};

export const panelSettleVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

export const tabSwitchVariants: Variants = {
  enter: { opacity: 0, x: 10, y: 6 },
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    x: -10,
    y: -4,
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
  },
};

export const detailRevealVariants: Variants = {
  enter: { opacity: 0, y: 18, scale: 0.985 },
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.992,
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
  },
};

export const handHoverTransition = springFast;
export const handSettleTransition = springSettle;

export const cardReleaseTransition: Transition = {
  duration: 0.42,
  ease: [0.16, 1, 0.3, 1],
};

export const turnBannerVariants: Variants = {
  hidden: { opacity: 0, y: -12, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 1.02,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};
