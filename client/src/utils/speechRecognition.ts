// utils/speechRecognition.ts

export const isSpeechRecognitionSupported = (): boolean => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SpeechRecognition;
  };
  
  // Extend the SpeechRecognition interface
  interface ExtendedSpeechRecognition extends SpeechRecognition {
    onstart: (event: Event) => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: (event: Event) => void;
  }

  export const getSpeechRecognition = (): ExtendedSpeechRecognition => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
    if (!SpeechRecognition) {
      throw new Error('Speech Recognition API is not supported in this browser.');
    }
  
    return new SpeechRecognition() as ExtendedSpeechRecognition;
  };
  
  export type SpeechRecognitionType = ExtendedSpeechRecognition;
