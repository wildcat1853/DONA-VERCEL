import React, { createContext, useContext, useState, useEffect } from 'react';
import { Track } from 'livekit-client';

interface AudioContextType {
  audioTrack: Track | null;
  setAudioTrack: (track: Track | null) => void;
  analyser: AnalyserNode | null;
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
}

const AudioContext = createContext<AudioContextType>({
  audioTrack: null,
  setAudioTrack: () => {},
  analyser: null,
  audioBuffer: null,
  isPlaying: false,
});

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audioTrack, setAudioTrack] = useState<Track | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    if (audioTrack) {
      console.log('Setting up audio processing for track:', audioTrack.sid);
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048;

      try {
        // Create MediaStream from the LiveKit track
        const mediaStream = new MediaStream([audioTrack.mediaStreamTrack]);
        const source = audioContext.createMediaStreamSource(mediaStream);
        
        // Connect to analyser
        source.connect(analyserNode);
        
        // Create buffer for lip sync
        const processor = audioContext.createScriptProcessor(2048, 1, 1);
        const chunks: Float32Array[] = [];
        
        processor.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          chunks.push(new Float32Array(input));
          
          if (chunks.length >= 10) {
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const buffer = audioContext.createBuffer(1, totalLength, audioContext.sampleRate);
            const channelData = buffer.getChannelData(0);
            
            let offset = 0;
            chunks.forEach(chunk => {
              channelData.set(chunk, offset);
              offset += chunk.length;
            });
            
            setAudioBuffer(buffer);
            setIsPlaying(true);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
        setAnalyser(analyserNode);

        console.log('Audio processing setup complete for track:', audioTrack.sid);

        return () => {
          console.log('Cleaning up audio processing for track:', audioTrack.sid);
          source.disconnect();
          analyserNode.disconnect();
          processor.disconnect();
          audioContext.close();
          setAnalyser(null);
          setAudioBuffer(null);
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
      audioBuffer,
      isPlaying 
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => useContext(AudioContext);
