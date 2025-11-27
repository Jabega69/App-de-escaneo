import React, { useState } from 'react';
import { ScannedDoc } from '../types';
import { Copy, Share, ArrowLeft, FileText, Sparkles, Download, Cloud } from 'lucide-react';

interface ResultViewProps {
  doc: ScannedDoc;
  onBack: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export const ResultView: React.FC<ResultViewProps> = ({ doc, onBack, onAnalyze, isAnalyzing }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'analysis'>('text');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = activeTab === 'text' ? doc.textData : (doc.analysis || '');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([doc.textData], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `documind-${doc.title}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: doc.title,
          text: activeTab === 'text' ? doc.textData : doc.analysis,
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-10 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-slate-800 truncate max-w-[200px]">{doc.title}</h1>
        <button onClick={handleShare} className="p-2 -mr-2 text-blue-600 font-medium">
          Share
        </button>
      </div>

      {/* Tabs */}
      <div className="p-4 pb-0">
        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={16} />
            Original Text
          </button>
          <button
            onClick={() => {
              setActiveTab('analysis');
              if (!doc.analysis) onAnalyze();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'analysis' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isAnalyzing ? <Sparkles size={16} className="animate-spin" /> : <Sparkles size={16} />}
            AI Analysis
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 min-h-[300px] text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-100">
          {activeTab === 'text' ? (
            doc.textData
          ) : (
             isAnalyzing ? (
              <div className="flex flex-col items-center justify-center h-48 text-purple-600 space-y-3">
                <Sparkles className="animate-spin" size={32} />
                <p className="text-sm font-medium">Analyzing with Gemini Pro...</p>
                <p className="text-xs text-purple-400">Thinking budget: 16k tokens</p>
              </div>
            ) : (
              doc.analysis || (
                <div className="text-center text-slate-400 py-10">
                  <p>Tap "AI Analysis" to summarize and extract insights.</p>
                </div>
              )
            )
          )}
        </div>
      </div>

      {/* Actions Toolbar */}
      <div className="bg-white border-t border-slate-200 px-4 py-4 safe-area-bottom">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
          >
            {copied ? <span className="text-green-600">Copied!</span> : <><Copy size={18} /> Copy Text</>}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors shadow-blue-200 shadow-lg"
          >
            <Cloud size={18} />
            Save to Drive
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-3">
          "Save to Drive" downloads the text file. Save to Files &gt; Drive on iOS.
        </p>
      </div>
    </div>
  );
};
