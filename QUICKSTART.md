# Todo App - Quick Start Guide

## 🎯 What You Have

A fully functional **Todo CRUD Application** built with:
- Next.js 16 (App Router)
- TypeScript
- SQLite (better-sqlite3)
- React 19
- Tailwind CSS 4
- Singapore Timezone Support

## ⚡ Quick Start

### Option 1: Using the Start Script
```bash
./start.sh
```

### Option 2: Manual Start
```bash
npm install
npm run dev
```

Then open **http://localhost:3000** in your browser.

## 📋 What You Can Do

### ✅ Create Todos
1. Type a title in the input field
2. Optionally set a due date
3. Click "Add" or press Enter

### ✅ Edit Todos
1. Click the "Edit" button on any todo
2. Modify the title or due date
3. Click "Save" (or "Cancel" to discard)

### ✅ Complete Todos
- Click the checkbox next to any todo
- Completed todos show with strikethrough text

### ✅ Delete Todos
1. Click the "Delete" button
2. Confirm in the dialog
3. Todo is permanently removed

## 🗂️ Project Structure

```
app/
├── api/todos/          # REST API endpoints
├── page.tsx            # Main UI
└── layout.tsx          # Root layout

lib/
├── db.ts              # Database & CRUD operations
├── timezone.ts        # Singapore timezone utilities
└── auth.ts            # Session management

PRPs/
└── 01-todo-crud-operations.md  # Full requirements (2100+ lines)
```

## 📊 Database

- **Type**: SQLite
- **Location**: `todos.db` (created automatically)
- **Tables**: users, todos
- **Operations**: Synchronous (no async/await needed)

## 🔧 Development

### Build for Production
```bash
npm run build
npm start
```

### Check for Errors
```bash
npm run lint
```

### Project Commands
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## 🌏 Singapore Timezone

All dates are in **Singapore timezone (Asia/Singapore)**.

**Important**: Always use the timezone utilities:
```typescript
import { getSingaporeNow, formatSingaporeDate } from '@/lib/timezone';

const now = getSingaporeNow();
const display = formatSingaporeDate(date); // "Nov 15, 2025, 2:30 PM SGT"
```

## 🔒 Authentication (Dev Mode)

Currently uses a **development stub** that:
- Auto-creates a "dev-user" on first access
- Uses JWT session cookies (7-day expiry)
- **For production**: Implement WebAuthn (see PRP-11)

## 🎨 Features Implemented

✅ **Core CRUD**
- Create, read, update, delete todos
- Optimistic UI updates
- Error handling with rollback

✅ **User Experience**
- Responsive design
- Loading states
- Confirmation dialogs
- Error messages
- Overdue indicators (red text)
- Completion indicators (strikethrough)

✅ **Data Management**
- Input validation (title length, required fields)
- Singapore timezone for all dates
- Sorted by newest first
- Auto-saves changes

## 📚 Documentation

- **IMPLEMENTATION.md** - Detailed technical documentation
- **PRPs/01-todo-crud-operations.md** - Complete requirements (2100+ lines)
- **USER_GUIDE.md** - Comprehensive user documentation
- **.github/copilot-instructions.md** - AI agent instructions

## 🚀 Next Steps

To add more features, implement these PRPs in order:

1. **Priority System** (PRP-02)
2. **Recurring Todos** (PRP-03)
3. **Reminders & Notifications** (PRP-04)
4. **Subtasks** (PRP-05)
5. **Tags** (PRP-06)
6. **Templates** (PRP-07)
7. **Search & Filtering** (PRP-08)
8. **Export & Import** (PRP-09)
9. **Calendar View** (PRP-10)
10. **WebAuthn Authentication** (PRP-11)

## 💡 Tips

### Adding New Features
1. Read the PRP file for the feature
2. Update `lib/db.ts` with new tables/operations
3. Create API routes in `app/api/`
4. Update UI in `app/page.tsx`
5. Use Singapore timezone utilities

### Common Issues

**Port already in use?**
```bash
# Kill process on port 3000
npx kill-port 3000
```

**Database locked?**
```bash
# Remove database and restart
rm todos.db
npm run dev
```

**CSS not applying?**
```bash
# Rebuild Tailwind
npm run build
```

## 🎉 You're Ready!

Start the development server and begin building your todo list:

```bash
./start.sh
```

---

**Questions?** Check the documentation files or the PRP for detailed information.
