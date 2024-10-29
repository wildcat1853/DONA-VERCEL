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
    console.log('AudioContext useEffect triggered with track:', {
      hasTrack: !!audioTrack,
      trackSid: audioTrack?.sid,
      hasMediaStreamTrack: !!audioTrack?.mediaStreamTrack
    });

    if (audioTrack?.mediaStreamTrack) {
      console.log('Setting up audio processing...');
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('AudioContext created');
      
      const analyserNode = audioContext.createAnalyser();
      console.log('AnalyserNode created');

      try {
        const mediaStream = new MediaStream([audioTrack.mediaStreamTrack]);
        console.log('MediaStream created:', mediaStream.id);

        const source = audioContext.createMediaStreamSource(mediaStream);
        console.log('MediaStreamSource created');
        
        source.connect(analyserNode);
        console.log('Source connected to analyser');
        
        setAnalyser(analyserNode);
        setIsPlaying(true);
        
        return () => {
          console.log('Cleanup triggered');
          source.disconnect();
          analyserNode.disconnect();
          audioContext.close();
          setAnalyser(null);
          setIsPlaying(false);
        };
      } catch (error) {
        console.error('Error in audio setup:', error);
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
