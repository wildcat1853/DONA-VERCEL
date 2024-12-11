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
          }

          // Always try to resume the context when setting up audio
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }

          console.log('AudioContext state:', ctx.state);

          const analyserNode = ctx.createAnalyser();
          analyserNode.fftSize = 2048;
          analyserNode.smoothingTimeConstant = 0.8; // Add smoothing
          
          const mediaStream = new MediaStream([audioTrack.mediaStreamTrack]);
          const source = ctx.createMediaStreamSource(mediaStream);
          
          // Connect the source to both analyser and destination
          source.connect(analyserNode);
          // Don't connect analyser to destination to prevent echo
          // analyserNode.connect(ctx.destination);
          
          setAnalyser(analyserNode);
          setIsPlaying(true);

          audioTrack.mediaStreamTrack.onended = () => {
            console.log('Audio track ended');
            setIsPlaying(false);
          };

          return () => {
            source.disconnect();
            analyserNode.disconnect();
            setAnalyser(null);
            setIsPlaying(false);
            // Don't close the audio context, just clean up connections
          };
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
