export const spring = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

export const gentleBounce = {
  type: 'spring',
  stiffness: 200,
  damping: 15,
};

export const snappy = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
};

export const termVariants = {
  idle: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.12,
    y: -3,
  },
  drag: {
    scale: 1.2,
    zIndex: 50,
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.3 },
  },
};

export const shakeAnimation = {
  x: [0, -14, 14, -10, 10, -5, 5, 0],
  transition: { duration: 0.5 },
};

export const signFlipAnimation = {
  scale: [1, 1.6, 1],
  rotate: [0, 180, 360],
  transition: { duration: 0.45, ease: 'easeOut' },
};

export const successPop = {
  scale: [1, 1.3, 1],
  transition: { duration: 0.4, ease: 'easeOut' },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.35, ease: 'easeOut' },
};

export const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

export const cardVariants = {
  initial: { opacity: 0, y: 40, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  hover: {
    y: -6,
    scale: 1.03,
    boxShadow: '0 12px 40px rgba(80, 60, 120, 0.2)',
  },
  tap: { scale: 0.97 },
};
