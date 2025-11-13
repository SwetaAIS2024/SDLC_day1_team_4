# PRP-08: Template System

**Feature**: Reusable Todo Templates with Subtasks and Metadata  
**Priority**: P1 (High Priority)  
**Status**: Specification  
**Last Updated**: November 13, 2025

---

## 📋 Feature Overview

The Template System feature enables users to save frequently-used todo patterns as reusable templates. Instead of recreating the same todo structure repeatedly (e.g., weekly report with 5 subtasks, client onboarding checklist, monthly review process), users can save a template once and instantiate it with a single click. Templates include the todo title, priority level, subtask list, optional categories, and due date offset logic.

This feature is invaluable for users with recurring workflows, project managers following standardized processes, and anyone who finds themselves creating similar todos repeatedly.

### Key Capabilities
- **Save Todo as Template**: Convert existing todo structures into reusable templates
- **Template Metadata**: Store title, priority, category, and subtask structure
- **Due Date Offset**: Define relative due dates (e.g., "3 days from now", "1 week from today")
- **Subtask Preservation**: Templates include entire subtask checklists with ordering
- **Category Organization**: Group templates by type (e.g., "Client Work", "Personal", "Reports")
- **One-Click Instantiation**: Create new todos from templates with automatic subtask creation
- **Template Management**: Edit, delete, and browse all saved templates
- **JSON Serialization**: Store complex subtask structures efficiently

---

## 👥 User Stories

### Primary User Persona: Freelance Developer Managing Multiple Clients

**As a** freelance developer who onboards new clients regularly  
**I want to** save my "Client Onboarding" template with all setup tasks  
**So that** I don't have to manually recreate the 15-step checklist for each new client

**As a** project manager with standardized workflows  
**I want to** create templates for different project types (web app, mobile app, API)  
**So that** I can quickly start new projects with the correct task structure

**As a** busy professional who writes weekly reports  
**I want to** save a "Weekly Report" template with all required sections  
**So that** I can create this week's report todo in 2 seconds instead of 2 minutes

**As a** user with multiple responsibility areas  
**I want to** organize templates by category (work, personal, health, learning)  
**So that** I can quickly find the right template when I need it

**As a** consultant with recurring client check-ins  
**I want to** set templates with due date offsets like "2 days from now"  
**So that** the todo automatically gets the correct deadline when created

**As a** meticulous planner  
**I want to** edit my templates when my processes evolve  
**So that** future todos reflect my improved workflows

---

## 🔄 User Flow

### Flow 1: Creating a Template from Scratch

1. User clicks "Templates" button in main navigation
2. Template manager modal opens showing existing templates (if any)
3. User clicks "Create New Template" button
4. Template creation form appears with fields:
   - **Template Name** (required, e.g., "Client Onboarding")
   - **Category** (optional, e.g., "Client Work")
   - **Todo Title** (required, e.g., "Onboard [Client Name]")
   - **Priority** (dropdown: high/medium/low, default: medium)
   - **Due Date Offset** (optional, e.g., "3" days from now)
   - **Subtasks** section with "Add Subtask" button
5. User fills in:
   - Name: "Client Onboarding"
   - Category: "Client Work"
   - Title: "Onboard new client"
   - Priority: "High"
   - Due Date Offset: 7 days
6. User adds subtasks:
   - "Initial discovery call"
   - "Set up project repository"
   - "Create project board"
   - "Send onboarding docs"
   - "Schedule kickoff meeting"
7. User clicks "Save Template"
8. **Optimistic Update**: Template appears in template list immediately
9. API request sent to `/api/templates`
10. On success: Template confirmed with database ID
11. On failure: Template removed, error message displayed

### Flow 2: Creating a Template from Existing Todo

1. User right-clicks on an existing todo with subtasks
2. Context menu shows "Save as Template" option
3. User clicks "Save as Template"
4. Quick template form appears:
   - **Template Name** pre-filled with todo title
   - **Category** (optional input)
   - All existing subtasks automatically included
   - Priority inherited from todo
   - Due date converted to offset from today
5. User edits template name to "Weekly Sprint Planning"
6. User adds category "Agile Workflows"
7. User clicks "Save"
8. Template saved with all metadata and subtasks
9. Success message: "Template 'Weekly Sprint Planning' created"

### Flow 3: Using a Template to Create a Todo

1. User is viewing main todo list
2. User clicks "Create from Template" button
3. Template picker modal opens showing all templates grouped by category
4. User browses categories:
   - **Client Work** (3 templates)
   - **Reports** (2 templates)
   - **Personal** (5 templates)
5. User clicks on "Weekly Report" template
6. Preview shows:
   - Template details (title, priority, subtasks)
   - Calculated due date: "Nov 20, 2025" (7 days from today)
