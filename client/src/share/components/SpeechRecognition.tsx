// components/SpeechRecognition.tsx

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { sendAudioChunk, commitAudioBuffer, createResponse } from '../../services/websocket';

interface SpeechRecognitionProps {
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  isSystemTalking: boolean;
  setIsUserTalking: (isUserTalking: boolean) => void;
}

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({
  isListening,
  setIsListening,
  isSystemTalking,
  setIsUserTalking,
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const silenceStartRef = useRef<number>(0);
  const silenceThreshold = 1000; // 1 second of silence

  const startRecognition = useCallback(async () => {
    if (audioContextRef.current) return; // Already started

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
    // Convert Float32Array to 16-bit PCM
    const pcmData = float32ToInt16(audioData);

    // Convert to Base64
    const base64Audio = btoa(
      String.fromCharCode(...Array.from(new Uint8Array(pcmData.buffer)))
    );

    // Send audio data via Ably
    sendAudioChunk({
      data: base64Audio,
      chunkIndex: 0,
      totalChunks: 1,
      isLast: true,
      type: 'audio_chunk',
    });

    // Commit the audio buffer and request a response
    commitAudioBuffer();
    createResponse();
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
