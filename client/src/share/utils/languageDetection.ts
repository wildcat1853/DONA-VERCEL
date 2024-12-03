export const detectUserLanguage = (): string => {
  // Try navigator.language first (most reliable)
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language;
    if (browserLang) {
      return browserLang.split('-')[0]; // Convert 'en-US' to 'en'
    }
  }

  // Fallback to navigator.languages if available
  if (typeof navigator !== 'undefined' && navigator.languages?.length > 0) {
    return navigator.languages[0].split('-')[0];
  }

  // Default fallback
  return 'en';
};

// Helper to get full language name for instructions
export const getLanguageInstruction = (langCode: string): string => {
  const languageNames: { [key: string]: string } = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean'
    // Add more languages as needed
  };

  return languageNames[langCode] || 'English';
};
