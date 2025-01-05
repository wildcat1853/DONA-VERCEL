// components/AvatarScene.tsx

import React, { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import ReadyPlayerMeAvatar from './ReadyPlayerMeAvatar';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useAudio } from '../context/AudioContext';

interface AvatarSceneProps {
  avatarUrl: string;
}

const AvatarScene: React.FC<AvatarSceneProps> = ({ avatarUrl }) => {
  const controlsRef = useRef<any>(null);
  const { analyser, isPlaying } = useAudio();

  console.log('AvatarScene component mounted');

  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
    >
      <PerspectiveCamera 
        makeDefault 
        position={[0, 0.6, 0.88]}
        fov={54}
      />
      {/* Lights */}
      <ambientLight intensity={1} />
      <directionalLight position={[0, 2, 2]} intensity={1.8} />
      {/* Controls - all interactions disabled */}
      <OrbitControls
        ref={controlsRef}
        target={[0, 0.5, 0]}
        enableZoom={false}
        enableRotate={false}
        enablePan={false}
      />
      {/* Avatar */}
      <React.Suspense fallback={null}>
        <ReadyPlayerMeAvatar 
          avatarUrl={avatarUrl} 
          analyser={analyser}
          // position={[-0.05, -0.9, 0]}
          // rotation={[0, 0, 0]}
          isPlaying={isPlaying}
        />
      </React.Suspense>
    </Canvas>
  );
};

export default AvatarScene;
