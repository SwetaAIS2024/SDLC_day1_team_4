# PRP-09: Search & Filtering

**Feature**: Real-Time Search and Multi-Criteria Filtering for Todos  
**Priority**: P1 (High Priority)  
**Status**: Specification  
**Last Updated**: November 13, 2025

---

## 📋 Feature Overview

The Search & Filtering feature provides users with powerful tools to quickly find and focus on relevant todos within their potentially large todo list. Users can perform real-time text searches across todo titles, apply multiple filters simultaneously (by priority, completion status, tags, overdue status), and combine search with filters for precise results. All search and filtering operations are performed client-side for instant feedback with no network latency.

This feature is essential for power users managing dozens or hundreds of todos, enabling them to efficiently navigate their task list and focus on what matters most at any given moment.

### Key Capabilities
- **Real-Time Text Search**: Instant search across todo titles as user types
- **Case-Insensitive Matching**: Find todos regardless of capitalization
- **Multi-Criteria Filtering**: Apply multiple filters simultaneously
- **Priority Filter**: Show only high, medium, or low priority todos
- **Completion Status Filter**: View active, completed, or all todos
- **Tag Filter**: Filter by one or multiple tags (OR logic)
- **Overdue Filter**: Quickly see todos past their due date
- **Search + Filter Combination**: Search text works with all filters
- **Filter Indicators**: Clear visual feedback showing active filters
- **Quick Clear**: One-click removal of all filters and search
- **Performance**: Client-side filtering ensures instant results

---

## 👥 User Stories

### Primary User Persona: Busy Professional with Many Todos

**As a** professional managing 50+ active todos  
**I want to** search for todos containing "client meeting"  
**So that** I can quickly find all meeting-related tasks without scrolling

**As a** user focusing on urgent work  
**I want to** filter to show only high-priority todos  
**So that** I can see my most important tasks at a glance

**As a** user who likes to archive completed work  
**I want to** toggle between viewing active and completed todos  
**So that** I can review what I've accomplished or focus on pending items

**As a** freelancer juggling multiple clients  
**I want to** filter todos by the "Client A" tag  
**So that** I can see all tasks related to that specific client

**As a** deadline-driven person  
**I want to** see only overdue todos  
**So that** I can immediately address tasks I've missed

**As a** user with complex needs  
**I want to** combine filters (e.g., high priority + work tag + active only)  
**So that** I can drill down to exactly the todos I need to see right now

**As a** user who frequently switches contexts  
**I want to** quickly clear all filters with one click  
**So that** I can return to viewing my full todo list without tedious manual removal

---

## 🔄 User Flow

### Flow 1: Basic Text Search

1. User is viewing main todo list with 50 todos
2. User focuses on search input field at top of page
3. User types "meet"
4. **Instant filtering**: Todo list updates to show only todos containing "meet" (case-insensitive)
5. Results show:
   - "Team meeting prep" (title contains "meet")
   - "Client meeting notes" (title contains "meet")
   - "Weekly standup meeting" (title contains "meet")
6. User continues typing: "meeting"
7. Results update instantly to match new query
8. User sees filter indicator: "Search: meeting" with X button
9. User clicks X or clears search input
10. Full todo list displays again

### Flow 2: Filtering by Priority

1. User clicks "Filter" button in toolbar
2. Filter panel opens showing filter options
3. User sees priority section with three checkboxes:
   - ☐ High Priority (3 todos)
   - ☐ Medium Priority (25 todos)
   - ☐ Low Priority (10 todos)
4. User checks "High Priority"
5. **Instant filtering**: List updates to show only 3 high-priority todos
6. Filter indicator appears: "Priority: High" with X button
7. User checks "Medium Priority" (multi-select)
8. List updates to show 28 todos (3 high + 25 medium)
9. Filter indicator updates: "Priority: High, Medium"
10. User unchecks "High Priority"
11. List updates to show only 25 medium-priority todos

### Flow 3: Filtering by Completion Status

1. User clicks "View" dropdown in toolbar
2. Options shown:
   - ● Active Todos (default, 38 todos)
   - ○ Completed Todos (12 todos)
   - ○ All Todos (50 todos)
3. User selects "Completed Todos"
4. **Instant filtering**: List updates to show only 12 completed todos
5. Completed todos appear with strikethrough styling
6. Filter indicator: "Status: Completed" with X
7. User selects "All Todos"
8. All 50 todos display (completed with strikethrough)

### Flow 4: Filtering by Tag

1. User clicks "Tags" dropdown in filter panel
2. Dropdown shows all user's tags:
   - ☐ Work (15 todos)
   - ☐ Personal (12 todos)
   - ☐ Urgent (5 todos)
   - ☐ Client A (8 todos)
   - ☐ Client B (6 todos)
