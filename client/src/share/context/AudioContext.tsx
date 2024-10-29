import React, { createContext, useContext, useState } from 'react';
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

// AudioContext.tsx

// import React, { createContext, useContext, useState, useEffect } from 'react';
// import { Track } from 'livekit-client';

// interface AudioContextType {
//   audioTrack: Track | null;
//   setAudioTrack: (track: Track | null) => void;
//   analyser: AnalyserNode | null;
//   isPlaying: boolean;
// }

// const AudioStateContext = createContext<AudioContextType>({
//   audioTrack: null,
//   setAudioTrack: () => {},
//   analyser: null,
//   isPlaying: false,
// });

// export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [audioTrack, setAudioTrack] = useState<Track | null>(null);
//   const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
//   const [isPlaying, setIsPlaying] = useState<boolean>(false);

//   useEffect(() => {
//     if (audioTrack) {
//       // Create a new AudioContext
//       const audioContext = new AudioContext();

//       // Create a MediaStreamSource from the audioTrack
//       const source = audioContext.createMediaStreamSource(
//         new MediaStream([audioTrack.mediaStreamTrack])
//       );

//       // Create an AnalyserNode
//       const analyserNode = audioContext.createAnalyser();

//       // Connect the source to the analyser
//       source.connect(analyserNode);

//       // Update state
//       setAnalyser(analyserNode);
//       setIsPlaying(true);

//       return () => {
//         // Disconnect and clean up
//         source.disconnect();
//         analyserNode.disconnect();
//         audioContext.close();
//         setAnalyser(null);
//         setIsPlaying(false);
//       };
//     } else {
//       // If no audioTrack, reset states
//       setAnalyser(null);
//       setIsPlaying(false);
//     }
//   }, [audioTrack]);

//   return (
//     <AudioStateContext.Provider value={{ 
//       audioTrack, 
//       setAudioTrack, 
//       analyser, 
//       isPlaying 
//     }}>
//       {children}
//     </AudioStateContext.Provider>
//   );
// };

// export const useAudio = () => useContext(AudioStateContext);
