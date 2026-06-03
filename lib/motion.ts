import type { Transition, Variants } from "framer-motion";

/** Soft spring used everywhere (§2: stiffness ~120, damping ~18). */
export const spring: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.9,
};

/** Gentler spring for large/heavy elements (covers, sheets). */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 90,
  damping: 17,
};

/** Editorial cubic-bezier for duration-based tweens. */
export const easeSoft: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Page transition: gentle cross-fade + 8px rise. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: easeSoft } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.24, ease: easeSoft } },
};

/** Staggered fade-up for lists (60–80ms stagger). */
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: spring },
};