3. User checks "Work"
4. **Instant filtering**: List shows 15 todos tagged "Work"
5. Filter indicator: "Tag: Work" with X
6. User checks "Urgent" (multi-select, OR logic)
7. List shows 20 todos (15 Work + 5 Urgent, some overlap counted once)
8. Filter indicator: "Tags: Work, Urgent"

### Flow 5: Filtering by Overdue Status

1. User clicks "Show Overdue Only" toggle button
2. **Instant filtering**: List shows only todos with due dates in the past
3. Overdue todos highlighted with red border or badge
4. Count shown: "7 overdue todos"
5. Filter indicator: "Overdue Only" with X
6. User clicks toggle again to disable
7. Full list displays again

### Flow 6: Combining Search and Filters

1. User starts with full todo list (50 todos)
2. User types "report" in search box
3. List filters to 8 todos containing "report"
4. User opens filter panel and checks "High Priority"
5. List further filters to 2 todos (high priority + contains "report")
6. User checks "Work" tag
7. List further filters to 1 todo (high priority + contains "report" + tagged Work)
8. Filter indicators show:
   - "Search: report"
   - "Priority: High"
   - "Tag: Work"
9. Each indicator has X button for individual removal

### Flow 7: Clearing All Filters

1. User has multiple active filters:
   - Search: "meeting"
   - Priority: High, Medium
   - Tag: Work, Urgent
   - Status: Active only
2. User sees "Clear All Filters" button (only visible when filters active)
3. User clicks "Clear All Filters"
4. **Instant reset**: All filters removed, search cleared
5. Full todo list displays (50 todos)
6. Filter indicators disappear
7. Search input clears

### Flow 8: URL State Persistence (Advanced)

1. User applies filters: Priority=High, Tag=Work
2. URL updates to: `/todos?priority=high&tag=work`
3. User copies URL and pastes in new tab
4. New tab opens with same filters pre-applied
5. User clicks browser back button
6. Filters revert to previous state
7. User refreshes page
8. Filters persist from URL parameters

---

## 🛠️ Technical Requirements

### Client-Side Filtering Logic

**File**: `lib/filters.ts`

