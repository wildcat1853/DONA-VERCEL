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

  // Constants for audio processing
  const smoothingFactor = 0.3;
  const audioThreshold = 0.01;

  // Refs for animation
  const smoothedAmplitudeRef = useRef(0);
  const previousMorphValuesRef = useRef<{ [key: string]: number }>({});

  // Idle animation state
  const idleTimerRef = useRef<number>(0);
  const idleIntervalRef = useRef<number>(0);
  const isIdleAnimatingRef = useRef<boolean>(false);

  // Blink state
  const isBlinkingRef = useRef<boolean>(false);
  const blinkStartTimeRef = useRef<number>(0);
  const nextBlinkTimeRef = useRef<number>(0);
  const blinkDuration = 0.2; // seconds

  // Define types for morph targets if necessary
  type MorphTargetNames = 
    | 'eyeBlinkLeft'
    | 'eyeBlinkRight'
    | 'mouthSmileLeft'
    | 'mouthSmileRight'
    | 'cheekPuff'
    | 'browInnerUp'
    | 'browOuterUpLeft'
    | 'browOuterUpRight'
    | 'mouthPucker'
    | 'mouthFunnel'
    | 'tongueOut';

  // Add any additional morph targets for idle gestures
  const idleMorphTargets: MorphTargetNames[] = [
    'eyeBlinkLeft',
    'eyeBlinkRight',
    'mouthSmileLeft',
    'mouthSmileRight',
    'cheekPuff',
    'browInnerUp',
    'browOuterUpLeft',
    'browOuterUpRight',
    'mouthPucker',
    'mouthFunnel',
    'tongueOut',
    // Add more as needed
  ];

  // Smile animation parameters
  const smileAmplitude = 0.4; // Increased for visibility
  const smileFrequency = 0.9; // Oscillations per second

  // Initialize dataArray
  useEffect(() => {
    if (analyser) {
      dataArrayRef.current = new Float32Array(analyser.frequencyBinCount);
    }
  }, [analyser]);

  // Initialize avatar mesh and set up idle gesture interval
  useEffect(() => {
    if (scene) {
      scene.traverse((child: any) => {
        if (child.isSkinnedMesh && child.name === 'Wolf3D_Head') {
          avatarMeshRef.current = child;
          console.log('Avatar mesh initialized:', {
            morphTargets: Object.keys(child.morphTargetDictionary || {})
          });
        }
      });

      // Initialize idle animation parameters
      idleTimerRef.current = performance.now();
      idleIntervalRef.current = window.setInterval(() => {
        if (!isPlaying && !isIdleAnimatingRef.current && avatarMeshRef.current) {
          triggerIdleGesture();
        }
      }, 10000); // Check every 10 seconds

      // Initialize first blink time
      nextBlinkTimeRef.current = performance.now() / 1000 + getRandomBlinkInterval();

      // Cleanup on unmount
      return () => {
        clearInterval(idleIntervalRef.current);
      };
    }
  }, [scene, isPlaying]);

  // Function to get a random blink interval between 2 to 5 seconds
  const getRandomBlinkInterval = () => {
    return THREE.MathUtils.randFloat(0.3, 2);
  };

  // Function to trigger an idle gesture
  const triggerIdleGesture = () => {
    if (!avatarMeshRef.current) return;

    console.log('Triggering idle gesture');

    isIdleAnimatingRef.current = true;

    // Randomly select an idle gesture
    const gesture = idleMorphTargets[Math.floor(Math.random() * idleMorphTargets.length)];

    const morphIndex = avatarMeshRef.current?.morphTargetDictionary?.[gesture];
    if (morphIndex === undefined) {
      console.warn(`Morph target '${gesture}' not found on the avatar.`);
      isIdleAnimatingRef.current = false;
      return;
    }

    // Animate the morph target to a random value and back
    const duration = 2; // seconds
    const targetValue = THREE.MathUtils.randFloat(0.1, 0.3); // Adjust based on gesture

    // Tweening using simple linear interpolation
    const startTime = performance.now() / 1000;
    const animate = () => {
      const currentTime = performance.now() / 1000;
      const elapsed = currentTime - startTime;
      if (elapsed > duration) {
        // Reset morph target
        avatarMeshRef.current!.morphTargetInfluences![morphIndex] = 0;
        previousMorphValuesRef.current[gesture] = 0;
        isIdleAnimatingRef.current = false;
        console.log(`Idle gesture '${gesture}' animation completed and reset.`);
        return;
      }

      // Simple easing function (easeInOutQuad)
      const t = elapsed / duration;
      const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      // Apply morph target influence
      const previousValue = previousMorphValuesRef.current[gesture] || 0;
      const lerpedValue = THREE.MathUtils.lerp(
        previousValue,
        targetValue * easedT,
        0.1
      );
      const clampedValue = THREE.MathUtils.clamp(lerpedValue, 0, 1);

      avatarMeshRef.current!.morphTargetInfluences![morphIndex] = clampedValue;
      previousMorphValuesRef.current[gesture] = clampedValue;

      requestAnimationFrame(animate);
    };

    animate();
  };

  // Function to animate idle smile smoothly
  const animateIdleSmile = (elapsedTime: number) => {
    if (!avatarMeshRef.current) return;

    const smileLeftIndex = avatarMeshRef.current.morphTargetDictionary!['mouthSmileLeft'];
    const smileRightIndex = avatarMeshRef.current.morphTargetDictionary!['mouthSmileRight'];

    if (smileLeftIndex === undefined || smileRightIndex === undefined) {
      console.warn('Smile morph targets not found.');
      return;
    }

    // Calculate new influence using sine wave, offset to oscillate between 0 and smileAmplitude
    const smileValue = smileAmplitude * (Math.sin(2 * Math.PI * smileFrequency * elapsedTime) + 1) / 2;

    // Apply to morph targets with smooth transition
    avatarMeshRef.current.morphTargetInfluences![smileLeftIndex] = THREE.MathUtils.lerp(
      avatarMeshRef.current.morphTargetInfluences![smileLeftIndex],
      smileValue,
      0.05 // Smoother transition
    );
    avatarMeshRef.current.morphTargetInfluences![smileRightIndex] = THREE.MathUtils.lerp(
      avatarMeshRef.current.morphTargetInfluences![smileRightIndex],
      smileValue,
      0.05 // Smoother transition
    );

    // Optional: Log the smile values for debugging
    console.log(`Idle smile value: ${smileValue.toFixed(2)}`);
  };

  // Function to animate idle eyebrows smoothly
  const animateIdleEyebrows = (elapsedTime: number) => {
    if (!avatarMeshRef.current) return;

    const eyebrowMorphs = ['browOuterUpLeft', 'browOuterUpRight', 'browInnerUp'];

    eyebrowMorphs.forEach((morphName) => {
      const index = avatarMeshRef.current!.morphTargetDictionary![morphName];
      if (index === undefined) return;

      // Calculate new influence using sine wave for subtle eyebrow movements
      const eyebrowValue = 0.1 * (Math.sin(elapsedTime * 0.5 + index) + 1) / 2; // Adjust frequency and amplitude as needed

      // Apply to morph targets with smooth transition
      avatarMeshRef.current!.morphTargetInfluences![index] = THREE.MathUtils.lerp(
        avatarMeshRef.current!.morphTargetInfluences![index],
        eyebrowValue,
        0.05 // Smooth transition
      );

      // Optional: Log the eyebrow values for debugging
      console.log(`Idle eyebrow '${morphName}' value: ${eyebrowValue.toFixed(2)}`);
    });
  };

  // Function to initiate a blink
  const initiateBlink = () => {
    if (!avatarMeshRef.current) return;

    const blinkLeftIndex = avatarMeshRef.current.morphTargetDictionary!['eyeBlinkLeft'];
    const blinkRightIndex = avatarMeshRef.current.morphTargetDictionary!['eyeBlinkRight'];

    if (blinkLeftIndex === undefined || blinkRightIndex === undefined) {
      console.warn('Blink morph targets not found.');
      return;
    }

    isBlinkingRef.current = true;
    blinkStartTimeRef.current = performance.now() / 1000;
  };

  // Animation frame update
  useFrame((state, delta) => {
    const currentTime = state.clock.getElapsedTime();

    // Handle blinking
    if (avatarMeshRef.current) {
      if (!isBlinkingRef.current && currentTime >= nextBlinkTimeRef.current) {
        initiateBlink();
      }

      if (isBlinkingRef.current) {
        const elapsed = currentTime - blinkStartTimeRef.current;
        if (elapsed <= blinkDuration / 2) {
          // Closing eyes
          const blinkProgress = elapsed / (blinkDuration / 2);
          const blinkValue = THREE.MathUtils.lerp(0, 1, blinkProgress);
          setBlinkMorphs(blinkValue);
        } else if (elapsed <= blinkDuration) {
          // Opening eyes
          const blinkProgress = (elapsed - blinkDuration / 2) / (blinkDuration / 2);
          const blinkValue = THREE.MathUtils.lerp(1, 0, blinkProgress);
          setBlinkMorphs(blinkValue);
        } else {
          // Blink completed
          setBlinkMorphs(0);
          isBlinkingRef.current = false;
          nextBlinkTimeRef.current = currentTime + getRandomBlinkInterval();
        }
      }
    }

    if (
      analyser &&
      dataArrayRef.current &&
      avatarMeshRef.current &&
      avatarMeshRef.current.morphTargetDictionary &&
      avatarMeshRef.current.morphTargetInfluences
    ) {
      if (isPlaying) {
        // Get real-time audio data
        analyser.getFloatTimeDomainData(dataArrayRef.current);

        // Calculate amplitude
        const currentAmplitude = Array.from(dataArrayRef.current)
          .reduce((sum, val) => sum + Math.abs(val), 0) / dataArrayRef.current.length;

        // Update smoothed amplitude
        if (currentAmplitude < audioThreshold) {
          smoothedAmplitudeRef.current *= 0.8;
        } else {
          smoothedAmplitudeRef.current = 
            smoothingFactor * smoothedAmplitudeRef.current + 
            (1 - smoothingFactor) * currentAmplitude;
        }

        // Define morph target groups
        const mouthMorphTargets = ['mouthOpen', 'mouthFunnel', 'jawOpen'];
        const lipMorphTargets = ['mouthLowerDown', 'mouthUpperUp', 'mouthPucker'];
        const cheekMorphTargets = ['cheekPuff', 'cheekSquintLeft', 'cheekSquintRight'];
        const eyeMorphTargets = ['eyeSquintLeft', 'eyeSquintRight', 'eyeWideLeft', 'eyeWideRight'];
        const eyebrowMorphTargets = ['browOuterUpLeft', 'browOuterUpRight', 'browInnerUp'];

        // Update mouth and lip morphs
        [...mouthMorphTargets, ...lipMorphTargets, ...cheekMorphTargets].forEach(updateMorphTarget);

        // Update eye morphs
        eyeMorphTargets.forEach(morphName => updateEyeMorphTarget(morphName, currentTime));

        // Update eyebrow morphs
        eyebrowMorphTargets.forEach(morphName => updateEyebrowMorphTarget(morphName, currentTime));

        // Reset unused morph targets (excluding used morphs)
        resetUnusedMorphTargets([
          ...mouthMorphTargets,
          ...lipMorphTargets,
          ...cheekMorphTargets,
          ...eyeMorphTargets,
          ...eyebrowMorphTargets
        ]);
      } else {
        // Handle idle state: Animate smile and eyebrows smoothly
        animateIdleSmile(currentTime);
        animateIdleEyebrows(currentTime);
      }
    } else {
      // Log why the frame update didn't process
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

  // Helper function to update mouth-related morph targets
  const updateMorphTarget = (morphName: string) => {
    const index = avatarMeshRef.current!.morphTargetDictionary![morphName];
    if (index === undefined) return;

    const previousValue = previousMorphValuesRef.current[morphName] || 0;
    let audioInfluence = smoothedAmplitudeRef.current;
    let maxValue = 0.5;
    let lerpSpeed = 0.5;

    if (morphName === 'jawOpen') {
      audioInfluence *= 0.8;
      maxValue = 0.7;
      lerpSpeed = 0.6;
    }

    const targetValue = smoothedAmplitudeRef.current < audioThreshold ? 0 : audioInfluence;
    const newValue = THREE.MathUtils.lerp(previousValue, targetValue, lerpSpeed);
    const clampedValue = THREE.MathUtils.clamp(newValue, 0, maxValue);
    
    avatarMeshRef.current!.morphTargetInfluences![index] = clampedValue;
    previousMorphValuesRef.current[morphName] = clampedValue;

    console.log(`Updated morph '${morphName}':`, clampedValue);
  };

  // Helper function to update eye morph targets
  const updateEyeMorphTarget = (morphName: string, time: number) => {
    const index = avatarMeshRef.current!.morphTargetDictionary![morphName];
    if (index === undefined) return;

    const previousValue = previousMorphValuesRef.current[morphName] || 0;
    let targetValue = 0;

    if (morphName.includes('eyeSquint')) {
      const blink = Math.sin(time * 1.5) > 0.95;
      targetValue = blink ? 0.3 : 0; // Adjust blink intensity as needed
    } else if (morphName.includes('eyeWide')) {
      targetValue = Math.abs(Math.sin(time * 2)) * 0.2; // Widen eyes periodically
    }

    const newValue = THREE.MathUtils.lerp(previousValue, targetValue, 0.25);
    const clampedValue = THREE.MathUtils.clamp(newValue, 0, 0.5); // Limit to prevent over-influence

    avatarMeshRef.current!.morphTargetInfluences![index] = clampedValue;
    previousMorphValuesRef.current[morphName] = clampedValue;

    console.log(`Updated eye morph '${morphName}':`, clampedValue);
  };

  // Helper function to update eyebrow morph targets
  const updateEyebrowMorphTarget = (morphName: string, time: number) => {
    const index = avatarMeshRef.current!.morphTargetDictionary![morphName];
    if (index === undefined) return;

    const previousValue = previousMorphValuesRef.current[morphName] || 0;
    let targetValue = smoothedAmplitudeRef.current * 0.15 + Math.sin(time * 1.2) * 0.05; // Audio-driven + subtle movement

    const newValue = THREE.MathUtils.lerp(previousValue, targetValue, 0.25);
    const clampedValue = THREE.MathUtils.clamp(newValue, 0, 0.5);
    
    avatarMeshRef.current!.morphTargetInfluences![index] = clampedValue;
    previousMorphValuesRef.current[morphName] = clampedValue;

    console.log(`Updated eyebrow morph '${morphName}':`, clampedValue);
  };

  // Helper function to set blink morphs
  const setBlinkMorphs = (value: number) => {
    if (!avatarMeshRef.current) return;

    const blinkLeftIndex = avatarMeshRef.current.morphTargetDictionary!['eyeBlinkLeft'];
    const blinkRightIndex = avatarMeshRef.current.morphTargetDictionary!['eyeBlinkRight'];

    if (blinkLeftIndex === undefined || blinkRightIndex === undefined) {
      console.warn('Blink morph targets not found.');
      return;
    }

    avatarMeshRef.current.morphTargetInfluences![blinkLeftIndex] = THREE.MathUtils.clamp(value, 0, 1);
    avatarMeshRef.current.morphTargetInfluences![blinkRightIndex] = THREE.MathUtils.clamp(value, 0, 1);
  };

  // Helper function to reset unused morph targets
  const resetUnusedMorphTargets = (usedMorphs: string[]) => {
    const allMorphs = Object.keys(avatarMeshRef.current!.morphTargetDictionary!);
    allMorphs.forEach(morphName => {
      if (!usedMorphs.includes(morphName)) {
        const index = avatarMeshRef.current!.morphTargetDictionary![morphName];
        if (index !== undefined) {
          avatarMeshRef.current!.morphTargetInfluences![index] = 0;
          console.log(`Reset morph '${morphName}' to 0`);
        }
      }
    });
  };

  return <primitive object={scene} dispose={null} {...props} />;
};

export default ReadyPlayerMeAvatar;