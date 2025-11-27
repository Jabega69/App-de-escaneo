import React, { useRef } from 'react';
import { Camera, FileText, Upload } from 'lucide-react';

interface ScannerProps {
  onFileSelected: (file: File) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onFileSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  const triggerCamera = () => {
    fileInputRef.current?.setAttribute("capture", "environment");
    fileInputRef.current?.click();
  };

  const triggerUpload = () => {
    fileInputRef.current?.removeAttribute("capture");
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 animate-fade-in-up">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <FileText size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Scan Document</h2>
        <p className="text-slate-500 max-w-xs mx-auto">
          Capture a photo or upload a PDF to extract text and analyze content.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={triggerCamera}
          className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-blue-200"
        >
          <Camera size={24} />
          <span>Use Camera</span>
        </button>

        <button
          onClick={triggerUpload}
          className="w-full bg-white hover:bg-slate-50 active:scale-95 transition-all text-slate-700 font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-md border border-slate-100"
        >
          <Upload size={24} />
          <span>Upload File</span>
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        className="hidden"
      />
    </div>
  );
};
