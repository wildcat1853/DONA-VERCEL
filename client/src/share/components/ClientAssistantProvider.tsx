"use client";
import { getProject, setProjectThreadId } from "@/app/actions/project";
import useAssistant from "@/hooks/useAssistant";
import Image from "next/image";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Separator } from "../ui/separator";
import TaskTabs from "./TaskTabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Chat from "./Chat";
import { Task } from "@/../.../../../../define";
import start from "@/../public/stars.svg";
import { useRouter } from "next/navigation";
import ReadyPlayerMeAvatar from "@/share/components/ReadyPlayerMeAvatar"; // Add this import at the top of the file
import { connectWebSocket, disconnectWebSocket } from '../../services/websocket'; // Add this import at the top of the file
import dynamic from 'next/dynamic';

type Props = {
  projectId: string;
  projectThreadId: string | undefined;
  serverMessages: any[];
  tasks: Task[];
};


const avatarUrl = 'https://models.readyplayer.me/670c2238e4f39be58fe308ae.glb?morphTargets=mouthSmile,mouthOpen,mouthFunnel,browOuterUpLeft,browOuterUpRight,tongueOut,ARKit';


const usedDataId = new Set<string>();

const ClientAssistantProvider: React.FC<Props> = ({
  projectId,
  projectThreadId,
  serverMessages,
  tasks,
}) => {
  const assistantData = useAssistant({ projectId, projectThreadId });
  const { status, messages, setMessages, append, threadId } = assistantData;
  const router = useRouter();

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Consolidated AudioContext creation and management
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContext && !audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const newContext = new AudioCtx();
      setAudioContext(newContext);
      audioContextRef.current = newContext;
      console.log('AudioContext created:', newContext);
    }

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch((err: Error) => 
          console.error('Error closing AudioContext:', err)
        );
      }
    };
  }, [audioContext]);

  const [audioQueue, setAudioQueue] = useState<AudioBuffer[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSystemTalking, setIsSystemTalking] = useState(false);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (!projectThreadId && threadId)
      (async () => {
        const project = await getProject(projectId);
        if (!project) throw new Error("no such project");
        if (project.threadId) return;
        await setProjectThreadId(projectId, threadId);
      })();
  }, [threadId]);

  useEffect(() => {
    setMessages(serverMessages);
    const todaysTasks = tasks.filter(
      (task) =>
        task.status == "in progress" &&
        new Date(task.deadline).toDateString() == new Date().toDateString()
    );
    const todaysMissedTasks = todaysTasks.filter(
      (task) => new Date(task.deadline) < new Date()
    );
    if (todaysMissedTasks.length) {
      append({
        role: "data",
        content: `Today is ${new Date().toLocaleString()}, but forget about it. My today's tasks are ${todaysMissedTasks
          .map((task) => ({ id: task.id, name: task.name }))
          .join(" , ")} ask me how is my progress`,
      });
    } else {
      append({
        role: "data",
        content: `Today is ${new Date().toLocaleString()}, but forget about it. Just say hi to me!`,
      });
    }
    
    // Remove the initial greeting from Dona
    // append({
    //   role: "assistant",
    //   content: "Hello! I'm Dona, your AI assistant. How can I help you today?",
    // });
  }, []);

  useEffect(() => {
    const lastMsg = messages.at(-2);
    if (!lastMsg || lastMsg?.role != "data") return;
    if (usedDataId.has(lastMsg.id)) return;
    usedDataId.add(lastMsg.id);
    //@ts-ignore
    if (lastMsg?.data?.text) {
      router.refresh();
    }
  }, [messages]);

  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const audioChunksRef = useRef<{ [key: number]: string }>({});
  const expectedChunksRef = useRef<number>(0);

  const handleAudioMessage = useCallback(async (message: any) => {
    const { data, chunkIndex, totalChunks, isLast, type } = message;

    if (type === 'audio_chunk') {
      if (!audioContextRef.current) {
        console.warn("AudioContext is not initialized.");
        return;
      }

      audioChunksRef.current[chunkIndex] = data;
      expectedChunksRef.current = totalChunks;

      if (isLast) {
        const completeAudioBase64 = Object.values(audioChunksRef.current).join('');
        try {
          const audioData = base64ToArrayBuffer(completeAudioBase64);
          const buffer = await audioContextRef.current.decodeAudioData(audioData);
          setAudioQueue(prevQueue => [...prevQueue, buffer]);
        } catch (error) {
          console.error('Error decoding audio:', error);
        }

        // Reset for next audio message
        audioChunksRef.current = {};
        expectedChunksRef.current = 0;
      }
    } else if (type === 'response_text') {
      const transcript = message.text;
      console.log('Received transcript:', transcript);
      append({
        role: "assistant",
        content: transcript,
      });
    }
  }, [append]);

  useEffect(() => {
    if (!audioContextRef.current) {
      console.warn("AudioContext is not initialized.");
      return;
    }

    if (!isWebSocketConnected) {
      connectWebSocket(handleAudioMessage);
      setIsWebSocketConnected(true);
    }

    return () => {
      if (isWebSocketConnected) {
        disconnectWebSocket();
        setIsWebSocketConnected(false);
      }
    };
  }, [isWebSocketConnected, handleAudioMessage]);

  const processAudioQueue = useCallback(() => {
    if (audioQueue.length > 0 && !isPlaying && audioContextRef.current) {
      setIsPlaying(true);
      setIsSystemTalking(true);
      const currentBuffer = audioQueue[0];
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = currentBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setAudioQueue(prevQueue => prevQueue.slice(1));
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

  return (
    <>
      <div className="w-7/12 flex justify-center max-h-screen overflow-auto">
        <div className="w-2/3 flex flex-col  gap-9 mt-32">
          <div>
            <div className="flex gap-4">
              <Image src={start} alt="stars" />
              <p className="font-semibold text-5xl tracking-tight">
                Project name
              </p>
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
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#E5F1FC] via-[#FAF0F1] to-[#EDD9FE] animate-gradient-xy">
            {/* Avatar container */}
            <div className="absolute inset-0">
              <AvatarScene 
                avatarUrl={avatarUrl} 
                audioBuffer={audioQueue[0] || null}
              />
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
    </>
  );
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Dynamically import AvatarScene with SSR disabled
const AvatarScene = dynamic(() => import('./AvatarScene'), { ssr: false });

export default ClientAssistantProvider;
