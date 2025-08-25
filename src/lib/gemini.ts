import { GoogleGenerativeAI } from '@google/generative-ai';

let cachedGenAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not set in environment variables');
  }
  if (!cachedGenAI) {
    cachedGenAI = new GoogleGenerativeAI(apiKey);
  }
  return cachedGenAI;
}

interface GenerateTextOptions {
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export async function generateText({
  prompt,
  maxOutputTokens = 100,
  temperature = 0.7,
  timeoutMs = 15000,
}: GenerateTextOptions): Promise<string> {
  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });

    const genPromise = model
      .generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens,
          temperature,
        },
      })
      .then((result) => result.response)
      .then((response) => response.text());

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini request timed out')), Math.max(1000, timeoutMs))
    );

    return await Promise.race([genPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error generating text with Gemini:', error);
    throw new Error('Failed to generate text with Gemini');
  }
}

// Example usage:
// const response = await generateText({ prompt: 'Tell me a joke' });
