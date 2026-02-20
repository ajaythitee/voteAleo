'use client';

import dynamic from 'next/dynamic';

const Scene3DInner = dynamic(() => import('./Scene3DInner').then((m) => m.Scene3DInner), {
  ssr: false,
  loading: () => null,
});

export function Scene3D(props: { variant?: 'hero' | 'background'; className?: string }) {
  return <Scene3DInner {...props} />;
}
