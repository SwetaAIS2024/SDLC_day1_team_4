import { TodoWithSubtasks, SearchFilters, Priority } from '@/lib/types';
import { getSingaporeNow, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from '@/lib/timezone';
import { DateTime } from 'luxon';

/**
 * Core filtering function that applies all search and filter criteria to todos
 * All filters are combined with AND logic
 * 
 * @param todos - Array of todos with subtasks and tags
 * @param filters - Search and filter criteria
 * @returns Filtered array of todos
 */
export function filterTodos(
  todos: TodoWithSubtasks[],
  filters: SearchFilters
): TodoWithSubtasks[] {
  return todos.filter(todo => {
    // 1. Search Term Filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      const matchesTitle = todo.title.toLowerCase().includes(term);
      const matchesDescription = (todo as any).description?.toLowerCase().includes(term) || false;
      
      let matchesTags = false;
      if (filters.advancedSearch && todo.tags) {
        matchesTags = todo.tags.some(tag => tag.name.toLowerCase().includes(term));
      }

      // If none match, filter out this todo
      if (!matchesTitle && !matchesDescription && !matchesTags) {
        return false;
      }
    }

    // 2. Status Filter
    if (filters.status === 'completed' && !todo.completed_at) return false;
    if (filters.status === 'incomplete' && todo.completed_at) return false;

    // 3. Priority Filter (multi-select, OR logic)
    if (filters.priorities.length > 0) {
      if (!filters.priorities.includes(todo.priority)) return false;
    }

    // 4. Tag Filter (multi-select, OR logic)
    if (filters.tagIds.length > 0) {
      const todoTagIds = todo.tags?.map(t => t.id) || [];
      const hasAnySelectedTag = filters.tagIds.some(tagId => todoTagIds.includes(tagId));
      if (!hasAnySelectedTag) return false;
    }

    // 5. Due Date Range Filter
    if (filters.dueDateRange !== 'all') {
      const now = getSingaporeNow();
      const todoDueDate = todo.due_date ? DateTime.fromISO(todo.due_date, { zone: 'Asia/Singapore' }) : null;

      switch (filters.dueDateRange) {
        case 'overdue':
          // Incomplete todos with due_date < today
          if (todo.completed_at || !todoDueDate) return false;
          if (todoDueDate >= startOfDay(now)) return false;
          break;

        case 'today':
          // Todos due today
          if (!todoDueDate) return false;
          const todayStart = startOfDay(now);
          const todayEnd = endOfDay(now);
          if (todoDueDate < todayStart || todoDueDate > todayEnd) return false;
          break;

        case 'this-week':
          // Todos due within current week (Monday-Sunday)
          if (!todoDueDate) return false;
          const weekStart = startOfWeek(now);
          const weekEnd = endOfWeek(now);
          if (todoDueDate < weekStart || todoDueDate > weekEnd) return false;
          break;

        case 'this-month':
          // Todos due within current month
          if (!todoDueDate) return false;
          const monthStart = startOfMonth(now);
          const monthEnd = endOfMonth(now);
          if (todoDueDate < monthStart || todoDueDate > monthEnd) return false;
          break;

        case 'no-due-date':
          // Todos without a due date
          if (todoDueDate !== null) return false;
          break;
      }
    }

    return true; // Passed all filters
  });
}

/**
 * Count the number of active filters
 * Used for displaying active filter count in UI
 * 
 * @param filters - Search and filter criteria
 * @returns Number of active filters
 */
export function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  
  if (filters.searchTerm) count++;
  if (filters.status !== 'all') count++;
  if (filters.priorities.length > 0) count += filters.priorities.length;
  if (filters.tagIds.length > 0) count += filters.tagIds.length;
  if (filters.dueDateRange !== 'all') count++;
  
  return count;
}

/**
 * Check if any filters are active
 * Used to determine whether to show "Clear All Filters" button
 * 
 * @param filters - Search and filter criteria
 * @returns True if any filters are active
 */
export function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    filters.searchTerm !== '' ||
    filters.status !== 'all' ||
    filters.priorities.length > 0 ||
    filters.tagIds.length > 0 ||
    filters.dueDateRange !== 'all'
  );
}

/**
 * Get default/empty filter state
 * Used for initializing filters and clearing all filters
 * 
 * @returns Default SearchFilters object
 */
export function getDefaultFilters(): SearchFilters {
  return {
    searchTerm: '',
    advancedSearch: false,
    status: 'all',
    priorities: [],
    tagIds: [],
    dueDateRange: 'all',
  };
}
