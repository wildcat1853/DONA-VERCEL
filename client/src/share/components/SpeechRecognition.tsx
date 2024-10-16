// components/SpeechRecognition.tsx

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import {
  isSpeechRecognitionSupported,
  getSpeechRecognition,
  SpeechRecognitionType,
} from '../../utils/speechRecognition';

interface SpeechRecognitionProps {
  onTranscript: (transcript: string) => void;
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  isSystemTalking: boolean;
  setIsUserTalking: (isUserTalking: boolean) => void;
}

const PAUSE_THRESHOLD = 1000; // 1 second of silence to trigger end of speech
const MAX_RESTART_ATTEMPTS = 3;

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({
  onTranscript,
  isListening,
  setIsListening,
  isSystemTalking,
  setIsUserTalking,
}) => {
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const currentTranscriptRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartAttemptsRef = useRef(0);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      console.log('Speech recognition stopped');
    }
    setIsListening(false);
    setIsUserTalking(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    restartAttemptsRef.current = 0;
  }, [setIsListening, setIsUserTalking]);

  const startRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log('Speech recognition started');
        setIsListening(true);
        restartAttemptsRef.current = 0;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'InvalidStateError') {
          console.log('Speech recognition is already running');
        } else {
          console.error('Error starting speech recognition:', error);
          stopRecognition();
        }
      }
    }
  }, [setIsListening, stopRecognition]);

  useEffect(() => {
    if (isSpeechRecognitionSupported()) {
      const newRecognition = getSpeechRecognition();
      newRecognition.continuous = true;
      newRecognition.interimResults = true;
      newRecognition.lang = 'en-US';

      newRecognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
      };

      newRecognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        currentTranscriptRef.current = transcript;
        onTranscript(transcript);
        setIsUserTalking(true);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          stopRecognition();
        }, PAUSE_THRESHOLD);
      };

      newRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          if (restartAttemptsRef.current < MAX_RESTART_ATTEMPTS) {
            console.log('No speech detected, restarting recognition');
            restartAttemptsRef.current++;
            startRecognition();
          } else {
            console.log('Max restart attempts reached, stopping recognition');
            stopRecognition();
          }
        } else if (event.error !== 'aborted') {
          stopRecognition();
        }
      };

      newRecognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        setIsUserTalking(false);
        if (currentTranscriptRef.current.trim()) {
          onTranscript(currentTranscriptRef.current);
        }
        currentTranscriptRef.current = '';
      };

      recognitionRef.current = newRecognition;
    } else {
      console.error('Speech recognition not supported in this browser.');
    }

    return () => {
      stopRecognition();
    };
  }, [onTranscript, setIsListening, setIsUserTalking, stopRecognition, startRecognition]);

  useEffect(() => {
    if (isListening && !isSystemTalking) {
      startRecognition();
    } else {
      stopRecognition();
    }
  }, [isListening, isSystemTalking, startRecognition, stopRecognition]);

  return null;
};

export default SpeechRecognition;
