import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Track } from 'livekit-client';

interface AudioContextType {
  audioTrack: Track | null;
  setAudioTrack: (track: Track | null) => void;
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  audioContext: AudioContext | null;
  ensureAudioContext: () => Promise<AudioContext>;
}

const AudioContext = createContext<AudioContextType>({
  audioTrack: null,
  setAudioTrack: () => {},
  analyser: null,
  isPlaying: false,
  audioContext: null,
  ensureAudioContext: async () => { throw new Error('Not implemented'); }
});

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audioTrack, setAudioTrack] = useState<Track | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const ensureAudioContext = async () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'suspended') {
      console.log('AudioContext status:', {
        exists: !!audioContextRef.current,
        state: audioContextRef.current?.state,
        timestamp: Date.now()
      });
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
      console.log('AudioContext resumed:', audioContextRef.current.state);
    }

    return audioContextRef.current;
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const setupAudioChain = async () => {
      if (!audioTrack?.mediaStreamTrack || !isPlaying) {
        console.log('Audio chain status:', {
          hasTrack: !!audioTrack,
          hasMediaStreamTrack: !!audioTrack?.mediaStreamTrack,
          isPlaying,
          timestamp: Date.now()
        });
      }

      if (!audioTrack?.mediaStreamTrack) {
        setIsPlaying(false);
        setAnalyser(null);
        return;
      }

      try {
        const audioContext = await ensureAudioContext();
        
        // Clean up previous chain
        if (sourceRef.current || analyser) {
          if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
          }
          if (analyser) {
            analyser.disconnect();
            setAnalyser(null);
          }
        }

        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 2048;
        analyserNode.smoothingTimeConstant = 0.8;
        
        const mediaStream = new MediaStream([audioTrack.mediaStreamTrack]);
        sourceRef.current = audioContext.createMediaStreamSource(mediaStream);
        sourceRef.current.connect(analyserNode);
        
        setAnalyser(analyserNode);
        setIsPlaying(true);

        console.log('Audio chain successfully configured');

        return () => {
          if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
          }
          analyserNode.disconnect();
          setAnalyser(null);
          setIsPlaying(false);
        };
      } catch (error) {
        console.error('Audio setup error:', error);
        setIsPlaying(false);
        setAnalyser(null);
      }
    };

    setupAudioChain();
  }, [audioTrack]);

  // Only log significant state changes
  useEffect(() => {
    if (!audioTrack || !analyser || !isPlaying) {
      console.log('Audio state changed:', {
        hasTrack: !!audioTrack,
        hasAnalyser: !!analyser,
        isPlaying,
        timestamp: Date.now()
      });
    }
  }, [audioTrack, analyser, isPlaying]);

  return (
    <AudioContext.Provider value={{ 
      audioTrack, 
      setAudioTrack, 
      analyser,
      isPlaying,
      audioContext: audioContextRef.current,
      ensureAudioContext
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => useContext(AudioContext);
