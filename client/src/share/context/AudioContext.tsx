import React, { createContext, useContext, useState, useEffect } from 'react';
import { Track } from 'livekit-client';

interface AudioContextType {
  audioTrack: Track | null;
  setAudioTrack: (track: Track | null) => void;
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

const AudioContext = createContext<AudioContextType>({
  audioTrack: null,
  setAudioTrack: () => {},
  analyser: null,
  isPlaying: false,
});

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audioTrack, setAudioTrack] = useState<Track | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Cleanup function for audio context
  useEffect(() => {
    return () => {
      if (audioContext) {
        audioContext.close().catch(console.error);
        setAudioContext(null);
      }
    };
  }, []);

  useEffect(() => {
    console.log('AudioContext useEffect triggered with track:', {
      hasTrack: !!audioTrack,
      trackSid: audioTrack?.sid,
      hasMediaStreamTrack: !!audioTrack?.mediaStreamTrack,
      audioContextState: audioContext?.state
    });

    let cleanup: (() => void) | undefined;

    const setupAudio = async () => {
      // Clean up previous connections
      if (cleanup) {
        cleanup();
      }

      // Close previous context if it exists
      if (audioContext) {
        await audioContext.close();
        setAudioContext(null);
      }

      if (audioTrack?.mediaStreamTrack) {
        try {
          // Create new AudioContext for each setup
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          setAudioContext(ctx);

          const analyserNode = ctx.createAnalyser();
          analyserNode.fftSize = 2048;
          analyserNode.smoothingTimeConstant = 0.8;
          
          const mediaStream = new MediaStream([audioTrack.mediaStreamTrack]);
          const source = ctx.createMediaStreamSource(mediaStream);
          
          source.connect(analyserNode);
          
          setAnalyser(analyserNode);
          setIsPlaying(true);

          cleanup = () => {
            console.log('Cleaning up audio connections');
            source.disconnect();
            analyserNode.disconnect();
            setAnalyser(null);
            setIsPlaying(false);
            ctx.close().catch(console.error);
          };

          return cleanup;
        } catch (error) {
          console.error('Error in audio setup:', error);
          setIsPlaying(false);
          setAnalyser(null);
        }
      } else {
        setIsPlaying(false);
        setAnalyser(null);
      }
    };

    setupAudio();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [audioTrack]);

  return (
    <AudioContext.Provider value={{ 
      audioTrack, 
      setAudioTrack, 
      analyser,
      isPlaying 
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => useContext(AudioContext);
