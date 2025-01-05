import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Initialize AudioContext once
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!audioContextRef.current || !audioTrack?.mediaStreamTrack) {
      setIsPlaying(false);
      setAnalyser(null);
      return;
    }

    try {
      // Clean up previous source if it exists
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }

      const analyserNode = audioContextRef.current.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0.8;
      
      const mediaStream = new MediaStream([audioTrack.mediaStreamTrack]);
      sourceRef.current = audioContextRef.current.createMediaStreamSource(mediaStream);
      sourceRef.current.connect(analyserNode);
      
      setAnalyser(analyserNode);
      setIsPlaying(true);

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
      console.error('Error in audio setup:', error);
      setIsPlaying(false);
      setAnalyser(null);
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
