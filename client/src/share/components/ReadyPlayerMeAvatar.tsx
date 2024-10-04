'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';

const Model = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
};

const ReadyPlayerMeAvatar: React.FC = () => {
  const modelUrl = 'https://models.readyplayer.me/66fff8ab8fcc54d1d062d962.glb';

  return (
    <div style={{ width: '100%', height: '400px', background: 'lightblue' }}>
      <Canvas camera={{ position: [0, 1.5, 3] }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <Suspense fallback={null}>
          <Model url={modelUrl} />
        </Suspense>
        <OrbitControls />
      </Canvas>
    </div>
  );
};

export default ReadyPlayerMeAvatar;
