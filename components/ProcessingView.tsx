import React from 'react';
import { Loader2, Sparkles, BrainCircuit } from 'lucide-react';
import { ProcessingState } from '../types';

interface ProcessingViewProps {
  state: ProcessingState;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({ state }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8 animate-pulse-slow">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-400 opacity-20 blur-2xl rounded-full animate-pulse"></div>
        <div className="relative bg-white w-24 h-24 rounded-3xl shadow-xl flex items-center justify-center">
          {state.status === 'thinking' ? (
            <BrainCircuit className="text-purple-600 animate-pulse" size={48} />
          ) : (
            <Sparkles className="text-blue-600 animate-spin-slow" size={48} />
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-xl font-semibold text-slate-800">
          {state.status === 'thinking' ? 'Deep Analysis...' : 'Processing Document...'}
        </h3>
        <p className="text-slate-500 text-sm max-w-xs mx-auto">
          {state.message}
        </p>
      </div>

      {state.status === 'thinking' && (
        <div className="px-4 py-2 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-100 flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" />
          Thinking Budget Active
        </div>
      )}
    </div>
  );
};
