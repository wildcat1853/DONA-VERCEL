// components/ClientAssistantProvider.tsx

'use client';

import React, { useEffect, useState, useCallback, useContext, createContext, ReactNode } from 'react';
import { Separator } from '../ui/separator';
import Image from 'next/image';
import start from '@/../public/stars.svg';
import dynamic from 'next/dynamic';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useRoomContext,
  useLocalParticipant,
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
  useParticipants,
  Chat,
  useEnsureRoom
} from '@livekit/components-react';

import '@livekit/components-styles';
import { Track, TrackEvent, RoomEvent, Participant, Room, ParticipantEvent, TrackPublication } from 'livekit-client';
import useAssistant from '@/hooks/useAssistant';

import { Task } from '@/define/define';
import RoomEventListener from './RoomEventListener';
import { AudioProvider } from '../context/AudioContext';
import { assistantInstructions } from '../config/assistantInstructions';
import ProjectName from './ProjectName';
import CircularProgress from './CircularProgress';
import { onboardingInstructions } from '../config/onboardingInstructions';
import { Badge } from "../ui/badge";
import { HelpCircle, MessageCircle, ListTodo } from 'lucide-react';
import TaskTabs, { TaskTabsWithLiveKit } from './TaskTabs';
import { SessionProvider } from "next-auth/react";
import AccountDropdown from './AccountDropdown';

type Props = {
  projectId: string;
  projectThreadId: string | undefined;
  serverMessages: any[];
  tasks: Task[];
  userId: string;
};

const avatarUrl = 'https://models.readyplayer.me/670c2238e4f39be58fe308ae.glb?morphTargets=mouthSmile,mouthOpen,mouthFunnel,browOuterUpLeft,browOuterUpRight,tongueOut,ARKit';

const getServerUrl = () => {
  console.log('🔧 Connecting to:', process.env.NEXT_PUBLIC_LIVEKIT_URL);
  return process.env.NEXT_PUBLIC_LIVEKIT_URL;
};

