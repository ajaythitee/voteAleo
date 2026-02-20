'use client';

import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useThemeStore } from '@/stores/themeStore';
import * as THREE from 'three';
import { Stars, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';

// Particle System
function ParticleField({ count = 200, isDark = true }: { count?: number; isDark?: boolean }) {
  const meshRef = useRef<THREE.Points>(null);
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 20;
      positions[i3 + 1] = (Math.random() - 0.5) * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * 20;

      sizes[i] = Math.random() * 0.008 + 0.004;
    }

    return { positions, sizes };
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
        <bufferAttribute attach="attributes-position" count={count} array={particles.positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={count} array={particles.sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color={isDark ? '#E8EEFF' : '#334155'}
        transparent
        opacity={isDark ? 0.35 : 0.22}
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
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className={`w-full h-full overflow-hidden pointer-events-none ${className}`} style={{ opacity: isDark ? 0.7 : 0.6 }}>
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
          count={isDark ? 3000 : 2400} 
          factor={3.2} 
          saturation={0}
          fade
          speed={0.15}
        />

        {/* Particle Field */}
        <ParticleField count={isDark ? 420 : 320} isDark={isDark} />

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
