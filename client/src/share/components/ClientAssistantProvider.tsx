// components/ClientAssistantProvider.tsx

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Separator } from '../ui/separator';
import TaskTabs from './TaskTabs';
import Image from 'next/image';
import start from '@/../public/stars.svg';
import dynamic from 'next/dynamic';
import SpeechRecognition from './SpeechRecognition';
import useAssistant from '@/hooks/useAssistant';  
import {
  connectWebSocket,
  disconnectWebSocket,
  commitAudioBuffer,
  createResponse,
} from '../../services/websocket';
import { Task } from '@/../.../../../../define';

type Props = {
  projectId: string;
  projectThreadId: string | undefined;
  serverMessages: any[]; // Might be related to Tasks, keep if necessary
  tasks: Task[];
};

const avatarUrl =
  'https://models.readyplayer.me/670c2238e4f39be58fe308ae.glb?morphTargets=mouthSmile,mouthOpen,mouthFunnel,browOuterUpLeft,browOuterUpRight,tongueOut,ARKit';

const ClientAssistantProvider: React.FC<Props> = ({
  projectId,
  projectThreadId,
  serverMessages,
  tasks,
}) => {
  const assistantData = useAssistant({ projectId, projectThreadId });

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [audioQueue, setAudioQueue] = useState<AudioBuffer[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSystemTalking, setIsSystemTalking] = useState(false);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const audioChunksRef = useRef<{ [key: number]: string }>({});
  const expectedChunksRef = useRef<number>(0);
  const [isListening, setIsListening] = useState(false);
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isAudioContextReady, setIsAudioContextReady] = useState(false);

  const initializeAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log('AudioContext resumed');
          setIsAudioContextReady(true);
        });
      } else {
        setIsAudioContextReady(true);
      }
    } else {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const newContext = new AudioCtx();
        audioContextRef.current = newContext;
        setAudioContext(newContext);
        console.log('AudioContext created');
        setIsAudioContextReady(true);
      } else {
        console.error('Web Audio API is not supported in this browser');
      }
    }
  }, []);

  const handleAudioMessage = useCallback(
    async (message: any) => {
      const { data, chunkIndex, totalChunks, isLast, type } = message;

      if (type === 'audio_chunk') {
        if (!audioContextRef.current) {
          console.warn('AudioContext is not initialized.');
          return;
        }

        audioChunksRef.current[chunkIndex] = data;
        expectedChunksRef.current = totalChunks;

        if (isLast) {
          const completeAudioBase64 = Object.values(audioChunksRef.current).join('');
          try {
            const audioData = base64ToArrayBuffer(completeAudioBase64);
            const audioBuffer = createAudioBufferFromPCM(audioData, audioContextRef.current);
            setAudioQueue((prevQueue) => [...prevQueue, audioBuffer]);
          } catch (error) {
            console.error('Error creating AudioBuffer from PCM data:', error);
          }

          audioChunksRef.current = {};
          expectedChunksRef.current = 0;
        }
      } else if (type === 'response_text') {
        const transcript = message.text;
        console.log('Received transcript:', transcript);
        // Handle the assistant's text response if needed
      }
    },
    []
  );

  const initializeBackend = useCallback(async () => {
    try {
      const response = await fetch('/api/realtime', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Backend initialization response:', data);
    } catch (error) {
      console.error('Error initializing backend API route:', error);
    }
  }, []);

  useEffect(() => {
    if (isAudioContextReady && !isWebSocketConnected) {
      connectWebSocket(handleAudioMessage)
        .then(() => {
          setIsWebSocketConnected(true);
          console.log('WebSocket connected successfully');
          setIsListening(true);
          initializeBackend();
        })
        .catch((error) => {
          console.error('Failed to connect WebSocket:', error);
        });
    }

    return () => {
      if (isWebSocketConnected) {
        disconnectWebSocket();
        setIsWebSocketConnected(false);
        setIsListening(false);
      }
    };
  }, [isAudioContextReady, isWebSocketConnected, handleAudioMessage, initializeBackend]);

  const processAudioQueue = useCallback(() => {
    if (audioQueue.length > 0 && !isPlaying && audioContextRef.current) {
      setIsPlaying(true);
      setIsSystemTalking(true);
      const currentBuffer = audioQueue[0];

      const source = audioContextRef.current.createBufferSource();
      source.buffer = currentBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        setAudioQueue((prevQueue) => prevQueue.slice(1));
        setIsPlaying(false);
        setIsSystemTalking(false);
        currentAudioSourceRef.current = null;
      };

      currentAudioSourceRef.current = source;
      source.start();
    }
  }, [audioQueue, isPlaying]);

  useEffect(() => {
    processAudioQueue();
  }, [audioQueue, processAudioQueue]);

  useEffect(() => {
    if (!isUserTalking && isListening) {
      commitAudioBuffer();
      createResponse();
    }
  }, [isUserTalking, isListening]);

  return (
    <>
      {!isAudioContextReady ? (
        <div className="w-full h-full flex items-center justify-center">
          <button
            onClick={initializeAudioContext}
            className="bg-blue-500 text-white px-6 py-3 rounded-md"
          >
            Start Assistant
          </button>
        </div>
      ) : (
        <>
          <div className="w-7/12 flex justify-center max-h-screen overflow-auto">
            <div className="w-2/3 flex flex-col  gap-9 mt-32">
              <div>
                <div className="flex gap-4">
                  <Image src={start} alt="stars" />
                  <p className="font-semibold text-5xl tracking-tight">Project name</p>
                </div>
                {/* <p className="text-base mt-5">Project description</p> */}
              </div>
              <Separator className="bg-gray-200" />
              <TaskTabs tasks={tasks} assistantData={assistantData} />
            </div>
          </div>
          <div className="w-5/12 relative h-screen">
            {/* Background div */}
            <div className="absolute top-0 right-0 w-full h-full bg-F1F2F4">
              {/* Gradient div as background for avatar */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#E5F1F1] via-[#FAF0F1] to-[#EDD9FE] animate-gradient-xy">
                {/* Avatar container */}
                <div className="absolute inset-0">
                  <AvatarScene avatarUrl={avatarUrl} audioBuffer={audioQueue[0] || null} />
                </div>
              </div>
            </div>

            {/* Listening indicator, User talking indicator, and Good mood label */}
            <div className="absolute bottom-60 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 z-10">
              {isSystemTalking ? (
                <div className="bg-yellow-500 text-white px-3 py-1 rounded-full">
                  Assistant is speaking...
                </div>
              ) : (
                <div className="bg-gray-300 text-gray-700 px-3 py-1 rounded-full">
                  Ready to listen
                </div>
              )}
              <div className="bg-green-200 text-green-600 px-3 py-1 rounded-full text-sm">
                Good mood
              </div>
            </div>
          </div>
          <SpeechRecognition
            isListening={isListening}
            setIsListening={setIsListening}
            isSystemTalking={isSystemTalking}
            setIsUserTalking={setIsUserTalking}
          />
        </>
      )}
    </>
  );
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function createAudioBufferFromPCM(arrayBuffer: ArrayBuffer, audioContext: AudioContext): AudioBuffer {
  const numOfChannels = 1; // Mono audio
  const sampleRate = 24000; // 24kHz
  const bytesPerSample = 2; // 16-bit audio
  const totalSamples = arrayBuffer.byteLength / bytesPerSample;

  // Create an AudioBuffer
  const audioBuffer = audioContext.createBuffer(numOfChannels, totalSamples, sampleRate);

  // Create a DataView for easier byte manipulation
  const dataView = new DataView(arrayBuffer);

  // Get the Float32Array for the buffer channel
  const channelData = audioBuffer.getChannelData(0);

  // Convert PCM data to Float32 [-1.0, 1.0]
  for (let i = 0; i < totalSamples; i++) {
    const sample = dataView.getInt16(i * bytesPerSample, true); // Little-endian
    channelData[i] = sample / 0x8000; // Normalize to [-1.0, 1.0]
  }

  return audioBuffer;
}

// Dynamically import AvatarScene with SSR disabled
const AvatarScene = dynamic(() => import('./AvatarScene'), { ssr: false });

export default ClientAssistantProvider;
