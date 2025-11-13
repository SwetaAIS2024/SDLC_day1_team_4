'use client';

import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  advancedSearch: boolean;
  onToggleAdvanced: () => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  advancedSearch,
  onToggleAdvanced,
  placeholder = 'Search todos...'
}: SearchBarProps) {
  const MAX_SEARCH_LENGTH = 100;

  const handleChange = (newValue: string) => {
    // Limit search term length to prevent excessive queries
    onChange(newValue.slice(0, MAX_SEARCH_LENGTH));
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            title="Clear search"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={advancedSearch}
          onChange={onToggleAdvanced}
          className="w-4 h-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500"
        />
        <span>Include tags in search</span>
      </label>
    </div>
  );
}
