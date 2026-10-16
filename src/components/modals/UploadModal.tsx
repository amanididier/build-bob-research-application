import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { X, UploadCloud, FileText, Check, Plus } from 'lucide-react';

export const UploadModal: React.FC = () => {
  const { isAddFilesOpen, setIsAddFilesOpen, triggerThinking } = useApp();
  const [files, setFiles] = useState<Array<{ name: string; size: string }>>([]);
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
      <div className="w-full max-w-[440px] bg-white dark:bg-[var(--s)] border border-black/5 dark:border-[var(--line)] shadow-2xl rounded-[24px] p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <b className="text-[16px] text-[var(--t)] block tracking-tight">Add files</b>
            <p className="text-[12px] text-[var(--m)] m-0 mt-0.5">Attach sources for Bob to use in this session.</p>
          </div>
          <button
            onClick={() => setIsAddFilesOpen(false)}
            className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-[var(--s2)] text-[var(--m)] hover:text-[var(--t)] grid place-items-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-neutral-300 dark:border-[var(--line)] rounded-[18px] text-center py-10 px-4 cursor-pointer hover:border-[#f5c842] hover:bg-[#fff8df]/40 dark:hover:bg-[var(--s2)]/40 transition-all"
        >
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-[var(--s2)] text-neutral-600 dark:text-[var(--m)] grid place-items-center mx-auto mb-3">
            <UploadCloud className="w-5 h-5" />
          </div>
          <b className="text-[13px] text-[var(--t)] block font-semibold">Drop files or browse</b>
          <p className="text-[11px] text-[var(--m)] m-0 mt-1">PDF, DOCX, TXT, CSV, images</p>
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
