/**
 * @file The in-game clock.
 *
 * Time is measured in minutes since midnight at the start of the first day
 * of the journey (for the winter journey: 24 December, 00:00). Timetables
 * are written as readable strings such as "24 15:00" or "25 07:30".
 */

/** Minutes in a day. */
export const DAY = 24 * 60;

/**
 * Parses a timetable entry "DD HH:MM" into minutes since the first day.
 * @param {string} text   e.g. "24 15:00"
 * @param {number} firstDay  day of month of the first day (e.g. 24)
 * @returns {number}
 */
export function parseTime(text, firstDay) {
  const m = /^(\d{1,2})\s+(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) throw new Error(`Invalid time "${text}" (expected "DD HH:MM")`);
  const [, day, hours, minutes] = m.map(Number);
  return (day - firstDay) * DAY + hours * 60 + minutes;
}

/**
 * Splits a time into its parts.
 * @param {number} minutes   since the first day
 * @param {number} firstDay
 * @returns {{day: number, hours: number, minutes: number}}
 */
export function timeParts(minutes, firstDay) {
  const whole = Math.floor(minutes);
  return {
    day: firstDay + Math.floor(whole / DAY),
    hours: Math.floor((whole % DAY) / 60),
    minutes: whole % 60,
  };
}

/**
 * "15:07"
 * @param {number} minutes
 * @returns {string}
 */
export function formatHourMinute(minutes) {
  const whole = Math.floor(minutes);
  const h = Math.floor((whole % DAY) / 60);
  const m = whole % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
