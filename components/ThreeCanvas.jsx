'use client';

import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// ==========================================
// Internal Animated 3D Mesh Core Component
// ==========================================
function DataCoreMesh({ isScanning }) {
  const meshRef = useRef();
  const wireRef = useRef();

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    
    // Speed up rotation speed significantly if the AI is running an OCR parse
    const speedMultiplier = isScanning ? 3.5 : 1.0;

    if (meshRef.current) {
      meshRef.current.rotation.y = elapsed * 0.15 * speedMultiplier;
      meshRef.current.rotation.x = elapsed * 0.08 * speedMultiplier;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y = -elapsed * 0.25 * speedMultiplier;
      wireRef.current.rotation.z = elapsed * 0.1 * speedMultiplier;
    }
  });

  // Dynamic tactical colors mapping based on processing state
  const activeColor = isScanning ? "#10b981" : "#06b6d4"; // Emerald Green vs Cyan Glow
  const emissiveInt = isScanning ? 2.5 : 0.8;

  return (
    <group>
      {/* Central Solid low-poly core */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.6, 1]} />
        <meshPhysicalMaterial
          color={activeColor}
          emissive={activeColor}
          emissiveIntensity={emissiveInt}
          wireframe
          transparent
          opacity={0.6}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Outer Protective Orbital Wire Ring */}
      <mesh ref={wireRef}>
        <sphereGeometry args={[2.3, 16, 16]} />
        <meshBasicMaterial
          color={activeColor}
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
    </group>
  );
}

// ==========================================
// Central Canvas Exporter Wrapper
// ==========================================
export default function ThreeCanvas({ isScanning = false }) {
  const [hasMounted, setHasMounted] = useState(false);

  // Hydration safeguard lifecycle hook
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Structural placeholder to show while WebGL context compiles
  if (!hasMounted) {
    return (
      <div className="w-full h-[350px] md:h-[400px] flex items-center justify-center bg-cyber-void border border-cyber-slate/30 rounded-xl">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-cyber-cyan/20 border-t-cyber-cyan rounded-full animate-spin" />
          <span className="absolute text-xs font-mono text-cyber-cyan/60 animate-pulse">CGL</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[350px] md:h-[400px] relative bg-cyber-void/40 border border-cyber-slate/20 rounded-xl overflow-hidden backdrop-blur-sm">
      
      {/* Decorative HUD overlay lines */}
      <div className="absolute top-3 left-4 font-mono text-[10px] text-cyber-cyan/40 tracking-wider z-20 pointer-events-none select-none">
        MATRIX_SYS_V2.5 // CORE_ONLINE
      </div>
      
      {/* Interactive 3D Render Window */}
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ antialias: true }}
        className="w-full h-full z-10"
      >
        <ambientLight intensity={0.3} />
        
        {/* Dynamic positional point grids */}
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#06b6d4" />
        <pointLight position={[-10, -10, -10]} intensity={1.2} color="#10b981" />
        <pointLight position={[0, 5, -5]} intensity={0.8} color="#f43f5e" />

        <DataCoreMesh isScanning={isScanning} />

        {/* Lock controls to rotation manipulation only, preventing clipping limits */}
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>

      {/* Dynamic Context Status Tag */}
      <div className="absolute bottom-3 right-4 font-mono text-xs z-20 pointer-events-none select-none flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-cyber-emerald animate-ping' : 'bg-cyber-cyan'}`} />
        <span className={isScanning ? 'text-cyber-emerald' : 'text-cyber-cyan/70'}>
          {isScanning ? 'EXTRACTING DATA PATHS...' : 'SYSTEM_IDLE'}
        </span>
      </div>
    </div>
  );
}