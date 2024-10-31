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
  const smileFrequency = 0.5; // Oscillations per second

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
        // If using bone animations for gestures
        // Initialize references to bones if necessary
      });

      // Initialize idle animation parameters
      idleTimerRef.current = performance.now();
      idleIntervalRef.current = window.setInterval(() => {
        if (!isPlaying && !isIdleAnimatingRef.current && avatarMeshRef.current) {
          triggerIdleGesture();
        }
      }, 10000); // Check every 10 seconds

      // Cleanup on unmount
      return () => {
        clearInterval(idleIntervalRef.current);
      };
    }
  }, [scene, isPlaying]);

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

    // Apply to morph targets
    avatarMeshRef.current.morphTargetInfluences![smileLeftIndex] = THREE.MathUtils.clamp(smileValue, 0, 1);
    avatarMeshRef.current.morphTargetInfluences![smileRightIndex] = THREE.MathUtils.clamp(smileValue, 0, 1);

    // Optional: Log the smile values for debugging
    console.log(`Idle smile value: ${smileValue.toFixed(2)}`);
  };

  // Animation frame update
  useFrame((state, delta) => {
    if (
      analyser &&
      dataArrayRef.current &&
      avatarMeshRef.current &&
      avatarMeshRef.current.morphTargetDictionary &&
      avatarMeshRef.current.morphTargetInfluences
    ) {
      if (isPlaying) {
        const time = state.clock.getElapsedTime();
        
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

        // Update eye and eyebrow morphs
        [...eyeMorphTargets, ...eyebrowMorphTargets].forEach((morphName) => 
          updateEyeMorphTarget(morphName, time));
        
        // Reset unused morph targets (excluding idle morph targets)
        resetUnusedMorphTargets([
          ...mouthMorphTargets,
          ...lipMorphTargets,
          ...cheekMorphTargets,
          ...eyeMorphTargets,
          ...eyebrowMorphTargets
        ]);
      } else {
        // Handle idle state: Animate smile smoothly
        animateIdleSmile(state.clock.getElapsedTime());
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

  // Helper function to update eye-related morph targets
  const updateEyeMorphTarget = (morphName: string, time: number) => {
    const index = avatarMeshRef.current!.morphTargetDictionary![morphName];
    if (index === undefined) return;

    const previousValue = previousMorphValuesRef.current[morphName] || 0;
    const blinkFrequency = Math.sin(time * 1.5) > 0.95;
    const randomMovement = Math.sin(time * 1.2 + Math.cos(time * 0.8)) * 0.1;
    
    let targetValue = randomMovement;
    
    if (morphName.includes('eyeSquint') && blinkFrequency) {
      targetValue += 0.8;
    }
    
    if (morphName.includes('brow')) {
      targetValue += smoothedAmplitudeRef.current * 0.15;
    }

    const newValue = THREE.MathUtils.lerp(previousValue, targetValue, 0.25);
    const clampedValue = THREE.MathUtils.clamp(newValue, 0, 0.5);
    
    avatarMeshRef.current!.morphTargetInfluences![index] = clampedValue;
    previousMorphValuesRef.current[morphName] = clampedValue;

    console.log(`Updated eye morph '${morphName}':`, clampedValue);
  };

  // Helper function to reset unused morph targets
  const resetUnusedMorphTargets = (usedMorphs: string[]) => {
    const allMorphs = Object.keys(avatarMeshRef.current!.morphTargetDictionary!);
    allMorphs.forEach(morphName => {
      if (!usedMorphs.includes(morphName)) {
        const index = avatarMeshRef.current!.morphTargetDictionary![morphName];
        if (index !== undefined) {
          avatarMeshRef.current!.morphTargetInfluences![index] = 0;
        }
      }
    });
  };

  return <primitive object={scene} dispose={null} {...props} />;
};

export default ReadyPlayerMeAvatar;