// components/ClientAssistantProvider.tsx

'use client';

import React, { useEffect, useState, useCallback, useContext,createContext, ReactNode } from 'react';
import { Separator } from '../ui/separator';
import TaskTabs from './TaskTabs';
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
  Chat
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
import { TaskTabsWithLiveKit } from './TaskTabs';
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

// Update the OnboardingControls component to include both buttons
const OnboardingControls = ({ 
  userId, 
  assistantData,
  tasks 
}: { 
  userId: string, 
  assistantData: any,
  tasks: Task[] 
}) => {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  const handleRepeatOnboarding = async () => {
    try {
      if (room.state !== 'connected' || !localParticipant) {
        console.warn('❌ Room or participant not ready');
        return;
      }

      // Keep existing attribute-based logic for repeat
      await assistantData.updateOnboardingStatus(true);
      const currentAttributes = localParticipant.attributes || {};
      const newAttributes = {
        ...currentAttributes,
        repeatOnboarding: 'true',
        timestamp: Date.now().toString(),
        userId: userId
      };
      
      await localParticipant.setAttributes(newAttributes);
      console.log('✅ Repeat onboarding attributes set');
    } catch (error) {
      console.error('❌ Error in repeat onboarding:', error);
    }
  };

  const handleDisableOnboarding = async () => {
    try {
      if (room.state !== 'connected' || !localParticipant) {
        console.warn('❌ Room or participant not ready');
        return;
      }

      console.log('🔍 Disable Onboarding Debug:', {
        tasksAvailable: !!tasks,
        tasksLength: tasks?.length,
        tasksList: tasks
      });

      // Update database status
      await assistantData.updateOnboardingStatus(false);

      // Use data message for disable
      const message = {
        type: 'onboardingControl',
        action: 'disable',
        timestamp: Date.now(),
        userId: userId,
        tasks: tasks
      };

      console.log('📤 Sending disable onboarding message:', message);
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));
      localParticipant.publishData(data, {
        reliable: true,
      });
    } catch (error) {
      console.error('❌ Error in disable onboarding:', error);
    }
  };

  return (
    <div className="fixed top-4 right-4 flex items-center gap-3 z-50">
      <button
        onClick={() => handleRepeatOnboarding()}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white/90 border border-gray-200 transition-colors shadow-sm"
        title="Repeat Onboarding"
      >
        <HelpCircle className="w-5 h-5 text-gray-600" />
        <span className="text-sm text-gray-600">How it works</span>
      </button>
      
      <button
        onClick={() => handleDisableOnboarding()}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white/90 border border-gray-200 transition-colors shadow-sm"
        title="Turn Off Onboarding"
      >
        <span className="text-sm text-gray-600">Turn off onboarding</span>
      </button>
    </div>
  );
};

const getServerUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development mode: connecting to localhost:8081');
    return 'ws://localhost:8081';
  } else {
    console.log('🚀 Production mode: connecting to LiveKit cloud');
    return process.env.NEXT_PUBLIC_LIVEKIT_URL;
  }
};

const ClientAssistantProvider: React.FC<Props> = ({ tasks, userId, ...props }) => {
  const [isOnboarding, setIsOnboarding] = useState(false);
  const assistantData = useAssistant({ projectId: props.projectId, projectThreadId: props.projectThreadId, userId });
  const { isOnboarding: assistantIsOnboarding, isLoading } = assistantData
  const [token, setToken] = useState('');
  const [roomName, setRoomName] = useState('');
  const name = 'User';
  
  console.log('Debug Onboarding State:', {
    isOnboarding: assistantIsOnboarding,
    isLoading,
    projectId: props.projectId
  });
  
  const [audioAllowed, setAudioAllowed] = useState(false);
  const [showMicrophoneDialog, setShowMicrophoneDialog] = useState(false);

  // Add state for mobile view control
  const [showTasks, setShowTasks] = useState(true);

  useEffect(() => {
    const requestMediaPermissions = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioAllowed(true);
        setShowMicrophoneDialog(false);
      } catch (error: any) {
        console.error('Error requesting media permissions:', error);
        setShowMicrophoneDialog(true);
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
                userId: userId,
                isOnboarding: assistantIsOnboarding,
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
  }, [assistantIsOnboarding, userId]);

  return (
    <SessionProvider>
      <Dialog open={showMicrophoneDialog} onOpenChange={setShowMicrophoneDialog}>
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
              tasks={tasks} 
              userId={userId} 
              isOnboarding={isOnboarding}
              setIsOnboarding={setIsOnboarding}
            />
            <div className="fixed top-4 left-4 z-50">
              <AccountDropdown />
            </div>
            <div className="flex flex-col md:flex-row h-screen">
              {/* Desktop Tasks Section */}
              <div className="hidden md:block w-7/12 max-h-screen overflow-auto bg-white">
                <div className="w-2/3 mx-auto flex flex-col gap-9 mt-20">
                  <ProjectName 
                    initialName={"Project name"} 
                    projectId={props.projectId}
                    className="text-gray-900 text-3xl font-semibold"
                  />
                  <Separator className="bg-gray-200" />
                  <TaskTabsWithLiveKit 
                    tasks={tasks} 
                    assistantData={assistantData} 
                    projectId={props.projectId}
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
                      <AvatarScene avatarUrl={avatarUrl} />
                      <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                    </div>
                  </div>
                </div>

                {/* Mobile Recent Tasks Panel */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm rounded-t-3xl shadow-lg z-40">
                  <div className="px-4 py-6">
                    <div className="max-h-[40vh] overflow-y-auto">
                      <TaskTabsWithLiveKit 
                        tasks={tasks} 
                        assistantData={assistantData} 
                        projectId={props.projectId}
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
                  <StartAudio label="Click to allow audio playback" />
                  <ConnectionStateToast />
                </div>

                {/* Onboarding Controls */}
                <div className="md:absolute md:top-4 md:right-4 fixed bottom-24 right-4 flex items-center gap-3 z-50">
                  <OnboardingControls 
                    userId={userId} 
                    assistantData={assistantData} 
                    tasks={tasks} 
                  />
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
  isOnboarding,
  setIsOnboarding 
}: { 
  tasks: Task[], 
  userId: string,
  isOnboarding: boolean,
  setIsOnboarding: (value: boolean) => void
}) => {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  // Send initial tasks data when connected
  useEffect(() => {
    if (!room || !localParticipant || room.state !== 'connected') {
      return;
    }

    const sendInitialTasks = () => {
      const message = {
        type: 'initialTasks',
        tasks: tasks,
        timestamp: Date.now(),
        userId: userId,
        isOnboarding: isOnboarding
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));
      localParticipant.publishData(data, {
        reliable: true,
      });
      console.log('📤 Sent initial tasks data');
    };

    sendInitialTasks();
  }, [room?.state, localParticipant, tasks, userId, isOnboarding]);

  return null;
};

export default ClientAssistantProvider;
