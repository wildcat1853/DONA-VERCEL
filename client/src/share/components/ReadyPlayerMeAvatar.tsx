// components/ReadyPlayerMeAvatar.tsx

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar } from '@readyplayerme/visage'; // Ensure correct import based on your library

interface ReadyPlayerMeAvatarProps {
  avatarUrl: string;
  width?: string;
  height?: string;
  audioBuffer?: AudioBuffer | null;
}

const ReadyPlayerMeAvatar: React.FC<ReadyPlayerMeAvatarProps> = React.memo(({ 
  avatarUrl, 
  width = '100%', 
  height = '100%',
  audioBuffer
}) => {
  console.log('ReadyPlayerMeAvatar component rendered');

  const avatarRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array>();
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  const [avatarLoaded, setAvatarLoaded] = useState(false);

  // const happy = {
  //   // ... (keep existing happy emotion)
  // };

  // const sad = {
  //   // ... (keep existing sad emotion)
  // };

  function updateMorphTargets(morphTargets: { [key: string]: number }) {
    console.log('updateMorphTargets called');
    if (avatarRef.current) {
      Object.entries(morphTargets).forEach(([key, value]) => {
        avatarRef.current.setMorphTarget(key, value);
      });
    }
  }

  const animateAvatar = useCallback(() => {
    console.log('animateAvatar called', {
      analyser: !!analyserRef.current,
      dataArray: !!dataArrayRef.current,
      avatar: !!avatarRef.current,
      analyserType: analyserRef.current ? typeof analyserRef.current : 'undefined',
      dataArrayType: dataArrayRef.current ? typeof dataArrayRef.current : 'undefined',
      avatarType: avatarRef.current ? typeof avatarRef.current : 'undefined'
    });
    if (!analyserRef.current || !dataArrayRef.current || !avatarRef.current) {
      console.log('Animation prerequisites not met');
      return;
    }

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Calculate average frequency
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }
    const average = sum / dataArrayRef.current.length;

    // Map average to morph target weight (e.g., jawOpen)
    const morphValue = average / 256; // Normalize between 0 and 1

    // Check if the morph target exists
    if (avatarRef.current.morphTargetDictionary && 'jawOpen' in avatarRef.current.morphTargetDictionary) {
      avatarRef.current.setMorphTarget('jawOpen', morphValue);
      console.log('jawOpen morph target set to:', morphValue);
    } else {
      console.warn('jawOpen morph target not found');
      
      // Log available morph targets
      console.log('Available morph targets:', Object.keys(avatarRef.current.morphTargetDictionary || {}));
    }

    animationFrameRef.current = requestAnimationFrame(animateAvatar);
  }, []);

  useEffect(() => {
    console.log('useEffect triggered', { 
      audioBuffer: !!audioBuffer, 
      avatarLoaded, 
      avatarRef: !!avatarRef.current 
    });
    if (audioBuffer && avatarLoaded && avatarRef.current) {
      console.log('Setting up audio context and starting animation');
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      // Create a buffer source
      sourceRef.current = audioContext.createBufferSource();
      sourceRef.current.buffer = audioBuffer;

      // Create an analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      // Connect nodes
      sourceRef.current.connect(analyser);
      analyser.connect(audioContext.destination);

      // Start playback
      sourceRef.current.start();

      // Start animation loop
      animateAvatar();

      // Cleanup
      return () => {
        console.log('Cleanup function called');
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (sourceRef.current) {
          sourceRef.current.stop();
          sourceRef.current.disconnect();
        }
        if (analyserRef.current) {
          analyserRef.current.disconnect();
        }
      };
    }
  }, [audioBuffer, avatarLoaded, animateAvatar]);

  const handleAvatarLoaded = () => {
    console.log('Avatar loaded successfully');
    setAvatarLoaded(true);
  };

  const setAvatarRef = (avatar: any) => {
    if (avatar) {
      avatarRef.current = avatar;
      handleAvatarLoaded();
    }
  };

  return (
    <div style={{ width, height }}>
      <Avatar
        modelSrc={avatarUrl}
        onLoaded={handleAvatarLoaded}
        scale={1}
        cameraTarget={1.4}
        cameraInitialDistance={0.8}
        idleRotation={false}
        headMovement={false}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
     
    </div>
  );
});

export default ReadyPlayerMeAvatar;
