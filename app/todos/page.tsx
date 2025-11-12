'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatSingaporeDate, isPastDue } from '@/lib/timezone';
import { Priority, RecurrencePattern, ReminderMinutes, PRIORITY_CONFIG, RECURRENCE_CONFIG, REMINDER_CONFIG, Todo } from '@/lib/types';
import { useNotifications } from '@/lib/hooks/useNotifications';

export default function TodosPage() {
  const router = useRouter();
  const { permission, startPolling } = useNotifications();
  const [todos, setTodos] = useState<Todo[]>([]);
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
    const newTodo: Todo = {
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
    };

    // Optimistic update
    setTodos(prev => [newTodo, ...prev]);
    setNewTodoTitle('');
    setNewTodoDueDate('');
    setPriority('medium');
    setRecurrence('');
    setReminder(null);

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          priority, 
          recurrence_pattern: recurrence || null,
          due_date: newTodoDueDate || null,
          reminder_minutes: reminder
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

  const updateTodo = async (id: number, updates: Partial<Todo>) => {
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

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDueDate(todo.due_date || '');
    setEditPriority(todo.priority);
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;

    await updateTodo(editingId, {
      title: editTitle.trim(),
      priority: editPriority,
      due_date: editDueDate || null,
    });

    setEditingId(null);
    setEditTitle('');
    setEditDueDate('');
    setEditPriority('medium');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDueDate('');
    setEditPriority('medium');
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

  // Sort and filter todos
  const sortedAndFilteredTodos = todos
    .filter(todo => {
      // Filter by search query
      if (searchQuery && !todo.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Filter by priority
      if (filterPriority !== 'all' && todo.priority !== filterPriority) {
        return false;
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
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