7. User clicks "Create Todo" button
8. **Optimistic Update**: New todo appears in list with all subtasks
9. API request sent to `/api/templates/[id]/use`
10. Backend creates:
    - New todo with template title, priority
    - Due date = today + template offset days
    - All subtasks with correct positions
11. On success: Todo confirmed, user can immediately interact with it
12. Template modal closes automatically

### Flow 4: Editing a Template

1. User opens template manager
2. User hovers over "Client Onboarding" template
3. "Edit" button appears
4. User clicks "Edit"
5. Template switches to edit mode with all fields editable
6. User changes:
   - Due Date Offset: 7 → 10 days
   - Adds new subtask: "Set up staging environment"
7. User reorders subtasks by dragging
8. User clicks "Save Changes"
9. **Optimistic Update**: Template updates immediately in list
10. API request sent to `/api/templates/[id]`
11. On success: Changes confirmed
12. On failure: Reverted to original state, error shown
13. **Note**: Existing todos created from this template are NOT affected

### Flow 5: Deleting a Template

1. User opens template manager
2. User clicks "Delete" icon next to "Old Project Template"
3. Confirmation dialog appears:
   - "Delete template 'Old Project Template'?"
   - "This will not affect any todos created from this template."
   - "Delete" and "Cancel" buttons
4. User confirms deletion
5. **Optimistic Update**: Template removed from list
6. API request sent to `/api/templates/[id]`
7. On success: Deletion confirmed
8. On failure: Template restored, error shown

### Flow 6: Browsing Templates by Category

1. User opens template picker (to create from template)
2. Templates displayed in collapsible category sections
3. Categories shown:
   - **Client Work** (collapsed by default, shows count: 3)
   - **Reports** (collapsed)
   - **Personal** (collapsed)
   - **Uncategorized** (expanded, shows templates without category)
4. User clicks "Client Work" category header
5. Section expands showing 3 templates:
   - "Client Onboarding" (high priority, 5 subtasks)
   - "Client Offboarding" (medium priority, 3 subtasks)
   - "Monthly Client Review" (medium priority, 7 subtasks)
6. Each template shows preview card with key metadata
7. User can search/filter templates by name

---

## 🛠️ Technical Requirements

### Database Schema

**Table**: `templates`

```sql
CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date_offset_days INTEGER DEFAULT NULL,
  subtasks_json TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(user_id, category);
```

**Column Descriptions**:
- `id`: Primary key, auto-incremented
- `user_id`: Foreign key to users table, cascade delete
- `name`: Template display name (e.g., "Client Onboarding"), required
- `title`: Todo title pattern (e.g., "Onboard new client"), required
- `priority`: Default priority for todos created from template ('high', 'medium', 'low')
- `due_date_offset_days`: Number of days from today to set due date (NULL = no due date)
- `subtasks_json`: JSON array of subtask objects, can be NULL
- `category`: Optional category for organization (e.g., "Client Work")
- `created_at`: Template creation timestamp (Singapore timezone)
- `updated_at`: Last modification timestamp (Singapore timezone)

**subtasks_json Format**:
```json
[
  {
    "title": "Initial discovery call",
    "position": 0
  },
  {
    "title": "Set up project repository",
    "position": 1
  },
  {
    "title": "Create project board",
    "position": 2
  }
]
```

### TypeScript Types

**File**: `lib/db.ts`

```typescript
export interface Template {
  id: number;
  user_id: number;
  name: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  due_date_offset_days: number | null;
  subtasks_json: string | null; // JSON string
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateSubtask {
  title: string;
  position: number;
}

export interface TemplateWithParsedSubtasks extends Omit<Template, 'subtasks_json'> {
  subtasks: TemplateSubtask[];
}

export interface CreateTemplateInput {
  name: string;
  title: string;
  priority?: 'high' | 'medium' | 'low';
  due_date_offset_days?: number | null;
  subtasks?: TemplateSubtask[];
  category?: string | null;
}

export interface UpdateTemplateInput {
  name?: string;
  title?: string;
  priority?: 'high' | 'medium' | 'low';
  due_date_offset_days?: number | null;
  subtasks?: TemplateSubtask[];
  category?: string | null;
}

export interface TemplateCategory {
  name: string;
  count: number;
}
```

**File**: `lib/constants.ts`

```typescript
export const TEMPLATE_NAME_MAX_LENGTH = 50;
export const TEMPLATE_NAME_MIN_LENGTH = 1;
export const TEMPLATE_TITLE_MAX_LENGTH = 500;
export const TEMPLATE_CATEGORY_MAX_LENGTH = 30;
export const MAX_DUE_DATE_OFFSET_DAYS = 365; // 1 year
```

### Database Operations

**File**: `lib/db.ts`

```typescript
export const templateDB = {
  /**
   * Create a new template
   */
  create(userId: number, input: CreateTemplateInput): Template {
    const stmt = db.prepare(`
