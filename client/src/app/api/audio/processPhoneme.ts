import { NextRequest, NextResponse } from 'next/server';
import CMUDict from 'cmu-pronouncing-dictionary';

export async function POST(request: NextRequest) {
  try {
    const { words } = await request.json();

    if (!Array.isArray(words)) {
      return NextResponse.json({ error: 'Words must be an array' }, { status: 400 });
    }
    const phonemes = words.flatMap((word: string) => {
      const pronunciation = CMUDict.get(word.toLowerCase());
      return pronunciation ? pronunciation.split(' ') : [];
    });

    return NextResponse.json({ phonemes });
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
