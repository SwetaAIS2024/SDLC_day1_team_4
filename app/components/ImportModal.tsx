'use client';

import { Upload, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useState } from 'react';
import { ImportResult, ImportOptions } from '@/lib/types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File, options: ImportOptions) => Promise<ImportResult>;
  onSuccess?: () => void;
}

export function ImportModal({ isOpen, onClose, onImport, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [options, setOptions] = useState<ImportOptions>({
    mergeDuplicateTags: true,
    skipDuplicateTemplates: false,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      const importResult = await onImport(file, options);
      setResult(importResult);
      
      if (importResult.success && onSuccess) {
        // Call onSuccess after a brief delay to show the success message
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      console.error('Import failed:', err);
      setResult({
        success: false,
        statistics: {
          todos_imported: 0,
          todos_skipped: 0,
          subtasks_imported: 0,
          tags_imported: 0,
          tags_merged: 0,
          tags_skipped: 0,
          templates_imported: 0,
          templates_skipped: 0
        },
        id_mapping: { todos: {}, tags: {}, templates: {} },
        errors: [{
          type: 'database',
          entity: 'todo',
          original_id: 0,
          message: err instanceof Error ? err.message : 'Unknown error occurred'
        }],
        warnings: []
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload size={24} />
            Import Data
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            disabled={importing}
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {!result ? (
          <>
            <div className="mb-4">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer"
                disabled={importing}
              />
              {file && (
                <p className="text-sm text-slate-400 mt-2">
                  Selected: {file.name}
                </p>
              )}
            </div>

            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.mergeDuplicateTags}
                  onChange={(e) => setOptions({ ...options, mergeDuplicateTags: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                  disabled={importing}
                />
                <span className="text-white">Merge duplicate tags by name</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.skipDuplicateTemplates}
                  onChange={(e) => setOptions({ ...options, skipDuplicateTemplates: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                  disabled={importing}
                />
                <span className="text-white">Skip duplicate templates</span>
              </label>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-200">
                  This will add imported data to your existing todos. Review carefully before proceeding.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                disabled={importing}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={!file || importing}
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              {result.success ? (
                <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={24} className="text-green-400 flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-green-200">Import Successful!</h3>
                  </div>
                  <div className="space-y-1 text-sm text-green-100">
                    <p>✓ {result.statistics.todos_imported} todos imported</p>
                    <p>✓ {result.statistics.subtasks_imported} subtasks imported</p>
                    <p>✓ {result.statistics.tags_imported} tags imported</p>
                    {result.statistics.tags_merged > 0 && (
                      <p>✓ {result.statistics.tags_merged} tags merged</p>
                    )}
                    <p>✓ {result.statistics.templates_imported} templates imported</p>
                    {result.statistics.todos_skipped > 0 && (
                      <p className="text-yellow-300">⚠ {result.statistics.todos_skipped} todos skipped</p>
                    )}
                    {result.statistics.templates_skipped > 0 && (
                      <p className="text-yellow-300">⚠ {result.statistics.templates_skipped} templates skipped</p>
                    )}
                  </div>
                  {result.warnings.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-green-500/30">
                      <p className="text-xs font-semibold text-green-200 mb-1">Warnings:</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {result.warnings.slice(0, 5).map((warning, i) => (
                          <p key={i} className="text-xs text-green-100">• {warning.message}</p>
                        ))}
                        {result.warnings.length > 5 && (
                          <p className="text-xs text-green-200">... and {result.warnings.length - 5} more warnings</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-200 mb-2">Import Failed</h3>
                  <div className="space-y-1 text-sm text-red-100 max-h-48 overflow-y-auto">
                    {result.errors.map((error, i) => (
                      <p key={i}>• {error.message}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
