'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatSingaporeDate, isPastDue } from '@/lib/timezone';
import { Priority, RecurrencePattern, ReminderMinutes, PRIORITY_CONFIG, RECURRENCE_CONFIG, REMINDER_CONFIG, TodoWithSubtasks, Subtask, TagResponse } from '@/lib/types';
import { useNotifications } from '@/lib/hooks/useNotifications';

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
      completed: false,
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

  // Sort and filter todos
  const sortedAndFilteredTodos = todos
    .filter(todo => {
      // Filter by search query (search in title and subtasks)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = todo.title.toLowerCase().includes(query);
        const subtaskMatch = todo.subtasks.some(s => 
          s.title.toLowerCase().includes(query)
        );
        if (!titleMatch && !subtaskMatch) {
          return false;
        }
      }
      
      // Filter by priority
      if (filterPriority !== 'all' && todo.priority !== filterPriority) {
        return false;
      }
      
      // Filter by tag
      if (filterTagId !== null) {
        if (!todo.tags || !todo.tags.some(t => t.id === filterTagId)) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by completion status first (incomplete first)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
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
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-slate-400">Loading todos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Top Navigation Bar */}
      <header className="bg-[#1e293b] border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Todo App</h1>
            <p className="text-sm text-slate-400">Welcome, {username || 'abc'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowTagModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500 transition-colors"
            >
              + Manage Tags
            </button>
            <button className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 transition-colors">
              Data
            </button>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-500 transition-colors">
              Calendar
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors">
              📋 Templates
            </button>
            <button className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-400 transition-colors">
              🔔
            </button>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <p>{error}</p>
              <button 
                onClick={() => setError(null)} 
                className="text-red-300 hover:text-red-100 text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Create Todo Form */}
        <div className="bg-[#1e293b] rounded-lg p-5 border border-slate-700/50">
          <form onSubmit={createTodo} className="space-y-4">
            {/* Main Input Row */}
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                placeholder="Add a new todo..."
                className="flex-1 px-4 py-2.5 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                maxLength={500}
              />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="px-4 py-2.5 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <input
                type="datetime-local"
                value={newTodoDueDate}
                onChange={(e) => setNewTodoDueDate(e.target.value)}
                className="px-4 py-2.5 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <button
                type="submit"
                disabled={!newTodoTitle.trim() || !newTodoDueDate}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>

            {/* Recurrence and Reminder Row */}
                        {/* Recurrence and Reminder Row */}
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <label className="text-slate-400">Recurrence:</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrencePattern | '')}
                disabled={!newTodoDueDate}
                className="px-3 py-1.5 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">None</option>
                <option value="daily">{RECURRENCE_CONFIG.daily.icon} {RECURRENCE_CONFIG.daily.label}</option>
                <option value="weekly">{RECURRENCE_CONFIG.weekly.icon} {RECURRENCE_CONFIG.weekly.label}</option>
                <option value="monthly">{RECURRENCE_CONFIG.monthly.icon} {RECURRENCE_CONFIG.monthly.label}</option>
                <option value="yearly">{RECURRENCE_CONFIG.yearly.icon} {RECURRENCE_CONFIG.yearly.label}</option>
              </select>
              <label className="text-slate-400">Reminder:</label>
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
                className="px-3 py-1.5 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <label className="text-slate-300 whitespace-nowrap">Use Template:</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                <label className="text-slate-300 text-sm">Tags:</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTagSelection(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedTagIds.includes(tag.id)
                          ? 'text-white'
                          : 'border-2 text-slate-400 hover:text-slate-300'
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

        {/* Search Section */}
        <div className="bg-[#1e293b] rounded-lg p-5 border border-slate-700/50">
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search todos and subtasks..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as Priority | 'all')}
              className="px-4 py-2 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            {tags.length > 0 && (
              <select
                value={filterTagId ?? ''}
                onChange={(e) => setFilterTagId(e.target.value ? parseInt(e.target.value) : null)}
                className="px-4 py-2 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">All Tags</option>
                {tags.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            )}
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors"
            >
              <span className={`transform transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}>
                ▼
              </span>
              <span>Advanced</span>
            </button>
          </div>
          
          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
              <h3 className="text-sm font-medium text-white mb-3">Advanced Filters</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Completion Status</label>
                  <select className="w-full px-3 py-2 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option>All Todos</option>
                    <option>Completed</option>
                    <option>Incomplete</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Due Date From</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Due Date To</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Todos List */}
        {sortedAndFilteredTodos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-base">
              {todos.length === 0 
                ? "No todos yet. Add one above!" 
                : "No todos match your filters."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAndFilteredTodos.map((todo) => (
              <div
                key={todo.id}
                className="bg-[#1e293b] rounded-lg p-4 border border-slate-700/50 hover:border-slate-600/70 transition-all"
              >
                {editingId === todo.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      maxLength={500}
                    />
                    <div className="flex gap-3">
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as Priority)}
                        className="px-4 py-2.5 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <input
                        type="datetime-local"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    {/* Tag Selection in Edit Mode */}
                    {tags.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-slate-300 text-sm">Tags:</label>
                        <div className="flex flex-wrap gap-2">
                          {tags.map(tag => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleEditTagSelection(tag.id)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                editSelectedTagIds.includes(tag.id)
                                  ? 'text-white'
                                  : 'border-2 text-slate-400 hover:text-slate-300'
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
                        className="px-5 py-2 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-500 transition-colors"
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
                      checked={todo.completed}
                      onChange={(e) => updateTodo(todo.id, { completed: e.target.checked })}
                      className="mt-0.5 w-5 h-5 cursor-pointer accent-blue-600 rounded border-slate-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-base ${todo.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                          {todo.title}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          todo.completed ? 'opacity-50' : ''
                        } ${PRIORITY_CONFIG[todo.priority].color}`}>
                          {PRIORITY_CONFIG[todo.priority].label}
                        </span>
                        {todo.recurrence_pattern && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-purple-500/50 bg-purple-500/10 text-purple-400 ${
                            todo.completed ? 'opacity-50' : ''
                          }`} title={RECURRENCE_CONFIG[todo.recurrence_pattern].description}>
                            {RECURRENCE_CONFIG[todo.recurrence_pattern].icon} {RECURRENCE_CONFIG[todo.recurrence_pattern].label}
                          </span>
                        )}
                        {todo.reminder_minutes && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-blue-500/50 bg-blue-500/10 text-blue-400 ${
                            todo.completed ? 'opacity-50' : ''
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
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                                  todo.completed ? 'opacity-50' : ''
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
                          isPastDue(todo.due_date) && !todo.completed
                            ? 'text-red-400 font-medium'
                            : 'text-slate-400'
                        }`}>
                          📅 {formatSingaporeDate(todo.due_date)}
                        </p>
                      )}
                      
                      {/* Progress Bar */}
                      {todo.subtasks.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                            <span>{todo.subtasks.filter(s => s.completed).length}/{todo.subtasks.length} subtasks</span>
                            <span>·</span>
                            <span>{todo.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
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
                        className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-500 transition-colors"
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
                    </div>
                  </div>
                )}
                
                {/* Subtasks Section */}
                {!editingId && expandedTodos.has(todo.id) && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    {todo.subtasks.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {todo.subtasks.map((subtask) => (
                          <div key={subtask.id} className="flex items-center gap-2 group">
                            <input
                              type="checkbox"
                              checked={subtask.completed}
                              onChange={(e) => toggleSubtask(todo.id, subtask.id, e.target.checked)}
                              className="w-4 h-4 cursor-pointer accent-blue-600 rounded border-slate-600"
                            />
                            <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                              {subtask.title}
                            </span>
                            <button
                              onClick={() => deleteSubtask(todo.id, subtask.id)}
                              className="opacity-0 group-hover:opacity-100 px-2 py-1 text-red-400 hover:text-red-300 text-xs transition-opacity"
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
                        className="flex-1 px-3 py-2 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
          <div className="bg-[#1e293b] rounded-lg border border-slate-700/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between sticky top-0 bg-[#1e293b]">
              <h2 className="text-2xl font-bold text-white">Manage Tags</h2>
              <button
                onClick={() => setShowTagModal(false)}
                className="text-slate-400 hover:text-white text-2xl font-bold transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Create Tag Form */}
              <div className="bg-[#0f172a] rounded-lg p-4 border border-slate-600/50">
                <h3 className="text-lg font-semibold text-white mb-4">Create New Tag</h3>
                <form onSubmit={createTag} className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Tag Name</label>
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="e.g., Work, Personal, Urgent"
                      className="w-full px-4 py-2.5 bg-[#1e293b] border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="h-10 w-20 cursor-pointer rounded border border-slate-600/50"
                      />
                      <input
                        type="text"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        placeholder="#3B82F6"
                        className="flex-1 px-4 py-2.5 bg-[#1e293b] border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                      <span
                        className="px-4 py-2 rounded-full text-sm font-medium text-white"
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
                <h3 className="text-lg font-semibold text-white mb-4">Your Tags</h3>
                {tags.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No tags yet. Create your first one above!</p>
                ) : (
                  <div className="space-y-2">
                    {tags.map(tag => (
                      <div
                        key={tag.id}
                        className="bg-[#0f172a] rounded-lg p-4 border border-slate-600/50 hover:border-slate-500/70 transition-all"
                      >
                        {editingTagId === tag.id ? (
                          // Edit Mode
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-slate-400 mb-1.5">Tag Name</label>
                              <input
                                type="text"
                                value={editTagName}
                                onChange={(e) => setEditTagName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-[#1e293b] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                maxLength={50}
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-400 mb-1.5">Color</label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="color"
                                  value={editTagColor}
                                  onChange={(e) => setEditTagColor(e.target.value)}
                                  className="h-10 w-20 cursor-pointer rounded border border-slate-600/50"
                                />
                                <input
                                  type="text"
                                  value={editTagColor}
                                  onChange={(e) => setEditTagColor(e.target.value)}
                                  className="flex-1 px-4 py-2.5 bg-[#1e293b] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                                className="px-4 py-2 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-500 transition-colors"
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
                                className="px-4 py-2 rounded-full text-sm font-medium text-white"
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

            <div className="p-6 border-t border-slate-700/50 sticky bottom-0 bg-[#1e293b]">
              <button
                onClick={() => setShowTagModal(false)}
                className="w-full px-4 py-2.5 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
