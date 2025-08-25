'use client';

import { useState, useMemo } from 'react';
import { useGemini } from '@/hooks/useGemini';

export function AIChat() {
  const [input, setInput] = useState('');
  const [showFull, setShowFull] = useState(false);
  const { response, isLoading, error, generateResponse, reset } = useGemini();

  // Remove basic markdown markers so asterisks don't show in UI
  const sanitizeMarkdown = (text: string) => {
    let t = text.replace(/\r\n/g, '\n');
    // bold/italic/code
    t = t.replace(/\*\*(.*?)\*\*/g, '$1');
    t = t.replace(/__(.*?)__/g, '$1');
    t = t.replace(/\*(.*?)\*/g, '$1');
    t = t.replace(/`([^`]+)`/g, '$1');
    // headings -> plain
    t = t.replace(/^#{1,6}\s*/gm, '');
    // bullets to dot
    t = t.replace(/^\s*[\*\-]\s+/gm, '• ');
    // numbered lists keep numbers
    t = t.replace(/^\s*(\d+)\.\s+/gm, '$1) ');
    return t.trim();
  };

  const formatted = useMemo(() => (response ? sanitizeMarkdown(response) : ''), [response]);
  const MAX_CHARS = 600;
  const displayText = useMemo(() => {
    if (!formatted) return '';
    if (showFull || formatted.length <= MAX_CHARS) return formatted;
    return formatted.slice(0, MAX_CHARS) + '…';
  }, [formatted, showFull]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await generateResponse(input);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
            Ask me anything:
          </label>
          <input
            id="prompt"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="Type your question here..."
            disabled={isLoading}
          />
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
          >
            {isLoading ? 'Generating...' : 'Send'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 bg-gray-200 rounded-md"
            disabled={isLoading}
          >
            Clear
          </button>
        </div>
      </form>

      {isLoading && <div className="text-gray-500">Thinking...</div>}
      
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          Error: {error}
        </div>
      )}
      
      {response && (
        <div className="p-4 bg-gray-50 rounded-md">
          <h3 className="font-medium mb-2">Response:</h3>
          <p className="whitespace-pre-line">{displayText}</p>
          {formatted.length > MAX_CHARS && (
            <button
              type="button"
              onClick={() => setShowFull((s) => !s)}
              className="mt-2 text-sm text-blue-600 underline"
              disabled={isLoading}
            >
              {showFull ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
