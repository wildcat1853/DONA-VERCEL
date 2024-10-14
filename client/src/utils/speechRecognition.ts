// utils/speechRecognition.ts

export const isSpeechRecognitionSupported = (): boolean => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SpeechRecognition;
  };
  
  export const getSpeechRecognition = (): SpeechRecognition => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
    if (!SpeechRecognition) {
      throw new Error('Speech Recognition API is not supported in this browser.');
    }
  
    return new SpeechRecognition();
  };
  
  export type SpeechRecognitionType = SpeechRecognition;