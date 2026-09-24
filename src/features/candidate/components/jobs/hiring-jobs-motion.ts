import type { Transition, Variants } from "framer-motion";

/** Corporate hiring-jobs motion — short, easeOut, no bounce. */
export const HIRING_EASE = [0.2, 0, 0, 1] as const;
export const HIRING_DURATION = 0.32;
export const HIRING_DURATION_FAST = 0.22;
export const HIRING_STAGGER = 0.05;

export const hiringTransition: Transition = {
  duration: HIRING_DURATION,
  ease: HIRING_EASE,
};

export const hiringTransitionFast: Transition = {
  duration: HIRING_DURATION_FAST,
  ease: HIRING_EASE,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: hiringTransition,
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: HIRING_STAGGER,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: hiringTransition,
  },
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: hiringTransition,
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: hiringTransitionFast,
  },
};

export const detailVariants: Variants = {
  initial: { opacity: 0, x: 10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: hiringTransition,
  },
  exit: {
    opacity: 0,
    x: -8,
    transition: hiringTransitionFast,
  },
};

/** When reduced motion is preferred, skip enter animations. */
export function motionSafe(reduced: boolean | null) {
  if (reduced) {
    return {
      initial: false as const,
      animate: "visible" as const,
      transition: { duration: 0 },
    };
  }
  return {
    initial: "hidden" as const,
    animate: "visible" as const,
  };
}
