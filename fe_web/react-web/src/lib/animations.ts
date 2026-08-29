import type { Variants, Transition } from 'framer-motion';

// Animation timing constants (150-300ms per ui-ux-pro-max guidelines)
export const ANIMATION_DURATION = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  page: 0.4,
} as const;

// Easing functions
export const EASING = {
  easeOut: [0.0, 0.0, 0.2, 1] as const,
  easeIn: [0.4, 0.0, 1, 1] as const,
  easeInOut: [0.4, 0.0, 0.2, 1] as const,
  spring: { type: 'spring' as const, stiffness: 300, damping: 30 },
  springBouncy: { type: 'spring' as const, stiffness: 400, damping: 20 },
} as const;

// Check for reduced motion preference
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Fade in animation variants
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: EASING.easeIn,
    },
  },
};

// Fade in from bottom (slide up)
export const fadeInUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: EASING.easeIn,
    },
  },
};

// Scale animation (for modals, dialogs)
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: EASING.easeIn,
    },
  },
};

// Scale from center (for modals with backdrop)
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.slow,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: EASING.easeIn,
    },
  },
};

// Stagger container variants (for lists, grids)
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

// Stagger item variants
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: EASING.easeOut,
    },
  },
};

// Slide in from right (for sidebars)
export const slideInRightVariants: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: ANIMATION_DURATION.slow,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: 50,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: EASING.easeIn,
    },
  },
};

// Slide in from left
export const slideInLeftVariants: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: ANIMATION_DURATION.slow,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: -50,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: EASING.easeIn,
    },
  },
};

// Page transition variants
export const pageTransitionVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.page,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: EASING.easeIn,
    },
  },
};

// Reduced motion variants (no animation)
export const reducedMotionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// Hover scale animation for cards
export const hoverScaleVariants = {
  rest: { scale: 1, transition: { duration: ANIMATION_DURATION.fast } },
  hover: {
    scale: 1.02,
    transition: { duration: ANIMATION_DURATION.fast, ease: EASING.easeOut },
  },
  tap: {
    scale: 0.98,
    transition: { duration: ANIMATION_DURATION.fast, ease: EASING.easeIn },
  },
};

// Button press animation
export const buttonTapVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.97 },
};

// Hover lift animation (for cards with shadow)
export const hoverLiftVariants = {
  rest: {
    y: 0,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    transition: { duration: ANIMATION_DURATION.fast },
  },
  hover: {
    y: -4,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    transition: { duration: ANIMATION_DURATION.fast, ease: EASING.easeOut },
  },
};

// Create reduced motion aware transition
export const getTransition = (customTransition?: Transition): Transition => {
  if (prefersReducedMotion()) {
    return { duration: 0 };
  }
  return customTransition || {
    duration: ANIMATION_DURATION.normal,
    ease: EASING.easeOut,
  };
};

// Reduced motion media query hook helper
export const reducedMotionTransition: Transition = {
  duration: 0,
};
