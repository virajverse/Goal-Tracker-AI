import { useState } from 'react';
import { AISuggestion, CreateAISuggestionRequest } from '@/shared/types';
import toast from 'react-hot-toast';

export function useAISuggestions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestion = async (request: CreateAISuggestionRequest = {}): Promise<AISuggestion | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/ai-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate AI suggestion');
      }
      
      const data = await response.json();
      return data.suggestion;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate suggestion';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getRecentSuggestions = async (): Promise<AISuggestion[]> => {
    try {
      const response = await fetch('/api/ai-suggestions/recent');
      if (!response.ok) {
        throw new Error('Failed to fetch recent suggestions');
      }
      const data = await response.json();
      return data.suggestions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch suggestions';
      setError(errorMessage);
      return [];
    }
  };

  return {
    loading,
    error,
    generateSuggestion,
    getRecentSuggestions,
  };
}
