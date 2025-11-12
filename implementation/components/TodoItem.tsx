/**
 * Todo Item Component with Recurring Support
 * 
 * Example component showing how to display a todo with recurrence indicator
 * Integrate this into your existing todo list rendering in app/page.tsx
 */

'use client';

import { RecurrenceIcon } from './RecurrenceIndicator';
import type { TodoWithRelations } from '@/lib/types';
import { formatSingaporeDate } from '@/lib/recurrence-utils';

interface TodoItemProps {
  todo: TodoWithRelations;
  onToggleComplete: (id: number) => void;
  onEdit: (todo: TodoWithRelations) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({ 
  todo, 
  onToggleComplete, 
  onEdit, 
  onDelete 
}: TodoItemProps) {
  const priorityColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };

  return (
    <div 
      className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 
                 rounded-lg border border-gray-200 dark:border-gray-700
                 hover:shadow-md transition-shadow"
    >
      {/* Completion Checkbox */}
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggleComplete(todo.id)}
        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
      />

      {/* Todo Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Title */}
          <h3 
            className={`text-base font-medium ${
              todo.completed 
                ? 'line-through text-gray-500 dark:text-gray-400' 
                : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {todo.title}
          </h3>

          {/* Recurrence Indicator */}
          <RecurrenceIcon pattern={todo.recurrence_pattern} />

          {/* Priority Badge */}
          <span 
            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
              priorityColors[todo.priority]
            }`}
          >
            {todo.priority}
          </span>
        </div>

        {/* Due Date */}
        {todo.due_date && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            📅 Due: {formatSingaporeDate(todo.due_date)}
          </p>
        )}

        {/* Tags */}
        {todo.tags.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {todo.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-1 text-xs rounded"
                style={{ 
                  backgroundColor: tag.color + '20', 
                  color: tag.color 
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Subtasks Progress */}
        {todo.subtasks.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span>
                {todo.subtasks.filter(st => st.completed).length}/{todo.subtasks.length} subtasks
              </span>
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-[100px]">
                <div 
                  className="h-full bg-blue-600 dark:bg-blue-400 transition-all"
                  style={{
                    width: `${(todo.subtasks.filter(st => st.completed).length / todo.subtasks.length) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(todo)}
          className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 
                     hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          className="px-3 py-1 text-sm text-red-600 dark:text-red-400 
                     hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
