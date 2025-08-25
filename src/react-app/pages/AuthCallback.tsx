import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  useEffect(() => {
    // No third-party exchange needed; redirect to home.
    window.location.href = '/';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Processing...</h2>
        <p className="text-slate-300">Completing your login...</p>
      </div>
    </div>
  );
}
