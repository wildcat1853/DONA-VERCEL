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
import { Button } from "../ui/button";
import { Mic, Settings } from "lucide-react";

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
      {/* <button
        onClick={() => handleRepeatOnboarding()}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white/90 border border-gray-200 transition-colors shadow-sm"
        title="Repeat Onboarding"
      >
        <HelpCircle className="w-5 h-5 text-gray-600" />
        <span className="text-sm text-gray-600">How it works</span>
      </button> */}
      
      {/* <button
        onClick={() => handleDisableOnboarding()}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white/90 border border-gray-200 transition-colors shadow-sm"
        title="Turn Off Onboarding"
      >
        <span className="text-sm text-gray-600">Turn off onboarding</span>
      </button> */}
    </div>
  );
};

const getServerUrl = () => {
  console.log('🔧 Connecting to:', process.env.NEXT_PUBLIC_LIVEKIT_URL);
  return process.env.NEXT_PUBLIC_LIVEKIT_URL;
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

  const [microphonePermission, setMicrophonePermission] = useState<PermissionState | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      // First check if permissions are already granted
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setMicrophonePermission(permission.state);

      if (permission.state === 'denied') {
        setShowPermissionDialog(true);
        return;
      }

      // If not granted, try to request access
      if (permission.state === 'prompt') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Clean up
        setMicrophonePermission('granted');
      }

      permission.addEventListener('change', (e) => {
        setMicrophonePermission((e.target as PermissionStatus).state);
        if ((e.target as PermissionStatus).state === 'denied') {
          setShowPermissionDialog(true);
        }
      });
    } catch (error) {
      console.error('Microphone permission error:', error);
      setShowPermissionDialog(true);
    }
  };

  const handleRetryPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicrophonePermission('granted');
      setShowPermissionDialog(false);
    } catch (error) {
      console.error('Retry permission error:', error);
    }
  };

  const openBrowserSettings = () => {
    // Different instructions for different browsers
    if (navigator.userAgent.includes('Chrome')) {
      window.open('chrome://settings/content/microphone');
    } else if (navigator.userAgent.includes('Firefox')) {
      window.open('about:preferences#privacy');
    } else {
      // Generic settings instructions
      alert('Please open your browser settings and enable microphone access for this site.');
    }
  };

  return (
    <SessionProvider>
      {/* Permission Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Microphone Access Required
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <p>
                This app needs microphone access to enable voice interaction with the AI assistant.
                Without microphone access, you won't be able to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Use voice commands</li>
                <li>Interact with the AI assistant</li>
                <li>Get real-time voice responses</li>
              </ul>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg">
              <div className="p-2 rounded-full bg-yellow-100">
                <Settings className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-900">How to enable:</h4>
                <ol className="mt-1 text-sm text-yellow-700 list-decimal list-inside space-y-1">
                  <li>Click the camera icon in your browser&apos;s address bar</li>
                  <li>Select &quot;Allow&quot; for microphone access</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={openBrowserSettings}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Open Browser Settings
            </Button>
            <Button 
              onClick={handleRetryPermission}
              className="flex items-center gap-2"
            >
              <Mic className="h-4 w-4" />
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
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
  const room = useEnsureRoom();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
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
