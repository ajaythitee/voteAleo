'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const defaultVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function RevealOnScroll({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  variants = defaultVariants,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  variants?: { hidden: object; visible: object };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
