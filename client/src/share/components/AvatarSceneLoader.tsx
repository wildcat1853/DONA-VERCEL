'use client';
import dynamic from 'next/dynamic';

const AvatarScene = dynamic(
  () => import('./AvatarScene').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => <div>Loading 3D scene...</div>
  }
);

export default AvatarScene; 