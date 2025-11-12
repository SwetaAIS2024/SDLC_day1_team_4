/**
 * Singapore Timezone Utilities
 * All date/time operations MUST use Asia/Singapore timezone
 * Per copilot-instructions.md Pattern #3
 */

/**
 * Get current date/time in Singapore timezone
 * CRITICAL: ALWAYS use this instead of new Date() for consistency
 * Mandated by copilot-instructions.md pattern #3
 */
export function getSingaporeNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
}

/**
 * Format date for Singapore timezone display
 */
export function formatSingaporeDate(
  date: Date | string,
  format: 'date' | 'datetime' | 'time' = 'date'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Singapore',
    ...(format === 'date' && { year: 'numeric', month: 'short', day: 'numeric' }),
    ...(format === 'datetime' && {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    ...(format === 'time' && { hour: '2-digit', minute: '2-digit' }),
  };

  return d.toLocaleString('en-US', options);
}

/**
 * Parse date string to Singapore timezone Date object
 */
export function parseSingaporeDate(dateString: string): Date {
  return new Date(new Date(dateString).toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
}

/**
 * Validate YYYY-MM-DD date format
 */
export function isValidDateFormat(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
