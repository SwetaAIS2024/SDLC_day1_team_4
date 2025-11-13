import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';
import { 
  ExportData, 
  ImportResult, 
  ImportError, 
  ImportWarning,
  ImportOptions 
} from '@/lib/types';
import {
  validateImportData,
  detectTagConflicts,
  detectTemplateConflicts,
  remapIds,
  sanitizePriority,
  sanitizeRecurrence,
  generateUniqueName
} from '@/lib/export-import';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const importData: ExportData = body.data;
    const options: ImportOptions = body.options || {
      mergeDuplicateTags: true,
      skipDuplicateTemplates: false
    };

    // Validate import data
    const validation = validateImportData(importData);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        statistics: {
          todos_imported: 0,
          todos_skipped: 0,
          subtasks_imported: 0,
          tags_imported: 0,
          tags_merged: 0,
          tags_skipped: 0,
          templates_imported: 0,
          templates_skipped: 0
        },
        id_mapping: {
          todos: {},
          tags: {},
          templates: {}
        },
        errors: validation.errors,
        warnings: []
      } as ImportResult, { status: 400 });
    }

    const result: ImportResult = {
      success: true,
      statistics: {
        todos_imported: 0,
        todos_skipped: 0,
        subtasks_imported: 0,
        tags_imported: 0,
        tags_merged: 0,
        tags_skipped: 0,
        templates_imported: 0,
        templates_skipped: 0
      },
      id_mapping: {
        todos: {},
        tags: {},
        templates: {}
      },
      errors: [],
      warnings: []
    };

    // Start transaction
    const importTransaction = db.transaction(() => {
      const now = getSingaporeNow().toISO()!;

      // Step 1: Import tags with conflict resolution
      const existingTags = db.prepare(`
        SELECT id, name, color FROM tags WHERE user_id = ?
      `).all(session.userId) as { id: number; name: string; color: string }[];

      for (const importedTag of importData.data.tags) {
        const existingTag = existingTags.find(
          t => t.name.toLowerCase() === importedTag.name.toLowerCase()
        );

        if (existingTag) {
          if (options.mergeDuplicateTags) {
            // Merge: use existing tag ID
            result.id_mapping.tags[importedTag.original_id] = existingTag.id;
            result.statistics.tags_merged++;
            result.warnings.push({
              type: 'duplicate',
              entity: 'tag',
              original_id: importedTag.original_id,
              message: `Tag "${importedTag.name}" merged with existing tag`
            });
          } else {
            // Create new with unique name
            const uniqueName = generateUniqueName(
              importedTag.name,
              existingTags.map(t => t.name)
            );
            const insertResult = db.prepare(`
              INSERT INTO tags (user_id, name, color, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?)
            `).run(session.userId, uniqueName, importedTag.color, now, now);

            result.id_mapping.tags[importedTag.original_id] = Number(insertResult.lastInsertRowid);
            result.statistics.tags_imported++;
            result.warnings.push({
              type: 'duplicate',
              entity: 'tag',
              original_id: importedTag.original_id,
              message: `Tag "${importedTag.name}" renamed to "${uniqueName}"`
            });
          }
        } else {
          // No conflict, create new tag
          const insertResult = db.prepare(`
            INSERT INTO tags (user_id, name, color, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(session.userId, importedTag.name, importedTag.color, now, now);

          result.id_mapping.tags[importedTag.original_id] = Number(insertResult.lastInsertRowid);
          result.statistics.tags_imported++;
        }
      }

      // Step 2: Import templates with conflict resolution
      const existingTemplates = db.prepare(`
        SELECT id, name FROM templates WHERE user_id = ?
      `).all(session.userId) as { id: number; name: string }[];

      for (const importedTemplate of importData.data.templates) {
        const existingTemplate = existingTemplates.find(
          t => t.name.toLowerCase() === importedTemplate.name.toLowerCase()
        );

        if (existingTemplate) {
          if (options.skipDuplicateTemplates) {
            // Skip duplicate
            result.statistics.templates_skipped++;
            result.warnings.push({
              type: 'skipped',
              entity: 'template',
              original_id: importedTemplate.original_id,
              message: `Template "${importedTemplate.name}" skipped (duplicate)`
            });
            continue;
          } else {
            // Create with unique name
            const uniqueName = generateUniqueName(
              importedTemplate.name,
              existingTemplates.map(t => t.name)
            );

            const insertResult = db.prepare(`
              INSERT INTO templates (
                user_id, name, description, category, priority,
                recurrence_pattern, reminder_minutes, due_date_offset_days,
                subtasks_json, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              session.userId,
              uniqueName,
              importedTemplate.description,
              importedTemplate.category,
              sanitizePriority(importedTemplate.priority),
              sanitizeRecurrence(importedTemplate.recurrence_pattern),
              importedTemplate.reminder_minutes,
              importedTemplate.due_date_offset_days,
              importedTemplate.subtasks_json,
              now,
              now
            );

            const newTemplateId = Number(insertResult.lastInsertRowid);
            result.id_mapping.templates[importedTemplate.original_id] = newTemplateId;
            result.statistics.templates_imported++;

            // Create template tag relationships
            for (const oldTagId of importedTemplate.tag_ids) {
              const newTagId = result.id_mapping.tags[oldTagId];
              if (newTagId) {
                db.prepare(`
                  INSERT INTO template_tags (template_id, tag_id) VALUES (?, ?)
                `).run(newTemplateId, newTagId);
              }
            }

            result.warnings.push({
              type: 'duplicate',
              entity: 'template',
              original_id: importedTemplate.original_id,
              message: `Template "${importedTemplate.name}" renamed to "${uniqueName}"`
            });
          }
        } else {
          // No conflict, create new template
          const insertResult = db.prepare(`
            INSERT INTO templates (
              user_id, name, description, category, priority,
              recurrence_pattern, reminder_minutes, due_date_offset_days,
              subtasks_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            session.userId,
            importedTemplate.name,
            importedTemplate.description,
            importedTemplate.category,
            sanitizePriority(importedTemplate.priority),
            sanitizeRecurrence(importedTemplate.recurrence_pattern),
            importedTemplate.reminder_minutes,
            importedTemplate.due_date_offset_days,
            importedTemplate.subtasks_json,
            now,
            now
          );

          const newTemplateId = Number(insertResult.lastInsertRowid);
          result.id_mapping.templates[importedTemplate.original_id] = newTemplateId;
          result.statistics.templates_imported++;

          // Create template tag relationships
          for (const oldTagId of importedTemplate.tag_ids) {
            const newTagId = result.id_mapping.tags[oldTagId];
            if (newTagId) {
              db.prepare(`
                INSERT INTO template_tags (template_id, tag_id) VALUES (?, ?)
              `).run(newTemplateId, newTagId);
            }
          }
        }
      }

      // Step 3: Import todos with subtasks
      for (const importedTodo of importData.data.todos) {
        try {
          // Validate and sanitize data
          if (!importedTodo.title?.trim()) {
            result.statistics.todos_skipped++;
            result.errors.push({
              type: 'validation',
              entity: 'todo',
              original_id: importedTodo.original_id,
              field: 'title',
              message: 'Todo title is required'
            });
            continue;
          }

          // Create todo
          const insertResult = db.prepare(`
            INSERT INTO todos (
              user_id, title, completed, priority, recurrence_pattern,
              due_date, reminder_minutes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            session.userId,
            importedTodo.title,
            importedTodo.completed ? 1 : 0,
            sanitizePriority(importedTodo.priority),
            sanitizeRecurrence(importedTodo.recurrence_pattern),
            importedTodo.due_date,
            importedTodo.reminder_minutes,
            now,
            now
          );

          const newTodoId = Number(insertResult.lastInsertRowid);
          result.id_mapping.todos[importedTodo.original_id] = newTodoId;
          result.statistics.todos_imported++;

          // Create subtasks
          for (const subtask of importedTodo.subtasks) {
            db.prepare(`
              INSERT INTO subtasks (todo_id, title, completed, position, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(
              newTodoId,
              subtask.title,
              subtask.completed ? 1 : 0,
              subtask.position,
              now,
              now
            );
            result.statistics.subtasks_imported++;
          }

          // Create todo tag relationships
          for (const oldTagId of importedTodo.tag_ids) {
            const newTagId = result.id_mapping.tags[oldTagId];
            if (newTagId) {
              db.prepare(`
                INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)
              `).run(newTodoId, newTagId);
            }
          }
        } catch (error) {
          result.statistics.todos_skipped++;
          result.errors.push({
            type: 'database',
            entity: 'todo',
            original_id: importedTodo.original_id,
            message: `Failed to import todo: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    });

    // Execute transaction
    try {
      importTransaction();
    } catch (error) {
      console.error('Import transaction failed:', error);
      return NextResponse.json({
        success: false,
        statistics: {
          todos_imported: 0,
          todos_skipped: 0,
          subtasks_imported: 0,
          tags_imported: 0,
          tags_merged: 0,
          tags_skipped: 0,
          templates_imported: 0,
          templates_skipped: 0
        },
        id_mapping: {
          todos: {},
          tags: {},
          templates: {}
        },
        errors: [{
          type: 'database',
          entity: 'todo',
          original_id: 0,
          message: `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        warnings: []
      } as ImportResult, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to import data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
