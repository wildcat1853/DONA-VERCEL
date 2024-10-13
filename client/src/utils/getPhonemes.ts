// utils/getPhonemes.ts

import fs from 'fs';
import path from 'path';

// Define the structure of the CMU Pronouncing Dictionary
interface CMUDictEntry {
  word: string;
  phonemes: string[];
}

// Load the CMU Pronouncing Dictionary from the installed package
// Since 'cmu-pronouncing-dictionary' exports a plain object mapping
// words to their phoneme arrays.

import cmuDict from 'cmu-pronouncing-dictionary';

// Type assertion since the package might not have proper TypeScript types
const dictionary: { [key: string]: string[] } = cmuDict as any;

/**
 * Retrieves the phonemes for a given word.
 * @param word - The word to convert to phonemes.
 * @returns An array of phonemes in ARPAbet or null if not found.
 */
export function getPhonemesForWord(word: string): string[] | null {
  const upperWord = word.toUpperCase();
  if (dictionary[upperWord]) {
    return dictionary[upperWord];
  }
  return null;
}

/**
 * Retrieves phonemes for an array of words.
 * @param words - The array of words to convert.
 * @returns An array of phonemes.
 */
export function getPhonemes(words: string[]): string[] {
  const phonemes: string[] = [];
  words.forEach(word => {
    const wordPhonemes = getPhonemesForWord(word);
    if (wordPhonemes) {
      phonemes.push(...wordPhonemes);
    } else {
      phonemes.push('sil'); // 'sil' represents silence or unknown words
    }
  });
  return phonemes;
}
