// components/SpeechRecognition.tsx

'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionProps {
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  isSystemTalking: boolean;
  setIsUserTalking: (isUserTalking: boolean) => void;
  onAudioCapture: (audioData: ArrayBuffer) => void;
}

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({
  isListening,
  setIsListening,
  isSystemTalking,
  setIsUserTalking,
  onAudioCapture,
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const silenceStartRef = useRef<number>(0);
  const silenceThreshold = 1000; // 1 second of silence
  const openAIWsRef = useRef<WebSocket | null>(null);

  const startRecognition = useCallback(async () => {
    if (audioContextRef.current) return; // Already started

    if (!openAIWsRef.current || openAIWsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected yet');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

      const source = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      processorRef.current.onaudioprocess = (event) => {
        if (isSystemTalking) return; // Don't capture while system is talking

        const inputData = event.inputBuffer.getChannelData(0);
        const inputDataCopy = new Float32Array(inputData);
        audioChunksRef.current.push(inputDataCopy);
        setIsUserTalking(true);

        // Detect silence
        const isSilent = inputData.every((sample) => Math.abs(sample) < 0.01);
        if (isSilent) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > silenceThreshold) {
            // Stop recording after silence threshold
            stopRecognition();
          }
        } else {
          silenceStartRef.current = 0;
        }
      };

      setIsListening(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setIsListening(false);
    }
  }, [isSystemTalking, setIsListening, setIsUserTalking]);

  const stopRecognition = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsListening(false);
    setIsUserTalking(false);

    // Process and send audio data
    if (audioChunksRef.current.length > 0) {
      const audioBuffer = flattenAudioChunks(audioChunksRef.current);
      sendAudioData(audioBuffer);
      audioChunksRef.current = [];
    }
  }, [setIsListening, setIsUserTalking]);

  const flattenAudioChunks = (chunks: Float32Array[]) => {
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Float32Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  };

  const sendAudioData = (audioData: Float32Array) => {
    // Convert Float32Array to regular ArrayBuffer
    const buffer = new ArrayBuffer(audioData.length * 4); // 4 bytes per float32
    const view = new Float32Array(buffer);
    view.set(audioData);

    // Now we're sure it's a regular ArrayBuffer
    onAudioCapture(buffer);
  };

  const float32ToInt16 = (buffer: Float32Array) => {
    const l = buffer.length;
    const buf = new Int16Array(l);

    for (let i = 0; i < l; i++) {
      let s = Math.max(-1, Math.min(1, buffer[i]));
      buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return buf;
  };

  useEffect(() => {
    // Establish WebSocket connection to OpenAI Realtime API
    const ws = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
      []
    );

    ws.onopen = () => {
      console.log('Connected to OpenAI Realtime API');

      // Send initial configuration
      ws.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['audio', 'text'],
            voice: 'alloy',
          },
        })
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Message from OpenAI:', data);

      // Handle audio and text responses
      switch (data.type) {
        case 'response.audio.delta':
          if (data.delta) {
            const audioBase64 = data.delta;
            // Process the audio data (e.g., play it or pass it to your avatar)
            // You might need to implement a function to handle audio playback
          }
          break;
        case 'response.text.delta':
          if (data.delta) {
            console.log('Received text response:', data.delta);
            // Handle the text response
          }
          break;
        default:
          console.log('Received other type of message:', data);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    openAIWsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (isListening && !isSystemTalking) {
      startRecognition();
    } else {
      stopRecognition();
    }
    // Clean up on unmount
    return () => {
      stopRecognition();
    };
  }, [isListening, isSystemTalking, startRecognition, stopRecognition]);

  return null;
};

export default SpeechRecognition;
