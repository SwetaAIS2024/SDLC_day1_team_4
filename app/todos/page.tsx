'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatSingaporeDate, isPastDue } from '@/lib/timezone';
import { Priority, RecurrencePattern, ReminderMinutes, PRIORITY_CONFIG, RECURRENCE_CONFIG, REMINDER_CONFIG, TodoWithSubtasks, Subtask, TagResponse, SearchFilters, FilterStatus, FilterDueDateRange } from '@/lib/types';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { filterTodos, getDefaultFilters, hasActiveFilters as checkHasActiveFilters, countActiveFilters } from '@/lib/filters';
import { SearchBar } from '../components/SearchBar';
import { FilterPanel } from '../components/FilterPanel';
import { ActiveFilterBadges } from '../components/ActiveFilterBadges';
import { FilterStats } from '../components/FilterStats';
import { ExportModal } from '../components/ExportModal';
import { ImportModal } from '../components/ImportModal';
import type { ExportOptions, ImportOptions, ImportResult } from '@/lib/types';

export default function TodosPage() {
  const router = useRouter();
  const { permission, startPolling } = useNotifications();
  const [todos, setTodos] = useState<TodoWithSubtasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [recurrence, setRecurrence] = useState<RecurrencePattern | ''>('');
  const [reminder, setReminder] = useState<ReminderMinutes>(null);
  const [template, setTemplate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  
  // Subtask state
  const [expandedTodos, setExpandedTodos] = useState<Set<number>>(new Set());
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<number, string>>({});
  
  // Tag state
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [editSelectedTagIds, setEditSelectedTagIds] = useState<number[]>([]);
  const [filterTagId, setFilterTagId] = useState<number | null>(null);

  // Template state
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: '',
    due_date_offset_days: 0,
  });

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(getDefaultFilters());

  // Export/Import state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, searchTerm: debouncedSearch }));
  }, [debouncedSearch]);

  // Apply filters to todos using memoization
  const filteredTodos = useMemo(() => {
    return filterTodos(todos, filters);
  }, [todos, filters]);

  const hasActiveFilters = checkHasActiveFilters(filters);
  const activeFilterCount = countActiveFilters(filters);

  const fetchUsername = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch session');
      }
      const data = await response.json();
      setUsername(data.username || '');
    } catch (err) {
      console.error('Error fetching username:', err);
    }
  };

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/todos');
      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, redirect to login
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch todos');
      }
      const data = await response.json();
      setTodos(data);
      setError(null);
    } catch (err) {
      setError('Failed to load todos. Please refresh the page.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch todos and username on mount
  useEffect(() => {
    fetchTodos();
    fetchUsername();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start notification polling when permission is granted
  useEffect(() => {
    if (permission === 'granted') {
      const cleanup = startPolling(60000); // Poll every 60 seconds
      return cleanup;
    }
  }, [permission, startPolling]);

  const createTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTodoTitle.trim();
    if (!title || !newTodoDueDate) return;

    const tempId = Date.now();
    const newTodo: TodoWithSubtasks = {
      id: tempId,
      title,
      completed_at: null,
      priority,
      recurrence_pattern: recurrence || null,
      due_date: newTodoDueDate || null,
      reminder_minutes: reminder,
      last_notification_sent: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subtasks: [],
      progress: 0,
      tags: selectedTagIds.map(id => tags.find(t => t.id === id)!).filter(Boolean),
    };

    // Optimistic update
    setTodos(prev => [newTodo, ...prev]);
    setNewTodoTitle('');
    setNewTodoDueDate('');
    setPriority('medium');
    setRecurrence('');
    setReminder(null);
    setSelectedTagIds([]);

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          priority, 
          recurrence_pattern: recurrence || null,
          due_date: newTodoDueDate || null,
          reminder_minutes: reminder,
          tag_ids: selectedTagIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create todo');
      }

      const createdTodo = await response.json();
      setTodos(prev => prev.map(t => t.id === tempId ? createdTodo : t));
    } catch (err) {
      // Rollback optimistic update
      setTodos(prev => prev.filter(t => t.id !== tempId));
      setError('Failed to create todo. Please try again.');
      console.error(err);
    }
  };

  const updateTodo = async (id: number, updates: Partial<TodoWithSubtasks>) => {
    // Find original todo for rollback
    const originalTodo = todos.find(t => t.id === id);
    if (!originalTodo) return;

    // Optimistic update
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update todo');
      }

      const updatedTodo = await response.json();
      setTodos(prev => prev.map(t => t.id === id ? updatedTodo : t));
    } catch (err) {
      // Rollback optimistic update
      setTodos(prev => prev.map(t => t.id === id ? originalTodo : t));
      setError('Failed to update todo. Please try again.');
      console.error(err);
    }
  };

  const deleteTodo = async (id: number) => {
    console.log('Delete button clicked for todo:', id);
    
    const confirmed = window.confirm('Delete this todo? This cannot be undone.');
    console.log('User confirmed deletion:', confirmed);
    
    if (!confirmed) return;

    // Find original todo for rollback
    const originalTodo = todos.find(t => t.id === id);
    if (!originalTodo) {
      console.error('Original todo not found:', id);
      return;
    }

    console.log('Deleting todo:', originalTodo);

    // Optimistic update
    setTodos(prev => prev.filter(t => t.id !== id));

    try {
      console.log('Sending DELETE request to /api/todos/' + id);
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });

      console.log('Delete response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Delete failed:', errorData);
        throw new Error('Failed to delete todo');
      }

      console.log('Todo deleted successfully');
      setError(null);
    } catch (err) {
      console.error('Delete error:', err);
      // Rollback optimistic update
      setTodos(prev => [...prev, originalTodo].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      setError('Failed to delete todo. Please try again.');
    }
  };

  const startEdit = (todo: TodoWithSubtasks) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDueDate(todo.due_date || '');
    setEditPriority(todo.priority);
    setEditSelectedTagIds(todo.tags?.map(t => t.id) || []);
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;

    await updateTodo(editingId, {
      title: editTitle.trim(),
      priority: editPriority,
      due_date: editDueDate || null,
      tag_ids: editSelectedTagIds,
    } as any); // Use 'as any' since tag_ids is not in TodoWithSubtasks type but API accepts it

    setEditingId(null);
    setEditTitle('');
    setEditDueDate('');
    setEditPriority('medium');
    setEditSelectedTagIds([]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDueDate('');
    setEditPriority('medium');
    setEditSelectedTagIds([]);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to logout');
    }
  };

  // Export/Import functions
  const handleExport = async (options: ExportOptions) => {
    try {
      const params = new URLSearchParams();
      if (options.includeTodos) params.append('include_todos', 'true');
      if (options.includeTags) params.append('include_tags', 'true');
      if (options.includeTemplates) params.append('include_templates', 'true');
      if (options.includeCompleted) params.append('include_completed', 'true');

      const response = await fetch(`/api/todos/export?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+?)"/);
      a.download = filenameMatch ? filenameMatch[1] : 'todos-backup.json';
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setShowExportModal(false);
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleImport = async (file: File, options: ImportOptions): Promise<ImportResult> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/todos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, options }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result: ImportResult = await response.json();
      return result;
    } catch (err) {
      console.error('Import error:', err);
      throw err;
    }
  };

  const handleImportSuccess = () => {
    // Refresh all data after successful import
    fetchTodos();
    fetchTags();
    fetchTemplates();
    setShowImportModal(false);
  };

  // Subtask functions
  const toggleSubtasks = (todoId: number) => {
    setExpandedTodos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(todoId)) {
        newSet.delete(todoId);
      } else {
        newSet.add(todoId);
      }
      return newSet;
    });
  };

  const addSubtask = async (todoId: number) => {
    const title = newSubtaskTitles[todoId]?.trim();
    if (!title) return;

    try {
      const response = await fetch(`/api/todos/${todoId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subtask');
      }

      const createdSubtask = await response.json();
      
      // Update todos state with new subtask
      setTodos(prev => prev.map(todo => {
        if (todo.id === todoId) {
          const newSubtasks = [...todo.subtasks, createdSubtask];
          const completed = newSubtasks.filter(s => s.completed).length;
          const progress = newSubtasks.length > 0 ? Math.round((completed / newSubtasks.length) * 100) : 0;
          return {
            ...todo,
            subtasks: newSubtasks,
            progress,
          };
        }
        return todo;
      }));

      // Clear input
      setNewSubtaskTitles(prev => ({ ...prev, [todoId]: '' }));
    } catch (err) {
      console.error('Error adding subtask:', err);
      setError('Failed to add subtask. Please try again.');
    }
  };

  const toggleSubtask = async (todoId: number, subtaskId: number, completed: boolean) => {
    try {
      const response = await fetch(`/api/todos/${todoId}/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update subtask');
      }

      const updatedSubtask = await response.json();

      // Update todos state
      setTodos(prev => prev.map(todo => {
        if (todo.id === todoId) {
          const newSubtasks = todo.subtasks.map(s => 
            s.id === subtaskId ? updatedSubtask : s
          );
          const completedCount = newSubtasks.filter(s => s.completed).length;
          const progress = newSubtasks.length > 0 ? Math.round((completedCount / newSubtasks.length) * 100) : 0;
          return {
            ...todo,
            subtasks: newSubtasks,
            progress,
          };
        }
        return todo;
      }));
    } catch (err) {
      console.error('Error toggling subtask:', err);
      setError('Failed to update subtask. Please try again.');
    }
  };

  const deleteSubtask = async (todoId: number, subtaskId: number) => {
    try {
      const response = await fetch(`/api/todos/${todoId}/subtasks/${subtaskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete subtask');
      }

      // Update todos state
      setTodos(prev => prev.map(todo => {
        if (todo.id === todoId) {
          const newSubtasks = todo.subtasks.filter(s => s.id !== subtaskId);
          const completedCount = newSubtasks.filter(s => s.completed).length;
          const progress = newSubtasks.length > 0 ? Math.round((completedCount / newSubtasks.length) * 100) : 0;
          return {
            ...todo,
            subtasks: newSubtasks,
            progress,
          };
        }
        return todo;
      }));
    } catch (err) {
      console.error('Error deleting subtask:', err);
      setError('Failed to delete subtask. Please try again.');
    }
  };

  // Tag functions
  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }
      const data = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  const createTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTagName.trim();
    if (!name) return;

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color: newTagColor }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create tag');
      }

      const createdTag = await response.json();
      setTags(prev => [...prev, createdTag]);
      setNewTagName('');
      setNewTagColor('#3B82F6');
    } catch (err: any) {
      setError(err.message || 'Failed to create tag. Please try again.');
      console.error(err);
    }
  };

  const startTagEdit = (tag: TagResponse) => {
    setEditingTagId(tag.id);
    setEditTagName(tag.name);
    setEditTagColor(tag.color);
  };

  const saveTagEdit = async () => {
    if (!editingTagId || !editTagName.trim()) return;

    try {
      const response = await fetch(`/api/tags/${editingTagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editTagName.trim(), color: editTagColor }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update tag');
      }

      const updatedTag = await response.json();
      setTags(prev => prev.map(t => t.id === editingTagId ? updatedTag : t));
      
      // Update todos that have this tag
      setTodos(prev => prev.map(todo => ({
        ...todo,
        tags: todo.tags?.map(t => t.id === editingTagId ? updatedTag : t),
      })));

      setEditingTagId(null);
      setEditTagName('');
      setEditTagColor('');
    } catch (err: any) {
      setError(err.message || 'Failed to update tag. Please try again.');
      console.error(err);
    }
  };

  const cancelTagEdit = () => {
    setEditingTagId(null);
    setEditTagName('');
    setEditTagColor('');
  };

  const deleteTag = async (tagId: number) => {
    const tag = tags.find(t => t.id === tagId);
    if (!tag) return;

    const confirmed = window.confirm(`Delete tag "${tag.name}"? It will be removed from all todos.`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tag');
      }

      setTags(prev => prev.filter(t => t.id !== tagId));
      
      // Remove tag from todos
      setTodos(prev => prev.map(todo => ({
        ...todo,
        tags: todo.tags?.filter(t => t.id !== tagId),
      })));

      // Clear filter if filtering by deleted tag
      if (filterTagId === tagId) {
        setFilterTagId(null);
      }
    } catch (err) {
      setError('Failed to delete tag. Please try again.');
      console.error(err);
    }
  };

  const toggleTagSelection = (tagId: number) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const toggleEditTagSelection = (tagId: number) => {
    setEditSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  // Fetch tags on mount
  useEffect(() => {
    fetchTags();
  }, []);

  // Template Functions
  const fetchTemplates = async () => {
    try {
      const url = selectedCategoryFilter === 'all'
        ? '/api/templates'
        : `/api/templates?category=${selectedCategoryFilter}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const handleSaveAsTemplate = async (todo: TodoWithSubtasks) => {
    const templateName = prompt('Template name:', todo.title);
    if (!templateName) return;

    const category = prompt('Category (optional):', '');
    const offsetInput = prompt('Due date offset in days (optional, e.g., 3 for 3 days from creation):', '');
    const dueOffsetDays = offsetInput ? parseInt(offsetInput, 10) : null;

    setSavingTemplate(true);
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          category: category || null,
          priority: todo.priority,
          recurrence_pattern: todo.recurrence_pattern,
          reminder_minutes: todo.reminder_minutes,
          due_date_offset_days: dueOffsetDays,
          subtasks: todo.subtasks.map((st, idx) => ({ 
            title: st.title, 
            position: idx 
          })),
          tag_ids: todo.tags?.map(t => t.id) || [],
        }),
      });

      if (response.ok) {
        alert(`Template "${templateName}" created!`);
        fetchTemplates(); // Refresh templates
      } else {
        throw new Error('Failed to create template');
      }
    } catch (err) {
      setError('Failed to create template. Please try again.');
      console.error(err);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleUseTemplate = async (templateId: number) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjust_due_date: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to create todo from template');
      }

      const data = await response.json();
      alert(data.message);
      fetchTodos(); // Refresh todos
      setShowTemplateModal(false);
    } catch (err) {
      setError('Failed to use template. Please try again.');
      console.error(err);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const confirmed = window.confirm(`Delete template "${template.name}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err) {
      setError('Failed to delete template. Please try again.');
      console.error(err);
    }
  };

  const startTemplateEdit = (template: any) => {
    setEditingTemplateId(template.id);
    setTemplateForm({
      name: template.name,
      category: template.category || '',
      due_date_offset_days: template.due_date_offset_days || 0,
    });
  };

  const cancelTemplateEdit = () => {
    setEditingTemplateId(null);
    setTemplateForm({
      name: '',
      category: '',
      due_date_offset_days: 0,
    });
  };

  const saveTemplateEdit = async () => {
    if (!editingTemplateId) return;

    try {
      const response = await fetch(`/api/templates/${editingTemplateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateForm.name,
          category: templateForm.category || null,
          due_date_offset_days: templateForm.due_date_offset_days || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update template');
      }

      const data = await response.json();
      setTemplates(prev => prev.map(t => t.id === editingTemplateId ? data.template : t));
      cancelTemplateEdit();
    } catch (err) {
      setError('Failed to update template. Please try again.');
      console.error(err);
    }
  };

  // Fetch templates when modal opens or category filter changes
  useEffect(() => {
    if (showTemplateModal) {
      fetchTemplates();
    }
  }, [showTemplateModal, selectedCategoryFilter]);

  const uniqueCategories = ['all', ...new Set(templates.map(t => t.category).filter(Boolean))];

  // Filter handler functions
  const handleClearAllFilters = () => {
    setSearchInput('');
    setFilters(getDefaultFilters());
  };

  const handleToggleAdvancedSearch = () => {
    setFilters(prev => ({ ...prev, advancedSearch: !prev.advancedSearch }));
  };

  const handleStatusChange = (status: FilterStatus) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const handlePrioritiesChange = (priorities: Priority[]) => {
    setFilters(prev => ({ ...prev, priorities }));
  };

  const handleTagIdsChange = (tagIds: number[]) => {
    setFilters(prev => ({ ...prev, tagIds }));
  };

  const handleDueDateRangeChange = (dueDateRange: FilterDueDateRange) => {
    setFilters(prev => ({ ...prev, dueDateRange }));
  };

  const togglePriority = (priority: Priority) => {
    if (filters.priorities.includes(priority)) {
      handlePrioritiesChange(filters.priorities.filter(p => p !== priority));
    } else {
      handlePrioritiesChange([...filters.priorities, priority]);
    }
  };

  const toggleTagFilter = (tagId: number) => {
    if (filters.tagIds.includes(tagId)) {
      handleTagIdsChange(filters.tagIds.filter(id => id !== tagId));
    } else {
      handleTagIdsChange([...filters.tagIds, tagId]);
    }
  };

  const removeSearchFilter = () => {
    setSearchInput('');
  };

  const removeStatusFilter = () => {
    handleStatusChange('all');
  };

  const removePriorityFilter = (priority: Priority) => {
    handlePrioritiesChange(filters.priorities.filter(p => p !== priority));
  };

  const removeTagFilter = (tagId: number) => {
    handleTagIdsChange(filters.tagIds.filter(id => id !== tagId));
  };

  const removeDueDateRangeFilter = () => {
    handleDueDateRangeChange('all');
  };

  // Sort and filter todos
  // Sort and filter todos using new filter system
  const sortedAndFilteredTodos = filteredTodos
    .sort((a, b) => {
      // Sort by completion status first (incomplete first)
      const aCompleted = !!a.completed_at;
      const bCompleted = !!b.completed_at;
      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1;
      }
      
      // Then by priority (high=1, medium=2, low=3)
      const priorityOrder: Record<Priority, number> = { high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by due date (nearest first, nulls last)
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      
      // Finally by created date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center transition-colors duration-200">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">Loading todos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-200">Todo App</h1>
              <p className="text-gray-600 dark:text-slate-400 mt-1 transition-colors duration-200">Welcome, {username || 'abc'}</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowTagModal(true)}
                className="px-4 py-2 bg-gray-600 dark:bg-slate-700 text-white rounded-lg font-medium hover:bg-gray-700 dark:hover:bg-slate-600 transition-colors duration-200"
              >
                + Manage Tags
              </button>
              <button className="px-4 py-2 bg-gray-600 dark:bg-slate-700 text-white rounded-lg font-medium hover:bg-gray-700 dark:hover:bg-slate-600 transition-colors duration-200">
                Data
              </button>
              <button 
                onClick={() => router.push('/calendar')}
                className="px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors duration-200"
              >
                📅 Calendar
              </button>
              <button 
                onClick={() => setShowTemplateModal(true)}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200"
              >
                📋 Templates
              </button>
              <button 
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors duration-200"
              >
                📤 Export
              </button>
              <button 
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-teal-600 dark:bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-700 dark:hover:bg-teal-600 transition-colors duration-200"
              >
                📥 Import
              </button>
              <button 
                onClick={() => startPolling()}
                disabled={permission === 'granted'}
                className="px-3 py-2 bg-orange-500 dark:bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-600 dark:hover:bg-orange-500 transition-colors duration-200 disabled:bg-green-500 dark:disabled:bg-green-600"
                title={permission === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
              >
                🔔
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-600 dark:bg-slate-700 text-white rounded-lg font-medium hover:bg-gray-700 dark:hover:bg-slate-600 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl p-4 transition-colors duration-200">
            <div className="flex items-start justify-between">
              <p>{error}</p>
              <button 
                onClick={() => setError(null)} 
                className="text-red-600 hover:text-red-800 text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Create Todo Form */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 transition-colors duration-200">
          <form onSubmit={createTodo} className="space-y-4">
            {/* Main Input Row */}
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                placeholder="Add a new todo..."
                className="flex-1 px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 transition-colors duration-200"
                maxLength={500}
              />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <input
                type="datetime-local"
                value={newTodoDueDate}
                onChange={(e) => setNewTodoDueDate(e.target.value)}
                className="px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!newTodoTitle.trim() || !newTodoDueDate}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>

            {/* Recurrence and Reminder Row */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="repeat-checkbox"
                  checked={recurrence !== ''}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      setRecurrence('');
                    } else {
                      setRecurrence('weekly');
                    }
                  }}
                  disabled={!newTodoDueDate}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="repeat-checkbox" className="text-gray-700">Repeat</label>
              </div>
              {recurrence && (
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as RecurrencePattern | '')}
                  disabled={!newTodoDueDate}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="daily">{RECURRENCE_CONFIG.daily.icon} {RECURRENCE_CONFIG.daily.label}</option>
                  <option value="weekly">{RECURRENCE_CONFIG.weekly.icon} {RECURRENCE_CONFIG.weekly.label}</option>
                  <option value="monthly">{RECURRENCE_CONFIG.monthly.icon} {RECURRENCE_CONFIG.monthly.label}</option>
                  <option value="yearly">{RECURRENCE_CONFIG.yearly.icon} {RECURRENCE_CONFIG.yearly.label}</option>
                </select>
              )}
              <label className="text-gray-700">Reminder:</label>
              <select
                value={reminder ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setReminder(null);
                  } else {
                    setReminder(parseInt(value) as ReminderMinutes);
                  }
                }}
                disabled={!newTodoDueDate}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">None</option>
                <option value="15">🔔 {REMINDER_CONFIG[15].label}</option>
                <option value="30">🔔 {REMINDER_CONFIG[30].label}</option>
                <option value="60">🔔 {REMINDER_CONFIG[60].label}</option>
                <option value="120">🔔 {REMINDER_CONFIG[120].label}</option>
                <option value="1440">🔔 {REMINDER_CONFIG[1440].label}</option>
                <option value="2880">🔔 {REMINDER_CONFIG[2880].label}</option>
                <option value="10080">🔔 {REMINDER_CONFIG[10080].label}</option>
              </select>
            </div>

            {/* Template Row */}
            <div className="flex items-center gap-3 text-sm">
              <label className="text-gray-600 whitespace-nowrap">Use Template:</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a template...</option>
                <option>Work Task</option>
                <option>Personal Errand</option>
                <option>Meeting</option>
              </select>
            </div>

            {/* Tag Selection */}
            {tags.length > 0 && (
              <div className="space-y-2">
                <label className="text-gray-600 text-sm">Tags:</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTagSelection(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedTagIds.includes(tag.id)
                          ? 'text-gray-900'
                          : 'border-2 text-gray-500 hover:text-gray-600'
                      }`}
                      style={{
                        backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : 'transparent',
                        borderColor: tag.color,
                      }}
                    >
                      {selectedTagIds.includes(tag.id) && '✓ '}
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Search & Filter Section */}
        <div className="bg-white rounded-lg p-5 border border-gray-200 space-y-4">
          {/* Search Bar */}
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            advancedSearch={filters.advancedSearch}
            onToggleAdvanced={handleToggleAdvancedSearch}
          />

          {/* Filter Panel Toggle */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors"
          >
            <span className={`transform transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`}>
              ▼
            </span>
            <span>Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
          </button>

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <FilterPanel
                status={filters.status}
                onStatusChange={handleStatusChange}
                selectedPriorities={filters.priorities}
                onPrioritiesChange={handlePrioritiesChange}
                selectedTagIds={filters.tagIds}
                onTagIdsChange={handleTagIdsChange}
                dueDateRange={filters.dueDateRange}
                onDueDateRangeChange={handleDueDateRangeChange}
                availableTags={tags}
                onClearAll={handleClearAllFilters}
                togglePriority={togglePriority}
                toggleTag={toggleTagFilter}
              />
            </div>
          )}

          {/* Active Filter Badges */}
          <ActiveFilterBadges
            status={filters.status}
            onRemoveStatus={removeStatusFilter}
            selectedPriorities={filters.priorities}
            onRemovePriority={removePriorityFilter}
            selectedTags={tags.filter(t => filters.tagIds.includes(t.id))}
            onRemoveTag={removeTagFilter}
            dueDateRange={filters.dueDateRange}
            onRemoveDueDateRange={removeDueDateRangeFilter}
            searchTerm={filters.searchTerm}
            onRemoveSearch={removeSearchFilter}
          />

          {/* Filter Stats */}
          <FilterStats
            totalTodos={todos.length}
            filteredTodos={filteredTodos.length}
          />
        </div>

        {/* Todos List */}
        {sortedAndFilteredTodos.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-gray-500 text-base">
              {todos.length === 0 
                ? "No todos yet. Add one above!" 
                : "No todos match your filters."
              }
            </p>
            {hasActiveFilters && todos.length > 0 && (
              <button
                onClick={handleClearAllFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAndFilteredTodos.map((todo) => (
              <div
                key={todo.id}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300/70 transition-all"
              >
                {editingId === todo.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={500}
                    />
                    <div className="flex gap-3">
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as Priority)}
                        className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <input
                        type="datetime-local"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {/* Tag Selection in Edit Mode */}
                    {tags.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-gray-600 text-sm">Tags:</label>
                        <div className="flex flex-wrap gap-2">
                          {tags.map(tag => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleEditTagSelection(tag.id)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                editSelectedTagIds.includes(tag.id)
                                  ? 'text-gray-900'
                                  : 'border-2 text-gray-500 hover:text-gray-600'
                              }`}
                              style={{
                                backgroundColor: editSelectedTagIds.includes(tag.id) ? tag.color : 'transparent',
                                borderColor: tag.color,
                              }}
                            >
                              {editSelectedTagIds.includes(tag.id) && '✓ '}
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-5 py-2 bg-slate-600 text-gray-900 rounded-lg text-sm hover:bg-slate-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={!!todo.completed_at}
                      onChange={(e) => updateTodo(todo.id, { completed_at: e.target.checked ? new Date().toISOString() : null })}
                      className="mt-0.5 w-5 h-5 cursor-pointer accent-blue-600 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-base ${todo.completed_at ? 'line-through text-slate-500' : 'text-gray-900'}`}>
                          {todo.title}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          todo.completed_at ? 'opacity-50' : ''
                        } ${PRIORITY_CONFIG[todo.priority].color}`}>
                          {PRIORITY_CONFIG[todo.priority].label}
                        </span>
                        {todo.recurrence_pattern && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-purple-500/50 bg-purple-500/10 text-purple-400 ${
                            todo.completed_at ? 'opacity-50' : ''
                          }`} title={RECURRENCE_CONFIG[todo.recurrence_pattern].description}>
                            {RECURRENCE_CONFIG[todo.recurrence_pattern].icon} {RECURRENCE_CONFIG[todo.recurrence_pattern].label}
                          </span>
                        )}
                        {todo.reminder_minutes && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-blue-500/50 bg-blue-500/10 text-blue-400 ${
                            todo.completed_at ? 'opacity-50' : ''
                          }`} title={REMINDER_CONFIG[todo.reminder_minutes].description}>
                            🔔 {REMINDER_CONFIG[todo.reminder_minutes].shortLabel}
                          </span>
                        )}
                        {/* Tag pills */}
                        {todo.tags && todo.tags.length > 0 && (
                          <>
                            {todo.tags.map(tag => (
                              <span
                                key={tag.id}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-gray-900 ${
                                  todo.completed_at ? 'opacity-50' : ''
                                }`}
                                style={{ backgroundColor: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </>
                        )}
                      </div>
                      {todo.due_date && (
                        <p className={`text-sm ${
                          isPastDue(todo.due_date) && !todo.completed_at
                            ? 'text-red-400 font-medium'
                            : 'text-gray-500'
                        }`}>
                          📅 {formatSingaporeDate(todo.due_date)}
                        </p>
                      )}
                      
                      {/* Progress Bar */}
                      {todo.subtasks.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <span>{todo.subtasks.filter(s => s.completed).length}/{todo.subtasks.length} subtasks</span>
                            <span>·</span>
                            <span>{todo.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full transition-all duration-300"
                              style={{ width: `${todo.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleSubtasks(todo.id)}
                        className="px-4 py-1.5 bg-purple-600 text-gray-900 rounded-lg text-sm hover:bg-purple-500 transition-colors"
                      >
                        {expandedTodos.has(todo.id) ? '▼ Subtasks' : '▶ Subtasks'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(todo)}
                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteTodo(todo.id);
                        }}
                        className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveAsTemplate(todo)}
                        disabled={savingTemplate}
                        className="px-4 py-1.5 bg-purple-600 text-gray-900 rounded-lg text-sm hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Save as template"
                      >
                        💾 Template
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Subtasks Section */}
                {!editingId && expandedTodos.has(todo.id) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {todo.subtasks.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {todo.subtasks.map((subtask) => (
                          <div key={subtask.id} className="flex items-center gap-2 group">
                            <input
                              type="checkbox"
                              checked={subtask.completed}
                              onChange={(e) => toggleSubtask(todo.id, subtask.id, e.target.checked)}
                              className="w-4 h-4 cursor-pointer accent-blue-600 rounded border-gray-300"
                            />
                            <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-slate-500' : 'text-gray-600'}`}>
                              {subtask.title}
                            </span>
                            <button
                              onClick={() => deleteSubtask(todo.id, subtask.id)}
                              className="opacity-0 group-hover:opacity-100 px-2 py-1 text-red-400 hover:text-red-600 text-xs transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add Subtask Form */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSubtaskTitles[todo.id] || ''}
                        onChange={(e) => setNewSubtaskTitles(prev => ({ ...prev, [todo.id]: e.target.value }))}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSubtask(todo.id);
                          }
                        }}
                        placeholder="Add a subtask..."
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={200}
                      />
                      <button
                        onClick={() => addSubtask(todo.id)}
                        disabled={!newSubtaskTitles[todo.id]?.trim()}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tag Management Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-lg border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Manage Tags</h2>
              <button
                onClick={() => setShowTagModal(false)}
                className="text-gray-500 hover:text-gray-900 text-2xl font-bold transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Create Tag Form */}
              <div className="bg-white rounded-lg p-4 border border-gray-300">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Tag</h3>
                <form onSubmit={createTag} className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5">Tag Name</label>
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="e.g., Work, Personal, Urgent"
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5">Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="h-10 w-20 cursor-pointer rounded border border-gray-300"
                      />
                      <input
                        type="text"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        placeholder="#3B82F6"
                        className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                      <span
                        className="px-4 py-2 rounded-full text-sm font-medium text-gray-900"
                        style={{ backgroundColor: newTagColor }}
                      >
                        Preview
                      </span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!newTagName.trim()}
                    className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                  >
                    Create Tag
                  </button>
                </form>
              </div>

              {/* Tags List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Tags</h3>
                {tags.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No tags yet. Create your first one above!</p>
                ) : (
                  <div className="space-y-2">
                    {tags.map(tag => (
                      <div
                        key={tag.id}
                        className="bg-white rounded-lg p-4 border border-gray-300 hover:border-slate-500/70 transition-all"
                      >
                        {editingTagId === tag.id ? (
                          // Edit Mode
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-gray-500 mb-1.5">Tag Name</label>
                              <input
                                type="text"
                                value={editTagName}
                                onChange={(e) => setEditTagName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                maxLength={50}
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-500 mb-1.5">Color</label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="color"
                                  value={editTagColor}
                                  onChange={(e) => setEditTagColor(e.target.value)}
                                  className="h-10 w-20 cursor-pointer rounded border border-gray-300"
                                />
                                <input
                                  type="text"
                                  value={editTagColor}
                                  onChange={(e) => setEditTagColor(e.target.value)}
                                  className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  pattern="^#[0-9A-Fa-f]{6}$"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={saveTagEdit}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors"
                              >
                                Update
                              </button>
                              <button
                                onClick={cancelTagEdit}
                                className="px-4 py-2 bg-slate-600 text-gray-900 rounded-lg text-sm hover:bg-slate-500 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span
                                className="px-4 py-2 rounded-full text-sm font-medium text-gray-900"
                                style={{ backgroundColor: tag.color }}
                              >
                                {tag.name}
                              </span>
                              <span className="text-xs text-slate-500">{tag.color}</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startTagEdit(tag)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteTag(tag.id)}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowTagModal(false)}
                className="w-full px-4 py-2.5 bg-gray-100 text-gray-900 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Management Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Templates</h2>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="text-gray-500 hover:text-gray-900 transition-colors text-2xl leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Category Filter */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {uniqueCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategoryFilter(cat as string)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategoryFilter === cat
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-slate-600'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates Grid */}
              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    No templates yet. Save a todo as a template to get started!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300/70 transition-all"
                    >
                      {editingTemplateId === template.id ? (
                        // Edit Mode
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm text-gray-500 mb-1.5">Name</label>
                            <input
                              type="text"
                              value={templateForm.name}
                              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              maxLength={200}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-500 mb-1.5">Category</label>
                            <input
                              type="text"
                              value={templateForm.category}
                              onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              maxLength={50}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-500 mb-1.5">Due Date Offset (days)</label>
                            <input
                              type="number"
                              value={templateForm.due_date_offset_days}
                              onChange={(e) => setTemplateForm({ ...templateForm, due_date_offset_days: parseInt(e.target.value) || 0 })}
                              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              min="0"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={saveTemplateEdit}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors"
                            >
                              Update
                            </button>
                            <button
                              onClick={cancelTemplateEdit}
                              className="px-4 py-2 bg-slate-600 text-gray-900 rounded-lg text-sm hover:bg-slate-500 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <>
                          {template.category && (
                            <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-purple-500/20 text-purple-400 mb-2">
                              {template.category}
                            </span>
                          )}
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                          
                          {/* Priority Badge */}
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded mb-2 ${
                            template.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            template.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {template.priority.toUpperCase()}
                          </span>

                          {/* Metadata */}
                          <div className="space-y-1 text-xs text-gray-500 mb-3">
                            {template.recurrence_pattern && (
                              <div>🔄 Recurs: {template.recurrence_pattern}</div>
                            )}
                            {template.due_date_offset_days !== null && (
                              <div>📅 Due: {template.due_date_offset_days} days after creation</div>
                            )}
                            {template.reminder_minutes && (
                              <div>⏰ Reminder: {template.reminder_minutes} min before due</div>
                            )}
                            {(() => {
                              try {
                                const subtasks = template.subtasks_json ? JSON.parse(template.subtasks_json) : [];
                                if (subtasks.length > 0) {
                                  return <div>✓ {subtasks.length} subtasks</div>;
                                }
                              } catch (e) {
                                return null;
                              }
                              return null;
                            })()}
                          </div>

                          {/* Tags */}
                          {template.tags && template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {template.tags.map((tag: any) => (
                                <span
                                  key={tag.id}
                                  className="px-2 py-0.5 text-xs rounded-full text-gray-900"
                                  style={{ backgroundColor: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleUseTemplate(template.id)}
                              className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors"
                            >
                              Use Template
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startTemplateEdit(template)}
                                className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="flex-1 px-3 py-1.5 border border-red-200 text-red-400 text-sm rounded-lg hover:bg-red-500/10 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="w-full px-4 py-2.5 bg-gray-100 text-gray-900 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
