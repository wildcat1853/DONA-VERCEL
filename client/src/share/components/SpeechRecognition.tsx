// components/SpeechRecognition.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  isSpeechRecognitionSupported,
  getSpeechRecognition,
  SpeechRecognitionType,
} from '../../utils/speechRecognition';

interface SpeechRecognitionProps {
  onTranscript: (transcript: string) => void;
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
}

const PAUSE_THRESHOLD = 1000; // 1 second of silence to trigger end of speech
const MAX_SPEECH_DURATION = 10000; // 10 seconds maximum continuous speech

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({
  onTranscript,
  isListening,
  setIsListening,
}) => {
  const [recognition, setRecognition] = useState<SpeechRecognitionType | null>(null);
  const currentTranscriptRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxDurationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('SpeechRecognition component mounted');
    if (isSpeechRecognitionSupported()) {
      console.log('Speech recognition is supported');
      const newRecognition = getSpeechRecognition();
      newRecognition.continuous = true;
      newRecognition.interimResults = true;
      newRecognition.lang = 'en-US';

      newRecognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
      };

      newRecognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('Speech recognition result received', event);
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        console.log('Current transcript:', transcript);
        currentTranscriptRef.current = transcript;
        onTranscript(transcript);
      };

      newRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      newRecognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        if (currentTranscriptRef.current.trim()) {
          console.log('Sending final transcript:', currentTranscriptRef.current);
          onTranscript(currentTranscriptRef.current);
        }
        currentTranscriptRef.current = '';
      };

      setRecognition(newRecognition);

      // Start recognition immediately
      try {
        newRecognition.start();
        console.log('Speech recognition started initially');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    } else {
      console.error('Speech recognition not supported in this browser.');
    }

    return () => {
      if (recognition) {
        recognition.stop();
        console.log('Speech recognition stopped on component unmount');
      }
    };
  }, [onTranscript, setIsListening]);

  useEffect(() => {
    if (recognition) {
      if (isListening) {
        try {
          recognition.start();
          console.log('Speech recognition started due to isListening change');
        } catch (error) {
          if (error instanceof DOMException && error.name !== 'InvalidStateError') {
            console.error('Error starting speech recognition:', error);
            setIsListening(false);
          }
        }
      } else {
        recognition.stop();
        console.log('Speech recognition stopped due to isListening change');
      }
    }
  }, [isListening, recognition, setIsListening]);

  return null;
};

export default SpeechRecognition;
