#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { DateTime } from 'luxon';

const db = new Database('todos.db');

interface Holiday {
  name: string;
  date: string; // YYYY-MM-DD
  year: number;
  is_recurring: number; // 0 or 1
}

// Singapore Public Holidays 2024-2026
const holidays: Holiday[] = [
  // 2024
  { name: "New Year's Day", date: '2024-01-01', year: 2024, is_recurring: 1 },
  { name: 'Chinese New Year', date: '2024-02-10', year: 2024, is_recurring: 0 },
  { name: 'Chinese New Year', date: '2024-02-11', year: 2024, is_recurring: 0 },
  { name: 'Chinese New Year (in lieu)', date: '2024-02-12', year: 2024, is_recurring: 0 },
  { name: 'Good Friday', date: '2024-03-29', year: 2024, is_recurring: 0 },
  { name: 'Hari Raya Puasa', date: '2024-04-10', year: 2024, is_recurring: 0 },
  { name: 'Labour Day', date: '2024-05-01', year: 2024, is_recurring: 1 },
  { name: 'Vesak Day', date: '2024-05-22', year: 2024, is_recurring: 0 },
  { name: 'Hari Raya Haji', date: '2024-06-17', year: 2024, is_recurring: 0 },
  { name: 'National Day', date: '2024-08-09', year: 2024, is_recurring: 1 },
  { name: 'Deepavali', date: '2024-11-01', year: 2024, is_recurring: 0 },
  { name: 'Christmas Day', date: '2024-12-25', year: 2024, is_recurring: 1 },

  // 2025
  { name: "New Year's Day", date: '2025-01-01', year: 2025, is_recurring: 1 },
  { name: 'Chinese New Year', date: '2025-01-29', year: 2025, is_recurring: 0 },
  { name: 'Chinese New Year', date: '2025-01-30', year: 2025, is_recurring: 0 },
  { name: 'Good Friday', date: '2025-04-18', year: 2025, is_recurring: 0 },
  { name: 'Hari Raya Puasa', date: '2025-03-31', year: 2025, is_recurring: 0 },
  { name: 'Labour Day', date: '2025-05-01', year: 2025, is_recurring: 1 },
  { name: 'Vesak Day', date: '2025-05-12', year: 2025, is_recurring: 0 },
  { name: 'Hari Raya Haji', date: '2025-06-07', year: 2025, is_recurring: 0 },
  { name: 'National Day', date: '2025-08-09', year: 2025, is_recurring: 1 },
  { name: 'Deepavali', date: '2025-10-20', year: 2025, is_recurring: 0 },
  { name: 'Christmas Day', date: '2025-12-25', year: 2025, is_recurring: 1 },

  // 2026
  { name: "New Year's Day", date: '2026-01-01', year: 2026, is_recurring: 1 },
  { name: 'Chinese New Year', date: '2026-02-17', year: 2026, is_recurring: 0 },
  { name: 'Chinese New Year', date: '2026-02-18', year: 2026, is_recurring: 0 },
  { name: 'Good Friday', date: '2026-04-03', year: 2026, is_recurring: 0 },
  { name: 'Hari Raya Puasa', date: '2026-03-20', year: 2026, is_recurring: 0 },
  { name: 'Labour Day', date: '2026-05-01', year: 2026, is_recurring: 1 },
  { name: 'Vesak Day', date: '2026-05-01', year: 2026, is_recurring: 0 },
  { name: 'Hari Raya Haji', date: '2026-05-27', year: 2026, is_recurring: 0 },
  { name: 'National Day', date: '2026-08-09', year: 2026, is_recurring: 1 },
  { name: 'Deepavali', date: '2026-11-08', year: 2026, is_recurring: 0 },
  { name: 'Christmas Day', date: '2026-12-25', year: 2026, is_recurring: 1 },
];

// Clear existing holidays
console.log('🗑️  Clearing existing holidays...');
db.prepare('DELETE FROM holidays').run();

// Insert holidays
console.log('📅 Seeding Singapore public holidays...');
const stmt = db.prepare(`
  INSERT INTO holidays (name, date, year, is_recurring)
  VALUES (?, ?, ?, ?)
`);

let count = 0;
for (const holiday of holidays) {
  stmt.run(holiday.name, holiday.date, holiday.year, holiday.is_recurring);
  count++;
}

console.log(`✅ Seeded ${count} holidays for years 2024-2026`);

// Display summary
const summary = db.prepare(`
  SELECT year, COUNT(*) as count 
  FROM holidays 
  GROUP BY year 
  ORDER BY year
`).all();

console.log('\n📊 Summary:');
summary.forEach((row: any) => {
  console.log(`  ${row.year}: ${row.count} holidays`);
});

db.close();
