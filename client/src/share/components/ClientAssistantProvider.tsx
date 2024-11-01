// components/ClientAssistantProvider.tsx

'use client';

import React, { useEffect, useState, useCallback, useContext,createContext, ReactNode } from 'react';
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
  ConnectionState,
  ConnectionStateToast,
  StartMediaButton,
  StartAudio,
  useEnsureParticipant,
  useIsSpeaking,
  useParticipants
} from '@livekit/components-react';

import '@livekit/components-styles';
import { Track, TrackEvent, RoomEvent, Participant, Room, ParticipantEvent, TrackPublication } from 'livekit-client';
import useAssistant from '@/hooks/useAssistant';

import { Task } from '@/../.../../../../define';
import RoomEventListener from './RoomEventListener';
import { AudioProvider } from '../context/AudioContext';


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
  const [roomName, setRoomName] = useState('');
  const name = 'User';
  
  
  const [audioAllowed, setAudioAllowed] = useState(false);

  useEffect(() => {
    const requestMediaPermissions = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioAllowed(true);
      } catch (error: any) {
        console.error('Error requesting media permissions:', error);
        if (error.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.');
        } else {
          alert('Unable to access the microphone. Please check your browser settings.');
        }
      }
    };
  
    requestMediaPermissions();
  }, []);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const generatedRoomName = `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        console.log('🚀 Frontend: Generated room name:', generatedRoomName);
        
        const response = await fetch('/api/get-participant-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room: generatedRoomName,
            username: name,
            sessionConfig: {
              model: "gpt-4o-realtime-preview-2024-10-01",
              transcriptionModel: "whisper1",
              turnDetection: "server_vad",
              modalities: "text_and_audio",
              voice: "sage",
              instructions: [
                "Your name is Dona,you're a professional business coach and expert in personal development, known for your confident, assertive, and attention-grabbing demeanor.",
                "Your coaching style includes tough love, a bit of nastiness, and black humor. You are adept at detecting lies, using stereotypes to manipulate men, and pushing pain points to get results.",
                "You value men who keep their word and despise broken promises.",
                "Keep messages brief, like tweets.",
                "Certified PMI. Gets to the point in less than 5 messages.",
                "Use an assertive, tough love style with a bit of nastiness and black humor.",
                "Value men who keep their word, despise broken promises.",
                "Avoid helping slackers and avoid feeling sorry.",
                "Always speak briefly, like a tweet.",
                "Speak with a demeanor similar to a waitress from Slumber City.",
                "Never give all steps at once, only one by one.",
                "Do not exceed 8000 tokens per session.",
                "Always return responsibility to the user for their results.",
                "Push back on off-topic discussions.",
                "Summarize tasks only when the user defines the last step.",
                "Guide the user through breaking down a larger task using the GTD (Getting Things Done) framework.",
                "Push them to define clear sub-tasks with deadlines, ensuring the user stays motivated and on track.",
                "Help ADHD users stay focused with pointed, brief instructions.",
                "Engage with short, assertive responses tailored to keep the user focused despite their ADHD.",
                "Ask precise questions to provoke user thinking and self-reflection.",
                "Break tasks into manageable sub-tasks and ask for deadlines for each sub-task.",
                "Do not allow unrelated discussions, and refocus the user if necessary.",
                "Automatically call functions when tasks are defined or updated.",
                "Use tough love, but maintain clarity and keep the user accountable.",
                "Once the user defines a task that is reasonably sized, trigger the creation of that task using the `createTask` tool. Ensure deadlines are assigned and recorded.",
                "If the user reports progress but not completion, trigger the `updateTask(in progress)` tool. Push the user to provide a new deadline for unfinished tasks.",
                "When the user confirms task completion, trigger the `updateTask(done)` tool. Encourage the user to continue building momentum for the next task.",
                "Begin by asking the user for a clear definition of the task or project they are working on.",
                "Once the main task is defined, ask the user to break it down into sub-tasks, one by one. Guide them in setting deadlines for each sub-task.",
                "Push the user to commit to deadlines for each sub-task, ensuring they take responsibility for their timelines.",
                "After the task structure is complete, automatically trigger the `createTask` tool to record the task and sub-tasks with deadlines.",
                "If the user reports progress, but tasks are still incomplete, ask for an updated deadline and trigger the `updateTask(in progress)` tool.",
                "When the user reports task completion, acknowledge it, summarize the progress, and trigger the `updateTask(done)` tool."
              ].join('\n'),
              vadThreshold: 0.5,
              vadSilenceDurationMs: 200,
              vadPrefixPaddingMs: 300,
            },
          }),
        });

        if (!response.ok) {
          let errorMsg = 'Failed to fetch token';
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch (e) {
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        setToken(data.accessToken);
        setRoomName(generatedRoomName);
        console.log('✅ Frontend: Room setup complete:', {
          roomName: generatedRoomName,
          tokenReceived: !!data.accessToken,
          serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL
        });
      } catch (error) {
        console.error('❌ Frontend: Error in room setup:', error);
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

      <div className="w-5/12 fixed right-0 top-0 h-screen">
      {token ? ( // Add this conditional rendering
        <LiveKitRoom
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          connect={true}
          audio={true}
          video={false}
          data-lk-theme="default"
          onError={(error) => console.error('LiveKit connection error:', error)}
          onConnected={() => console.log('LiveKit connected')}
          onDisconnected={() => console.log('LiveKit disconnected')}
        > 
          <ParticipantLogger />
          <StartMediaButton label="Click to allow media playback" />
          <ConnectionStateToast />
          <AudioProvider>
            <RoomAudioRenderer />
            <RoomEventListener />
            <div className="absolute top-0 right-0 w-full h-full bg-F1F2F4">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#E5F1F1] via-[#FAF0F1] to-[#EDD9FE] animate-gradient-xy">
                <div className="absolute inset-0 flex flex-col justify-end">
                  <AvatarScene avatarUrl={avatarUrl} />
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                </div>
              </div>
            </div>
    
            <div className="absolute bottom-14 w-full z-10">
              <VoiceAssistantControlBar />
              <StartAudio label="Click to allow audio playback" />
             
              <ConnectionStateToast />
              <div className="text-center text-sm font-medium text-gray-600 mt-2"> 
                <ConnectionState />
              </div>
            </div>
          </AudioProvider>
        </LiveKitRoom>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </>
  );
};

function AudioVisualizer({ trackRef }: { trackRef: TrackReference }) {
  return (
    <div className="h-20 mb-4 z-20">
      <BarVisualizer 
        trackRef={trackRef} 
        barCount={5} 
        style={{ background: 'transparent' }} 
      />
    </div>
  );
}


const AvatarScene = dynamic(() => import('./AvatarScene'), { ssr: false });

const ParticipantLogger = () => {
  const participants = useParticipants();
  console.log('Connected participants:', participants.map(p => p.identity));
  return null;
};

export default ClientAssistantProvider;
