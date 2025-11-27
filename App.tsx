import React, { useState, useEffect } from 'react';
import { ViewState, ProcessingState, ScannedDoc } from './types';
import { Scanner } from './components/Scanner';
import { ProcessingView } from './components/ProcessingView';
import { ResultView } from './components/ResultView';
import { extractTextFromDocument, analyzeDocumentContent } from './services/geminiService';
import { Plus, Clock, FileText, ChevronRight } from 'lucide-react';

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      let encoded = reader.result?.toString().replace(/^data:(.*,)?/, '');
      if ((encoded?.length || 0) % 4 > 0) {
        encoded += '='.repeat(4 - (encoded?.length || 0) % 4);
      }
      resolve(encoded || '');
    };
    reader.onerror = error => reject(error);
  });
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle' });
  const [documents, setDocuments] = useState<ScannedDoc[]>([]);
  const [currentDoc, setCurrentDoc] = useState<ScannedDoc | null>(null);
  const [rawFile, setRawFile] = useState<{data: string, mimeType: string} | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('documind_scans');
    if (saved) {
      try {
        setDocuments(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save to local storage on update
  useEffect(() => {
    localStorage.setItem('documind_scans', JSON.stringify(documents));
  }, [documents]);

  const handleFileSelected = async (file: File) => {
    setView(ViewState.PROCESSING);
    setProcessing({ status: 'uploading', message: 'Reading file...' });

    try {
      const base64Data = await fileToBase64(file);
      setRawFile({ data: base64Data, mimeType: file.type });
      
      setProcessing({ status: 'ocr', message: 'Extracting text with Gemini Vision...' });
      
      const text = await extractTextFromDocument(base64Data, file.type);
      
      const newDoc: ScannedDoc = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        title: `Scan ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
        textData: text,
        type: file.type.includes('pdf') ? 'pdf' : 'image',
      };

      setCurrentDoc(newDoc);
      setDocuments(prev => [newDoc, ...prev]);
      setProcessing({ status: 'complete' });
      setView(ViewState.RESULT);

    } catch (error) {
      setProcessing({ status: 'error', message: 'Failed to process document. Please try again.' });
      setTimeout(() => setView(ViewState.HOME), 3000);
    }
  };

  const handleAnalyze = async () => {
    if (!currentDoc) return;
    
    // Check if we already have analysis
    if (currentDoc.analysis) return;

    setProcessing({ status: 'thinking', message: 'Gemini is thinking deeply...' });
    // We update UI locally first to show spinner in ResultView, but here we actually manage the async call
    // However, ResultView handles its own loading state for the tab switch visually.
    // Let's pass a prop to ResultView instead of changing global view if we want to keep context.
    // Actually, let's keep it simple: ResultView has an `isAnalyzing` prop.
    
    // We don't change `view` here, we just update state passed to ResultView
  };

  const performAnalysis = async () => {
    if (!currentDoc) return;
    
    try {
      const analysis = await analyzeDocumentContent(
        currentDoc.textData,
        rawFile?.data,
        rawFile?.mimeType
      );
      
      const updatedDoc = { ...currentDoc, analysis };
      setCurrentDoc(updatedDoc);
      setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    } catch (error) {
      console.error(error);
      alert("Analysis failed. Please check your API key quota.");
    }
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const onAnalyzeRequest = async () => {
    setIsAnalyzing(true);
    await performAnalysis();
    setIsAnalyzing(false);
  };

  const renderHome = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="px-6 pt-12 pb-6 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <FileText size={20} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">DocuMind</h1>
        </div>
        <p className="text-slate-500 text-sm font-medium">AI-Powered Document Scanner</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Clock size={18} className="text-slate-400" />
            Recent Scans
          </h2>
        </div>

        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 opacity-60">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
              <FileText size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-500">No documents scanned yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <button
                key={doc.id}
                onClick={() => {
                  setCurrentDoc(doc);
                  setRawFile(null); // Clear raw file if loading from history (saves memory, logic handles missing raw file gracefully)
                  setView(ViewState.RESULT);
                }}
                className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${doc.type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                  <FileText size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 truncate">{doc.title}</h3>
                  <p className="text-xs text-slate-500 truncate mt-1">
                    {doc.textData.substring(0, 40)}...
                  </p>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-slate-400" size={20} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 pb-8 bg-white border-t border-slate-200">
        <button
          onClick={() => setView(ViewState.SCANNING)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <Plus size={24} strokeWidth={3} />
          <span>Scan New Document</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto h-screen bg-white shadow-2xl overflow-hidden relative">
      {view === ViewState.HOME && renderHome()}
      
      {view === ViewState.SCANNING && (
        <div className="h-full flex flex-col">
           <header className="px-4 py-3 bg-white border-b border-slate-100 flex items-center">
             <button onClick={() => setView(ViewState.HOME)} className="p-2 -ml-2 text-slate-600">
               <ArrowLeft size={24} /> {/* Need to import ArrowLeft locally or reuse from ResultView */}
             </button>
             <span className="font-semibold ml-2">New Scan</span>
           </header>
           <div className="flex-1">
             <Scanner onFileSelected={handleFileSelected} />
           </div>
        </div>
      )}

      {view === ViewState.PROCESSING && <ProcessingView state={processing} />}
      
      {view === ViewState.RESULT && currentDoc && (
        <ResultView 
          doc={currentDoc} 
          onBack={() => setView(ViewState.HOME)} 
          onAnalyze={onAnalyzeRequest}
          isAnalyzing={isAnalyzing}
        />
      )}
    </div>
  );
};

// Re-importing ArrowLeft for the inline usage above to avoid TS error
import { ArrowLeft } from 'lucide-react';

export default App;
