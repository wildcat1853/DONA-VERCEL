// components/ReadyPlayerMeAvatar.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from '@readyplayerme/visage';

interface ReadyPlayerMeAvatarProps {
  avatarUrl: string;
  width?: string;
  height?: string;
  audioBuffer?: AudioBuffer | null;
  text?: string;
}

interface PhonemeEvent {
  phoneme: string;
  startTime: number;
  duration: number;
}

const phonemeToVisemeMap: { [key: string]: string } = {
  'AA': 'viseme_aa',
  'AE': 'viseme_aa',
  'AH': 'viseme_aa',
  'AO': 'viseme_aa',
  'EH': 'viseme_E',
  'IH': 'viseme_I',
  'IY': 'viseme_I',
  'OW': 'viseme_O',
  'UW': 'viseme_U',
};

const ReadyPlayerMeAvatar: React.FC<ReadyPlayerMeAvatarProps> = ({ 
  avatarUrl, 
  width = '100%', 
  height = '100%',
  audioBuffer,
  text
}) => {
  const [feeling, setFeeling] = useState<{ [key: string]: number }>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const phonemeEventsRef = useRef<PhonemeEvent[]>([]);

  const happy = {
    mouthOpen: -0.3,
    mouthSmile: 0,
    eyeSquintLeft: 0.1,
    eyeSquintRight: 0.1,
    mouthSmileLeft: 0.6,
    mouthSmileRight: 0.6,
    browInnerUp: 0.2,
    browOuterUpLeft: 0.2,
    browOuterUpRight: 0.2,
    cheekPuff: 0.1,
    cheekSquintLeft: 0.1,
    cheekSquintRight: 0.1
  };

  const sad = {
    mouthOpen: -0.3,
    mouthFrownLeft: 1,
    mouthFrownRight: 1,
    eyeBlinkLeft: 0.2,
    eyeBlinkRight: 0.2,
    browInnerUp: -0.2,
    browDownLeft: 0.4,
    browDownRight: 0.4,
    mouthStretchLeft: -0.1,
    mouthStretchRight: -0.1,
    cheekPuff: 0.3,
    cheekSquintLeft: 0.3,
    cheekSquintRight: 0.3,
    noseSneerLeft: -0.1,
    noseSneerRight: -0.1
  };

  const feelings = [
    { label: "HAPPY", onClick: () => setFeeling(happy) },
    { label: "SAD", onClick: () => setFeeling(sad) },
    { label: "NEUTRAL", onClick: () => setFeeling({}) }
  ];

  const synthesizeSpeech = async (text: string): Promise<string> => {
    const response = await fetch('/api/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Failed to synthesize speech');
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  };

  const processPhonemes = async (words: string[]): Promise<string[]> => {
    const response = await fetch('/api/process-phonemes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words }),
    });

    if (!response.ok) {
      throw new Error('Failed to process phonemes');
    }

    const { phonemes } = await response.json();
    return phonemes;
  };

  async function textToPhonemes(text: string): Promise<string[]> {
    const words = text.split(' ');
    return await processPhonemes(words);
  }

  function estimatePhonemeTimings(phonemes: string[], totalDuration: number): PhonemeEvent[] {
    const totalPhonemes = phonemes.length;
    const phonemeDuration = totalDuration / totalPhonemes;

    return phonemes.map((phoneme, index) => ({
      phoneme,
      startTime: index * phonemeDuration,
      duration: phonemeDuration,
    }));
  }

  function updateMorphTargets(viseme: string) {
    setFeeling(prevFeeling => ({
      ...prevFeeling,
      [viseme]: 1, // Set the active viseme to 1
      // Reset other visemes to 0
      ...Object.keys(phonemeToVisemeMap).reduce((acc, key) => {
        if (phonemeToVisemeMap[key] !== viseme) {
          acc[phonemeToVisemeMap[key]] = 0;
        }
        return acc;
      }, {} as { [key: string]: number })
    }));
  }

  function resetMorphTargets() {
    setFeeling(prevFeeling => ({
      ...prevFeeling,
      ...Object.values(phonemeToVisemeMap).reduce((acc, viseme) => {
        acc[viseme] = 0;
        return acc;
      }, {} as { [key: string]: number })
    }));
  }

  function animateAvatar() {
    if (!audioContextRef.current) return;

    const currentTime = audioContextRef.current.currentTime - startTimeRef.current;

    const currentPhonemeEvent = phonemeEventsRef.current.find(event =>
      currentTime >= event.startTime && currentTime < event.startTime + event.duration
    );

    if (currentPhonemeEvent) {
      const viseme = phonemeToVisemeMap[currentPhonemeEvent.phoneme];
      if (viseme) {
        updateMorphTargets(viseme);
      }
    } else {
      resetMorphTargets();
    }

    requestAnimationFrame(animateAvatar);
  }

  useEffect(() => {
    if (audioBuffer && text) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      (async () => {
        const phonemes = await textToPhonemes(text);
        if (audioContextRef.current) {
          phonemeEventsRef.current = estimatePhonemeTimings(phonemes, audioBuffer.duration);

          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContextRef.current.destination);

          startTimeRef.current = audioContextRef.current.currentTime;
          source.start();
          animateAvatar();
        }
      })();
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioBuffer, text]);

  useEffect(() => {
    console.log('Emotion updated:', feeling);
  }, [feeling]);

  return (
    <div style={{ width, height }}>
      <Avatar
        key={JSON.stringify(feeling)}
        modelSrc={avatarUrl}
        onLoaded={() => console.log('Avatar loaded successfully')}
        scale={1}
        cameraTarget={1.4}
        cameraInitialDistance={0.8}
        emotion={feeling}
        idleRotation={false}
        headMovement={false}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
      <div>
        {feelings.map(({ label, onClick }) => (
          <button key={label} onClick={onClick}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReadyPlayerMeAvatar;
