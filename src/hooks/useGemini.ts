import { useState, useCallback } from 'react';

interface UseGeminiResult {
  response: string | null;
  isLoading: boolean;
  error: string | null;
  generateResponse: (prompt: string) => Promise<void>;
  reset: () => void;
}

export function useGemini(): UseGeminiResult {
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateResponse = useCallback(async (prompt: string) => {
    if (!prompt.trim()) {
      setError('Prompt cannot be empty');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await res.json();
      setResponse(data.response);
    } catch (err) {
      console.error('Error generating response:', err);
      setError('Failed to generate response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  return { response, isLoading, error, generateResponse, reset };
}
