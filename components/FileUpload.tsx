
import React from 'react';

interface FileUploadProps {
  onFileSelect: (text: string) => void;
  disabled: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        onFileSelect(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 transition-colors cursor-pointer relative">
      <div className="text-center">
        <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-cloud-arrow-up text-blue-600 text-2xl"></i>
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Upload Transaction CSV</h3>
        <p className="text-slate-500 mt-2 text-sm max-w-xs">
          Select a CSV file containing your monthly credit card statements.
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>
      <div className="mt-6 flex gap-2">
        <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-600 border border-slate-200">Required: Date</span>
        <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-600 border border-slate-200">Required: Description</span>
        <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-600 border border-slate-200">Required: Amount</span>
      </div>
    </div>
  );
};

export default FileUpload;
