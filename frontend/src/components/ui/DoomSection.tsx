'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export function DoomSection({
  children,
  className = '',
  intensity = 1,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.92', 'end 0.08'],
  });

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const y = useTransform(scrollYProgress, [0, 0.5, 1], [26 * intensity, 0, -26 * intensity]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.985, 1, 0.985]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [4 * intensity, 0, -4 * intensity]);

  return (
    <motion.section
      ref={ref}
      className={className}
      style={
        reduceMotion
          ? undefined
          : {
              y,
              scale,
              rotateX,
              transformPerspective: 1200,
              transformStyle: 'preserve-3d',
            }
      }
    >
      {children}
    </motion.section>
  );
}

