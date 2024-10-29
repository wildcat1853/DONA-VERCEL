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
  const { scene } = useGLTF(avatarUrl) as any;
  const avatarMeshRef = useRef<THREE.SkinnedMesh | null>(null);
  const dataArrayRef = useRef<Float32Array>();
  
  // For smoothing audio amplitude
  const smoothingFactor = 0.5;
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
    if (
      analyser &&
      dataArrayRef.current &&
      avatarMeshRef.current &&
      avatarMeshRef.current.morphTargetDictionary &&
      avatarMeshRef.current.morphTargetInfluences &&
      isPlaying
    ) {
      // Get real-time audio data
      analyser.getFloatTimeDomainData(dataArrayRef.current);

      // Calculate amplitude with more detailed logging
      let sum = 0;
      let maxValue = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        const absValue = Math.abs(dataArrayRef.current[i]);
        sum += absValue;
        maxValue = Math.max(maxValue, absValue);
      }
      const currentAmplitude = sum / dataArrayRef.current.length;

      // Apply smoothing with adjusted factor
      const smoothingFactor = 0.3; // Reduced for more responsive movement
      smoothedAmplitudeRef.current = 
        smoothingFactor * smoothedAmplitudeRef.current + 
        (1 - smoothingFactor) * currentAmplitude;

      // Enhanced amplitude scaling
      const scaledAmplitude = Math.min(smoothedAmplitudeRef.current * 5, 1);

      // Log audio metrics for debugging
      if (currentAmplitude > 0.01) { // Lower threshold for more frequent logging
        console.log('Audio metrics:', {
          rawAmplitude: currentAmplitude,
          smoothedAmplitude: smoothedAmplitudeRef.current,
          scaledAmplitude: scaledAmplitude,
          maxValue: maxValue,
          isPlaying: isPlaying
        });
      }

      // Primary lip sync morphs with direct amplitude mapping
      const lipSyncMorphs = {
        'mouthOpen': scaledAmplitude * 1.0,
        'mouthFunnel': scaledAmplitude * 0.5,
        'jawOpen': scaledAmplitude * 0.8
      };

      // Apply lip sync morphs with logging
      Object.entries(lipSyncMorphs).forEach(([morphName, targetValue]) => {
        const index = avatarMeshRef.current!.morphTargetDictionary![morphName];
        if (index !== undefined) {
          const previousValue = avatarMeshRef.current!.morphTargetInfluences![index];
          const newValue = THREE.MathUtils.lerp(previousValue, targetValue, 0.3);
          avatarMeshRef.current!.morphTargetInfluences![index] = newValue;

          if (currentAmplitude > 0.01) {
            console.log(`Morph target update - ${morphName}:`, {
              index: index,
              previousValue: previousValue,
              targetValue: targetValue,
              newValue: newValue
            });
          }
        } else {
          console.warn(`Morph target not found: ${morphName}`);
        }
      });

      const time = state.clock.getElapsedTime();

      // Lip sync morph targets
      const mouthMorphTargets = ['mouthOpen', 'mouthFunnel'];
      const lipMorphTargets = ['mouthLowerDown', 'mouthUpperUp'];
      const cheekMorphTargets = ['cheekPuff'];
      const eyeMorphTargets = ['eyeSquintLeft', 'eyeSquintRight'];
      const eyebrowMorphTargets = ['browOuterUpLeft', 'browOuterUpRight'];

      // Update morph targets based on audio
      [...mouthMorphTargets, ...lipMorphTargets, ...cheekMorphTargets].forEach((morphTargetName) => {
        const index = avatarMeshRef.current!.morphTargetDictionary![morphTargetName];
        if (index !== undefined) {
          const previousValue = previousMorphValuesRef.current[morphTargetName] || 0;
          const audioInfluence = smoothedAmplitudeRef.current * 0.2;
          const timeInfluence = 0.1 * Math.sin(time * 2);
          const targetValue = audioInfluence + timeInfluence;
          const newValue = THREE.MathUtils.lerp(previousValue, targetValue, 0.1);
          const clampedValue = THREE.MathUtils.clamp(newValue, 0, 0.5);
          avatarMeshRef.current!.morphTargetInfluences![index] = clampedValue;
          previousMorphValuesRef.current[morphTargetName] = clampedValue;
        }
      });

      // Smiling animation
      const currentTime = performance.now() / 1000;
      const timeSinceLastSmile = currentTime - lastSmileTimeRef.current;

      if (timeSinceLastSmile > timeBetweenSmilesRef.current) {
        lastSmileTimeRef.current = currentTime;
        smileDurationRef.current = Math.random() * 1 + 1;
        timeBetweenSmilesRef.current = Math.random() * 10 + 5;
      }

      const smileMorphTargets = ['mouthSmile', 'mouthSmileLeft', 'mouthSmileRight'];
      const smileProgress = Math.min(timeSinceLastSmile / smileDurationRef.current, 1);
      const smileIntensity = Math.sin(smileProgress * Math.PI) * 0.1;

      smileMorphTargets.forEach((morphTargetName) => {
        const index = avatarMeshRef.current!.morphTargetDictionary![morphTargetName];
        if (index !== undefined) {
          const previousValue = previousMorphValuesRef.current[morphTargetName] || 0;
          const targetValue = smileIntensity;
          const newValue = THREE.MathUtils.lerp(previousValue, targetValue, 0.1);
          avatarMeshRef.current!.morphTargetInfluences![index] = newValue;
          previousMorphValuesRef.current[morphTargetName] = newValue;
        }
      });

      // Hand gesture animation
      const timeSinceLastGesture = currentTime - lastGestureTimeRef.current;

      if (timeSinceLastGesture > timeBetweenGesturesRef.current) {
        lastGestureTimeRef.current = currentTime;
        gestureDurationRef.current = Math.random() * 1 + 1;
        timeBetweenGesturesRef.current = Math.random() * 20 + 10;
      }

      const gestureProgress = Math.min(timeSinceLastGesture / gestureDurationRef.current, 1);
      const gestureIntensity = Math.sin(gestureProgress * Math.PI);

      if (rightArmBonesRef.current.RightUpperArm && 
          rightArmBonesRef.current.RightLowerArm && 
          rightArmBonesRef.current.RightHand) {
        const upperArmRotation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, 0, -Math.PI / 6 * gestureIntensity)
        );
        const lowerArmRotation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, 0, -Math.PI / 4 * gestureIntensity)
        );
        const handRotation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, 0, Math.PI / 4 * gestureIntensity)
        );

        rightArmBonesRef.current.RightUpperArm.rotation.setFromQuaternion(upperArmRotation);
        rightArmBonesRef.current.RightLowerArm.rotation.setFromQuaternion(lowerArmRotation);
        rightArmBonesRef.current.RightHand.rotation.setFromQuaternion(handRotation);
      }

      // Reset other morph targets
      const allMorphTargets = Object.keys(avatarMeshRef.current.morphTargetDictionary);
      allMorphTargets.forEach((morphTargetName) => {
        if (
          !mouthMorphTargets.includes(morphTargetName) &&
          !lipMorphTargets.includes(morphTargetName) &&
          !cheekMorphTargets.includes(morphTargetName) &&
          !eyeMorphTargets.includes(morphTargetName) &&
          !eyebrowMorphTargets.includes(morphTargetName) &&
          !smileMorphTargets.includes(morphTargetName)
        ) {
          const index = avatarMeshRef.current!.morphTargetDictionary![morphTargetName];
          if (index !== undefined) {
            avatarMeshRef.current!.morphTargetInfluences![index] = 0;
          }
        }
      });
    }
  });

  return <primitive object={scene} dispose={null} {...props} />;
};

export default ReadyPlayerMeAvatar;