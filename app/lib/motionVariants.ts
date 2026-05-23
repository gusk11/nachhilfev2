'use client';

import React from 'react';
import { Variants } from 'framer-motion';

// Timing constants
export const TIMING = {
  FAST: 0.2,      // 200ms - buttons, small interactions
  NORMAL: 0.25,   // 250ms - modals, transitions
  SLOW: 0.3,      // 300ms - accordions, complex animations
} as const;

// Spring configs (for playful entrances)
export const SPRING = {
  SNAPPY: { type: 'spring' as const, stiffness: 400, damping: 40 },
  SMOOTH: { type: 'spring' as const, stiffness: 300, damping: 35 },
} as const;

// Easing curves
export const EASE = {
  INOUT: 'easeInOut' as const,
  OUT: 'easeOut' as const,
  IN: 'easeIn' as const,
} as const;

// Modal animations
export const modalVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: TIMING.FAST },
  },
  exit: {
    opacity: 0,
    transition: { duration: TIMING.FAST },
  },
};

export const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRING.SNAPPY,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: TIMING.FAST },
  },
};

// Fade in / scale animations
export const fadeInScaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: TIMING.NORMAL, ease: EASE.OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: TIMING.FAST },
  },
};

// Fade in / slide up animations
export const fadeInSlideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: TIMING.NORMAL, ease: EASE.OUT },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: TIMING.FAST },
  },
};

// Page transition animations (enter/exit)
export const pageEnterVariants: Variants = {
  hidden: { opacity: 0.9, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: TIMING.NORMAL, ease: EASE.INOUT },
  },
};

export const pageExitVariants: Variants = {
  visible: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    transition: { duration: TIMING.FAST - 0.05 }, // 150ms
  },
};

// Staggered list container (for cards, rows)
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

// Staggered item (child of container)
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: TIMING.NORMAL, ease: EASE.OUT },
  },
};

// Accordion animations
export const accordionContentVariants: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: { duration: TIMING.SLOW, ease: EASE.INOUT },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: TIMING.SLOW - 0.05, ease: EASE.INOUT },
  },
};

// Rotate animation (for accordion arrows)
export const rotateArrowVariants: Variants = {
  closed: { rotate: 0 },
  open: { rotate: 180 },
};

// Button animations (whileHover, whileTap)
export const buttonHoverVariants = {
  scale: 1.03,
  transition: { duration: TIMING.FAST, ease: EASE.OUT },
};

export const buttonTapVariants = {
  scale: 0.98,
  transition: { duration: 0.1 },
};

// Form input focus animations
export const inputFocusVariants = {
  scale: 1,
  transition: { duration: TIMING.FAST, ease: EASE.OUT },
};

// Label float animation
export const labelFloatVariants: Variants = {
  unfocused: {
    y: 0,
    scale: 1,
    color: '#6B7280',
  },
  focused: {
    y: -24,
    scale: 0.85,
    color: '#032e65',
    transition: { duration: TIMING.FAST, ease: EASE.OUT },
  },
};

// Focus glow animation for inputs
export const focusGlowVariants: Variants = {
  unfocused: {
    boxShadow: '0 0 0 0 rgba(3, 46, 101, 0)',
  },
  focused: {
    boxShadow: '0 0 0 3px rgba(3, 46, 101, 0.2)',
    transition: { duration: TIMING.FAST },
  },
};

// Hover card animation
export const hoverCardVariants = {
  scale: 1.02,
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
  transition: { duration: TIMING.FAST, ease: EASE.OUT },
};

// Hover file card animation (more pronounced)
export const hoverFileCardVariants = {
  scale: 1.05,
  boxShadow: '0 15px 35px rgba(0, 0, 0, 0.15)',
  transition: { duration: TIMING.FAST, ease: EASE.OUT },
};

// Helper hook to detect if user prefers reduced motion
export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// Disable animations if user prefers reduced motion
export const getVariant = (
  variant: Variants,
  prefersReducedMotion: boolean
): Variants => {
  // Return variant as-is; animations will be disabled by browser/OS
  return variant;
};

