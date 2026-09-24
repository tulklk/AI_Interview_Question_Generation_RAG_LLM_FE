import type { Transition, Variants } from "framer-motion";

/** Corporate Coach motion — short, easeOut, no bounce. */
export const COACH_EASE = [0.2, 0, 0, 1] as const;
export const COACH_DURATION = 0.32;
export const COACH_DURATION_FAST = 0.22;
export const COACH_STAGGER = 0.06;

export const coachTransition: Transition = {
  duration: COACH_DURATION,
  ease: COACH_EASE,
};

export const coachTransitionFast: Transition = {
  duration: COACH_DURATION_FAST,
  ease: COACH_EASE,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: coachTransition,
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: coachTransition,
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: COACH_STAGGER,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: coachTransition,
  },
};

export const stepContentVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: coachTransition,
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: coachTransitionFast,
  },
};

export const expandVariants: Variants = {
  collapsed: { opacity: 0, height: 0 },
  expanded: {
    opacity: 1,
    height: "auto",
    transition: { duration: COACH_DURATION, ease: COACH_EASE },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: COACH_DURATION_FAST, ease: COACH_EASE },
  },
};

export const overlayBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: COACH_EASE } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: COACH_EASE } },
};

export const overlayPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: coachTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 4,
    transition: coachTransitionFast,
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
