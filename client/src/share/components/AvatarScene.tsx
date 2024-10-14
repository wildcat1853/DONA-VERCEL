// components/AvatarScene.tsx

import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import ReadyPlayerMeAvatar from './ReadyPlayerMeAvatar';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

interface AvatarSceneProps {
  avatarUrl: string;
  audioBuffer?: AudioBuffer | null;
}

const AvatarScene: React.FC<AvatarSceneProps> = ({ avatarUrl, audioBuffer }) => {
  const controlsRef = useRef<any>(null);

  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
    >
      <PerspectiveCamera makeDefault position={[0.9, 0, 0.9]} fov={40} />
      {/* Lights */}
      <ambientLight intensity={1} />
      <directionalLight position={[0, 2, 2]} intensity={1.8} />
      {/* Controls */}
      <OrbitControls
        ref={controlsRef}
        target={[0, 0.5, 0]}  // Adjusted target to look lower
        enableZoom={true}
      />
      {/* Avatar */}
      <React.Suspense fallback={null}>
        <ReadyPlayerMeAvatar 
          avatarUrl={avatarUrl} 
          audioBuffer={audioBuffer} 
          position={[0, -0.9, 0]}  // Move the avatar down
          isPlaying={true}  // Added isPlaying prop
        />
      </React.Suspense>
    </Canvas>
  );
};

export default AvatarScene;
