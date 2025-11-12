/**
 * Main Todo Page Component
 * Per copilot-instructions.md: Monolithic client component (~2200 lines in full app)
 * This implementation covers CRUD operations from PRP-01
 */

'use client';

import { useState, useEffect } from 'react';
import { Todo } from '@/lib/db';
import { formatSingaporeDate, getSingaporeNow } from '@/lib/timezone';

export default function TodoPage() {
  // State management
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  // Fetch todos on mount
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/todos');
      if (!res.ok) throw new Error('Failed to fetch todos');
      const data = await res.json();
      setTodos(data.todos);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Create todo with optimistic update pattern
  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) {
      setError('Title is required');
      return;
    }

    if (newTodoTitle.length > 500) {
      setError('Title must be 500 characters or less');
      return;
    }

    const tempId = Date.now(); // Temporary ID for optimistic update
    const optimisticTodo: Todo = {
      id: tempId,
      user_id: 0, // Will be set by server
      title: newTodoTitle.trim(),
      completed_at: null,
      due_date: newTodoDueDate || null,
      created_at: getSingaporeNow().toISOString(),
      updated_at: getSingaporeNow().toISOString(),
      priority: null,
      recurrence_pattern: null,
      reminder_minutes: null,
      last_notification_sent: null,
    };

    // Optimistic update - show immediately
    setTodos((prev) => [optimisticTodo, ...prev]);
    setNewTodoTitle('');
    setNewTodoDueDate('');
    setError(null);

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodoTitle.trim(),
          due_date: newTodoDueDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create todo');
      }

      const createdTodo: Todo = await res.json();

      // Replace optimistic todo with real server-confirmed one
      setTodos((prev) => prev.map((t) => (t.id === tempId ? createdTodo : t)));
    } catch (err) {
      // Rollback optimistic update on error
      setTodos((prev) => prev.filter((t) => t.id !== tempId));
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Toggle completion with optimistic update
  const handleToggleComplete = async (todo: Todo) => {
    const newCompletedAt = todo.completed_at ? null : getSingaporeNow().toISOString();

    // Optimistic update
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed_at: newCompletedAt } : t))
    );

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_at: newCompletedAt }),
      });

      if (!res.ok) throw new Error('Failed to update todo');

      const updatedTodo: Todo = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updatedTodo : t)));
    } catch (err) {
      // Rollback on error
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, completed_at: todo.completed_at } : t))
      );
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Start editing
  const handleStartEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDueDate(todo.due_date || '');
  };

  // Save edit with optimistic update
  const handleSaveEdit = async (todoId: number) => {
    if (!editTitle.trim()) {
      setError('Title is required');
      return;
    }

    if (editTitle.length > 500) {
      setError('Title must be 500 characters or less');
      return;
    }

    const originalTodo = todos.find((t) => t.id === todoId);

    // Optimistic update
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId ? { ...t, title: editTitle.trim(), due_date: editDueDate || null } : t
      )
    );
    setEditingId(null);

    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          due_date: editDueDate || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to update todo');

      const updatedTodo: Todo = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === todoId ? updatedTodo : t)));
      setError(null);
    } catch (err) {
      // Rollback on error
      if (originalTodo) {
        setTodos((prev) => prev.map((t) => (t.id === todoId ? originalTodo : t)));
      }
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Delete todo with optimistic update
  const handleDelete = async (todoId: number) => {
    if (!confirm('Are you sure you want to delete this todo?')) return;

    const originalTodos = [...todos];

    // Optimistic update - remove immediately
    setTodos((prev) => prev.filter((t) => t.id !== todoId));

    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete todo');
      setError(null);
    } catch (err) {
      // Rollback on error
      setTodos(originalTodos);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (loading) return <div className="p-4">Loading todos...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Todos</h1>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Create Todo Form */}
      <form onSubmit={handleCreateTodo} className="mb-8 flex gap-2">
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={500}
        />
        <input
          type="date"
          value={newTodoDueDate}
          onChange={(e) => setNewTodoDueDate(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Add
        </button>
      </form>

      {/* Todo List */}
      <div className="space-y-2">
        {todos.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No todos yet. Create one above!</p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:shadow-md transition"
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={!!todo.completed_at}
                onChange={() => handleToggleComplete(todo)}
                className="w-5 h-5 cursor-pointer"
              />

              {/* Todo Content */}
              {editingId === todo.id ? (
                <>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 px-2 py-1 border rounded"
                    maxLength={500}
                  />
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="px-2 py-1 border rounded"
                  />
                  <button
                    onClick={() => handleSaveEdit(todo.id)}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <p className={`${todo.completed_at ? 'line-through text-gray-500' : ''}`}>
                      {todo.title}
                    </p>
                    {todo.due_date && (
                      <p className="text-sm text-gray-500">
                        Due: {formatSingaporeDate(todo.due_date, 'date')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleStartEdit(todo)}
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(todo.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
