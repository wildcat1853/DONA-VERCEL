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
  const avatarMeshRef = useRef<THREE.SkinnedMesh | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array>();

  // For smoothing audio amplitude
  const smoothingFactor = 0.1; // Adjust between 0 (no smoothing) and 1 (maximum smoothing)
  const smoothedAmplitudeRef = useRef(0);

  // For interpolating morph target values
  const previousMorphValuesRef = useRef<{ [key: string]: number }>({});

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
      const currentAmplitude = average / 256;

      // Apply exponential smoothing
      smoothedAmplitudeRef.current =
        smoothingFactor * smoothedAmplitudeRef.current +
        (1 - smoothingFactor) * currentAmplitude;

      const morphValue = smoothedAmplitudeRef.current * 1.5; // Adjust scaling as needed

      // Mouth movement morph targets
      const mouthMorphTargets = [
        'jawOpen',
        'mouthFunnel',
        'mouthPucker',
        'mouthShrugUpper',
        'mouthShrugLower',
      ];

      mouthMorphTargets.forEach((morphTargetName) => {
        const index = avatarMeshRef.current!.morphTargetDictionary![morphTargetName];
        if (index !== undefined) {
          const previousValue = previousMorphValuesRef.current[morphTargetName] || 0;
          const newValue = THREE.MathUtils.lerp(previousValue, morphValue, 0.4);
          const clampedValue = THREE.MathUtils.clamp(newValue, 0, 1);
          avatarMeshRef.current!.morphTargetInfluences![index] = clampedValue;
          previousMorphValuesRef.current[morphTargetName] = clampedValue;
        } else {
          console.warn(`Morph target "${morphTargetName}" not found`);
        }
      });

      // Lip movement morph targets
      const lipMorphTargets = [
        'mouthUpperUpLeft',
        'mouthUpperUpRight',
        'mouthLowerDownLeft',
        'mouthLowerDownRight',
      ];

      lipMorphTargets.forEach((morphTargetName) => {
        const index = avatarMeshRef.current!.morphTargetDictionary![morphTargetName];
        if (index !== undefined) {
          const previousValue = previousMorphValuesRef.current[morphTargetName] || 0;
          const targetValue = morphValue * 0.5;
          const newValue = THREE.MathUtils.lerp(previousValue, targetValue, 0.15);
          const clampedValue = THREE.MathUtils.clamp(newValue, 0, 0.5);
          avatarMeshRef.current!.morphTargetInfluences![index] = clampedValue;
          previousMorphValuesRef.current[morphTargetName] = clampedValue;
        } else {
          console.warn(`Morph target "${morphTargetName}" not found`);
        }
      });

      // Cheek movements
      const cheekMorphTargets = ['cheekPuff', 'cheekSquintLeft', 'cheekSquintRight'];

      cheekMorphTargets.forEach((morphTargetName) => {
        const index = avatarMeshRef.current!.morphTargetDictionary![morphTargetName];
        if (index !== undefined) {
          const previousValue = previousMorphValuesRef.current[morphTargetName] || 0;
          const targetValue = morphValue * 0.2; // Adjust influence for subtle movement
          const newValue = THREE.MathUtils.lerp(previousValue, targetValue, 0.2);
          const clampedValue = THREE.MathUtils.clamp(newValue, 0, 0.3);
          avatarMeshRef.current!.morphTargetInfluences![index] = clampedValue;
          previousMorphValuesRef.current[morphTargetName] = clampedValue;
        } else {
          console.warn(`Morph target "${morphTargetName}" not found`);
        }
      });

      // Eye movements (including blinking)
      const eyeMorphTargets = ['eyeBlinkLeft', 'eyeBlinkRight', 'eyeSquintLeft', 'eyeSquintRight'];

      eyeMorphTargets.forEach((morphTargetName) => {
        const index = avatarMeshRef.current!.morphTargetDictionary![morphTargetName];
        if (index !== undefined) {
          const time = performance.now() / 1000;
          let targetValue;

          if (morphTargetName.includes('Blink')) {
            // Blinking animation
            const blinkFrequency = 4; // Blink every 4 seconds
            const blinkDuration = 0.1; // Blink lasts 0.1 seconds
            const blinkTime = time % blinkFrequency;
            targetValue = blinkTime < blinkDuration ? 1 : 0;
          } else {
            // Squinting animation (you can adjust this as needed)
            targetValue = 0.1 + 0.05 * Math.sin(time * 3);
          }

          const previousValue = previousMorphValuesRef.current[morphTargetName] || 0;
          const newValue = THREE.MathUtils.lerp(previousValue, targetValue, 0.1);
          avatarMeshRef.current!.morphTargetInfluences![index] = newValue;
          previousMorphValuesRef.current[morphTargetName] = newValue;
        } else {
          console.warn(`Morph target "${morphTargetName}" not found`);
        }
      });

      // Eyebrow movements
      const eyebrowMorphTargets = [
        'browDownLeft',
        'browDownRight',
        'browInnerUp',
        'browOuterUpLeft',
        'browOuterUpRight',
      ];

      eyebrowMorphTargets.forEach((morphTargetName) => {
        const index = avatarMeshRef.current!.morphTargetDictionary![morphTargetName];
        if (index !== undefined) {
          const previousValue = previousMorphValuesRef.current[morphTargetName] || 0;
          const time = performance.now() / 1000;
          const audioInfluence = smoothedAmplitudeRef.current * 0.2; // Adjust influence
          const timeInfluence = 0.1 * Math.sin(time * 2); // Adjust frequency
          const targetValue = audioInfluence + timeInfluence;
          const newValue = THREE.MathUtils.lerp(previousValue, targetValue, 0.1);
          const clampedValue = THREE.MathUtils.clamp(newValue, 0, 0.5);
          avatarMeshRef.current!.morphTargetInfluences![index] = clampedValue;
          previousMorphValuesRef.current[morphTargetName] = clampedValue;
        } else {
          console.warn(`Morph target "${morphTargetName}" not found`);
        }
      });

      // Optionally, reset other morph targets to zero
      const allMorphTargets = Object.keys(avatarMeshRef.current.morphTargetDictionary);
      allMorphTargets.forEach((morphTargetName) => {
        if (
          !mouthMorphTargets.includes(morphTargetName) &&
          !lipMorphTargets.includes(morphTargetName) &&
          !cheekMorphTargets.includes(morphTargetName) &&
          !eyeMorphTargets.includes(morphTargetName) &&
          !eyebrowMorphTargets.includes(morphTargetName)
        ) {
          const index = avatarMeshRef.current!.morphTargetDictionary![morphTargetName];
          if (index !== undefined) {
            avatarMeshRef.current!.morphTargetInfluences![index] = 0;
          }
        }
      });

      // console.log('Morph target values:', avatarMeshRef.current.morphTargetInfluences);
    }
  });

  return <primitive object={scene} dispose={null} {...props} />;
};

export default ReadyPlayerMeAvatar;
