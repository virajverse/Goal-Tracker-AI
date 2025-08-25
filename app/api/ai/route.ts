import { NextResponse } from 'next/server';
import { aiRespond } from '@/lib/ai';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }
    const response = await aiRespond({ userMessage: prompt, maxTokens: 250, temperature: 0.7 });

    // Hard cap output length to keep UI compact
    const limited = response && response.length > 1500 ? response.slice(0, 1500) + '…' : response;

    return NextResponse.json({ response: limited || "I'm here to help. Could you share a bit more about what you need?" });
  } catch (error) {
    console.error('Error in AI API route:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
