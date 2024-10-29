// components/ReadyPlayerMeAvatar.tsx

import React, { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, GroupProps } from '@react-three/fiber';
import * as THREE from 'three';

interface ReadyPlayerMeAvatarProps extends GroupProps {
  avatarUrl: string;
  analyser?: AnalyserNode | null;
  isPlaying: boolean;
}

const ReadyPlayerMeAvatar: React.FC<ReadyPlayerMeAvatarProps> = ({
  avatarUrl,
  analyser,
  isPlaying,
  ...props
}) => {

  console.log('ReadyPlayerMeAvatar component mounted');

  const { scene } = useGLTF(avatarUrl) as any;
  const avatarMeshRef = useRef<THREE.SkinnedMesh | null>(null);
  const dataArrayRef = useRef<Float32Array>();
  
  // Adjust these values at the top of the component
  const smoothingFactor = 0.3; // Reduced from 0.7 for less smoothing/delay
  const audioThreshold = 0.01; // Add threshold to detect silence

  // For smoothing audio amplitude
  const smoothedAmplitudeRef = useRef(0);

  // For interpolating morph target values
  const previousMorphValuesRef = useRef<{ [key: string]: number }>({});

  // For smiling animation
  const lastSmileTimeRef = useRef(0);
  const smileDurationRef = useRef(0);
  const timeBetweenSmilesRef = useRef(0);

  // For hand gesture animation
  const lastGestureTimeRef = useRef(0);
  const gestureDurationRef = useRef(0);
  const timeBetweenGesturesRef = useRef(0);
  const rightArmBonesRef = useRef<{[key: string]: THREE.Bone}>({});

  // Initialize dataArray once
  useEffect(() => {
    if (analyser) {
      dataArrayRef.current = new Float32Array(analyser.frequencyBinCount);
    }
  }, [analyser]);

  useEffect(() => {
    if (scene) {
      scene.traverse((child: any) => {
        if (child.isSkinnedMesh && child.name === 'Wolf3D_Head') {
          avatarMeshRef.current = child;
          console.log('Avatar mesh details:', {
            name: child.name,
            morphTargets: child.morphTargetDictionary,
            morphInfluences: child.morphTargetInfluences,
            availableMorphs: Object.keys(child.morphTargetDictionary || {})
          });
        }
        if (child.isBone) {
          if (['RightHand', 'RightLowerArm', 'RightUpperArm'].includes(child.name)) {
            rightArmBonesRef.current[child.name] = child;
          }
        }
      });

      // Initialize smiling animation parameters
      lastSmileTimeRef.current = performance.now() / 1000;
      smileDurationRef.current = 2;
      timeBetweenSmilesRef.current = Math.random() * 10 + 5;

      // Initialize hand gesture animation parameters
      lastGestureTimeRef.current = performance.now() / 1000;
      gestureDurationRef.current = 2;
      timeBetweenGesturesRef.current = Math.random() * 20 + 10;
    }
  }, [scene]);

  useFrame((state, delta) => {
    if (analyser && dataArrayRef.current && avatarMeshRef.current && 
        avatarMeshRef.current.morphTargetDictionary && 
        avatarMeshRef.current.morphTargetInfluences && 
        isPlaying) {
      const time = state.clock.getElapsedTime();
      
      // Get real-time audio data
      analyser.getFloatTimeDomainData(dataArrayRef.current);

      // Calculate amplitude
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += Math.abs(dataArrayRef.current[i]);
      }
      const currentAmplitude = sum / dataArrayRef.current.length;

      // Quick reset when audio is below threshold
      if (currentAmplitude < audioThreshold) {
        smoothedAmplitudeRef.current *= 0.8; // Quick fadeout
      } else {
        // Less smoothing for more immediate response
        smoothedAmplitudeRef.current = 
          smoothingFactor * smoothedAmplitudeRef.current + 
          (1 - smoothingFactor) * currentAmplitude;
      }

      // Enhanced morph target groups
      const mouthMorphTargets = ['mouthOpen', 'mouthFunnel', 'jawOpen'];  // Added jawOpen
      const lipMorphTargets = ['mouthLowerDown', 'mouthUpperUp', 'mouthPucker'];
      const cheekMorphTargets = ['cheekPuff', 'cheekSquintLeft', 'cheekSquintRight'];
      const eyeMorphTargets = ['eyeSquintLeft', 'eyeSquintRight', 'eyeWideLeft', 'eyeWideRight'];
      const eyebrowMorphTargets = ['browOuterUpLeft', 'browOuterUpRight', 'browInnerUp'];

      // Update morph targets based on audio with enhanced movements
      [...mouthMorphTargets, ...lipMorphTargets, ...cheekMorphTargets].forEach((morphTargetName) => {
        const index = avatarMeshRef.current!.morphTargetDictionary![morphTargetName];
        if (index !== undefined) {
          const previousValue = previousMorphValuesRef.current[morphTargetName] || 0;
          
          let audioInfluence = smoothedAmplitudeRef.current;
          let maxValue = 0.5;
          let lerpSpeed = 0.5; // Increased for faster response

          if (morphTargetName === 'jawOpen') {
            audioInfluence *= 0.8;
            maxValue = 0.7;
            lerpSpeed = 0.6;
          }

          const targetValue = currentAmplitude < audioThreshold ? 0 : audioInfluence;
          const newValue = THREE.MathUtils.lerp(previousValue, targetValue, lerpSpeed);
          const clampedValue = THREE.MathUtils.clamp(newValue, 0, maxValue);
          avatarMeshRef.current!.morphTargetInfluences![index] = clampedValue;
          previousMorphValuesRef.current[morphTargetName] = clampedValue;
        }
      });

      // Faster eye and eyebrow movements
      [...eyeMorphTargets, ...eyebrowMorphTargets].forEach((morphTargetName) => {
        const index = avatarMeshRef.current!.morphTargetDictionary![morphTargetName];
        if (index !== undefined) {
          const previousValue = previousMorphValuesRef.current[morphTargetName] || 0;
          
          const blinkFrequency = Math.sin(time * 1.5) > 0.95;
          const randomMovement = Math.sin(time * 1.2 + Math.cos(time * 0.8)) * 0.1;
          
          let targetValue = randomMovement;
          
          if (morphTargetName.includes('eyeSquint') && blinkFrequency) {
            targetValue += 0.8;
          }
          
          if (morphTargetName.includes('brow')) {
            targetValue += smoothedAmplitudeRef.current * 0.15;
          }

          const newValue = THREE.MathUtils.lerp(previousValue, targetValue, 0.25);
          const clampedValue = THREE.MathUtils.clamp(newValue, 0, 0.5);
          avatarMeshRef.current!.morphTargetInfluences![index] = clampedValue;
          previousMorphValuesRef.current[morphTargetName] = clampedValue;
        }
      });

      // Reset other morph targets
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
    } else if (analyser) {
      // Log why the frame update didn't process only if analyser is available
      console.log('Frame update skipped:', {
        hasAnalyser: !!analyser,
        hasDataArray: !!dataArrayRef.current,
        hasAvatarMesh: !!avatarMeshRef.current,
        hasMorphDict: !!(avatarMeshRef.current?.morphTargetDictionary),
        hasMorphInfluences: !!(avatarMeshRef.current?.morphTargetInfluences),
        isPlaying: isPlaying
      });
    }
  });

  return <primitive object={scene} dispose={null} {...props} />;
};

export default ReadyPlayerMeAvatar;