'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { ExportOptions } from '@/lib/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
}

export function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  const [options, setOptions] = useState<ExportOptions>({
    includeTodos: true,
    includeTags: true,
    includeTemplates: true,
    includeCompleted: true,
  });
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport(options);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  const hasSelection = options.includeTodos || options.includeTags || options.includeTemplates;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Download size={24} />
          Export Data
        </h2>

        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeTodos}
              onChange={(e) => setOptions({ ...options, includeTodos: e.target.checked })}
              className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
              disabled={exporting}
            />
            <span className="text-white">Todos (with subtasks)</span>
          </label>

          {options.includeTodos && (
            <label className="flex items-center gap-3 cursor-pointer ml-8">
              <input
                type="checkbox"
                checked={options.includeCompleted}
                onChange={(e) => setOptions({ ...options, includeCompleted: e.target.checked })}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                disabled={exporting}
              />
              <span className="text-slate-300">Include completed todos</span>
            </label>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeTags}
              onChange={(e) => setOptions({ ...options, includeTags: e.target.checked })}
              className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
              disabled={exporting}
            />
            <span className="text-white">Tags</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeTemplates}
              onChange={(e) => setOptions({ ...options, includeTemplates: e.target.checked })}
              className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
              disabled={exporting}
            />
            <span className="text-white">Templates</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            disabled={exporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={exporting || !hasSelection}
          >
            {exporting ? 'Exporting...' : 'Download JSON'}
          </button>
        </div>
      </div>
    </div>
  );
}
