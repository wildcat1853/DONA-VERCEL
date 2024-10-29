import React, { useEffect } from 'react';
import { useParticipantTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useAudio } from '../context/AudioContext';

const RoomEventListener: React.FC = () => {
  const { setAudioTrack } = useAudio();
  const tracks = useParticipantTracks(
    [Track.Source.Microphone],
    "AI-Agent"
  );

  useEffect(() => {
    console.log('RoomEventListener - Tracks:', tracks);
    
    if (!tracks.length) {
      console.log('No tracks available');
      return;
    }

    const track = tracks[0];
    const audioTrack = track.publication.track;
    
    console.log('Track received:', {
      isLocal: track.participant.isLocal,
      participantIdentity: track.participant.identity,
      audioTrack: audioTrack?.sid,
    });
    
    if (audioTrack && 
        !track.participant.isLocal && 
        track.participant.identity === "AI-Agent") {
      setAudioTrack(audioTrack);
      console.log('Audio track passed to context:', audioTrack.sid);
    }
  }, [tracks, setAudioTrack]);

  return null;
};

export default RoomEventListener;
