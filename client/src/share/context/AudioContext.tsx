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

  useEffect(() => {
    console.log('AudioContext useEffect triggered with track:', {
      hasTrack: !!audioTrack,
      trackSid: audioTrack?.sid,
      hasMediaStreamTrack: !!audioTrack?.mediaStreamTrack,
      audioContextState: audioContext?.state
    });

    const setupAudio = async () => {
      if (audioTrack?.mediaStreamTrack) {
        try {
          // Create or resume AudioContext
          let ctx = audioContext;
          if (!ctx) {
            ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            setAudioContext(ctx);
          } else if (ctx.state === 'suspended') {
            await ctx.resume();
          }

          console.log('AudioContext state:', ctx.state);

          const analyserNode = ctx.createAnalyser();
          analyserNode.fftSize = 2048; // Ensure consistent FFT size
          
          const mediaStream = new MediaStream([audioTrack.mediaStreamTrack]);
          const source = ctx.createMediaStreamSource(mediaStream);
          source.connect(analyserNode);
          
          setAnalyser(analyserNode);
          setIsPlaying(true);

          audioTrack.mediaStreamTrack.onended = () => {
            console.log('Audio track ended');
            setIsPlaying(false);
          };

          return () => {
            console.log('Cleanup triggered');
            audioTrack.mediaStreamTrack.onended = null;
            source.disconnect();
            analyserNode.disconnect();
            setAnalyser(null);
            setIsPlaying(false);
          };
        } catch (error) {
          console.error('Error in audio setup:', error);
          setIsPlaying(false);
          setAnalyser(null);
        }
      } else {
        setIsPlaying(false);
      }
    };

    setupAudio();
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
