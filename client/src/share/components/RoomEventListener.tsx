import React, { useEffect } from 'react';
import { useParticipantTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';

const RoomEventListener: React.FC = () => {
  const tracks = useParticipantTracks(
    [Track.Source.Microphone],  // First parameter: sources array
    "AI-Agent"                  // Second parameter: participant identity
  );

  useEffect(() => {
    if (!tracks.length) return;

    const track = tracks[0];
    const audioTrack = track.publication.track;
    
    // Debug logs
    console.log('Track received:', {
      isLocal: track.participant.isLocal,
      participantIdentity: track.participant.identity,
      audioTrack: audioTrack
    });
    
    // Only attach if:
    // 1. It's a valid audio track
    // 2. It's from a remote participant (not local)
    // 3. It's from the AI agent
    if (audioTrack && 
        !track.participant.isLocal && 
        track.participant.identity === "AI-Agent") {
      const audioElement = audioTrack.attach();
      console.log('Agent Audio Track Attached:', audioTrack);
      
      return () => {
        audioTrack.detach();
        audioElement.remove();
      };
    } else {
      console.log('Track filtered out due to conditions not met');
    }
  }, [tracks]);

  return null;
};

export default RoomEventListener;
