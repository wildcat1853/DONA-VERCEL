// components/SpeechRecognition.tsx

'use client';

import React, { useState, useEffect } from 'react';
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

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({
  onTranscript,
  isListening,
  setIsListening,
}) => {
  const [recognition, setRecognition] = useState<SpeechRecognitionType | null>(null);

  useEffect(() => {
    if (isSpeechRecognitionSupported()) {
      const newRecognition = getSpeechRecognition();
      newRecognition.continuous = true;
      newRecognition.interimResults = true;
      newRecognition.lang = 'en-US';

      newRecognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        onTranscript(transcript);
      };

      newRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      newRecognition.onend = () => {
        console.log('Speech recognition ended');
        // Restart recognition when it ends
        if (isListening) {
          try {
            newRecognition.start();
          } catch (error) {
            console.error('Error restarting speech recognition:', error);
          }
        }
      };

      setRecognition(newRecognition);

      // Start recognition immediately
      try {
        newRecognition.start();
        setIsListening(true);
        console.log('Speech recognition started.');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }

      // Cleanup function
      return () => {
        if (recognition) {
          recognition.stop();
        }
      };
    } else {
      console.error('Speech recognition not supported in this browser.');
    }
  }, [onTranscript, setIsListening]);

  useEffect(() => {
    if (recognition) {
      if (isListening) {
        try {
          recognition.start();
        } catch (error) {
          // Ignore "already started" errors
          if (error instanceof DOMException && error.name !== 'InvalidStateError') {
            console.error('Error starting speech recognition:', error);
            setIsListening(false);
          }
        }
      } else {
        recognition.stop();
      }
    }
  }, [isListening, recognition, setIsListening]);

  return null;
};

export default SpeechRecognition;
