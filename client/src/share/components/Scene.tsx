'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useState } from 'react';
import { useAudio } from '../context/AudioContext';
import ReadyPlayerMeAvatar from './ReadyPlayerMeAvatar';

// Dynamically import R3F components with SSR disabled
const Canvas = dynamic(() => import('@react-three/fiber').then(mod => mod.Canvas), { ssr: false });
const OrbitControls = dynamic(() => import('@react-three/drei').then(mod => mod.OrbitControls), { ssr: false });
const PerspectiveCamera = dynamic(() => import('@react-three/drei').then(mod => mod.PerspectiveCamera), { ssr: false });

interface SceneProps {
  avatarUrl: string;
}

const Scene = ({ avatarUrl }: SceneProps) => {
  const { analyser, isPlaying } = useAudio();
  const [mounted, setMounted] = useState(false);
  const [frameloop, setFrameloop] = useState('never');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="scene-container" style={{ width: '100%', height: '100%' }}>
      <Suspense fallback={null}>
        <Canvas
          frameloop={frameloop}
          gl={canvas => {
            const renderer = new WebGPURenderer({ canvas });
            renderer.xr = { addEventListener: () => {} };
            renderer.init().then(() => setFrameloop('always'));
            return renderer;
          }}
        >
          <ambientLight intensity={1} />
          <directionalLight position={[0, 2, 2]} intensity={1.8} />
          <PerspectiveCamera 
            makeDefault 
            position={[0, 0.6, 0.88]}
            fov={54}
          />
          <OrbitControls
            target={[0, 0.5, 0]}
            enableZoom={false}
            enableRotate={false}
            enablePan={false}
          />
          <mesh position={[-0.05, -0.9, 0]}>
            <ReadyPlayerMeAvatar 
              avatarUrl={avatarUrl}
              analyser={analyser}
              isPlaying={isPlaying}
            />
          </mesh>
        </Canvas>
      </Suspense>
    </div>
  );
};

export default Scene; 