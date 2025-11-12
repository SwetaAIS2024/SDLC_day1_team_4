# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All endpoints require a valid session cookie. In development mode, a session is auto-created with user "dev-user".

## Endpoints

### 1. Get All Todos
```http
GET /api/todos
```

**Response: 200 OK**
```json
[
  {
    "id": 1,
    "title": "Review Q4 budget report",
    "completed": false,
    "due_date": "2025-11-15T14:30:00+08:00",
    "created_at": "2025-11-12T10:00:00+08:00",
    "updated_at": "2025-11-12T10:00:00+08:00"
  },
  {
    "id": 2,
    "title": "Call dentist",
    "completed": true,
    "due_date": null,
    "created_at": "2025-11-12T09:00:00+08:00",
    "updated_at": "2025-11-12T09:30:00+08:00"
  }
]
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated (auto-handled in dev)
- `500 Internal Server Error` - Database error

---

### 2. Create Todo
```http
POST /api/todos
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Review Q4 budget report",
  "due_date": "2025-11-15T14:30:00+08:00"  // Optional
}
```

**Response: 201 Created**
```json
{
  "id": 1,
  "title": "Review Q4 budget report",
  "completed": false,
  "due_date": "2025-11-15T14:30:00+08:00",
  "created_at": "2025-11-12T10:00:00+08:00",
  "updated_at": "2025-11-12T10:00:00+08:00"
}
```

**Validation Rules:**
- `title` is required
- `title` must be 1-500 characters after trimming
- `due_date` must be valid ISO 8601 format (optional)

**Error Responses:**
- `400 Bad Request` - Invalid input
  ```json
  { "error": "Title is required" }
  { "error": "Title must be 500 characters or less" }
  ```
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Database error

---

### 3. Update Todo
```http
PUT /api/todos/:id
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "title": "Review Q4 budget report (URGENT)",
  "completed": true,
  "due_date": "2025-11-16T14:30:00+08:00"
}
```

**Remove due date:**
```json
{
  "due_date": null
}
```

**Response: 200 OK**
```json
{
  "id": 1,
  "title": "Review Q4 budget report (URGENT)",
  "completed": true,
  "due_date": "2025-11-16T14:30:00+08:00",
  "created_at": "2025-11-12T10:00:00+08:00",
  "updated_at": "2025-11-12T11:30:00+08:00"
}
```

**Validation Rules:**
- `title` must be 1-500 characters if provided
- `completed` must be boolean if provided
- `due_date` must be valid ISO 8601 format or null if provided

**Error Responses:**
- `400 Bad Request` - Invalid input or invalid ID
  ```json
  { "error": "Invalid todo ID" }
  { "error": "Title cannot be empty" }
  ```
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Todo doesn't exist or doesn't belong to user
  ```json
  { "error": "Todo not found" }
  ```
- `500 Internal Server Error` - Database error

---

### 4. Delete Todo
```http
DELETE /api/todos/:id
```

**Response: 204 No Content**
```
(empty body)
```

**Error Responses:**
- `400 Bad Request` - Invalid ID
  ```json
  { "error": "Invalid todo ID" }
  ```
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Todo doesn't exist or doesn't belong to user
  ```json
  { "error": "Todo not found" }
  ```
- `500 Internal Server Error` - Database error

---

## Data Models

### Todo
```typescript
interface Todo {
  id: number;
  title: string;
  completed: boolean;
  due_date: string | null;  // ISO 8601 format with Singapore timezone
  created_at: string;        // ISO 8601 format with Singapore timezone
  updated_at: string;        // ISO 8601 format with Singapore timezone
}
```

### CreateTodoInput
```typescript
interface CreateTodoInput {
  title: string;           // Required, 1-500 characters
  due_date?: string | null; // Optional ISO 8601 format
}
```

### UpdateTodoInput
```typescript
interface UpdateTodoInput {
  title?: string;          // Optional, 1-500 characters
  completed?: boolean;     // Optional
  due_date?: string | null; // Optional, null to remove
}
```

## Date Format

All dates use **Singapore timezone** (Asia/Singapore) in ISO 8601 format:
```
2025-11-15T14:30:00+08:00
```

**Display Format:**
```
Nov 15, 2025, 2:30 PM SGT
```

## Testing with cURL

### Get all todos
```bash
curl http://localhost:3000/api/todos
```

### Create a todo
```bash
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Test todo", "due_date": "2025-11-15T14:30:00+08:00"}'
```

### Update a todo
```bash
curl -X PUT http://localhost:3000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

### Delete a todo
```bash
curl -X DELETE http://localhost:3000/api/todos/1
```

## Testing with JavaScript

### Fetch API
```javascript
// Get all todos
const todos = await fetch('/api/todos').then(r => r.json());

// Create todo
const newTodo = await fetch('/api/todos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'New todo',
    due_date: '2025-11-15T14:30:00+08:00'
  })
}).then(r => r.json());

// Update todo
const updated = await fetch('/api/todos/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ completed: true })
}).then(r => r.json());

// Delete todo
await fetch('/api/todos/1', { method: 'DELETE' });
```

## Rate Limiting

Currently **no rate limiting** is implemented. For production:
- Add rate limiting middleware
- Implement per-user quotas
- Add DDoS protection

## CORS

Currently **CORS is not configured**. All requests must be same-origin. For production API:
- Configure CORS headers if needed
- Set allowed origins
- Configure allowed methods

## Error Handling

All errors follow this format:
```json
{
  "error": "Human-readable error message"
}
```

Common HTTP status codes:
- `200 OK` - Successful GET/PUT
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

**API Version**: 1.0  
**Last Updated**: November 12, 2025  
**Base Implementation**: PRP-01 (Todo CRUD Operations)
