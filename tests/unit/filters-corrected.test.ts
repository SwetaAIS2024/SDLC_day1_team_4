import { describe, it, expect } from '@jest/globals';
import {
    filterTodos,
    getDefaultFilters,
    hasActiveFilters,
    countActiveFilters,
} from '../../lib/filters';
import type { TodoWithSubtasks, SearchFilters, Priority } from '../../lib/types';

describe('Filter Utilities', () => {
    // Sample todos for testing
    const sampleTodos: TodoWithSubtasks[] = [
        {
            id: 1,
            title: 'High priority work task',
            completed_at: null,
            priority: 'high' as Priority,
            due_date: '2025-11-15T14:00:00+08:00',
            recurrence_pattern: null,
            reminder_minutes: null,
            last_notification_sent: null,
            created_at: '2025-11-10T10:00:00+08:00',
            updated_at: '2025-11-10T10:00:00+08:00',
            subtasks: [],
            tags: [
                { id: 1, name: 'Work', color: '#FF0000', created_at: '2025-11-10T10:00:00+08:00', updated_at: '2025-11-10T10:00:00+08:00' },
                { id: 2, name: 'Urgent', color: '#FFA500', created_at: '2025-11-10T10:00:00+08:00', updated_at: '2025-11-10T10:00:00+08:00' },
            ],
            progress: 50
        },
        {
            id: 2,
            title: 'Personal shopping list',
            completed_at: '2025-11-12T15:00:00+08:00',
            priority: 'medium' as Priority,
            due_date: '2025-11-14T12:00:00+08:00',
            recurrence_pattern: null,
            reminder_minutes: 60,
            last_notification_sent: null,
            created_at: '2025-11-09T09:00:00+08:00',
            updated_at: '2025-11-12T15:00:00+08:00',
            subtasks: [],
            tags: [
                { id: 3, name: 'Personal', color: '#00FF00', created_at: '2025-11-09T09:00:00+08:00', updated_at: '2025-11-09T09:00:00+08:00' },
            ],
            progress: 0
        },
        {
            id: 3,
            title: 'Low priority reading',
            completed_at: null,
            priority: 'low' as Priority,
            due_date: null,
            recurrence_pattern: 'weekly',
            reminder_minutes: null,
            last_notification_sent: null,
            created_at: '2025-11-08T08:00:00+08:00',
            updated_at: '2025-11-08T08:00:00+08:00',
            subtasks: [],
            tags: [
                { id: 4, name: 'Learning', color: '#0000FF', created_at: '2025-11-08T08:00:00+08:00', updated_at: '2025-11-08T08:00:00+08:00' },
            ],
            progress: 0
        },
    ];

    describe('getDefaultFilters', () => {
        it('should return default filter state', () => {
            const defaultFilters = getDefaultFilters();

            expect(defaultFilters.searchTerm).toBe('');
            expect(defaultFilters.priorities).toEqual([]);
            expect(defaultFilters.tagIds).toEqual([]);
            expect(defaultFilters.status).toBe('all');
            expect(defaultFilters.dueDateRange).toBe('all');
            expect(defaultFilters.advancedSearch).toBe(false);
        });
    });

    describe('hasActiveFilters', () => {
        it('should return false for default filters', () => {
            const defaultFilters = getDefaultFilters();
            expect(hasActiveFilters(defaultFilters)).toBe(false);
        });

        it('should return true when search term is set', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                searchTerm: 'work'
            };
            expect(hasActiveFilters(filters)).toBe(true);
        });

        it('should return true when priorities are set', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                priorities: ['high']
            };
            expect(hasActiveFilters(filters)).toBe(true);
        });

        it('should return true when tags are set', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                tagIds: [1, 2]
            };
            expect(hasActiveFilters(filters)).toBe(true);
        });

        it('should return true when status is not all', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                status: 'incomplete'
            };
            expect(hasActiveFilters(filters)).toBe(true);
        });

        it('should return true when due date range is not all', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                dueDateRange: 'today'
            };
            expect(hasActiveFilters(filters)).toBe(true);
        });
    });

    describe('countActiveFilters', () => {
        it('should return 0 for default filters', () => {
            const defaultFilters = getDefaultFilters();
            expect(countActiveFilters(defaultFilters)).toBe(0);
        });

        it('should count each active filter type', () => {
            const filters: SearchFilters = {
                searchTerm: 'work',
                priorities: ['high', 'medium'],
                tagIds: [1],
                status: 'incomplete',
                dueDateRange: 'today',
                advancedSearch: true
            };
            expect(countActiveFilters(filters)).toBe(4); // search, priorities, tags, status, due date
        });

        it('should count priorities as one filter regardless of count', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                priorities: ['high', 'medium', 'low']
            };
            expect(countActiveFilters(filters)).toBe(1);
        });

        it('should count tags as one filter regardless of count', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                tagIds: [1, 2, 3, 4, 5]
            };
            expect(countActiveFilters(filters)).toBe(1);
        });
    });

    describe('filterTodos', () => {
        it('should return all todos when no filters applied', () => {
            const defaultFilters = getDefaultFilters();
            const result = filterTodos(sampleTodos, defaultFilters);

            expect(result).toHaveLength(3);
            expect(result).toEqual(sampleTodos);
        });

        it('should filter by search term in title', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                searchTerm: 'work'
            };
            const result = filterTodos(sampleTodos, filters);

            expect(result).toHaveLength(1);
            expect(result[0].title).toContain('work');
        });

        it('should filter by search term case insensitive', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                searchTerm: 'WORK'
            };
            const result = filterTodos(sampleTodos, filters);

            expect(result).toHaveLength(1);
            expect(result[0].title).toContain('work');
        });

        it('should filter by search term in tags when advanced search enabled', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                searchTerm: 'learning',
                advancedSearch: true
            };
            const result = filterTodos(sampleTodos, filters);

            expect(result).toHaveLength(1);
            expect(result[0].tags?.some(tag => tag.name.toLowerCase().includes('learning'))).toBe(true);
        });

        it('should filter by priority', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                priorities: ['high']
            };
            const result = filterTodos(sampleTodos, filters);

            expect(result).toHaveLength(1);
            expect(result[0].priority).toBe('high');
        });

        it('should filter by multiple priorities (OR logic)', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                priorities: ['high', 'low']
            };
            const result = filterTodos(sampleTodos, filters);

            expect(result).toHaveLength(2);
            expect(result.every(todo => ['high', 'low'].includes(todo.priority))).toBe(true);
        });

        it('should filter by tag IDs', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                tagIds: [1] // Work tag
            };
            const result = filterTodos(sampleTodos, filters);

            expect(result).toHaveLength(1);
            expect(result[0].tags?.some(tag => tag.id === 1)).toBe(true);
        });

        it('should filter by multiple tag IDs (OR logic)', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                tagIds: [1, 3] // Work and Personal tags
            };
            const result = filterTodos(sampleTodos, filters);

            expect(result).toHaveLength(2);
        });

        it('should filter by completion status - incomplete only', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                status: 'incomplete'
            };
            const result = filterTodos(sampleTodos, filters);

            expect(result).toHaveLength(2);
            expect(result.every(todo => todo.completed_at === null)).toBe(true);
        });

        it('should filter by completion status - completed only', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                status: 'completed'
            };
            const result = filterTodos(sampleTodos, filters);

            expect(result).toHaveLength(1);
            expect(result[0].completed_at).not.toBeNull();
        });

        it('should combine multiple filters with AND logic', () => {
            const filters: SearchFilters = {
                searchTerm: 'task',
                priorities: ['high'],
                tagIds: [1],
                status: 'incomplete',
                dueDateRange: 'all',
                advancedSearch: false
            };
            const result = filterTodos(sampleTodos, filters);

            expect(result).toHaveLength(1);
            const todo = result[0];
            expect(todo.title.toLowerCase()).toContain('task');
            expect(todo.priority).toBe('high');
            expect(todo.tags?.some(tag => tag.id === 1)).toBe(true);
            expect(todo.completed_at).toBeNull();
        });

        it('should return empty array when no todos match filters', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                searchTerm: 'nonexistent'
            };
            const result = filterTodos(sampleTodos, filters);

            expect(result).toHaveLength(0);
        });

        it('should handle empty todos array', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                searchTerm: 'anything'
            };
            const result = filterTodos([], filters);

            expect(result).toHaveLength(0);
        });

        it('should filter by due date range - no due date', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                dueDateRange: 'no-due-date'
            };
            const result = filterTodos(sampleTodos, filters);

            expect(result).toHaveLength(1);
            expect(result[0].due_date).toBeNull();
        });

        it('should handle todos with no tags', () => {
            const todoWithoutTags: TodoWithSubtasks = {
                ...sampleTodos[0],
                id: 999,
                tags: undefined
            };
            const todosWithEmpty = [...sampleTodos, todoWithoutTags];

            const filters: SearchFilters = {
                ...getDefaultFilters(),
                tagIds: [1]
            };
            const result = filterTodos(todosWithEmpty, filters);

            expect(result).toHaveLength(1); // Only the original todo with tag ID 1
            expect(result[0].id).not.toBe(999);
        });

        it('should handle partial matches in search', () => {
            const filters: SearchFilters = {
                ...getDefaultFilters(),
                searchTerm: 'shop'
            };
            const result = filterTodos(sampleTodos, filters);

            expect(result).toHaveLength(1);
            expect(result[0].title).toContain('shopping');
        });
    });
});