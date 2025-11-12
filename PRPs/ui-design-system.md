# PRP-05: UI Design System & Visual Refinement

## Feature Overview

Implement a comprehensive, professional UI design system for the Todo App that provides a cohesive visual experience across all pages. This includes a dark theme color palette, consistent spacing, typography, form elements, and interactive components that align with modern web design standards. The design system should be reusable, maintainable, and enhance user experience through thoughtful visual hierarchy and interaction patterns.

**Key Components:**
- Dark navy color scheme with slate palette
- Consistent navigation header with action buttons
- Refined form layouts with proper input styling
- Advanced filtering UI with collapsible sections
- Responsive card-based todo list display
- Smooth transitions and hover states

## User Stories

### Story 1: As a user, I want a visually appealing interface
**Persona:** Sarah, Marketing Manager
- "I spend hours managing my tasks daily, and I want an app that's pleasant to look at"
- "Dark themes are easier on my eyes during long work sessions"
- "I appreciate when apps have a professional, polished appearance"

**Acceptance:**
- Dark navy theme (#0f172a background) is consistently applied
- All colors follow a cohesive slate-based palette
- Visual hierarchy guides attention to important actions
- Interface feels premium and modern

### Story 2: As a user, I want intuitive form interactions
**Persona:** Mike, Software Developer
- "I need to add tasks quickly without fumbling through complex forms"
- "Form fields should have clear focus states so I know where I am"
- "Buttons should respond immediately to show they're clickable"

**Acceptance:**
- Form inputs have visible focus rings (blue glow)
- All interactive elements have hover states
- Button clicks provide visual feedback
- Tab navigation works logically through forms

### Story 3: As a user, I want organized visual information
**Persona:** Lisa, Project Coordinator
- "I need to scan my tasks quickly and find what I'm looking for"
- "Important information should stand out visually"
- "Filters and search should be easily accessible but not cluttered"

**Acceptance:**
- Search bar is prominently placed with icon
- Filter options are logically grouped
- Advanced filters can be collapsed when not needed
- Todo cards have clear visual separation

### Story 4: As a user, I want responsive feedback from UI elements
**Persona:** David, Freelance Designer
- "I expect buttons to show they're interactive when I hover"
- "Loading states should be clear so I know the app is working"
- "Completed tasks should visually differ from active ones"

**Acceptance:**
- All buttons have hover states with color changes
- Loading spinner displays during data fetch
- Completed todos show strikethrough and muted colors
- Transitions are smooth (200-300ms duration)

## User Flow

### Primary Flow: Adding a Todo with Refined UI

1. **User arrives at todo page**
   - Sees dark navy background (#0f172a)
   - Header displays "Todo App" with welcome message
   - Navigation buttons (Data, Calendar, Templates, Bell, Logout) are visible
   - Empty state shows: "No todos yet. Add one above!"

2. **User interacts with form**
   - Clicks into "Add a new todo..." input field
   - Field receives blue focus ring (ring-2 ring-blue-500/50)
   - Selects priority from dropdown (Medium/High/Low)
   - Clicks date picker, calendar overlay appears
   - All fields maintain consistent styling

3. **User configures options**
   - Checks "Repeat" checkbox if needed
   - Selects reminder from dropdown
   - Optionally selects template from bottom row
   - All controls have slate-themed backgrounds

4. **User submits todo**
   - Clicks blue "Add" button
   - Button shows hover state (bg-blue-500)
   - Form clears after successful addition
   - New todo appears in list below

5. **User applies filters**
   - Types in search bar with magnifying glass icon
   - Selects priority from "All Priorities" dropdown
   - Clicks "Advanced" button with dropdown arrow
   - Advanced Filters section expands smoothly
   - Shows Completion Status and Date Range pickers

6. **User interacts with todo cards**
   - Hovers over todo, border color intensifies
   - Checks checkbox to complete, text becomes strikethrough
   - Clicks "Edit" button, inline edit mode activates
   - Clicks "Delete" button, confirmation may appear

### Secondary Flow: Using Advanced Filters

1. User clicks "▼ Advanced" button (blue background)
2. Section expands with smooth animation
3. "Advanced Filters" heading appears
4. Completion Status dropdown shows (All Todos/Completed/Incomplete)
5. Two date pickers appear side by side (Due Date From/To)
6. User makes selections, todos filter in real-time
7. Click "▲ Advanced" to collapse section

### Edge Flow: Responsive Layout

1. On mobile/tablet, form inputs stack vertically
2. Navigation buttons may wrap or show menu icon
3. Filter controls stack in mobile view
4. Todo cards remain full-width on small screens
5. Touch targets are at least 44x44px

## Technical Requirements

### Color System (Tailwind CSS)

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Primary backgrounds
        'navy-950': '#0f172a',  // Main background
        'navy-800': '#1e293b',  // Card backgrounds
        'navy-700': '#334155',  // Borders and dividers
        
        // Interactive elements
        'primary-blue': {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          focus: '#1d4ed8',
        },
        'primary-purple': {
          DEFAULT: '#9333ea',
          hover: '#7e22ce',
        },
        
        // Status colors
        'success': '#10b981',
        'warning': '#f59e0b',
        'error': '#ef4444',
      },
    },
  },
};
```

### Design Tokens

```typescript
// lib/design-tokens.ts
export const designTokens = {
  // Spacing
  spacing: {
    page: '1.5rem',      // 24px - Page padding
    section: '1.25rem',  // 20px - Between sections
    card: '1rem',        // 16px - Card padding
    element: '0.75rem',  // 12px - Between elements
  },
  
  // Border radius
  radius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
  },
  
  // Typography
  fontSize: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    base: '1rem',    // 16px
    lg: '1.125rem',  // 18px
    xl: '1.5rem',    // 24px
    '2xl': '2rem',   // 32px
  },
  
  // Transitions
  transition: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
  },
  
  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },
};
```

### Component Library Structure

```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className = '',
}) => {
  const baseStyles = 'rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500 disabled:bg-slate-600',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500',
    danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-700',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  };
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
```

```typescript
// components/ui/Input.tsx
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'date' | 'datetime-local';
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
  disabled = false,
  icon,
}) => {
  const baseStyles = 'w-full px-4 py-2.5 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all';
  
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${baseStyles} ${icon ? 'pl-10' : ''} ${className}`}
      />
    </div>
  );
};
```

```typescript
// components/ui/Select.tsx
interface SelectProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  className = '',
}) => {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`px-4 py-2.5 bg-[#0f172a] border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
```

### Layout Components

```typescript
// components/layout/Header.tsx
interface HeaderProps {
  username: string;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ username, onLogout }) => {
  return (
    <header className="bg-[#1e293b] border-b border-slate-700/50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Todo App</h1>
          <p className="text-sm text-slate-400">Welcome, {username}</p>
        </div>
        <nav className="flex items-center gap-3">
          <Button variant="secondary" size="md">Data</Button>
          <Button variant="primary" size="md" className="bg-purple-600 hover:bg-purple-500">
            Calendar
          </Button>
          <Button variant="primary" size="md">
            📋 Templates
          </Button>
          <Button size="md" className="bg-yellow-500 hover:bg-yellow-400">
            🔔
          </Button>
          <Button variant="secondary" size="md" onClick={onLogout}>
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
};
```

```typescript
// components/layout/Container.tsx
interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`max-w-6xl mx-auto px-6 py-6 space-y-5 ${className}`}>
      {children}
    </div>
  );
};
```

```typescript
// components/ui/Card.tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '',
  hoverable = false 
}) => {
  const hoverStyles = hoverable 
    ? 'hover:border-slate-600/70 transition-all' 
    : '';
    
  return (
    <div className={`bg-[#1e293b] rounded-lg p-5 border border-slate-700/50 ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
};
```

### Advanced Filters Component

```typescript
// components/features/AdvancedFilters.tsx
interface AdvancedFiltersProps {
  isOpen: boolean;
  onToggle: () => void;
  completionStatus: string;
  onCompletionChange: (status: string) => void;
  dateFrom: string;
  onDateFromChange: (date: string) => void;
  dateTo: string;
  onDateToChange: (date: string) => void;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  isOpen,
  onToggle,
  completionStatus,
  onCompletionChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
}) => {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 transition-colors"
      >
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
        <span>Advanced</span>
      </button>
      
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-medium text-white mb-3">Advanced Filters</h3>
          
          <div className="space-y-3">
            {/* Completion Status */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Completion Status
              </label>
              <Select
                value={completionStatus}
                onChange={(e) => onCompletionChange(e.target.value)}
                options={[
                  { value: 'all', label: 'All Todos' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'incomplete', label: 'Incomplete' },
                ]}
              />
            </div>
            
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Due Date From
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  placeholder="dd/mm/yyyy"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Due Date To
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  placeholder="dd/mm/yyyy"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Todo Card Component

```typescript
// components/features/TodoCard.tsx
interface TodoCardProps {
  todo: Todo;
  isEditing: boolean;
  onToggleComplete: (id: number, completed: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: number) => void;
  onSaveEdit: (id: number, updates: Partial<Todo>) => void;
  onCancelEdit: () => void;
}

export const TodoCard: React.FC<TodoCardProps> = ({
  todo,
  isEditing,
  onToggleComplete,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
}) => {
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDueDate, setEditDueDate] = useState(todo.due_date || '');
  
  if (isEditing) {
    return (
      <Card className="space-y-3">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Task title"
        />
        <Input
          type="datetime-local"
          value={editDueDate}
          onChange={(e) => setEditDueDate(e.target.value)}
        />
        <div className="flex gap-2">
          <Button 
            variant="primary" 
            onClick={() => onSaveEdit(todo.id, { title: editTitle, due_date: editDueDate })}
            className="bg-green-600 hover:bg-green-500"
          >
            Save
          </Button>
          <Button variant="secondary" onClick={onCancelEdit}>
            Cancel
          </Button>
        </div>
      </Card>
    );
  }
  
  return (
    <Card hoverable className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={(e) => onToggleComplete(todo.id, e.target.checked)}
        className="mt-0.5 w-5 h-5 cursor-pointer accent-blue-600 rounded border-slate-600"
      />
      
      <div className="flex-1 min-w-0">
        <p className={`text-base ${todo.completed ? 'line-through text-slate-500' : 'text-white'}`}>
          {todo.title}
        </p>
        {todo.due_date && (
          <p className={`text-sm mt-1 ${
            isPastDue(todo.due_date) && !todo.completed
              ? 'text-red-400 font-medium'
              : 'text-slate-400'
          }`}>
            📅 {formatSingaporeDate(todo.due_date)}
          </p>
        )}
      </div>
      
      <div className="flex gap-2 flex-shrink-0">
        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => onEdit(todo)}
        >
          Edit
        </Button>
        <Button 
          variant="danger" 
          size="sm" 
          onClick={() => onDelete(todo.id)}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
};
```

## Edge Cases

### Visual Edge Cases

1. **Long Text Content**
   - **Issue:** Todo titles exceeding card width
   - **Solution:** Apply `truncate` or `line-clamp-2` with tooltip on hover
   - **Example:** "Buy groceries including milk, bread, eggs, cheese, and vegetables from the store" → truncates with "..."

2. **No Username Available**
   - **Issue:** User not logged in or username fetch fails
   - **Solution:** Display "Welcome, Guest" or "Welcome, User"
   - **Fallback:** `{username || 'abc'}` pattern

3. **Form Validation Feedback**
   - **Issue:** User submits empty form
   - **Solution:** Disable Add button when title is empty
   - **Visual:** Button shows `disabled:bg-slate-600 disabled:cursor-not-allowed`

4. **Loading States**
   - **Issue:** Data fetching in progress
   - **Solution:** Show loading spinner with dark background
   - **Pattern:** Full-screen overlay with centered spinner

5. **Empty State Variations**
   - **Issue:** Different empty contexts (no todos, no search results, filtered out)
   - **Solutions:**
     - No todos: "No todos yet. Add one above!"
     - No results: "No todos match your search"
     - All filtered: "No todos match selected filters"

6. **Hover States on Touch Devices**
   - **Issue:** Hover effects don't work on mobile
   - **Solution:** Use `@media (hover: hover)` for hover-specific styles
   - **Alternative:** Show buttons always on mobile, not on hover

7. **Color Contrast Accessibility**
   - **Issue:** Text may not meet WCAG AA standards
   - **Solution:** Ensure minimum 4.5:1 contrast ratio
   - **Test:** Use browser DevTools color picker

8. **Focus Trap in Modals**
   - **Issue:** Tab navigation escapes modal dialogs
   - **Solution:** Implement focus trap using `focus-trap-react`
   - **Pattern:** First and last focusable elements loop

## Acceptance Criteria

### Visual Design

- [ ] Background color is #0f172a (slate-950) across all pages
- [ ] Card backgrounds use #1e293b (slate-800)
- [ ] Input fields have #0f172a background with slate-600/50 borders
- [ ] All text uses white or slate shades (never pure gray)
- [ ] Border radius is consistent (lg = 0.75rem for cards, 0.5rem for inputs)

### Header Component

- [ ] Header shows "Todo App" title at 2xl size (text-2xl)
- [ ] Welcome message displays dynamic username
- [ ] All five navigation buttons are visible (Data, Calendar, Templates, Bell, Logout)
- [ ] Data button has slate-700 background
- [ ] Calendar button has purple-600 background
- [ ] Templates button has blue-600 background with icon
- [ ] Bell button has yellow-500 background
- [ ] Logout button has slate-700 background
- [ ] All buttons have hover states with darker shades

### Form Layout

- [ ] Main input row has 4 elements: title input, priority select, date picker, Add button
- [ ] Title input takes flexible width (flex-1)
- [ ] Priority dropdown shows Medium/High/Low options
- [ ] Date picker uses datetime-local type
- [ ] Add button is blue-600 with hover state
- [ ] Add button is disabled when title is empty
- [ ] Second row shows Repeat checkbox and Reminder dropdown
- [ ] Third row shows "Use Template:" label with full-width select
- [ ] All inputs have consistent 2.5rem height (py-2.5)

### Focus States

- [ ] All inputs show blue focus ring (ring-2 ring-blue-500/50)
- [ ] Focus ring has 50% opacity for subtlety
- [ ] Tab order follows logical sequence (title → priority → date → add)
- [ ] Checkboxes show focus ring on keyboard navigation
- [ ] Buttons show focus ring on keyboard interaction

### Search & Filter Section

- [ ] Search input has magnifying glass icon on left
- [ ] Search placeholder reads "Search todos and subtasks..."
- [ ] Priority filter shows "All Priorities" as default
- [ ] Advanced button shows blue background (blue-600)
- [ ] Advanced button has dropdown arrow (▼) that rotates when open
- [ ] Advanced section expands/collapses smoothly (200ms transition)

### Advanced Filters Expanded State

- [ ] Section shows "Advanced Filters" heading
- [ ] Completion Status dropdown displays with 3 options
- [ ] Two date pickers appear side by side (grid-cols-2)
- [ ] Date pickers have labels "Due Date From" and "Due Date To"
- [ ] Date inputs show "dd/mm/yyyy" placeholder
- [ ] All advanced filter inputs match main form styling
- [ ] Section has top border (border-slate-700/50) for separation

### Todo Cards

- [ ] Cards have slate-800 background (#1e293b)
- [ ] Cards have slate-700/50 border
- [ ] Hover increases border opacity to slate-600/70
- [ ] Checkbox is 5x5 (w-5 h-5) with blue accent
- [ ] Todo title is base size (text-base) in white
- [ ] Completed todos show strikethrough and slate-500 color
- [ ] Due date shows calendar emoji (📅) with formatted date
- [ ] Overdue dates show red-400 color
- [ ] Edit and Delete buttons are right-aligned
- [ ] Edit button is blue-600, Delete button is red-600

### Empty State

- [ ] Shows centered text "No todos yet. Add one above!"
- [ ] Text color is slate-400
- [ ] Text size is base (text-base)
- [ ] Adequate padding above and below (py-16)

### Responsive Behavior

- [ ] Form inputs stack vertically on mobile (< 768px)
- [ ] Navigation buttons wrap or collapse on small screens
- [ ] Todo cards remain full-width on all screen sizes
- [ ] Advanced filters date pickers stack on mobile
- [ ] Touch targets are minimum 44x44px on mobile

### Performance

- [ ] Page loads in under 2 seconds on 3G
- [ ] Transitions complete in 200-300ms
- [ ] No layout shift (CLS < 0.1)
- [ ] Images/icons are optimized and lazy-loaded
- [ ] CSS is purged of unused Tailwind classes

## Testing Requirements

### Visual Regression Tests (Playwright)

```typescript
// tests/visual/ui-design.spec.ts
import { test, expect } from '@playwright/test';

test.describe('UI Design System', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to todos page
    await page.goto('/login');
    await page.fill('input[type="text"]', 'testuser');
    await page.click('button[type="submit"]');
    await page.waitForURL('/todos');
  });

  test('should match header design', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toHaveScreenshot('header.png');
    
    // Check background color
    const bgColor = await header.evaluate((el) => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toBe('rgb(30, 41, 59)'); // #1e293b
  });

  test('should match form layout', async ({ page }) => {
    const form = page.locator('form').first();
    await expect(form).toHaveScreenshot('form-layout.png');
    
    // Check input count in main row
    const mainRow = form.locator('.flex').first();
    await expect(mainRow.locator('input, select, button')).toHaveCount(4);
  });

  test('should show proper focus states', async ({ page }) => {
    const titleInput = page.locator('input[placeholder*="Add a new todo"]');
    await titleInput.focus();
    
    // Check for focus ring
    const focusRing = await titleInput.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.boxShadow;
    });
    expect(focusRing).toContain('rgb(59, 130, 246)'); // Blue-500
  });

  test('should expand advanced filters', async ({ page }) => {
    const advancedButton = page.locator('button:has-text("Advanced")');
    
    // Check initial state
    await expect(page.locator('text=Advanced Filters')).not.toBeVisible();
    
    // Click to expand
    await advancedButton.click();
    await expect(page.locator('text=Advanced Filters')).toBeVisible();
    
    // Screenshot expanded state
    await expect(page.locator('.border-t').first()).toHaveScreenshot('advanced-filters.png');
  });

  test('should match todo card design', async ({ page }) => {
    // Create a todo first
    await page.fill('input[placeholder*="Add a new todo"]', 'Test Todo');
    await page.click('button:has-text("Add")');
    
    const todoCard = page.locator('[key]').first();
    await expect(todoCard).toHaveScreenshot('todo-card.png');
  });

  test('should show hover states', async ({ page }) => {
    // Create a todo
    await page.fill('input[placeholder*="Add a new todo"]', 'Hover Test');
    await page.click('button:has-text("Add")');
    
    const todoCard = page.locator('[key]').first();
    
    // Get border color before hover
    const borderBefore = await todoCard.evaluate((el) =>
      window.getComputedStyle(el).borderColor
    );
    
    // Hover and check border change
    await todoCard.hover();
    const borderAfter = await todoCard.evaluate((el) =>
      window.getComputedStyle(el).borderColor
    );
    
    expect(borderBefore).not.toBe(borderAfter);
  });
});
```

### Accessibility Tests

```typescript
// tests/accessibility/ui-a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('UI Accessibility', () => {
  test('should have no accessibility violations', async ({ page }) => {
    await page.goto('/todos');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/todos');
    
    // Tab through form
    await page.keyboard.press('Tab'); // Title input
    await expect(page.locator('input[placeholder*="Add a new todo"]')).toBeFocused();
    
    await page.keyboard.press('Tab'); // Priority select
    await expect(page.locator('select').first()).toBeFocused();
    
    await page.keyboard.press('Tab'); // Date picker
    await expect(page.locator('input[type="datetime-local"]')).toBeFocused();
    
    await page.keyboard.press('Tab'); // Add button
    await expect(page.locator('button:has-text("Add")')).toBeFocused();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/todos');
    
    // Check form labels
    const repeatCheckbox = page.locator('input[type="checkbox"]#repeat');
    const label = page.locator('label[for="repeat"]');
    await expect(label).toBeVisible();
    
    // Check search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toHaveAttribute('type', 'text');
  });

  test('should meet color contrast requirements', async ({ page }) => {
    await page.goto('/todos');
    
    // Test main heading contrast
    const heading = page.locator('h1:has-text("Todo App")');
    const contrast = await heading.evaluate((el) => {
      const color = window.getComputedStyle(el).color;
      const bgColor = window.getComputedStyle(el.parentElement!).backgroundColor;
      // Calculate contrast ratio (simplified)
      return { color, bgColor };
    });
    
    // White text on dark background should pass WCAG AA
    expect(contrast.color).toBe('rgb(255, 255, 255)');
  });
});
```

### Component Unit Tests

```typescript
// components/ui/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  test('renders with correct variant styles', () => {
    const { rerender } = render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
    
    rerender(<Button variant="secondary">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-slate-700');
    
    rerender(<Button variant="danger">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });

  test('applies correct size classes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');
    
    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2');
    
    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-2.5', 'text-base');
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('disables properly', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:bg-slate-600');
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
```

## Out of Scope

### Explicitly Excluded from This PRP

1. **Animation Libraries**
   - No Framer Motion or other animation libraries
   - Use Tailwind's built-in transitions only
   - Keep animations simple (fade, slide, scale)

2. **Component Variants Beyond Specified**
   - No additional button variants (info, link, etc.)
   - No additional input types (textarea, multi-select)
   - Stick to basic form elements shown in reference

3. **Theming System**
   - No light/dark mode toggle
   - Dark theme only as per design
   - No theme customization by user

4. **Advanced Interactions**
   - No drag-and-drop reordering
   - No keyboard shortcuts (beyond standard Tab/Enter)
   - No gesture controls

5. **Responsive Breakpoints**
   - Focus on desktop (1024px+) and mobile (< 768px)
   - No specific tablet optimizations
   - No landscape-specific layouts

6. **Browser Support**
   - Modern browsers only (Chrome, Firefox, Safari, Edge)
   - No IE11 support
   - No polyfills for older browsers

7. **CSS Frameworks**
   - Tailwind CSS only, no additional CSS frameworks
   - No Bootstrap, Material-UI, or other UI libraries
   - No CSS-in-JS solutions beyond Tailwind

8. **Design System Documentation**
   - No Storybook or component playground
   - No design tokens export for Figma
   - Documentation in code comments only

## Success Metrics

### Quantitative Metrics

1. **Page Load Performance**
   - Target: < 2 seconds First Contentful Paint (FCP)
   - Target: < 3 seconds Time to Interactive (TTI)
   - Target: Lighthouse Performance score > 90

2. **Accessibility Scores**
   - Target: Lighthouse Accessibility score 100
   - Target: 0 axe violations on all pages
   - Target: WCAG 2.1 AA compliance

3. **Code Quality**
   - Target: 0 ESLint errors
   - Target: < 10 ESLint warnings
   - Target: > 80% test coverage for UI components

4. **Visual Consistency**
   - Target: 0 visual regression failures in CI/CD
   - Target: 100% design token usage (no hardcoded colors)
   - Target: < 5 unique color values in production CSS

5. **User Interaction Metrics**
   - Target: < 100ms response time for button clicks
   - Target: 200-300ms for all transitions
   - Target: 60fps for all animations

### Qualitative Metrics

1. **Design Consistency**
   - All pages use consistent color palette
   - Spacing follows 4px/8px grid system
   - Typography hierarchy is clear and consistent

2. **User Feedback**
   - "The interface feels modern and professional"
   - "I can find what I need quickly"
   - "The dark theme is easy on my eyes"

3. **Developer Experience**
   - Components are easy to understand and modify
   - New developers can add features without breaking design
   - Design tokens make global changes simple

4. **Code Maintainability**
   - Component structure is logical and reusable
   - Styles are DRY (Don't Repeat Yourself)
   - Future designers can understand token system

### Monitoring and Validation

```typescript
// scripts/measure-ui-metrics.ts
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';

async function runLighthouse() {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = { logLevel: 'info', output: 'json', port: chrome.port };
  const runnerResult = await lighthouse('http://localhost:3000/todos', options);

  const { lhr } = runnerResult;
  console.log('Performance score:', lhr.categories.performance.score * 100);
  console.log('Accessibility score:', lhr.categories.accessibility.score * 100);
  console.log('FCP:', lhr.audits['first-contentful-paint'].displayValue);
  console.log('TTI:', lhr.audits['interactive'].displayValue);

  await chrome.kill();
}

runLighthouse();
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Set up design tokens and color system
- Create base UI components (Button, Input, Select, Card)
- Implement Header and Container layouts
- Establish focus state patterns

### Phase 2: Forms & Interactions (Week 2)
- Build todo creation form with proper layout
- Implement Advanced Filters component
- Add search functionality with icon
- Create hover states and transitions

### Phase 3: Todo Display (Week 3)
- Build TodoCard component
- Implement edit/delete interactions
- Add empty state UI
- Create loading states

### Phase 4: Polish & Testing (Week 4)
- Visual regression testing
- Accessibility audit and fixes
- Performance optimization
- Documentation and cleanup

## References

- **Design Reference:** todo_page.png (attached)
- **Color Palette:** Tailwind CSS Slate colors
- **Typography:** System fonts (Inter, SF Pro, Segoe UI)
- **Icons:** Unicode emojis for simplicity
- **Accessibility:** WCAG 2.1 Level AA standards