```typescript
import { Todo, Tag } from './db';
import { getSingaporeNow } from './timezone';

export interface FilterCriteria {
  searchQuery?: string;
  priorities?: ('high' | 'medium' | 'low')[];
  completionStatus?: 'active' | 'completed' | 'all';
  tagIds?: number[];
  showOverdueOnly?: boolean;
}

export interface FilterResult {
  filteredTodos: Todo[];
  totalCount: number;
  filteredCount: number;
  appliedFilters: string[];
}

/**
 * Apply all filter criteria to todo list
 * All operations performed client-side for instant results
 */
export function applyFilters(
  todos: Todo[],
  criteria: FilterCriteria
): FilterResult {
  let filtered = [...todos];
  const appliedFilters: string[] = [];

  // 1. Filter by search query (case-insensitive, matches title)
  if (criteria.searchQuery && criteria.searchQuery.trim()) {
    const query = criteria.searchQuery.trim().toLowerCase();
    filtered = filtered.filter(todo =>
      todo.title.toLowerCase().includes(query)
    );
    appliedFilters.push(`Search: ${criteria.searchQuery}`);
  }

  // 2. Filter by priority (OR logic - show if matches any selected priority)
  if (criteria.priorities && criteria.priorities.length > 0) {
    filtered = filtered.filter(todo =>
      criteria.priorities!.includes(todo.priority)
    );
    appliedFilters.push(`Priority: ${criteria.priorities.join(', ')}`);
  }

  // 3. Filter by completion status
  if (criteria.completionStatus && criteria.completionStatus !== 'all') {
    const isCompleted = criteria.completionStatus === 'completed';
    filtered = filtered.filter(todo => todo.completed === (isCompleted ? 1 : 0));
    appliedFilters.push(`Status: ${criteria.completionStatus}`);
  }

  // 4. Filter by tags (OR logic - show if has any selected tag)
  if (criteria.tagIds && criteria.tagIds.length > 0) {
    filtered = filtered.filter(todo =>
      todo.tags?.some(tag => criteria.tagIds!.includes(tag.id))
    );
    const tagNames = filtered.length > 0
      ? criteria.tagIds.map(id => {
          const tag = filtered[0].tags?.find(t => t.id === id);
          return tag?.name || '';
        }).filter(Boolean).join(', ')
      : 'Selected tags';
    appliedFilters.push(`Tags: ${tagNames}`);
  }

  // 5. Filter by overdue status
  if (criteria.showOverdueOnly) {
    const now = getSingaporeNow();
    filtered = filtered.filter(todo => {
      if (!todo.due_date) return false;
      const dueDate = new Date(todo.due_date);
      return dueDate < now && todo.completed === 0;
    });
    appliedFilters.push('Overdue Only');
  }

  return {
    filteredTodos: filtered,
    totalCount: todos.length,
    filteredCount: filtered.length,
    appliedFilters,
  };
}

/**
 * Check if any filters are currently active
 */
export function hasActiveFilters(criteria: FilterCriteria): boolean {
  return !!(
    criteria.searchQuery?.trim() ||
    (criteria.priorities && criteria.priorities.length > 0) ||
    (criteria.completionStatus && criteria.completionStatus !== 'all') ||
    (criteria.tagIds && criteria.tagIds.length > 0) ||
    criteria.showOverdueOnly
  );
}

/**
 * Clear all filter criteria
 */
export function clearAllFilters(): FilterCriteria {
  return {
    searchQuery: '',
    priorities: [],
    completionStatus: 'all',
    tagIds: [],
    showOverdueOnly: false,
  };
}

/**
 * Convert URL search params to filter criteria
 */
export function filtersFromURLParams(searchParams: URLSearchParams): FilterCriteria {
  const criteria: FilterCriteria = {};

  // Search query
  const query = searchParams.get('q');
  if (query) criteria.searchQuery = query;

  // Priorities (can be comma-separated: ?priority=high,medium)
  const priorityParam = searchParams.get('priority');
  if (priorityParam) {
    const priorities = priorityParam.split(',').filter(p =>
      ['high', 'medium', 'low'].includes(p)
    ) as ('high' | 'medium' | 'low')[];
    if (priorities.length > 0) criteria.priorities = priorities;
  }

  // Completion status
  const status = searchParams.get('status');
  if (status && ['active', 'completed', 'all'].includes(status)) {
    criteria.completionStatus = status as 'active' | 'completed' | 'all';
  }

  // Tags (comma-separated IDs: ?tags=1,2,3)
  const tagsParam = searchParams.get('tags');
  if (tagsParam) {
    const tagIds = tagsParam.split(',')
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id));
    if (tagIds.length > 0) criteria.tagIds = tagIds;
  }

  // Overdue only
  const overdue = searchParams.get('overdue');
  if (overdue === 'true') criteria.showOverdueOnly = true;

  return criteria;
}

/**
 * Convert filter criteria to URL search params
 */
export function filtersToURLParams(criteria: FilterCriteria): URLSearchParams {
  const params = new URLSearchParams();

  if (criteria.searchQuery?.trim()) {
    params.set('q', criteria.searchQuery.trim());
  }

  if (criteria.priorities && criteria.priorities.length > 0) {
    params.set('priority', criteria.priorities.join(','));
  }

  if (criteria.completionStatus && criteria.completionStatus !== 'all') {
    params.set('status', criteria.completionStatus);
  }

  if (criteria.tagIds && criteria.tagIds.length > 0) {
    params.set('tags', criteria.tagIds.join(','));
  }

  if (criteria.showOverdueOnly) {
    params.set('overdue', 'true');
  }

  return params;
}
```

### TypeScript Types

**File**: `lib/types.ts` (additions)

```typescript
export type CompletionStatus = 'active' | 'completed' | 'all';
export type PriorityFilter = 'high' | 'medium' | 'low';

export interface FilterState {
  searchQuery: string;
  selectedPriorities: PriorityFilter[];
  completionStatus: CompletionStatus;
  selectedTagIds: number[];
  showOverdueOnly: boolean;
}

export interface FilterOption {
  value: string;
  label: string;
  count: number;
  checked: boolean;
}
```

### React Hook for Filter State Management

**File**: `hooks/useFilters.ts`

