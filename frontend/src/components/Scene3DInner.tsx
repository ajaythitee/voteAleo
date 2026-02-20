'use client';

import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useThemeStore } from '@/stores/themeStore';
import * as THREE from 'three';

const ICOSA_R = 1.2;
function buildIcosa() {
  const g = new THREE.IcosahedronGeometry(ICOSA_R, 0);
  const pos = g.attributes.position.array as Float32Array;
  const vertices: [number, number, number][] = [];
  for (let i = 0; i < pos.length; i += 3) {
    vertices.push([pos[i], pos[i + 1], pos[i + 2]]);
  }
  const edges = new Set<string>();
  const idx = g.index?.array;
  if (idx) {
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i];
      const b = idx[i + 1];
      const c = idx[i + 2];
      const add = (x: number, y: number) => edges.add(`${Math.min(x, y)}-${Math.max(x, y)}`);
      add(a, b);
      add(b, c);
      add(a, c);
    }
  }
  return { vertices, edges };
}
const icosa = buildIcosa();

function NetworkSphere() {
  const groupRef = useRef<THREE.Group>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const mouseTarget = useRef({ x: 0, y: 0 });
  const scrollRef = useRef(0);
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const nodeColor = isDark ? '#6366f1' : '#818cf8';
  const edgeColor = isDark ? '#4f46e5' : '#a5b4fc';

  useFrame((_, delta) => {
    if (groupRef.current) {
      mouseRef.current.x += (mouseTarget.current.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseTarget.current.y - mouseRef.current.y) * 0.05;
      scrollRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
      groupRef.current.rotation.y += delta * 0.12 + mouseRef.current.x * 0.02;
      groupRef.current.rotation.x = mouseRef.current.y * 0.15 + scrollRef.current * 0.0003;
      groupRef.current.position.y = scrollRef.current * 0.015;
    }
  });

  const linePositions = (() => {
    const arr: number[] = [];
    icosa.edges.forEach((key) => {
      const [a, b] = key.split('-').map(Number);
      const va = icosa.vertices[a];
      const vb = icosa.vertices[b];
      if (va && vb) arr.push(...va, ...vb);
    });
    return new Float32Array(arr);
  })();

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseTarget.current = { x: x * 0.4, y: y * 0.4 };
    };
    window.addEventListener('mousemove', onMouse);
    return () => window.removeEventListener('mousemove', onMouse);
  }, []);

  return (
    <group ref={groupRef}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={linePositions.length / 3} array={linePositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color={edgeColor} transparent opacity={isDark ? 0.4 : 0.5} />
      </lineSegments>
      {icosa.vertices.map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.055, 8, 6]} />
          <meshBasicMaterial color={nodeColor} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

export function Scene3DInner() {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="fixed inset-0 -z-10 w-full h-full overflow-hidden pointer-events-none" style={{ opacity: 0.85 }}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 48 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <ambientLight intensity={isDark ? 0.25 : 0.5} />
        <pointLight position={[4, 4, 4]} intensity={isDark ? 0.5 : 0.35} color={isDark ? '#6366f1' : '#a5b4fc'} />
        <pointLight position={[-3, -2, 3]} intensity={isDark ? 0.25 : 0.15} color={isDark ? '#8b5cf6' : '#c4b5fd'} />
        <NetworkSphere />
      </Canvas>
    </div>
  );
}
