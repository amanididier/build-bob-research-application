import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { X, UploadCloud, FileText, Check, Plus } from 'lucide-react';

export const UploadModal: React.FC = () => {
  const { isAddFilesOpen, setIsAddFilesOpen, triggerThinking } = useApp();
  const [files, setFiles] = useState<Array<{ name: string; size: string }>>([
    { name: 'passenger_survey_kigali_2026.pdf', size: '245 KB' },
    { name: 'competitor_fare_matrix.csv', size: '38 KB' },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isAddFilesOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newItems = Array.from(e.target.files).map((f) => ({
        name: f.name,
        size: `${Math.round(f.size / 1024)} KB`,
      }));
      setFiles((prev) => [...prev, ...newItems]);
    }
  };

  const handleApply = () => {
    setIsAddFilesOpen(false);
    triggerThinking('Adding research context', 'Indexing uploaded documents into project embedding space...', 'Reading uploaded context', () => {
      triggerThinking('Research context added', 'Your new sources are ready to use.', 'Ready');
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-[520px] bg-[var(--s)] border border-[var(--line)] shadow-2xl rounded-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <b className="text-[16px] text-[var(--t)] block">Add research files</b>
            <p className="text-[11px] text-[var(--m)] m-0">Give Bob another piece of context to ground synthesis.</p>
          </div>
          <button
            onClick={() => setIsAddFilesOpen(false)}
            className="w-7 h-7 rounded-full bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] grid place-items-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#ccc] dark:border-[#44382f] rounded-2xl text-center py-8 px-4 cursor-pointer hover:border-[var(--y)] hover:bg-[var(--s2)]/40 transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-[var(--ys)] text-[#765700] grid place-items-center mx-auto mb-3 text-xl shadow-sm">
            <UploadCloud className="w-6 h-6 text-[var(--y)]" />
          </div>
          <b className="text-[13px] text-[var(--t)] block">Drop files here or click to browse</b>
          <p className="text-[10px] text-[var(--m)] m-0 mt-1">PDF, DOCX, TXT, CSV, images</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {files.map((f, i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-xl bg-[var(--s2)] flex items-center justify-between text-[11px]"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-[var(--m)]" />
                  <span className="truncate text-[var(--t)]">{f.name}</span>
                </div>
                <span className="text-[10px] text-[var(--m)] font-mono flex-shrink-0">{f.size}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
          <button
            onClick={() => setIsAddFilesOpen(false)}
            className="h-8 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--s)] hover:bg-[var(--s2)] text-[var(--t)] text-[11px] font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            className="h-8 px-4 rounded-xl bg-[#171717] dark:bg-[#f2eee7] text-white dark:text-[#171717] text-[11px] font-bold flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Add to research</span>
          </button>
        </div>
      </div>
    </div>
  );
};
