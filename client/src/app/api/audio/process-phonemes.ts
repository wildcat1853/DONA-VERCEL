// pages/api/audio/process-phonemes.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getPhonemes } from '../../../utils/getPhonemes';

interface ProcessPhonemesRequest {
  words: string[];
}

interface ProcessPhonemesResponse {
  phonemes: string[];
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProcessPhonemesResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { words } = req.body as ProcessPhonemesRequest;

  if (!words || !Array.isArray(words)) {
    return res.status(400).json({ error: 'Invalid input. "words" must be an array of strings.' });
  }

  try {
    const phonemes = getPhonemes(words);
    res.status(200).json({ phonemes });
  } catch (error) {
    console.error('Error processing phonemes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
