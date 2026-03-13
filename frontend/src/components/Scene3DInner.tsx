'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Stars, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';

// Particle System
function ParticleField({
  count = 200,
  isDark = true,
  size = 0.02,
  opacity = 0.22,
}: {
  count?: number;
  isDark?: boolean;
  size?: number;
  opacity?: number;
}) {
  const meshRef = useRef<THREE.Points>(null);
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const palette = isDark
      ? [new THREE.Color('#E8EEFF'), new THREE.Color('#A5B4FC'), new THREE.Color('#6EE7B7')]
      : [new THREE.Color('#0F172A'), new THREE.Color('#334155'), new THREE.Color('#4F46E5')];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 20;
      positions[i3 + 1] = (Math.random() - 0.5) * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * 20;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }

    return { positions, colors };
  }, [count, isDark]);

  useFrame((state) => {
    if (meshRef.current) {
      // ultra subtle drift only (no obvious spinning blobs)
      meshRef.current.rotation.y += 0.0001;
      meshRef.current.rotation.x += 0.00005;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[particles.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        vertexColors
        transparent
        opacity={opacity}
        sizeAttenuation
      />
    </points>
  );
}

// Camera Controller with smooth movement
function CameraController() {
  const { camera } = useThree();
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0, z: 5.5 });

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current = { x, y };
    };
    window.addEventListener('mousemove', onMouse);
    return () => window.removeEventListener('mousemove', onMouse);
  }, []);

  useFrame(() => {
    targetRef.current.x += (mouseRef.current.x * 0.3 - targetRef.current.x) * 0.05;
    targetRef.current.y += (mouseRef.current.y * 0.3 - targetRef.current.y) * 0.05;
    
    camera.position.x += (targetRef.current.x - camera.position.x) * 0.05;
    camera.position.y += (targetRef.current.y - camera.position.y) * 0.05;
    camera.position.z = targetRef.current.z;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export function Scene3DInner({ className = '' }: { variant?: 'hero' | 'background'; className?: string }) {
  const isDark = true;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className={`w-full h-full overflow-hidden pointer-events-none ${className}`} style={{ opacity: 0.7 }}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 50 }}
        dpr={[1, 2]}
        gl={{ 
          alpha: true, 
          antialias: true, 
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5.5]} fov={50} />
        <CameraController />
        
        {/* Lighting */}
        <ambientLight intensity={isDark ? 0.25 : 0.5} />
        <pointLight 
          position={[4, 3, 4]} 
          intensity={isDark ? 0.8 : 0.6} 
          color={isDark ? '#6366f1' : '#818cf8'}
          castShadow
        />
        <pointLight 
          position={[-3, -2, 3]} 
          intensity={isDark ? 0.4 : 0.3} 
          color={isDark ? '#8b5cf6' : '#c4b5fd'}
        />
        <pointLight 
          position={[0, -4, 2]} 
          intensity={isDark ? 0.3 : 0.25} 
          color={isDark ? '#10b981' : '#34d399'}
        />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={isDark ? 0.2 : 0.15}
          color={isDark ? '#ffffff' : '#f8fafc'}
        />

        {/* Stars background */}
        <Stars 
          radius={100} 
          depth={50} 
          count={isMobile ? 1800 : 3000}
          factor={3.2} 
          saturation={0}
          fade
          speed={0.15}
        />

        {/* Particle Field */}
        <ParticleField count={isMobile ? 160 : 220} isDark={isDark} size={0.03} opacity={0.18} />
        <ParticleField count={isMobile ? 360 : 520} isDark={isDark} size={0.012} opacity={0.26} />

        {/* Post-processing Effects */}
        <EffectComposer>
          <Bloom 
            intensity={isDark ? 0.18 : 0.08} 
            luminanceThreshold={0.98} 
            luminanceSmoothing={0.9}
            height={300}
          />
          <ChromaticAberration offset={[0.00035, 0.00025]} />
          <Vignette eskil={false} offset={0.12} darkness={isDark ? 0.55 : 0.22} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
