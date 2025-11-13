# Subtasks & Progress Tracking - Quick Start Guide

## 🎯 Feature Overview
Break down complex todos into manageable subtasks with visual progress tracking.

## 🚀 How to Use

### 1. Create a Todo
```
1. Fill in todo title
2. Set due date (required)
3. Click "Add" button
```

### 2. Add Subtasks
```
1. Click "▶ Subtasks" button on any todo
2. Type subtask name in input field
3. Press Enter OR click "Add" button
4. Repeat for more subtasks
```

### 3. Track Progress
- Progress automatically calculated as you complete subtasks
- Shows: "X/Y subtasks" and "Z%" completion
- Visual progress bar updates in real-time
- Blue bar fills from 0% to 100%

### 4. Complete Subtasks
```
1. Click checkbox next to subtask
2. Subtask text gets strike-through
3. Progress bar updates immediately
4. Percentage recalculated
```

### 5. Delete Subtasks
```
1. Hover over any subtask
2. Click the "✕" button that appears
3. Subtask removed instantly
4. Progress recalculated
```

### 6. Collapse/Expand
```
- Click "▼ Subtasks" to hide subtask list
- Progress bar still visible when collapsed
- Click "▶ Subtasks" to show list again
```

## 📊 Progress Calculation

| Subtasks | Progress |
|----------|----------|
| 0/5 completed | 0% |
| 1/5 completed | 20% |
| 3/5 completed | 60% |
| 5/5 completed | 100% |

## ⌨️ Keyboard Shortcuts

- **Enter** - Add subtask from input field
- **Click checkbox** - Toggle subtask completion
- **Hover + ✕** - Delete subtask

## 💡 Pro Tips

1. **Break Down Complex Tasks**
   - Todo: "Launch Website"
   - Subtasks:
     - Design homepage
     - Write content
     - Test on mobile
     - Deploy to production
     - Announce on social media

2. **Track Meeting Agendas**
   - Todo: "Team Standup"
   - Subtasks:
     - Review yesterday's progress
     - Share today's plan
     - Identify blockers
     - Schedule follow-ups

3. **Shopping Lists**
   - Todo: "Weekly Groceries"
   - Subtasks:
     - Milk
     - Eggs
     - Bread
     - Vegetables

4. **Project Milestones**
   - Todo: "Q4 Report"
   - Subtasks:
     - Collect data
     - Create charts
     - Write summary
     - Review with team
     - Submit to management

## ⚠️ Important Notes

- **Subtasks inherit todo settings**: Due date, priority from parent todo
- **CASCADE delete**: Deleting a todo deletes ALL its subtasks
- **Max 200 characters** per subtask title
- **Progress always visible** when subtasks exist (even when collapsed)
- **Real-time updates**: No need to refresh page

## 🐛 Troubleshooting

### Subtasks button not appearing?
- Make sure you created a todo first
- Button is always visible on all todos

### Progress not updating?
- Check network connection
- Refresh the page
- Check browser console for errors

### Can't add empty subtask?
- This is intentional - subtasks must have a title
- The "Add" button is disabled when input is empty

### Subtask deleted but still showing?
- Refresh the page
- Check if error message appeared
- Verify you're online

## 🎨 Visual Indicators

### Progress Bar Colors
- **Gray background** - Incomplete portion
- **Blue fill** - Completed portion
- **Smooth animation** - Updates with transition effect

### Subtask States
- **Normal text** - Incomplete (slate-300)
- **Strike-through** - Completed (slate-500)
- **Hidden ✕** - Appears on hover (red)

### Button States
- **▶ Subtasks** - Collapsed (purple)
- **▼ Subtasks** - Expanded (purple)
- **Add button** - Green (enabled) / Gray (disabled)

## 📱 Responsive Design

- Works on desktop and mobile
- Progress bar scales to screen width
- Touch-friendly buttons and checkboxes
- Optimized for small screens

## 🔄 Integration with Other Features

### Works With:
✅ Priority levels (high/medium/low)
✅ Recurring todos
✅ Reminders & notifications
✅ Tags
✅ Search & filtering
✅ Export/import (if implemented)

### Limitations:
❌ No nested subtasks (single level only)
❌ No subtask reordering (yet)
❌ No subtask due dates (inherit from parent)
❌ No individual subtask priorities

## 🎯 Success Metrics

A well-used subtasks feature should show:
- 60%+ of todos have at least 1 subtask
- Average 3-5 subtasks per todo
- 70%+ of subtasks completed within parent todo completion
- Regular use of expand/collapse functionality

## 📈 Best Practices

1. **Keep subtasks atomic** - Each subtask should be a single action
2. **Order matters** - Add subtasks in logical sequence
3. **Be specific** - "Write introduction" vs "Write"
4. **Review regularly** - Check progress and adjust
5. **Celebrate completion** - Watch that progress bar hit 100%!

---

**Need Help?** Check the full USER_GUIDE.md for more details.
