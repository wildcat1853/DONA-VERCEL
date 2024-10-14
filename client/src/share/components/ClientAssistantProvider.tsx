"use client";
import { getProject, setProjectThreadId } from "@/app/actions/project";
import useAssistant from "@/hooks/useAssistant";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
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

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

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

  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContext) {
      const newContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(newContext);
      console.log('AudioContext created:', newContext);
    }
  }, []);

  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    let audioChunks: string[] = [];
    let expectedChunks = 0;

    const handleAudioMessage = async (message: any) => {
      const { data, chunkIndex, totalChunks, isLast } = message;
      console.log(`Received chunk ${chunkIndex + 1} of ${totalChunks}`);

      audioChunks[chunkIndex] = data;
      expectedChunks = totalChunks;

      if (isLast) {
        const completeAudioBase64 = audioChunks.join('');
        console.log('Complete audio received, length:', completeAudioBase64.length);

        try {
          const audioData = base64ToArrayBuffer(completeAudioBase64);
          const buffer = await audioContextRef.current!.decodeAudioData(audioData);
          audioBufferRef.current = buffer;
          console.log('Audio buffer created:', buffer);

          if (audioSourceRef.current) {
            audioSourceRef.current.stop();
          }
          audioSourceRef.current = audioContextRef.current!.createBufferSource();
          audioSourceRef.current.buffer = buffer;
          audioSourceRef.current.connect(audioContextRef.current!.destination);
          
          console.log('About to pronounce message:', new Date().toISOString());
          
          audioSourceRef.current.start();
        } catch (error) {
          console.error('Error decoding audio:', error);
        }

        // Reset for next message
        audioChunks = [];
        expectedChunks = 0;
      }
    };

    connectWebSocket(handleAudioMessage);

    return () => {
      disconnectWebSocket();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Attempt to resume the context immediately
    audioContextRef.current!.resume().catch(console.error);
  };

  // Call initAudioContext on a user interaction, e.g., button click
  useEffect(() => {
    const handleInteraction = () => {
      initAudioContext();
      document.removeEventListener('click', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    return () => document.removeEventListener('click', handleInteraction);
  }, []);

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
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-gray-200 via-gray-200 to-transparent">
            {/* Avatar container */}
            <div className="absolute inset-0">
              <AvatarScene 
                avatarUrl={avatarUrl} 
                audioBuffer={audioBufferRef.current}
              />
            </div>
          </div>
        </div>
        
        {/* Chat component */}
        <Chat assistantData={{...assistantData, status}} />
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
