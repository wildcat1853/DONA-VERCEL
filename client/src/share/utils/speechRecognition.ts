// utils/speechRecognition.ts

export const isSpeechRecognitionSupported = (): boolean => {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  };
  
  export const getSpeechRecognition = (): SpeechRecognition => {
    const SpeechRecognitionConstructor =
      (window.SpeechRecognition as unknown as {
        new (): SpeechRecognition;
      }) ||
      (window.webkitSpeechRecognition as unknown as {
        new (): SpeechRecognition;
      });
  
    if (!SpeechRecognitionConstructor) {
      throw new Error('Speech Recognition API is not supported in this browser.');
    }
  
    return new SpeechRecognitionConstructor();
  };
  
  export type SpeechRecognitionType = SpeechRecognition;