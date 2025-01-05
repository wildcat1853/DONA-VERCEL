import React, { useEffect, useRef, useCallback } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ReadyPlayerMeAvatarProps {
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
  const idleAnimation = useGLTF('/animations/idle5.glb');
  // const idleAnimation = useGLTF('/animations/greeting.glb');
  // const idleAnimation = useGLTF('/animations/calling.glb');
  // const talkingAnimation = useGLTF('/animations/talking.glb'); // Commented out talking animation

  const { actions, mixer } = useAnimations(idleAnimation.animations, scene);
  const avatarMeshRef = useRef<THREE.SkinnedMesh | null>(null);
  const dataArrayRef = useRef<Float32Array>();

  // Constants for audio processing
  const smoothingFactor = 0.3;
  const audioThreshold = 0.01;

  // Refs for animation
  const smoothedAmplitudeRef = useRef(0);
  const previousMorphValuesRef = useRef<{ [key: string]: number }>({});

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
  const smileAmplitude = 0.4; // Adjust for desired effect
  const smileFrequency = 0.09; // Adjust for desired effect

  // Add a new ref to track if mesh is ready
  const isMeshReadyRef = useRef<boolean>(false);

  // Initialize dataArray
  useEffect(() => {
    if (analyser) {
      dataArrayRef.current = new Float32Array(analyser.frequencyBinCount);
    }
  }, [analyser]);

  // Initialize avatar mesh and set up idle animation
  useEffect(() => {
    if (scene) {
      scene.traverse((child: any) => {
        if (child.isSkinnedMesh && child.name === 'Wolf3D_Head') {
          avatarMeshRef.current = child;
          isMeshReadyRef.current = true; // Mark mesh as ready

          // Initialize morph target values to 0
          if (child.morphTargetInfluences) {
            child.morphTargetInfluences.fill(0);
          }
        }
      });

      // Initialize first blink time
      nextBlinkTimeRef.current = performance.now() / 1000 + getRandomBlinkInterval();
    }
  }, [scene]);

  // Update the animation effect to use only idle animation
  useEffect(() => {
    if (actions && idleAnimation.animations?.length > 0) {
      const actionName = actions['idle'] ? 'idle' : idleAnimation.animations[0].name;
      const currentAction = actions[actionName];

      if (currentAction) {
        currentAction.timeScale = 0.5;
        currentAction.setLoop(THREE.LoopRepeat, Infinity);
        
        currentAction
          .reset()
          .fadeIn(0.5)
          .play();

        return () => {
          currentAction.fadeOut(0.5);
          currentAction.stop();
        };
      }
    }
  }, [actions, idleAnimation.animations, mixer]);

  // Function to get a random blink interval between 0.3 to 4 seconds
  const getRandomBlinkInterval = () => {
    return THREE.MathUtils.randFloat(0.3, 4);
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

    // Update the animation mixer
    if (mixer) mixer.update(delta);

    if (analyser) {
      updateMouthMorphsForSpeech();
    }

    // Run idle facial animations
    animateIdleSmile(currentTime);
    animateIdleEyebrows(currentTime);

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
  const updateMouthMorphsForSpeech = useCallback(() => {
    if (!analyser || !dataArrayRef.current || !avatarMeshRef.current || !isMeshReadyRef.current) {
      return;
    }

    try {
      // Check if analyser is still valid
      if (analyser.context.state === 'closed') {
        console.warn('AudioContext is closed');
        return;
      }

      analyser.getFloatTimeDomainData(dataArrayRef.current);
      
      // Add validation for audio data
      const hasAudioData = dataArrayRef.current.some(val => val !== 0);
      if (!hasAudioData) {
        return;
      }

      // Get audio data
      const currentAmplitude =
        Array.from(dataArrayRef.current).reduce((sum, val) => sum + Math.abs(val), 0) /
        dataArrayRef.current.length;

      // Smooth the amplitude
      smoothedAmplitudeRef.current =
        smoothingFactor * (smoothedAmplitudeRef.current || 0) +
        (1 - smoothingFactor) * currentAmplitude;

      // Update mouth-related morph targets
      const mouthMorphTargets = ['mouthOpen', 'mouthFunnel', 'jawOpen'];
      mouthMorphTargets.forEach((morphName) => {
        const index = avatarMeshRef.current!.morphTargetDictionary?.[morphName];
        if (index === undefined) {
          return;
        }

        const previousValue = previousMorphValuesRef.current[morphName] || 0;
        const targetValue =
          smoothedAmplitudeRef.current < audioThreshold ? 0 : smoothedAmplitudeRef.current;
        const newValue = THREE.MathUtils.lerp(previousValue, targetValue, 0.5);
        const clampedValue = THREE.MathUtils.clamp(newValue, 0, 0.8);

        if (avatarMeshRef.current!.morphTargetInfluences) {
          avatarMeshRef.current!.morphTargetInfluences[index] = clampedValue;
          previousMorphValuesRef.current[morphName] = clampedValue;
        }
      });
    } catch (error) {
      console.error('Error in updateMouthMorphsForSpeech:', error);
    }
  }, [analyser, audioThreshold, smoothingFactor]);

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
    const smileValue =
      (smileAmplitude * (Math.sin(2 * Math.PI * smileFrequency * elapsedTime) + 1)) / 2;

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
  };

  // Function to animate idle eyebrows smoothly
  const animateIdleEyebrows = (elapsedTime: number) => {
    if (!avatarMeshRef.current) return;

    const eyebrowMorphs = ['browOuterUpLeft', 'browOuterUpRight', 'browInnerUp'];

    eyebrowMorphs.forEach((morphName) => {
      const index = avatarMeshRef.current!.morphTargetDictionary![morphName];
      if (index === undefined) return;

      // Calculate new influence using sine wave for subtle eyebrow movements
      const eyebrowValue = (0.1 * (Math.sin(elapsedTime * 0.5 + index) + 1)) / 2;

      // Apply to morph targets with smooth transition
      avatarMeshRef.current!.morphTargetInfluences![index] = THREE.MathUtils.lerp(
        avatarMeshRef.current!.morphTargetInfluences![index],
        eyebrowValue,
        0.05 // Smooth transition
      );
    });
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

    avatarMeshRef.current.morphTargetInfluences![blinkLeftIndex] = THREE.MathUtils.clamp(
      value,
      0,
      1
    );
    avatarMeshRef.current.morphTargetInfluences![blinkRightIndex] = THREE.MathUtils.clamp(
      value,
      0,
      1
    );
  };

  return <primitive object={scene} dispose={null} {...props} />;
};

export default ReadyPlayerMeAvatar;