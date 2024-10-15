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
  isSystemTalking: boolean;
  setIsUserTalking: (isUserTalking: boolean) => void; // Add this prop
}

const PAUSE_THRESHOLD = 1000; // 1 second of silence to trigger end of speech
const MAX_SPEECH_DURATION = 10000; // 10 seconds maximum continuous speech

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({
  onTranscript,
  isListening,
  setIsListening,
  isSystemTalking,
  setIsUserTalking, // Add this prop
}) => {
  const [recognition, setRecognition] = useState<SpeechRecognitionType | null>(null);
  const currentTranscriptRef = useRef<string>('');
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

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
        setIsUserTalking(true); // Set user talking to true when we receive results
      };

      newRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsUserTalking(false); // Set user talking to false on error
      };

      newRecognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        setIsUserTalking(false); // Set user talking to false when recognition ends
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
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        console.log('Speech recognition stopped on component unmount');
      }
    };
  }, [onTranscript, setIsListening, setIsUserTalking]);

  useEffect(() => {
    if (recognitionRef.current) {
      if (isListening && !isSystemTalking) {
        try {
          recognitionRef.current.start();
          console.log('Speech recognition started');
        } catch (error) {
          if (error instanceof DOMException && error.name !== 'InvalidStateError') {
            console.error('Error starting speech recognition:', error);
            setIsListening(false);
          }
        }
      } else {
        recognitionRef.current.stop();
        console.log('Speech recognition stopped');
      }
    }
  }, [isListening, isSystemTalking, recognitionRef.current, setIsListening]);

  return null;
};

export default SpeechRecognition;
