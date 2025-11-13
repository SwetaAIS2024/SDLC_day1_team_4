# Todo App - Next.js 16

This is a Next.js todo application with WebAuthn authentication and Singapore timezone support.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- ✅ Todo CRUD operations (Create, Read, Update, Delete)
- ✅ Singapore timezone handling
- ✅ Optimistic UI updates
- ✅ Client and server-side validation
- ✅ SQLite database with better-sqlite3
- ✅ WebAuthn authentication (passwordless)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19, Tailwind CSS 4
- **Backend**: Next.js API routes
- **Database**: SQLite via better-sqlite3
- **Timezone**: Singapore (Asia/Singapore)

## Project Structure

```
.
├── app/
│   ├── api/
│   │   └── todos/
│   │       ├── route.ts              # GET /api/todos, POST /api/todos
│   │       └── [id]/
│   │           └── route.ts          # GET/PUT/DELETE /api/todos/:id
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Main todo page
│   └── globals.css                   # Global styles
├── lib/
│   ├── db.ts                         # Database operations
│   ├── auth.ts                       # Session management
│   └── timezone.ts                   # Singapore timezone utilities
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.ts
```

## Database Schema

The `todos` table:

```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL CHECK(length(title) >= 1 AND length(title) <= 500),
  completed BOOLEAN NOT NULL DEFAULT 0,
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## API Endpoints

### POST /api/todos
Create a new todo
- Body: `{ title: string, due_date?: string }`
- Returns: Created todo object

### GET /api/todos
Get all todos for the authenticated user
- Returns: Array of todo objects

### GET /api/todos/:id
Get a single todo by ID
- Returns: Todo object

### PUT /api/todos/:id
Update a todo
- Body: `{ title?: string, completed?: boolean, due_date?: string }`
- Returns: Updated todo object

### DELETE /api/todos/:id
Delete a todo
- Returns: Success message

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Notes

- All dates are stored and displayed in Singapore timezone (Asia/Singapore)
- The database file (`todos.db`) is created automatically on first run
- Session management is simplified for development (uses cookies, not JWT)
- WebAuthn/Passkeys authentication can be added later
