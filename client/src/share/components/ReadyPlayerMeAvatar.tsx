// components/ReadyPlayerMeAvatar.tsx

import React, { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, GroupProps } from '@react-three/fiber';
import * as THREE from 'three';

interface ReadyPlayerMeAvatarProps extends GroupProps {
  avatarUrl: string;
  audioBuffer?: AudioBuffer | null;
  isPlaying: boolean; // Add this prop
}

const ReadyPlayerMeAvatar: React.FC<ReadyPlayerMeAvatarProps> = ({
  avatarUrl,
  audioBuffer,
  isPlaying, // Add this prop
  ...props
}) => {
  const { scene } = useGLTF(avatarUrl) as any;
  const avatarMeshRef = useRef<THREE.SkinnedMesh | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array>();

  // For smoothing audio amplitude
  const smoothingFactor = 0.5; // Adjust between 0 (no smoothing) and 1 (maximum smoothing)
  const smoothedAmplitudeRef = useRef(0);

  // For interpolating morph target values
  const previousMorphValuesRef = useRef<{ [key: string]: number }>({});

  // Add these new refs for smiling animation
  const lastSmileTimeRef = useRef(0);
  const smileDurationRef = useRef(0);
  const timeBetweenSmilesRef = useRef(0);

  // Add these new refs for hand gesture animation
  const lastGestureTimeRef = useRef(0);
  const gestureDurationRef = useRef(0);
  const timeBetweenGesturesRef = useRef(0);
  const rightArmBonesRef = useRef<{[key: string]: THREE.Bone}>({});

  useEffect(() => {
    if (scene) {
      scene.traverse((child: any) => {
        if (child.isSkinnedMesh && child.name === 'Wolf3D_Head') {
          avatarMeshRef.current = child;
          console.log('Avatar mesh found:', child);
          console.log('Available morph targets:', child.morphTargetDictionary);
        }
        if (child.isBone) {
          if (['RightHand', 'RightLowerArm', 'RightUpperArm'].includes(child.name)) {
            rightArmBonesRef.current[child.name] = child;
          }
        }
      });

      // Initialize smiling animation parameters
      lastSmileTimeRef.current = performance.now() / 1000;
      smileDurationRef.current = 2; // Smile duration in seconds
      timeBetweenSmilesRef.current = Math.random() * 10 + 5; // Random time between smiles (5-15 seconds)

      // Initialize hand gesture animation parameters
      lastGestureTimeRef.current = performance.now() / 1000;
      gestureDurationRef.current = 2; // Gesture duration in seconds
      timeBetweenGesturesRef.current = Math.random() * 20 + 10; // Random time between gestures (10-30 seconds)
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

  useFrame((state, delta) => {
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

      const morphValue = smoothedAmplitudeRef.current * 1.0; // Reduced scaling

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

      // Smiling animation
      const currentTime = performance.now() / 1000;
      const timeSinceLastSmile = currentTime - lastSmileTimeRef.current;

      if (timeSinceLastSmile > timeBetweenSmilesRef.current) {
        // Start a new smile
        lastSmileTimeRef.current = currentTime;
        smileDurationRef.current = Math.random() * 1 + 1; // Random smile duration (1-2 seconds)
        timeBetweenSmilesRef.current = Math.random() * 10 + 5; // Random time until next smile
      }

      const smileMorphTargets = ['mouthSmile', 'mouthSmileLeft', 'mouthSmileRight'];
      const smileProgress = Math.min(timeSinceLastSmile / smileDurationRef.current, 1);
      const smileIntensity = Math.sin(smileProgress * Math.PI) * 0.1; // Smooth in and out

      smileMorphTargets.forEach((morphTargetName) => {
        const index = avatarMeshRef.current!.morphTargetDictionary![morphTargetName];
        if (index !== undefined) {
          const previousValue = previousMorphValuesRef.current[morphTargetName] || 0;
          const targetValue = smileIntensity;
          const newValue = THREE.MathUtils.lerp(previousValue, targetValue, 0.1);
          avatarMeshRef.current!.morphTargetInfluences![index] = newValue;
          previousMorphValuesRef.current[morphTargetName] = newValue;
        } else {
          console.warn(`Morph target "${morphTargetName}" not found`);
        }
      });

      // Hand gesture animation
      const timeSinceLastGesture = currentTime - lastGestureTimeRef.current;

      if (timeSinceLastGesture > timeBetweenGesturesRef.current) {
        // Start a new gesture
        lastGestureTimeRef.current = currentTime;
        gestureDurationRef.current = Math.random() * 1 + 1; // Random gesture duration (1-2 seconds)
        timeBetweenGesturesRef.current = Math.random() * 20 + 10; // Random time until next gesture
      }

      const gestureProgress = Math.min(timeSinceLastGesture / gestureDurationRef.current, 1);
      const gestureIntensity = Math.sin(gestureProgress * Math.PI); // Smooth in and out

      // Apply hand gesture
      if (rightArmBonesRef.current.RightUpperArm && rightArmBonesRef.current.RightLowerArm && rightArmBonesRef.current.RightHand) {
        const upperArmRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 6 * gestureIntensity));
        const lowerArmRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 4 * gestureIntensity));
        const handRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 4 * gestureIntensity));

        rightArmBonesRef.current.RightUpperArm.rotation.setFromQuaternion(upperArmRotation);
        rightArmBonesRef.current.RightLowerArm.rotation.setFromQuaternion(lowerArmRotation);
        rightArmBonesRef.current.RightHand.rotation.setFromQuaternion(handRotation);
      }

      // Optionally, reset other morph targets to zero
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

      // console.log('Morph target values:', avatarMeshRef.current.morphTargetInfluences);
    }
  });

  return <primitive object={scene} dispose={null} {...props} />;
};

export default ReadyPlayerMeAvatar;