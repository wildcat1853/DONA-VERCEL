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

  useFrame(() => {
    if (
      analyser &&  // Check if analyser is available
      dataArrayRef.current &&
      avatarMeshRef.current &&
      avatarMeshRef.current.morphTargetDictionary &&
      avatarMeshRef.current.morphTargetInfluences &&
      isPlaying
    ) {
      // Get real-time audio data
      analyser.getFloatTimeDomainData(dataArrayRef.current);

      // Log the first few values of the audio data array to verify it's being populated
      console.log('Audio data array (first 10 values):', dataArrayRef.current.slice(0, 10));

      // Calculate amplitude
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += Math.abs(dataArrayRef.current[i]);
      }
      const currentAmplitude = sum / dataArrayRef.current.length;

      // Log the calculated amplitude
      console.log('Calculated amplitude:', currentAmplitude);

      // Log each time audio data is processed
      console.log('Audio data processed:', {
        rawAmplitude: currentAmplitude,
        smoothedAmplitude: smoothedAmplitudeRef.current
      });

      // Existing morph target update logic remains unchanged
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