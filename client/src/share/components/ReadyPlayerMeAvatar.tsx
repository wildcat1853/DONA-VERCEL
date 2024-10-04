'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';

interface ReadyPlayerMeAvatarProps {
  avatarUrl: string;
  width?: string;
  height?: string;
}

const Model = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} position={[0, -1.5, 0]} scale={[1, 1, 1]} />;
};

const ReadyPlayerMeAvatar: React.FC<ReadyPlayerMeAvatarProps> = ({ 
  avatarUrl, 
  width = '100%', 
  height = '100%' 
}) => {
  return (
    <div style={{ width, height }}>
      <Canvas camera={{ position: [0, 0, 1.7], fov: 20 }}>
        <ambientLight intensity={3} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <Model url={avatarUrl} />
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          minPolarAngle={Math.PI/2} 
          maxPolarAngle={Math.PI/2}
          minAzimuthAngle={-Math.PI/4}
          maxAzimuthAngle={Math.PI/4}
        />
      </Canvas>
    </div>
  );
};

export default ReadyPlayerMeAvatar;
