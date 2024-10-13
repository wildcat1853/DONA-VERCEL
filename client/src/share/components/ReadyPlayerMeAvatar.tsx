// components/ReadyPlayerMeAvatar.tsx

import React, { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, GroupProps } from '@react-three/fiber';
import * as THREE from 'three';

interface ReadyPlayerMeAvatarProps extends GroupProps {
  avatarUrl: string;
  audioBuffer?: AudioBuffer | null;
}

const ReadyPlayerMeAvatar: React.FC<ReadyPlayerMeAvatarProps> = ({
  avatarUrl,
  audioBuffer,
  ...props
}) => {
  const { scene } = useGLTF(avatarUrl) as any;
  const avatarMeshRef = useRef<THREE.SkinnedMesh | null>(null); // Updated type
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array>();

  useEffect(() => {
    if (scene) {
      scene.traverse((child: any) => {
        if (child.isSkinnedMesh && child.name === 'Wolf3D_Head') {
          avatarMeshRef.current = child;
          console.log('Avatar mesh found:', child);
          console.log('Available morph targets:', child.morphTargetDictionary);
        }
      });
    }
  }, [scene]);

  useEffect(() => {
    if (audioBuffer) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      source.connect(analyser);
      analyser.connect(audioContext.destination);
      source.start();

      return () => {
        source.stop();
        source.disconnect();
        analyser.disconnect();
        audioContext.close();
      };
    }
  }, [audioBuffer]);

  useFrame(() => {
    if (
      analyserRef.current &&
      dataArrayRef.current &&
      avatarMeshRef.current &&
      avatarMeshRef.current.morphTargetDictionary &&
      avatarMeshRef.current.morphTargetInfluences
    ) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i];
      }
      const average = sum / dataArrayRef.current.length;
      const morphValue = (average / 256) * 1.5; // Adjust scaling as needed

      // Use the appropriate morph target name
      const morphTargetName = 'jawOpen'; // Adjust based on your model's morph targets
      const index = avatarMeshRef.current.morphTargetDictionary[morphTargetName];
      if (index !== undefined) {
        avatarMeshRef.current.morphTargetInfluences[index] = morphValue;
      } else {
        console.warn(`Morph target "${morphTargetName}" not found`);
      }
    }
  });

  return <primitive object={scene} dispose={null} {...props} />;
};

export default ReadyPlayerMeAvatar;
