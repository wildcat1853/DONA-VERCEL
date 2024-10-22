// components/ClientAssistantProvider.tsx

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Separator } from '../ui/separator';
import TaskTabs from './TaskTabs';
import Image from 'next/image';
import start from '@/../public/stars.svg';
import dynamic from 'next/dynamic';

import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useRoomContext,
  useVoiceAssistant,
  BarVisualizer,
  VoiceAssistantControlBar,
  TrackReference,
  useStartAudio,
  ConnectionState
} from '@livekit/components-react';

import '@livekit/components-styles';
import { Track, TrackEvent, RoomEvent, Participant, Room, ParticipantEvent, TrackPublication } from 'livekit-client';
import useAssistant from '@/hooks/useAssistant';

import { Task } from '@/../.../../../../define';

type Props = {
  projectId: string;
  projectThreadId: string | undefined;
  serverMessages: any[];
  tasks: Task[];
};

const avatarUrl = 'https://models.readyplayer.me/670c2238e4f39be58fe308ae.glb?morphTargets=mouthSmile,mouthOpen,mouthFunnel,browOuterUpLeft,browOuterUpRight,tongueOut,ARKit';

const ClientAssistantProvider: React.FC<Props> = ({
  projectId,
  projectThreadId,
  serverMessages,
  tasks,
}) => {
  const assistantData = useAssistant({ projectId, projectThreadId });
  const [token, setToken] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const roomName = 'Dona-Room';
  const name = 'User';

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch(`/api/get-participant-token?room=${roomName}&username=${name}`);
        const data = await response.json();
        setToken(data.token);
      } catch (error) {
        console.error('Error fetching LiveKit token:', error);
      }
    };
    fetchToken();
  }, []);



  return (
    <>
      <div className="w-7/12 flex justify-center max-h-screen overflow-auto">
        <div className="w-2/3 flex flex-col gap-9 mt-32">
          <div>
            <div className="flex gap-4">
              <Image src={start} alt="stars" />
              <p className="font-semibold text-5xl tracking-tight">Project name</p>
            </div>
          </div>
          <Separator className="bg-gray-200" />
          <TaskTabs tasks={tasks} assistantData={assistantData} />
        </div>
      </div>

      <div className="w-5/12 relative h-screen">
        <LiveKitRoom
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          connect={true}
          audio={true}
          video={false}
          data-lk-theme="default"
          onError={(error) => console.error('LiveKit connection error:', error)}
        >
          <RoomAudioRenderer />
          <div className="absolute top-0 right-0 w-full h-full bg-F1F2F4">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#E5F1F1] via-[#FAF0F1] to-[#EDD9FE] animate-gradient-xy">
              <div className="absolute inset-0 flex flex-col justify-end">
                <SimpleVoiceAssistant />
                <AvatarScene avatarUrl={avatarUrl} audioBuffer={null} />
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
              </div>
            </div>
          </div>
          
         
          <VoiceAssistantControlBar />
        </LiveKitRoom>
      </div>
    </>
  );
};

function SimpleVoiceAssistant() {
  const { state, audioTrack } = useVoiceAssistant();
  const room = useRoomContext();
  const trackReferences: TrackReference[] = useTracks([Track.Source.Microphone]);

  useEffect(() => {
    if (room && room.localParticipant) {
      const handleIsSpeakingChanged = () => {
        console.log('IsSpeakingChanged event:', room.localParticipant.isSpeaking);
        console.log('Track References:', trackReferences);
      };

      room.localParticipant.on(ParticipantEvent.IsSpeakingChanged, handleIsSpeakingChanged);

      return () => {
        room.localParticipant.off(ParticipantEvent.IsSpeakingChanged, handleIsSpeakingChanged);
      };
    }
  }, [room]);


 
  return (
    <div className="h-20 mb-4 z-20">
      <BarVisualizer 
        state={state} 
        barCount={5} 
        trackRef={audioTrack} 
        style={{ 
          background: 'transparent',
          // You can add other styles here if needed
        }} 
      />
    </div>
  );
}

const AvatarScene = dynamic(() => import('./AvatarScene'), { ssr: false });

export default ClientAssistantProvider;
