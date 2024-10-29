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
    if (!tracks.length) return;

    const track = tracks[0];
    const audioTrack = track.publication.track;
    
    if (!audioTrack || track.participant.identity !== "AI-Agent") return;

    // Set up track event listeners
    const handleMuted = () => {
      console.log('Track muted - clearing audio track');
      setAudioTrack(null);
    };

    const handleUnmuted = () => {
      console.log('Track unmuted - setting audio track');
      if (audioTrack.mediaStreamTrack) {
        setAudioTrack(audioTrack);
      }
    };

    // Initial state
    if (!audioTrack.isMuted && audioTrack.mediaStreamTrack) {
      console.log('Initial track setup - setting audio track');
      setAudioTrack(audioTrack);
    }

    // Add listeners
    audioTrack.on('muted', handleMuted);
    audioTrack.on('unmuted', handleUnmuted);

    return () => {
      audioTrack.off('muted', handleMuted);
      audioTrack.off('unmuted', handleUnmuted);
    };
  }, [tracks, setAudioTrack]);

  return null;
};

export default RoomEventListener;
