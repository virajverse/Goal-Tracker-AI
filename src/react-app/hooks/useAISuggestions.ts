import { useState } from "react";
import type { AISuggestion, CreateAISuggestionRequest } from "@/shared/types";
import toast from "react-hot-toast";

export function useAISuggestions(): {
  loading: boolean;
  error: string | null;
  generateSuggestion: (
    request?: CreateAISuggestionRequest,
  ) => Promise<AISuggestion | null>;
  getRecentSuggestions: () => Promise<AISuggestion[]>;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  interface ApiErrorJson {
    error?: unknown;
  }
  interface AISuggestionResponseJson {
    suggestion?: AISuggestion;
  }
  interface AISuggestionsListJson {
    suggestions?: AISuggestion[];
  }

  function extractErrorMessage(data: unknown, fallback: string): string {
    if (data && typeof data === "object" && "error" in data) {
      const err = (data as ApiErrorJson).error;
      if (typeof err === "string") return err;
    }
    return fallback;
  }

  function extractSuggestion(data: unknown): AISuggestion | null {
    if (data && typeof data === "object" && "suggestion" in data) {
      const s = (data as AISuggestionResponseJson).suggestion;
      if (s && typeof s === "object") return s;
    }
    return null;
  }

  function extractSuggestions(data: unknown): AISuggestion[] {
    if (data && typeof data === "object" && "suggestions" in data) {
      const s = (data as AISuggestionsListJson).suggestions;
      if (Array.isArray(s)) return s;
    }
    return [];
  }

  const generateSuggestion = async (
    request: CreateAISuggestionRequest = {},
  ): Promise<AISuggestion | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/ai-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        /* ignore json parse errors */
      }
      if (!response.ok) {
        const msg = extractErrorMessage(
          data,
          "Failed to generate AI suggestion",
        );
        throw new Error(msg);
      }
      const suggestion = extractSuggestion(data);
      if (!suggestion) throw new Error("Invalid server response");
      return suggestion;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate suggestion";
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getRecentSuggestions = async (): Promise<AISuggestion[]> => {
    try {
      const response = await fetch("/api/ai-suggestions/recent");
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        /* ignore json parse errors */
      }
      if (!response.ok) {
        const msg = extractErrorMessage(
          data,
          "Failed to fetch recent suggestions",
        );
        throw new Error(msg);
      }
      return extractSuggestions(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch suggestions";
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
