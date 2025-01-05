import React, { useEffect, useState } from 'react';
import { useParticipantTracks, useParticipants } from '@livekit/components-react';
import { Track, Participant } from 'livekit-client';
import { useAudio } from '../context/AudioContext';

const RoomEventListener: React.FC = () => {
  const { setAudioTrack, ensureAudioContext } = useAudio();
  const participants = useParticipants();
  const [aiAgentIdentity, setAiAgentIdentity] = useState<string | null>(null);

  // Detect AI agent participant
  useEffect(() => {
    console.log('All participants:', participants.map(p => ({
      identity: p.identity,
      metadata: p.metadata,
      isLocal: p.isLocal
    })));

    // Find the non-local participant (should be the AI agent)
    const aiParticipant = participants.find(p => !p.isLocal);
    if (aiParticipant) {
      console.log('AI Agent detected:', aiParticipant.identity);
      setAiAgentIdentity(aiParticipant.identity);
    }
  }, [participants]);

  const tracks = useParticipantTracks(
    [Track.Source.Microphone],
    aiAgentIdentity || undefined
  );

  useEffect(() => {
    if (!aiAgentIdentity) {
      console.log('No AI agent identity yet');
      return;
    }

    if (!tracks.length) {
      console.log(`No tracks found for AI agent: ${aiAgentIdentity}`);
      return;
    }

    const track = tracks[0];
    const audioTrack = track.publication.track;
    
    console.log('Track detected:', {
      participantIdentity: track.participant.identity,
      isAIAgent: track.participant.identity === aiAgentIdentity,
      trackSource: track.publication.source,
      isMuted: audioTrack?.isMuted,
    });
    
    if (!audioTrack || track.participant.identity !== aiAgentIdentity) {
      console.log('Skipping track - not AI agent or no audio track');
      return;
    }

    const setupAudioTrack = async () => {
      try {
        // Ensure AudioContext is running before setting up track
        await ensureAudioContext();
        
        if (!audioTrack.isMuted && audioTrack.mediaStreamTrack) {
          console.log('Setting up AI agent audio track');
          setAudioTrack(audioTrack);
        }
      } catch (error) {
        console.error('Error setting up audio track:', error);
      }
    };

    const handleMuted = () => {
      console.log('AI agent track muted');
      setAudioTrack(null);
    };

    const handleUnmuted = async () => {
      console.log('AI agent track unmuted');
      if (audioTrack.mediaStreamTrack) {
        await setupAudioTrack();
      }
    };

    setupAudioTrack();

    audioTrack.on('muted', handleMuted);
    audioTrack.on('unmuted', handleUnmuted);

    return () => {
      console.log('Cleaning up AI agent track listeners');
      audioTrack.off('muted', handleMuted);
      audioTrack.off('unmuted', handleUnmuted);
    };
  }, [tracks, setAudioTrack, aiAgentIdentity, ensureAudioContext]);

  return null;
};

export default RoomEventListener;
