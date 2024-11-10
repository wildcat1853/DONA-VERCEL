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
  useParticipants
} from '@livekit/components-react';

import '@livekit/components-styles';
import { Track, TrackEvent, RoomEvent, Participant, Room, ParticipantEvent, TrackPublication } from 'livekit-client';
import useAssistant from '@/hooks/useAssistant';

import { Task } from '@/../.../../../../define';
import RoomEventListener from './RoomEventListener';
import { AudioProvider } from '../context/AudioContext';
import { assistantInstructions } from '../config/assistantInstructions';
import ProjectName from './ProjectName';
import CircularProgress from './CircularProgress';
import { onboardingInstructions } from '../config/onboardingInstructions';
import { Badge } from "../ui/badge";
import { HelpCircle } from 'lucide-react';


type Props = {
  projectId: string;
  projectThreadId: string | undefined;
  serverMessages: any[];
  tasks: Task[];
  userId: string;
};

const avatarUrl = 'https://models.readyplayer.me/670c2238e4f39be58fe308ae.glb?morphTargets=mouthSmile,mouthOpen,mouthFunnel,browOuterUpLeft,browOuterUpRight,tongueOut,ARKit';

// Create a new component for the onboarding button
const OnboardingButton = ({ userId, assistantData }: { userId: string, assistantData: any }) => {
  const { localParticipant } = useLocalParticipant();

  const handleRepeatOnboarding = async () => {
    try {
      console.log('Starting repeat onboarding sequence...');
      console.log('Local participant:', localParticipant?.identity);
      
      if (localParticipant) {
        // First update the onboarding status
        console.log('Updating onboarding status...');
        await assistantData.updateOnboardingStatus(true);
        
        // Get existing attributes and merge with new ones
        const currentAttributes = localParticipant.attributes || {};
        
        // Log current state
        console.log('Current attributes:', currentAttributes);
        
        // Create new attributes object preserving ALL existing attributes
        const attributes = {
          ...currentAttributes,  // Spread existing attributes
          repeatOnboarding: 'true',
          timestamp: Date.now().toString(),
          userId: userId
        };
        
        console.log('Setting participant attributes:', attributes);
        await localParticipant.setAttributes(attributes);
        console.log('✅ Attributes set successfully');
      } else {
        console.warn('❌ Local participant not found');
      }
    } catch (error: any) {
      console.error('❌ Error in handleRepeatOnboarding:', error);
    }
  };

  return (
    <button
      onClick={handleRepeatOnboarding}
      className="fixed top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white/90 border border-gray-200 transition-colors z-50 shadow-sm"
      title="Repeat Onboarding"
    >
      <HelpCircle className="w-5 h-5 text-gray-600" />
      <span className="text-sm text-gray-600">How it works</span>
    </button>
  );
};

const ClientAssistantProvider: React.FC<Props> = ({
  projectId,
  projectThreadId,
  serverMessages,
  tasks,
  userId,
}) => {
  const assistantData = useAssistant({ projectId, projectThreadId, userId });
  const { isOnboarding, isLoading } = assistantData
  const [token, setToken] = useState('');
  const [roomName, setRoomName] = useState('');
  const name = 'User';
  
  console.log('Debug Onboarding State:', {
    isOnboarding,
    isLoading,
    projectId
  });
  
  const [audioAllowed, setAudioAllowed] = useState(false);
  const [showMicrophoneDialog, setShowMicrophoneDialog] = useState(false);

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
        
        console.log('🔄 ClientAssistant: Sending initial task data:', {
          tasks,
          userId,
          isOnboarding,
          timestamp: new Date().toISOString()
        });

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
                isOnboarding: isOnboarding,
                tasks: tasks
              }
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
  }, [isOnboarding, userId, tasks]);

  // Calculate progress
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const progress = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

  return (
    <>
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
                  className="w-6 h-6 text-blue-600"
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

      <div className="w-7/12 flex justify-center max-h-screen overflow-auto">
        <div className="w-2/3 flex flex-col gap-9 mt-20">
          <div className="scale-90 origin-left flex items-center gap-4">
            <ProjectName 
              initialName={"Project name"} 
              projectId={projectId}
            />
           
          </div>
          <Separator className="bg-gray-200" />
          <TaskTabs 
            tasks={tasks} 
            assistantData={assistantData} 
            projectId={projectId}
          />
        </div>
      </div>

      <div className="w-5/12 fixed right-0 top-0 h-screen">
        {token ? (
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
                    <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                  </div>
                </div>
              </div>
    
              <div className="absolute bottom-14 w-full z-10">
                <VoiceAssistantControlBar />
                <StartAudio label="Click to allow audio playback" />
               
                <ConnectionStateToast />
                {/* <div className="text-center text-sm font-medium text-gray-600 mt-2"> 
                  <ConnectionState />
                </div> */}
              </div>
              <OnboardingButton userId={userId} assistantData={assistantData} />
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
