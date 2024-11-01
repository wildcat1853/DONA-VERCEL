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
  const smileFrequency = 0.09; // Oscillations per second

  // Add these new refs for body animations
  const rightArmRef = useRef<THREE.Bone | null>(null);
  const leftArmRef = useRef<THREE.Bone | null>(null);
  const spineRef = useRef<THREE.Bone | null>(null);
  const rightHandRef = useRef<THREE.Bone | null>(null);
  const leftHandRef = useRef<THREE.Bone | null>(null);

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
          console.log('Available morph targets:', {
            dictionary: Object.keys(child.morphTargetDictionary || {}),
            influences: child.morphTargetInfluences?.length
          });
        }
        
        // Add body bone references
        if (child.isBone) {
          console.log('Found bone:', child.name);
          switch (child.name) {
            case 'RightArm': rightArmRef.current = child; console.log('Set RightArm bone ref'); break;
            case 'LeftArm': leftArmRef.current = child; console.log('Set LeftArm bone ref'); break;
            case 'Spine': spineRef.current = child; console.log('Set Spine bone ref'); break;
            case 'RightHand': rightHandRef.current = child; console.log('Set RightHand bone ref'); break;
            case 'LeftHand': leftHandRef.current = child; console.log('Set LeftHand bone ref'); break;
          }
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
    return THREE.MathUtils.randFloat(0.3, 4);
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

  // Add new function for idle body animations with doubled movement
  const animateIdleBody = (elapsedTime: number) => {
    if (!isPlaying && !isIdleAnimatingRef.current) {  
      // Breathing animation for spine
      if (spineRef.current) {
        const breathingSpeed = 0.5; // Slower breathing rate
        const breathingDepth = 0.03; // Increased breathing movement
        
        // Forward/back breathing motion
        const breathing = Math.sin(elapsedTime * breathingSpeed) * breathingDepth;
        spineRef.current.rotation.x = breathing;
      }

      // Arm movement
      if (rightArmRef.current && leftArmRef.current) {
        // Default positions
        const armForwardTilt = 1;  // Brings arms closer to body on X axis
        
        // Set base position
        rightArmRef.current.rotation.x = armForwardTilt;
        leftArmRef.current.rotation.x = armForwardTilt;

        // Add subtle sway on Z axis
        const armSway = Math.sin(elapsedTime * 0.1) * 0.002;
        rightArmRef.current.rotation.z = armSway;
        leftArmRef.current.rotation.z = -armSway;
      }

      // Extremely subtle hand movement
      if (rightHandRef.current && leftHandRef.current) {
        const handSway = Math.sin(elapsedTime * 0.1) * 0.001;
        rightHandRef.current.rotation.z = handSway;
        leftHandRef.current.rotation.z = -handSway;
      }
    }
  };

  // Animation frame update
  useFrame((state) => {
    const currentTime = state.clock.getElapsedTime();

    // Always run body animations
    animateIdleBody(currentTime);

    if (isPlaying) {
      // Update mouth movements based on audio input for lip-sync
      updateMouthMorphsForSpeech();
    } else {
      // Run idle facial animations only when not speaking
      animateIdleSmile(currentTime);
      animateIdleEyebrows(currentTime);
    }

    // Always handle blinking
    const currentTimeSeconds = performance.now() / 1000;
    if (!isBlinkingRef.current && currentTimeSeconds >= nextBlinkTimeRef.current) {
      initiateBlink();
    }

    if (isBlinkingRef.current) {
      const blinkElapsed = currentTimeSeconds - blinkStartTimeRef.current;
      if (blinkElapsed <= blinkDuration) {
        const t = blinkElapsed / blinkDuration;
        const blinkValue = Math.sin(t * Math.PI);
        setBlinkMorphs(blinkValue);
      } else {
        setBlinkMorphs(0);
        isBlinkingRef.current = false;
        nextBlinkTimeRef.current = currentTimeSeconds + getRandomBlinkInterval();
      }
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

  // Add this helper function to verify bone references
  const logBoneHierarchy = (bone: THREE.Bone, level = 0) => {
    const indent = '  '.repeat(level);
    console.log(`${indent}${bone.name}`);
    bone.children.forEach(child => {
      if (child instanceof THREE.Bone) {
        logBoneHierarchy(child, level + 1);
      }
    });
  };

  // Use it in your useEffect
  useEffect(() => {
    if (scene) {
      scene.traverse((child: any) => {
        if (child.isBone && child.name === 'Hips') {
          console.log('Full bone hierarchy:');
          logBoneHierarchy(child);
        }
      });
    }
  }, [scene]);

  const updateMouthMorphsForSpeech = () => {
    if (!analyser || !dataArrayRef.current || !avatarMeshRef.current) return;

    // Get audio data
    analyser.getFloatTimeDomainData(dataArrayRef.current);
    const currentAmplitude = Array.from(dataArrayRef.current)
      .reduce((sum, val) => sum + Math.abs(val), 0) / dataArrayRef.current.length;

    // Smooth the amplitude
    smoothedAmplitudeRef.current = 
      smoothingFactor * smoothedAmplitudeRef.current + (1 - smoothingFactor) * currentAmplitude;

    // Update mouth-related morph targets
    const mouthMorphTargets = ['mouthOpen', 'mouthFunnel', 'jawOpen'];
    mouthMorphTargets.forEach((morphName) => {
      const index = avatarMeshRef.current!.morphTargetDictionary![morphName];
      if (index === undefined) return;

      const previousValue = previousMorphValuesRef.current[morphName] || 0;
      const targetValue = smoothedAmplitudeRef.current < audioThreshold ? 0 : smoothedAmplitudeRef.current;
      const newValue = THREE.MathUtils.lerp(previousValue, targetValue, 0.5);
      const clampedValue = THREE.MathUtils.clamp(newValue, 0, 0.8);

      avatarMeshRef.current!.morphTargetInfluences![index] = clampedValue;
      previousMorphValuesRef.current[morphName] = clampedValue;
    });
  };

  return <primitive object={scene} dispose={null} {...props} />;
};

export default ReadyPlayerMeAvatar;