import { useState } from 'react';
import { Sparkles, RefreshCw, Lightbulb, Heart, Bell, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useAISuggestions } from '@/react-app/hooks/useAISuggestions';
import { AISuggestion } from '@/shared/types';

interface AISuggestionBoxProps {
  onSuggestionGenerated?: (suggestion: AISuggestion) => void;
}

export default function AISuggestionBox({ onSuggestionGenerated }: AISuggestionBoxProps) {
  const [currentSuggestion, setCurrentSuggestion] = useState<AISuggestion | null>(null);
  const [context, setContext] = useState('');
  const { generateSuggestion, loading } = useAISuggestions();

  const suggestionTypes = [
    { type: 'motivation', icon: Heart, label: 'Motivation', color: 'text-red-400' },
    { type: 'tip', icon: Lightbulb, label: 'Tips', color: 'text-yellow-400' },
    { type: 'reminder', icon: Bell, label: 'Reminder', color: 'text-blue-400' },
    { type: 'health', icon: Heart, label: 'Health', color: 'text-green-400' },
    { type: 'productivity', icon: RefreshCw, label: 'Productivity', color: 'text-purple-400' },
    { type: 'mindfulness', icon: Sparkles, label: 'Mindfulness', color: 'text-indigo-400' },
  ];

  const handleGenerateSuggestion = async (type?: string) => {
    const suggestion = await generateSuggestion({ 
      context: context.trim() || undefined, 
      type: type as any 
    });
    
    if (suggestion) {
      setCurrentSuggestion(suggestion);
      onSuggestionGenerated?.(suggestion);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-500/20 to-blue-600/20 backdrop-blur-lg rounded-xl border border-white/20 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
          <p className="text-sm text-purple-200">Get personalized guidance</p>
        </div>
      </div>

      {/* Context Input */}
      <div className="mb-4">
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Tell me about your current situation or challenges..."
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
          rows={2}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => handleGenerateSuggestion()}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{loading ? 'Thinking...' : 'Get Suggestion'}</span>
        </button>

        {suggestionTypes.map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            onClick={() => handleGenerateSuggestion(type)}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white text-sm rounded-lg transition-colors"
          >
            <Icon className={`w-4 h-4 ${color}`} />
            <span>{label}</span>
          </button>
        ))}

        <Link
          href="/questions"
          className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
        >
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span>Questions</span>
        </Link>
      </div>

      {/* Current Suggestion */}
      {currentSuggestion && (
        <div className="bg-white/10 rounded-lg p-4 border border-white/20">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm leading-relaxed">
                {currentSuggestion.suggestion_text}
              </p>
              {currentSuggestion.suggestion_type && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100/20 text-purple-200 border border-purple-300/20">
                    {currentSuggestion.suggestion_type}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!currentSuggestion && !loading && (
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <p className="text-white/60 text-sm">
            Get AI-powered suggestions to help you achieve your goals
          </p>
        </div>
      )}
    </div>
  );
}
