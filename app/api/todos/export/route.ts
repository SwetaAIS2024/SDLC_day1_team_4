import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, todoDB, subtaskDB, tagDB, templateDB } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';
import { ExportData, ExportedTodo, ExportedTag, ExportedTemplate, ExportedSubtask } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeTodos = searchParams.get('include_todos') !== 'false';
    const includeTags = searchParams.get('include_tags') !== 'false';
    const includeTemplates = searchParams.get('include_templates') !== 'false';
    const includeCompleted = searchParams.get('include_completed') !== 'false';

    // Initialize export data
    const exportData: ExportData = {
      version: '1.0',
      exported_at: getSingaporeNow().toISO()!,
      exported_by: session.username,
      data: {
        todos: [],
        tags: [],
        templates: []
      },
      metadata: {
        todo_count: 0,
        tag_count: 0,
        template_count: 0,
        subtask_count: 0
      }
    };

    // Export todos with subtasks
    if (includeTodos) {
      const todosQuery = includeCompleted
        ? `SELECT * FROM todos WHERE user_id = ? ORDER BY id`
        : `SELECT * FROM todos WHERE user_id = ? AND completed_at IS NULL ORDER BY id`;
      
      const todos = db.prepare(todosQuery).all(session.userId) as any[];

      for (const todo of todos) {
        // Get subtasks for this todo
        const subtasks = db.prepare(`
          SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position
        `).all(todo.id) as any[];

        // Get tag IDs for this todo
        const tagIds = db.prepare(`
          SELECT tag_id FROM todo_tags WHERE todo_id = ?
        `).all(todo.id).map((row: any) => row.tag_id);

        const exportedTodo: ExportedTodo = {
          original_id: todo.id,
          title: todo.title,
          completed: todo.completed_at !== null,
          priority: todo.priority,
          recurrence_pattern: todo.recurrence_pattern || null,
          due_date: todo.due_date,
          reminder_minutes: todo.reminder_minutes,
          created_at: todo.created_at,
          updated_at: todo.updated_at,
          subtasks: subtasks.map(sub => ({
            original_id: sub.id,
            title: sub.title,
            completed: Boolean(sub.completed),
            position: sub.position,
            created_at: sub.created_at,
            updated_at: sub.updated_at
          })),
          tag_ids: tagIds
        };

        exportData.data.todos.push(exportedTodo);
        exportData.metadata.subtask_count += subtasks.length;
      }

      exportData.metadata.todo_count = todos.length;
    }

    // Export tags
    if (includeTags) {
      const tags = db.prepare(`
        SELECT * FROM tags WHERE user_id = ? ORDER BY id
      `).all(session.userId) as any[];

      for (const tag of tags) {
        const exportedTag: ExportedTag = {
          original_id: tag.id,
          name: tag.name,
          color: tag.color,
          created_at: tag.created_at,
          updated_at: tag.updated_at
        };

        exportData.data.tags.push(exportedTag);
      }

      exportData.metadata.tag_count = tags.length;
    }

    // Export templates
    if (includeTemplates) {
      const templates = db.prepare(`
        SELECT * FROM templates WHERE user_id = ? ORDER BY id
      `).all(session.userId) as any[];

      for (const template of templates) {
        // Get tag IDs for this template
        const tagIds = db.prepare(`
          SELECT tag_id FROM template_tags WHERE template_id = ?
        `).all(template.id).map((row: any) => row.tag_id);

        const exportedTemplate: ExportedTemplate = {
          original_id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          priority: template.priority,
          recurrence_pattern: template.recurrence_pattern || null,
          reminder_minutes: template.reminder_minutes,
          due_date_offset_days: template.due_date_offset_days,
          subtasks_json: template.subtasks_json || '[]',
          tag_ids: tagIds,
          created_at: template.created_at,
          updated_at: template.updated_at
        };

        exportData.data.templates.push(exportedTemplate);
      }

      exportData.metadata.template_count = templates.length;
    }

    // Generate filename with timestamp
    const timestamp = getSingaporeNow().toFormat('yyyy-MM-dd-HHmmss');
    const filename = `todos-backup-${timestamp}.json`;

    // Return JSON file as download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
