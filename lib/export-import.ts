// Export/Import utility functions
import { ExportData, ImportError, ImportWarning, ExportedTodo, ExportedTag, ExportedTemplate } from './types';

/**
 * Validate import data structure
 */
export function validateImportData(data: any): { valid: boolean; errors: ImportError[] } {
  const errors: ImportError[] = [];

  // Check version
  if (!data.version) {
    errors.push({
      type: 'validation',
      entity: 'todo',
      original_id: 0,
      field: 'version',
      message: 'Missing version field in export data'
    });
  }

  // Check data structure
  if (!data.data) {
    errors.push({
      type: 'validation',
      entity: 'todo',
      original_id: 0,
      field: 'data',
      message: 'Missing data field in export'
    });
    return { valid: false, errors };
  }

  // Validate todos array
  if (!Array.isArray(data.data.todos)) {
    errors.push({
      type: 'validation',
      entity: 'todo',
      original_id: 0,
      field: 'todos',
      message: 'Invalid todos array'
    });
  } else {
    // Validate each todo
    data.data.todos.forEach((todo: any, index: number) => {
      if (!todo.title?.trim()) {
        errors.push({
          type: 'validation',
          entity: 'todo',
          original_id: todo.original_id || index,
          field: 'title',
          message: `Todo at index ${index}: title is required`
        });
      }

      const validPriorities = ['high', 'medium', 'low'];
      if (!validPriorities.includes(todo.priority)) {
        errors.push({
          type: 'validation',
          entity: 'todo',
          original_id: todo.original_id || index,
          field: 'priority',
          message: `Todo at index ${index}: invalid priority "${todo.priority}"`
        });
      }

      if (todo.recurrence_pattern) {
        const validPatterns = ['daily', 'weekly', 'monthly', 'yearly'];
        if (!validPatterns.includes(todo.recurrence_pattern)) {
          errors.push({
            type: 'validation',
            entity: 'todo',
            original_id: todo.original_id || index,
            field: 'recurrence_pattern',
            message: `Todo at index ${index}: invalid recurrence pattern "${todo.recurrence_pattern}"`
          });
        }
      }
    });
  }

  // Validate tags array
  if (!Array.isArray(data.data.tags)) {
    errors.push({
      type: 'validation',
      entity: 'tag',
      original_id: 0,
      field: 'tags',
      message: 'Invalid tags array'
    });
  } else {
    data.data.tags.forEach((tag: any, index: number) => {
      if (!tag.name?.trim()) {
        errors.push({
          type: 'validation',
          entity: 'tag',
          original_id: tag.original_id || index,
          field: 'name',
          message: `Tag at index ${index}: name is required`
        });
      }

      if (tag.color && !/^#[0-9A-F]{6}$/i.test(tag.color)) {
        errors.push({
          type: 'validation',
          entity: 'tag',
          original_id: tag.original_id || index,
          field: 'color',
          message: `Tag at index ${index}: invalid color format "${tag.color}"`
        });
      }
    });
  }

  // Validate templates array
  if (!Array.isArray(data.data.templates)) {
    errors.push({
      type: 'validation',
      entity: 'template',
      original_id: 0,
      field: 'templates',
      message: 'Invalid templates array'
    });
  } else {
    data.data.templates.forEach((template: any, index: number) => {
      if (!template.name?.trim()) {
        errors.push({
          type: 'validation',
          entity: 'template',
          original_id: template.original_id || index,
          field: 'name',
          message: `Template at index ${index}: name is required`
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Detect conflicts in tags (duplicate names with different colors)
 */
export function detectTagConflicts(
  existingTags: { id: number; name: string; color: string }[],
  importedTags: ExportedTag[]
): { tag: ExportedTag; existing: { id: number; name: string; color: string } }[] {
  const conflicts: { tag: ExportedTag; existing: { id: number; name: string; color: string } }[] = [];

  for (const importedTag of importedTags) {
    const existing = existingTags.find(t => t.name.toLowerCase() === importedTag.name.toLowerCase());
    if (existing && existing.color !== importedTag.color) {
      conflicts.push({ tag: importedTag, existing });
    }
  }

  return conflicts;
}

/**
 * Detect conflicts in templates (duplicate names)
 */
export function detectTemplateConflicts(
  existingTemplates: { id: number; name: string }[],
  importedTemplates: ExportedTemplate[]
): { template: ExportedTemplate; existing: { id: number; name: string } }[] {
  const conflicts: { template: ExportedTemplate; existing: { id: number; name: string } }[] = [];

  for (const importedTemplate of importedTemplates) {
    const existing = existingTemplates.find(t => t.name.toLowerCase() === importedTemplate.name.toLowerCase());
    if (existing) {
      conflicts.push({ template: importedTemplate, existing });
    }
  }

  return conflicts;
}

/**
 * Remap IDs to prevent conflicts
 */
export function remapIds<T extends { original_id: number }>(
  items: T[],
  startId: number
): { remappedItems: (T & { id: number })[]; mapping: Record<number, number> } {
  const mapping: Record<number, number> = {};
  const remappedItems: (T & { id: number })[] = [];

  items.forEach((item, index) => {
    const newId = startId + index;
    mapping[item.original_id] = newId;
    remappedItems.push({ ...item, id: newId });
  });

  return { remappedItems, mapping };
}

/**
 * Sanitize and validate priority value
 */
export function sanitizePriority(priority: string): 'high' | 'medium' | 'low' {
  const validPriorities = ['high', 'medium', 'low'];
  return validPriorities.includes(priority) ? priority as 'high' | 'medium' | 'low' : 'medium';
}

/**
 * Sanitize and validate recurrence pattern
 */
export function sanitizeRecurrence(pattern: string | null): 'daily' | 'weekly' | 'monthly' | 'yearly' | null {
  if (!pattern) return null;
  const validPatterns = ['daily', 'weekly', 'monthly', 'yearly'];
  return validPatterns.includes(pattern) ? pattern as 'daily' | 'weekly' | 'monthly' | 'yearly' : null;
}

/**
 * Generate unique name for duplicate entity
 */
export function generateUniqueName(baseName: string, existingNames: string[]): string {
  let counter = 2;
  let newName = `${baseName} (${counter})`;
  
  while (existingNames.includes(newName)) {
    counter++;
    newName = `${baseName} (${counter})`;
  }
  
  return newName;
}