```typescript
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Todo } from '@/lib/db';
import {
  FilterCriteria,
  applyFilters,
  hasActiveFilters,
  clearAllFilters,
  filtersFromURLParams,
  filtersToURLParams,
} from '@/lib/filters';

export function useFilters(todos: Todo[]) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize filter state from URL params
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>(() =>
    filtersFromURLParams(searchParams)
  );

  // Apply filters to todos
  const filterResult = useMemo(
    () => applyFilters(todos, filterCriteria),
    [todos, filterCriteria]
  );

  // Update URL when filters change
  useEffect(() => {
    const params = filtersToURLParams(filterCriteria);
    const queryString = params.toString();
    const newURL = queryString ? `?${queryString}` : '/';
    router.replace(newURL, { scroll: false });
  }, [filterCriteria, router]);

  // Filter mutation functions
  const setSearchQuery = (query: string) => {
    setFilterCriteria(prev => ({ ...prev, searchQuery: query }));
  };

  const setPriorities = (priorities: ('high' | 'medium' | 'low')[]) => {
    setFilterCriteria(prev => ({ ...prev, priorities }));
  };

  const togglePriority = (priority: 'high' | 'medium' | 'low') => {
    setFilterCriteria(prev => {
      const priorities = prev.priorities || [];
      const newPriorities = priorities.includes(priority)
        ? priorities.filter(p => p !== priority)
        : [...priorities, priority];
      return { ...prev, priorities: newPriorities };
    });
  };

  const setCompletionStatus = (status: 'active' | 'completed' | 'all') => {
    setFilterCriteria(prev => ({ ...prev, completionStatus: status }));
  };

  const setTagIds = (tagIds: number[]) => {
    setFilterCriteria(prev => ({ ...prev, tagIds }));
  };

  const toggleTag = (tagId: number) => {
    setFilterCriteria(prev => {
      const tagIds = prev.tagIds || [];
      const newTagIds = tagIds.includes(tagId)
        ? tagIds.filter(id => id !== tagId)
        : [...tagIds, tagId];
      return { ...prev, tagIds: newTagIds };
    });
  };

  const setShowOverdueOnly = (show: boolean) => {
    setFilterCriteria(prev => ({ ...prev, showOverdueOnly: show }));
  };

  const clearFilters = () => {
    setFilterCriteria(clearAllFilters());
  };

  const removeFilter = (filterKey: keyof FilterCriteria) => {
    setFilterCriteria(prev => {
      const updated = { ...prev };
      if (filterKey === 'searchQuery') updated.searchQuery = '';
      if (filterKey === 'priorities') updated.priorities = [];
      if (filterKey === 'completionStatus') updated.completionStatus = 'all';
      if (filterKey === 'tagIds') updated.tagIds = [];
      if (filterKey === 'showOverdueOnly') updated.showOverdueOnly = false;
      return updated;
    });
  };

  return {
    // State
    filterCriteria,
    filteredTodos: filterResult.filteredTodos,
    totalCount: filterResult.totalCount,
    filteredCount: filterResult.filteredCount,
    appliedFilters: filterResult.appliedFilters,
    hasFilters: hasActiveFilters(filterCriteria),

    // Actions
    setSearchQuery,
    setPriorities,
    togglePriority,
    setCompletionStatus,
    setTagIds,
    toggleTag,
    setShowOverdueOnly,
    clearFilters,
    removeFilter,
  };
}
```

---

## 🎨 UI Components

### Search Input Component

**File**: `components/SearchInput.tsx`

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search todos...',
  debounceMs = 300,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce onChange calls
  const handleChange = (newValue: string) => {
    setLocalValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
      />
      
      {/* Search Icon */}
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Clear Button */}
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
```

### Filter Panel Component

**File**: `components/FilterPanel.tsx`

```typescript
'use client';

import { Tag } from '@/lib/db';

interface FilterPanelProps {
  // Priority filters
  priorities: ('high' | 'medium' | 'low')[];
  onPrioritiesChange: (priorities: ('high' | 'medium' | 'low')[]) => void;
  priorityCounts: { high: number; medium: number; low: number };

  // Completion status
  completionStatus: 'active' | 'completed' | 'all';
  onCompletionStatusChange: (status: 'active' | 'completed' | 'all') => void;
  statusCounts: { active: number; completed: number; all: number };

  // Tags
  availableTags: Tag[];
  selectedTagIds: number[];
  onTagsChange: (tagIds: number[]) => void;
  tagCounts: Record<number, number>;

  // Overdue
  showOverdueOnly: boolean;
  onShowOverdueChange: (show: boolean) => void;
  overdueCount: number;

  // Clear all
  onClearAll: () => void;
}

