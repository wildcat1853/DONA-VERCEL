import React, { useEffect, useState, useCallback } from 'react';
import { useParticipantTracks, useParticipants } from '@livekit/components-react';
import { Track, Participant } from 'livekit-client';
import { useAudio } from '../context/AudioContext';

const RoomEventListener: React.FC = () => {
  const { setAudioTrack, ensureAudioContext } = useAudio();
  const participants = useParticipants();
  const [aiAgentIdentity, setAiAgentIdentity] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Detect AI agent participant
  useEffect(() => {
    console.log('All participants:', participants.map(p => ({
      identity: p.identity,
      metadata: p.metadata,
      isLocal: p.isLocal
    })));

    const aiParticipant = participants.find(p => !p.isLocal);
    if (aiParticipant) {
      console.log('AI Agent detected:', aiParticipant.identity);
      setAiAgentIdentity(aiParticipant.identity);
      // Reset retry count when we find the AI agent
      setRetryCount(0);
    }
  }, [participants]);

  const tracks = useParticipantTracks(
    [Track.Source.Microphone],
    aiAgentIdentity || undefined
  );

  const setupAudioTrack = useCallback(async (audioTrack: Track) => {
    try {
      // Ensure AudioContext is running before setting up track
      await ensureAudioContext();
      
      if (!audioTrack.isMuted && audioTrack.mediaStreamTrack) {
        console.log('Setting up AI agent audio track');
        setAudioTrack(audioTrack);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting up audio track:', error);
      return false;
    }
  }, [ensureAudioContext, setAudioTrack]);

  // Main track subscription effect
  useEffect(() => {
    if (!aiAgentIdentity) {
      console.log('No AI agent identity yet');
      return;
    }

    if (!tracks.length) {
      console.log(`No tracks found for AI agent: ${aiAgentIdentity}`);
      // Retry logic for track subscription
      if (retryCount < 3) {
        const timeoutId = setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 1000);
        return () => clearTimeout(timeoutId);
      }
      return;
    }

    const track = tracks[0];
    const audioTrack = track.publication.track;
    
    console.log('Track detected:', {
      participantIdentity: track.participant.identity,
      isAIAgent: track.participant.identity === aiAgentIdentity,
      trackSource: track.publication.source,
      isMuted: audioTrack?.isMuted,
      retryCount
    });
    
    if (!audioTrack || track.participant.identity !== aiAgentIdentity) {
      console.log('Skipping track - not AI agent or no audio track');
      return;
    }

    let isSubscribed = false;

    const handleMuted = () => {
      console.log('AI agent track muted');
      setAudioTrack(null);
      isSubscribed = false;
    };

    const handleUnmuted = async () => {
      console.log('AI agent track unmuted');
      if (audioTrack.mediaStreamTrack && !isSubscribed) {
        isSubscribed = await setupAudioTrack(audioTrack);
      }
    };

    const setupTrack = async () => {
      if (!isSubscribed) {
        isSubscribed = await setupAudioTrack(audioTrack);
      }
    };

    // Initial setup
    setupTrack();

    // Subscribe to track events
    audioTrack.on('muted', handleMuted);
    audioTrack.on('unmuted', handleUnmuted);

    // Setup periodic check for track subscription
    const checkInterval = setInterval(async () => {
      if (!isSubscribed && audioTrack.mediaStreamTrack && !audioTrack.isMuted) {
        console.log('Attempting to resubscribe to track...');
        isSubscribed = await setupAudioTrack(audioTrack);
      }
    }, 2000);

    return () => {
      console.log('Cleaning up AI agent track listeners');
      audioTrack.off('muted', handleMuted);
      audioTrack.off('unmuted', handleUnmuted);
      clearInterval(checkInterval);
      isSubscribed = false;
    };
  }, [tracks, setAudioTrack, aiAgentIdentity, ensureAudioContext, setupAudioTrack, retryCount]);

  return null;
};

export default RoomEventListener;
