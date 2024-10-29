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

  useEffect(() => {
    if (audioTrack) {
      console.log('Audio track received:', audioTrack.sid);
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048;

      try {
        const mediaStream = new MediaStream([audioTrack.mediaStreamTrack]);
        console.log('Created MediaStream:', {
          id: mediaStream.id,
          active: mediaStream.active
        });

        const source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(analyserNode);
        
        setAnalyser(analyserNode);
        setIsPlaying(true);
        
        console.log('Audio processing setup complete');

        return () => {
          console.log('Cleaning up audio processing');
          source.disconnect();
          analyserNode.disconnect();
          audioContext.close();
          setAnalyser(null);
          setIsPlaying(false);
        };
      } catch (error) {
        console.error('Error setting up audio processing:', error);
      }
    }
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
