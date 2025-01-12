'use client';

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense } from 'react'
import ReadyPlayerMeAvatar from './ReadyPlayerMeAvatar'
import { useAudio } from '../context/AudioContext'

interface SceneProps {
  avatarUrl: string;
}

const Scene = ({ avatarUrl }: SceneProps) => {
  const { analyser, isPlaying } = useAudio();

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Suspense fallback={null}>
        <Canvas frameloop="always">
          <OrbitControls />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <mesh>
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