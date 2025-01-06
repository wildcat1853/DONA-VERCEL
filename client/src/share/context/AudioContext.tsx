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
    try {
      // Force create new context if none exists or if current one is closed
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        // console.log('Creating new AudioContext (previous state:', audioContextRef.current?.state, ')');
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Always try to resume the context
      if (audioContextRef.current.state !== 'running') {
        // console.log('Resuming AudioContext from state:', audioContextRef.current.state);
        await audioContextRef.current.resume();
      }

      if (audioContextRef.current.state !== 'running') {
        throw new Error(`Failed to start AudioContext. Current state: ${audioContextRef.current.state}`);
      }

      return audioContextRef.current;
    } catch (error) {
      // console.error('Failed to ensure AudioContext:', error);
      // Force recreation of context on error
      if (audioContextRef.current) {
        try {
          await audioContextRef.current.close();
        } catch (e) {
          console.warn('Error closing AudioContext:', e);
        }
        audioContextRef.current = null;
      }
      throw error;
    }
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
      if (!audioTrack?.mediaStreamTrack) {
        console.log('No media stream track available');
        setIsPlaying(false);
        setAnalyser(null);
        return;
      }

      try {
        // Force ensure audio context is running
        const audioContext = await ensureAudioContext();
        // console.log('AudioContext confirmed running:', audioContext.state);

        // Clean up existing audio chain
        if (sourceRef.current) {
          sourceRef.current.disconnect();
          sourceRef.current = null;
        }
        if (analyser) {
          analyser.disconnect();
          setAnalyser(null);
        }

        // Create new audio chain
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 2048;
        analyserNode.smoothingTimeConstant = 0.8;

        const mediaStream = new MediaStream([audioTrack.mediaStreamTrack]);
        sourceRef.current = audioContext.createMediaStreamSource(mediaStream);
        sourceRef.current.connect(analyserNode);

        setAnalyser(analyserNode);
        setIsPlaying(true);
        // console.log('Audio chain successfully configured');

        return () => {
          console.log('Cleaning up audio chain');
          if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
          }
          if (analyserNode) {
            analyserNode.disconnect();
          }
          setAnalyser(null);
          setIsPlaying(false);
        };
      } catch (error) {
        console.error('Audio setup error:', error);
        setIsPlaying(false);
        setAnalyser(null);
        // Attempt recovery by forcing AudioContext recreation on next try
        if (audioContextRef.current) {
          await audioContextRef.current.close().catch(console.error);
          audioContextRef.current = null;
        }
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