const ClientAssistantProvider: React.FC<Props> = (props) => {
  const { projectId, projectThreadId, userId } = props;
  const assistantData = useAssistant({ projectId, projectThreadId, userId });

  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [token, setToken] = useState('');
  const [roomName, setRoomName] = useState('');
  const name = 'User';
  
  console.log('Debug State:', {
    projectId
  });
  
  const [audioAllowed, setAudioAllowed] = useState(false);
  const [showMicrophoneDialog, setShowMicrophoneDialog] = useState(false);
  const [showTasks, setShowTasks] = useState(true);

  useEffect(() => {
    const requestMediaPermissions = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setShowPermissionDialog(false);
      } catch (error) {
        console.error('Error requesting media permissions:', error);
        setShowPermissionDialog(true);
      }
    };
  
    requestMediaPermissions();
  }, []);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const generatedRoomName = `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        
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
              instructions: assistantInstructions.join('\n'),
              metadata: {
                userId: userId
              }
            },
          }),
        });

        const data = await response.json();
        setToken(data.accessToken);
        setRoomName(generatedRoomName);
      } catch (error) {
        console.error('❌ Frontend: Error in room setup:', error);
      }
    };

    fetchToken();
  }, [userId]);

  // Rest of your component remains the same
  return (
    <SessionProvider>
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enable Microphone Access</DialogTitle>
            <DialogDescription>
              Voice interaction requires microphone access to work properly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <svg
                  className="w-6 h-12 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium">How to enable:</h4>
                <ol className="mt-2 text-sm text-gray-500 list-decimal list-inside space-y-1">
                  <li>Click the camera icon in your browser&apos;s address bar</li>
                  <li>Select &quot;Allow&quot; for microphone access</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => window.location.reload()}
                className="w-full mt-4 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {token ? (
        <LiveKitRoom
          token={token}
          serverUrl={getServerUrl()}
          connect={true}
          audio={true}
          video={false}
          data-lk-theme="default"
          connectOptions={{
            autoSubscribe: true,
            maxRetries: 3,
          }}
          onError={(error) => {
            console.error('LiveKit connection error:', error);
            console.log('Current server URL:', getServerUrl());
          }}
          onConnected={() => console.log('LiveKit connected to:', getServerUrl())}
          onDisconnected={() => console.log('LiveKit disconnected from:', getServerUrl())}
          className="bg-white"
        > 
          <AudioProvider>
            <LiveKitStateManager 
              tasks={props.tasks} 
              userId={userId}
            />
            <div className="fixed top-4 left-4 z-50">
              <AccountDropdown />
            </div>
            <div className="flex flex-col md:flex-row h-screen">
              {/* Desktop Tasks Section */}
              <div className="hidden md:block w-7/12 max-h-screen overflow-auto bg-white">
                <div className="w-2/3 mx-auto flex flex-col gap-9 mt-20">
                  <ProjectName 
                    initialName={"Tasks"} 
                    projectId={projectId}
                    className="text-gray-900 text-3xl font-semibold"
                  />
                  <Separator className="bg-gray-200" />
                  <TaskTabs 
                    tasks={props.tasks} 
                    assistantData={assistantData} 
                    projectId={projectId}
                  />
                </div>
              </div>

              {/* Assistant Section with Mobile Bottom Sheet */}
              <div className="w-full md:w-5/12 fixed md:right-0 top-0 h-screen">
                <RoomAudioRenderer />
                <RoomEventListener />
                
                {/* Avatar and Background */}
                <div className="absolute top-0 right-0 w-full h-full bg-F1F2F4">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#E5F1F1] via-[#FAF0F1] to-[#EDD9FE] animate-gradient-xy">
                    <div className="absolute inset-0 flex flex-col justify-end">
                      <AvatarScene avatarUrl={avatarUrl} ></AvatarScene>
                     
                      <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                    </div>
                  </div>
                </div>

                {/* Mobile Recent Tasks Panel */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm rounded-t-3xl shadow-lg z-40">
                  <div className="px-4 py-6">
                    <div className="max-h-[40vh] overflow-y-auto">
                      <TaskTabsWithLiveKit 
                        tasks={props.tasks} 
                        assistantData={assistantData} 
                        projectId={projectId}
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop Controls */}
                <div className="absolute bottom-14 w-full z-10 hidden md:block">
                  {/* Dona's Status Indicator */}
                  <div className="flex justify-center mb-6">
                    <div className="px-6 py-3 rounded-full bg-emerald-500/15 backdrop-blur-md border border-emerald-100/20">
                      <span className="text-emerald-600 font-medium text-base">
                        Good mood ✨
                      </span>
                    </div>
                  </div>

                  <VoiceAssistantControlBar />
                  {/* <AudioVisualizer /> */}
                  <StartAudio label="Click to allow audio playback" />
                  <ConnectionStateToast />
                </div>

                {/* Onboarding Controls */}
                <div className="md:absolute md:top-4 md:right-4 fixed bottom-24 right-4 flex items-center gap-3 z-50">
                 
                </div>
              </div>
            </div>
          </AudioProvider>
        </LiveKitRoom>
      ) : (
        <p>Loading...</p>
      )}
    </SessionProvider>
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

// New component to handle LiveKit state management
const LiveKitStateManager = ({ 
  tasks, 
  userId, 
}: { 
  tasks: Task[], 
  userId: string,
}) => {
  const room = useEnsureRoom();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    console.log('Room state:', room.state);
    console.log('Local participant:', localParticipant);
    console.log('Tasks:', tasks);
    
    if (room.state === 'connected' && localParticipant) {
      const message = {
        type: 'initialTasks',
        tasks: tasks,
        timestamp: Date.now(),
        userId: userId
      };

      const encoder = new TextEncoder();
      localParticipant.publishData(encoder.encode(JSON.stringify(message)), {
        reliable: true,
      });
      console.log('📤 Sent initial tasks data');
    }
  }, [room.state, localParticipant, tasks, userId]);

  return null;
};

export default ClientAssistantProvider;
