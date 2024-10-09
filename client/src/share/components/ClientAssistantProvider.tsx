"use client";
import { getProject, setProjectThreadId } from "@/app/actions/project";
import useAssistant from "@/hooks/useAssistant";
import Image from "next/image";
import React, { useEffect, useRef } from "react";
import { Separator } from "../ui/separator";
import TaskTabs from "./TaskTabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Chat from "./Chat";
import { Task } from "@/../.../../../../define";
import start from "@/../public/stars.svg";
import { useRouter } from "next/navigation";
import ReadyPlayerMeAvatar from "@/share/components/ReadyPlayerMeAvatar"; // Add this import at the top of the file
import { connectWebSocket, disconnectWebSocket } from '../../services/websocket'; // Add this import at the top of the file

type Props = {
  projectId: string;
  projectThreadId: string | undefined;
  serverMessages: any[];
  tasks: Task[];
};

const avatarUrl = 'https://models.readyplayer.me/6702ac102075ee5f35a0a783.glb';

const usedDataId = new Set<string>();
function ClientAssistantProvider({
  projectId,
  projectThreadId,
  serverMessages,
  tasks,
}: Props) {
  const assistantData = useAssistant({ projectId, projectThreadId });
  const { status, messages, setMessages, append, threadId } = assistantData;
  const router = useRouter();

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

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
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    let audioChunks: string[] = [];
    let expectedChunks = 0;

    connectWebSocket((message) => {
      const { data, chunkIndex, totalChunks, isLast } = message;
      console.log(`Received chunk ${chunkIndex + 1} of ${totalChunks}`);

      audioChunks[chunkIndex] = data;
      expectedChunks = totalChunks;

      if (isLast) {
        const completeAudioBase64 = audioChunks.join('');
        console.log('All chunks received, audio length:', completeAudioBase64.length);

        const audioData = base64ToArrayBuffer(completeAudioBase64);
        audioContextRef.current!.decodeAudioData(audioData, (buffer) => {
          if (audioSourceRef.current) {
            audioSourceRef.current.stop();
          }
          audioSourceRef.current = audioContextRef.current!.createBufferSource();
          audioSourceRef.current.buffer = buffer;
          audioSourceRef.current.connect(audioContextRef.current!.destination);
          
          console.log('About to pronounce message:', new Date().toISOString());
          
          audioSourceRef.current.start();
        }, (error) => {
          console.error('Error decoding audio:', error);
        });

        // Reset for next message
        audioChunks = [];
        expectedChunks = 0;
      }
    });

    return () => {
      disconnectWebSocket();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
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
      <div className="w-5/12 relative">
        {/* Background div */}
        <div className="absolute top-0 right-0 w-full h-full bg-F1F2F4">
          {/* Gradient div as background for avatar */}
          <div className="absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-b from-gray-200 via-gray-200 to-transparent">
            {/* Avatar container */}
            <div className="absolute left-1/2 transform -translate-x-1/2 top-6">
              <div className="w-64 h-64 rounded-full overflow-hidden bg-gray-100 shadow-glow">
                <div className="w-full h-full">
                  <ReadyPlayerMeAvatar 
                    avatarUrl={avatarUrl} 
                    width="100%" 
                    height="100%" 
                  />
                </div>
              </div>
              {/* Mood tag */}
              <div className="mt-4 text-center">
                <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                💡 Good mood!
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Chat component */}
        <Chat assistantData={assistantData} />
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

export default ClientAssistantProvider;
