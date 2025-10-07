import { useState, useCallback } from "react";

interface UseGeminiResult {
  response: string | null;
  isLoading: boolean;
  error: string | null;
  generateResponse: (prompt: string) => Promise<void>;
  reset: () => void;
}

interface AIResponseJson {
  response?: unknown;
  error?: unknown;
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string") return err;
  }
  return fallback;
}

function extractReply(data: unknown): string | null {
  if (data && typeof data === "object" && "response" in data) {
    const r = (data as AIResponseJson).response;
    if (typeof r === "string") return r;
  }
  return null;
}

export function useGemini(): UseGeminiResult {
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateResponse = useCallback(async (prompt: string): Promise<void> => {
    if (!prompt.trim()) {
      setError("Prompt cannot be empty");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        let j: unknown = null;
        try {
          j = await res.json();
        } catch { /* ignore json parse errors */ }
        const msg = extractErrorMessage(j, "Failed to get response from AI");
        throw new Error(msg);
      }

      let data: unknown = null;
      try {
        data = await res.json();
      } catch { /* ignore json parse errors */ }
      const reply = extractReply(data);
      if (typeof reply !== "string") throw new Error("Invalid AI response");
      setResponse(reply);
    } catch (err) {
      console.error("Error generating response:", err);
      setError("Failed to generate response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback((): void => {
    setResponse(null);
    setError(null);
  }, []);

  return { response, isLoading, error, generateResponse, reset };
}