export function FilterPanel({
  priorities,
  onPrioritiesChange,
  priorityCounts,
  completionStatus,
  onCompletionStatusChange,
  statusCounts,
  availableTags,
  selectedTagIds,
  onTagsChange,
  tagCounts,
  showOverdueOnly,
  onShowOverdueChange,
  overdueCount,
  onClearAll,
}: FilterPanelProps) {
  const handlePriorityToggle = (priority: 'high' | 'medium' | 'low') => {
    const newPriorities = priorities.includes(priority)
      ? priorities.filter(p => p !== priority)
      : [...priorities, priority];
    onPrioritiesChange(newPriorities);
  };

  const handleTagToggle = (tagId: number) => {
    const newTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    onTagsChange(newTagIds);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        <button
          onClick={onClearAll}
          className="text-sm text-blue-500 hover:text-blue-700"
        >
          Clear All
        </button>
      </div>

      {/* Priority Filter */}
      <div>
        <h4 className="text-sm font-medium mb-2">Priority</h4>
        <div className="space-y-2">
          {(['high', 'medium', 'low'] as const).map((priority) => (
            <label
              key={priority}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={priorities.includes(priority)}
                onChange={() => handlePriorityToggle(priority)}
                className="w-4 h-4"
              />
              <span className="capitalize">{priority}</span>
              <span className="text-sm text-gray-500 ml-auto">
                ({priorityCounts[priority]})
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Completion Status */}
      <div>
        <h4 className="text-sm font-medium mb-2">Status</h4>
        <div className="space-y-2">
          {(['active', 'completed', 'all'] as const).map((status) => (
            <label
              key={status}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                checked={completionStatus === status}
                onChange={() => onCompletionStatusChange(status)}
                className="w-4 h-4"
              />
              <span className="capitalize">{status}</span>
              <span className="text-sm text-gray-500 ml-auto">
                ({statusCounts[status]})
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Tags Filter */}
      {availableTags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Tags</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {availableTags.map((tag) => (
              <label
                key={tag.id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTagIds.includes(tag.id)}
                  onChange={() => handleTagToggle(tag.id)}
                  className="w-4 h-4"
                />
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span>{tag.name}</span>
                <span className="text-sm text-gray-500 ml-auto">
                  ({tagCounts[tag.id] || 0})
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Overdue Toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showOverdueOnly}
            onChange={(e) => onShowOverdueChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span>Show Overdue Only</span>
          <span className="text-sm text-gray-500 ml-auto">
            ({overdueCount})
          </span>
        </label>
      </div>
    </div>
  );
}
```

### Filter Indicator Chips Component

**File**: `components/FilterIndicators.tsx`

```typescript
'use client';

interface FilterIndicatorsProps {
  appliedFilters: string[];
  onRemoveFilter: (index: number) => void;
  onClearAll: () => void;
}

export function FilterIndicators({
  appliedFilters,
  onRemoveFilter,
  onClearAll,
}: FilterIndicatorsProps) {
  if (appliedFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Active filters:
      </span>

      {appliedFilters.map((filter, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm"
        >
          {filter}
          <button
            onClick={() => onRemoveFilter(index)}
            className="hover:text-blue-600 dark:hover:text-blue-400"
            aria-label={`Remove ${filter} filter`}
          >
            ×
          </button>
        </span>
      ))}

      {appliedFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm text-red-500 hover:text-red-700"
        >
          Clear All
        </button>
      )}
    </div>
  );
}
```

### Results Count Component

**File**: `components/ResultsCount.tsx`

```typescript
'use client';

interface ResultsCountProps {
  filteredCount: number;
  totalCount: number;
  hasFilters: boolean;
}

export function ResultsCount({
  filteredCount,
  totalCount,
  hasFilters,
}: ResultsCountProps) {
  if (!hasFilters) {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Showing {totalCount} {totalCount === 1 ? 'todo' : 'todos'}
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
      Showing {filteredCount} of {totalCount} {totalCount === 1 ? 'todo' : 'todos'}
      {filteredCount === 0 && (
        <span className="text-orange-600 dark:text-orange-400 ml-2">
          No todos match your filters
        </span>
      )}
    </div>
  );
}
```

---

## ⚠️ Edge Cases

### 1. No Search Results
**Scenario**: User searches for "xyz123" but no todos contain that text  
**Handling**:
- Display empty state message: "No todos found for 'xyz123'"
- Show suggestion: "Try different keywords or clear filters"
- Keep search active (don't auto-clear)
- Allow user to clear search manually

### 2. All Filters Result in Empty List
**Scenario**: User applies High Priority + Urgent Tag + Completed Status but no todos match  
**Handling**:
- Show count: "0 of 50 todos"
- Display message: "No todos match all active filters"
- List all active filters clearly
- Provide "Clear All Filters" button prominently
- Suggest removing one filter at a time

### 3. Search with Special Characters
**Scenario**: User searches for "client's meeting" or "task #123"  
**Handling**:
- Treat special characters as literal text (not regex)
- Escape special regex characters in search query
- Case-insensitive matching
- No SQL injection risk (client-side only)

### 4. Very Long Search Query
**Scenario**: User pastes 500-character text into search  
**Handling**:
- No max length restriction on search
- Performance remains instant (client-side filter)
- Truncate display in filter indicator chip (show first 30 chars + "...")
- Full text visible in input field

### 5. Rapid Filter Changes
**Scenario**: User quickly toggles multiple filters in succession  
**Handling**:
- Each filter change triggers immediate re-render
- React batches state updates automatically
- No debouncing needed (instant feedback desired)
- URL updates debounced to prevent history spam (300ms)

### 6. URL Manipulation
**Scenario**: User manually edits URL: `?priority=invalid&tags=abc`  
**Handling**:
- Validate URL parameters on load
- Ignore invalid priority values
- Ignore non-numeric tag IDs
- Fall back to default filter state for invalid params
- Don't show error (silently ignore)

### 7. Filter by Non-Existent Tag ID
**Scenario**: URL contains `?tags=999` but tag ID 999 doesn't exist  
**Handling**:
- Tag filter applied but no todos match
- Show "0 of X todos"
- Filter indicator shows "Tags: Unknown"
- User can clear filter normally

### 8. Overdue Filter with No Due Dates
**Scenario**: User enables "Show Overdue Only" but all todos lack due dates  
**Handling**:
- Results: 0 todos (as expected)
- Message: "No overdue todos found"
- Suggestion: "Add due dates to your todos to track deadlines"

### 9. Search During Todo Creation
**Scenario**: User has active search filter, creates new todo that matches search  
**Handling**:
- New todo appears immediately in filtered list (if it matches)
- If doesn't match search, it's hidden (consistent behavior)
- User can clear search to see all todos including new one

### 10. Browser Back/Forward with Filters
**Scenario**: User applies filters, navigates away, clicks back button  
**Handling**:
- URL contains filter state in query params
- Filters restored from URL on page load
- Todo list filtered correctly on mount
- Browser back/forward works seamlessly

### 11. Multiple Tags with Same Todo
**Scenario**: Todo tagged with "Work" and "Urgent", user filters by either  
**Handling**:
- OR logic: Show todo if it has ANY selected tag
- Todo appears once (not duplicated)
- Filter indicator shows both tags
- Removing one tag filter may keep todo visible (if has other tag)

### 12. Performance with 1000+ Todos
**Scenario**: User has 1000 todos and types in search  
**Handling**:
- Client-side filtering remains fast (< 50ms)
- Use memoization (`useMemo`) to avoid redundant filtering
- Debounce search input (300ms) to reduce filter calls
- Consider virtualization if list rendering slows down
- Monitor performance in dev tools

---

## ✅ Acceptance Criteria

### Functional Requirements

1. **Text Search**
   - [ ] User can type in search input to filter todos by title
   - [ ] Search is case-insensitive
   - [ ] Search updates instantly as user types (debounced)
   - [ ] Search matches partial words (e.g., "meet" matches "meeting")
   - [ ] Clear button appears when search has text
   - [ ] Clicking clear button removes search filter

2. **Priority Filter**
   - [ ] User can filter by high, medium, or low priority
   - [ ] Multiple priorities can be selected (OR logic)
   - [ ] Todo list updates instantly when priority filter changes
   - [ ] Priority filter shows count of todos per priority
   - [ ] Unchecking all priorities shows all todos

3. **Completion Status Filter**
   - [ ] User can view active, completed, or all todos
   - [ ] Only one status can be selected at a time (radio buttons)
   - [ ] Status filter shows count per status
   - [ ] Completed todos display with strikethrough styling
   - [ ] Default status is "active"

4. **Tag Filter**
   - [ ] User can filter by one or multiple tags
   - [ ] Multiple tags use OR logic (show if has any tag)
   - [ ] Tag filter shows count of todos per tag
   - [ ] Tag filter displays tag colors
   - [ ] Tag list scrolls if many tags exist

5. **Overdue Filter**
   - [ ] User can toggle "Show Overdue Only" checkbox
   - [ ] Overdue todos have due_date in the past
   - [ ] Completed todos excluded from overdue filter
   - [ ] Overdue count displayed next to toggle
   - [ ] Overdue todos highlighted visually (red border/badge)

6. **Combined Filters**
   - [ ] Search works with all other filters simultaneously
   - [ ] Multiple filters use AND logic (must match all)
   - [ ] All filters update todo list instantly
   - [ ] Filters can be applied in any order
   - [ ] Removing one filter keeps others active

7. **Filter Indicators**
   - [ ] Active filters shown as chips/badges
   - [ ] Each chip shows filter type and value
   - [ ] Each chip has X button to remove individual filter
   - [ ] "Clear All" button visible when filters active
   - [ ] Clicking "Clear All" removes all filters

8. **Results Count**
   - [ ] Show "X of Y todos" when filters active
   - [ ] Show "X todos" when no filters active
   - [ ] Show "No todos match" when no results
   - [ ] Count updates instantly with filter changes

9. **URL State Persistence**
   - [ ] Filters reflected in URL query parameters
   - [ ] URL updates when filters change
   - [ ] Filters restored from URL on page load
   - [ ] Browser back/forward works with filter state
   - [ ] URL is shareable (same filters on different device)

10. **Clear All Filters**
    - [ ] "Clear All" button removes all filters
    - [ ] Search input clears
    - [ ] All checkboxes uncheck
    - [ ] Status resets to default
    - [ ] URL updates to remove query params

### Non-Functional Requirements

1. **Performance**
   - [ ] Search filtering completes in < 50ms for 100 todos
   - [ ] No noticeable lag when toggling filters
   - [ ] Debounced search prevents excessive re-renders
   - [ ] URL updates don't cause page reloads

2. **Usability**
   - [ ] Filter panel is clearly visible and accessible
   - [ ] Search input prominently placed at top
   - [ ] Filter counts help user understand data distribution
   - [ ] Empty states provide helpful guidance
   - [ ] Mobile-responsive filter UI

3. **Accessibility**
   - [ ] Search input has proper label
   - [ ] Filter checkboxes are keyboard accessible
   - [ ] Filter indicators have aria-labels
   - [ ] Screen reader announces filter changes
   - [ ] Focus management in filter panel

4. **Data Integrity**
   - [ ] Client-side filtering never modifies todos
   - [ ] Filters work on immutable data copies
   - [ ] Invalid URL params don't crash app
   - [ ] Filter state doesn't persist inappropriately

### Testing Requirements

1. **E2E Tests (Playwright)**
   ```typescript
   test('should filter todos by search query', async ({ page }) => {
     // Create 5 todos: 3 containing "meeting", 2 without
     // Type "meeting" in search box
     // Verify 3 todos displayed
     // Clear search
     // Verify all 5 todos displayed
   });

   test('should filter by multiple priorities', async ({ page }) => {
     // Create todos with different priorities
     // Check "High Priority" filter
     // Verify only high-priority todos shown
     // Check "Medium Priority" as well
     // Verify high + medium todos shown
   });

   test('should combine search and filters', async ({ page }) => {
     // Create todos with various properties
     // Apply search + priority + tag filters
     // Verify only todos matching ALL criteria shown
     // Remove filters one by one
     // Verify list expands appropriately
   });

   test('should persist filters in URL', async ({ page }) => {
     // Apply multiple filters
     // Verify URL contains query params
     // Reload page
     // Verify filters still active
     // Verify todo list filtered correctly
   });
   ```

2. **Unit Tests**
   ```typescript
   test('applyFilters handles search query', () => {
     const todos = [
       { id: 1, title: 'Team meeting', ... },
       { id: 2, title: 'Code review', ... },
     ];
     const result = applyFilters(todos, { searchQuery: 'meeting' });
     expect(result.filteredCount).toBe(1);
     expect(result.filteredTodos[0].id).toBe(1);
   });

   test('applyFilters handles multiple priorities', () => {
     const todos = createMockTodos();
     const result = applyFilters(todos, { priorities: ['high', 'medium'] });
     // Verify only high and medium priority todos returned
   });

   test('hasActiveFilters returns correct boolean', () => {
     expect(hasActiveFilters({})).toBe(false);
     expect(hasActiveFilters({ searchQuery: 'test' })).toBe(true);
     expect(hasActiveFilters({ priorities: ['high'] })).toBe(true);
   });
   ```

3. **Manual Testing Checklist**
   - [ ] Test all filter combinations
   - [ ] Test with 0, 1, 10, 100+ todos
   - [ ] Test URL sharing across devices
   - [ ] Test browser back/forward
   - [ ] Test mobile responsive layout
   - [ ] Test with no search results
   - [ ] Test with all filters resulting in empty list
   - [ ] Test performance with large todo lists
   - [ ] Test accessibility with screen reader
   - [ ] Test keyboard navigation

---

## 🚀 Implementation Plan

### Phase 1: Core Filtering Logic (1 day)
1. Create `lib/filters.ts` with filter functions
2. Implement `applyFilters` function with all criteria
3. Add URL param conversion functions
4. Write unit tests for filter logic
5. Test performance with large datasets

### Phase 2: React Hook & State Management (1 day)
1. Create `hooks/useFilters.ts`
2. Implement filter state management
3. Add URL sync with `useSearchParams`
4. Handle filter mutations
5. Test hook with various scenarios

### Phase 3: UI Components (2 days)
1. Build `SearchInput` component
2. Build `FilterPanel` component
3. Build `FilterIndicators` component
4. Build `ResultsCount` component
5. Style all components with Tailwind CSS
6. Make components mobile-responsive

### Phase 4: Integration (1 day)
1. Integrate `useFilters` hook in main `page.tsx`
2. Connect search input to filter state
3. Connect filter panel to filter state
4. Display filtered todos in list
5. Show filter indicators and results count

### Phase 5: Testing & Polish (1 day)
1. Write E2E tests for all filter scenarios
2. Test URL persistence thoroughly
3. Test edge cases (no results, invalid params, etc.)
4. Performance optimization if needed
5. Accessibility audit and fixes
6. Documentation updates

**Total Estimated Time**: 6 days

---

## 📊 Success Metrics

### Quantitative Metrics
- **Adoption Rate**: >80% of active users use search or filters weekly
- **Search Usage**: Average 5+ searches per user per day
- **Filter Usage**: Average 3+ filter changes per user per day
- **Performance**: Filtering completes in <50ms for 100 todos
- **Empty Results**: <10% of searches result in no matches (indicates good data quality)

### Qualitative Metrics
- Users report finding todos faster
- Reduction in support questions about "finding tasks"
- Positive feedback on filter combinations
- No complaints about performance lag
- Users appreciate URL shareability

---

## 🔮 Future Enhancements

### Phase 2 Features (Out of Scope for This PRP)

1. **Advanced Search Operators**
   - Boolean operators: AND, OR, NOT
   - Field-specific search: `title:meeting`, `tag:work`
   - Date range search: `due:2025-11-01..2025-11-30`
   - More complex query syntax

2. **Saved Filter Presets**
   - Save common filter combinations with names
   - Quick-access buttons for saved filters
   - Share filter presets with other users
   - Example: "Urgent Work Items" = High Priority + Work Tag + Active

3. **Sort Options**
   - Sort by due date (ascending/descending)
   - Sort by priority
   - Sort by creation date
   - Sort by completion date
   - Sort by title (alphabetical)

4. **Smart Filters**
   - "Due This Week"
   - "Due Today"
   - "No Due Date"
   - "Recently Completed"
   - "Assigned to Me" (if multi-user feature added)

5. **Filter Analytics**
   - Track most-used filters
   - Suggest filters based on usage patterns
   - Show trending tags or priorities

6. **Bulk Actions on Filtered Results**
   - Select all filtered todos
   - Bulk complete/delete/tag
   - Bulk priority change
   - Export filtered results

7. **Search History**
   - Remember recent searches
   - Dropdown with search suggestions
   - Clear search history option

8. **Full-Text Search**
   - Search todo descriptions (when added)
   - Search subtask titles
   - Search notes/comments (if added)

---

## 📚 Dependencies

### New Dependencies
- None (uses existing React, Next.js, and utility libraries)

### Existing Dependencies
- `next/navigation` for `useRouter` and `useSearchParams`
- React hooks (`useState`, `useEffect`, `useMemo`)
- `lib/timezone.ts` for overdue date calculations
- Tailwind CSS for styling

### Browser Requirements
- Modern browser with JavaScript enabled
- URLSearchParams API support (all modern browsers)
- No special browser APIs needed

---

## 🔒 Security Considerations

1. **Client-Side Only**
   - All filtering done client-side (no API calls)
   - No data sent to server during filtering
   - No security risks from filter operations

2. **URL Parameter Validation**
   - All URL params validated before use
   - Invalid params ignored (not executed)
   - No code injection possible

3. **XSS Prevention**
   - Search query never rendered as HTML
   - Text-only search and display
   - React automatically escapes content

4. **No SQL Injection**
   - No database queries for filtering
   - Client-side JavaScript array operations only

---

## 📖 Documentation Updates Required

1. **User Guide**
   - How to search for todos
   - Explanation of each filter type
   - How to combine filters
   - URL sharing for collaboration

2. **Developer Documentation**
   - Filter function architecture
   - How to add new filter criteria
   - Performance considerations
   - Testing filter logic

3. **README Updates**
   - Add "Search & Filtering" to features list
   - Include filter examples in screenshots
   - Document URL parameter format

---

## ❌ Out of Scope

The following are explicitly **not** included in this PRP:

1. ~~Server-side filtering~~ (all client-side for performance)
2. ~~Full-text search engine integration~~ (e.g., Elasticsearch)
3. ~~Natural language search~~ (e.g., "todos due next week")
4. ~~Machine learning search suggestions~~
5. ~~Multi-field advanced search builder UI~~
6. ~~Regex search capability~~ (users can't write regex)
7. ~~Saved search presets~~ (future enhancement)
8. ~~Export filtered results~~ (future enhancement)
9. ~~Bulk actions on filtered results~~ (future enhancement)
10. ~~Search analytics and insights~~ (future enhancement)

---

## 🎯 Definition of Done

This feature is considered complete when:

- [ ] All filter logic functions implemented and tested
- [ ] React hook for filter state management working
- [ ] All UI components built and styled
- [ ] Search input with debouncing functional
- [ ] Priority filter with multi-select working
- [ ] Completion status filter with radio buttons working
- [ ] Tag filter with multi-select working
- [ ] Overdue filter toggle working
- [ ] Filter combination (AND logic) working correctly
- [ ] Filter indicators displaying and removable
- [ ] Results count showing correctly
- [ ] URL persistence working (read and write)
- [ ] Browser back/forward navigation working
- [ ] "Clear All" functionality working
- [ ] All unit tests passing (>90% coverage)
- [ ] All E2E tests passing
- [ ] Performance benchmarks met (<50ms filtering)
- [ ] Mobile-responsive design working
- [ ] Accessibility audit passed
- [ ] Code review completed and approved
- [ ] Documentation updated
- [ ] User acceptance testing completed
- [ ] No critical bugs for 1 week post-launch
- [ ] Feature merged to main branch
- [ ] Deployed to production successfully

---

**Document Control**:
- **Version**: 1.0
- **Created**: November 13, 2025
- **Last Updated**: November 13, 2025
- **Author**: GitHub Copilot (based on yue-lin_stengg's request)
- **Status**: Draft - Awaiting Review
- **Related PRPs**: PRP-01 (Todo CRUD), PRP-03 (Priority System), PRP-07 (Tag System)
