export const getDefaultDate = (): Date => {
  const now = new Date();

  // Use Eastern Time - NBA's official timezone
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));

  // Switch to "today" when evening games typically start (6 PM ET)
  const cutoffHour = 18;

  if (easternTime.getHours() < cutoffHour) {
    // Before 6 PM ET: show yesterday's completed games
    const yesterday = new Date(easternTime);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  // After 6 PM ET: show today's games (underway or starting soon)
  return easternTime;
};

export const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Parse a DD/MM/YYYY string into a Date (midnight local time), or null if invalid
const parseDMY = (value: string): Date | null => {
  const parts = value.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
};

export const isPlayoffDate = (date: Date): boolean => {
  const startStr = import.meta.env.VITE_PLAYOFF_START;
  const endStr = import.meta.env.VITE_PLAYOFF_END;
  if (!startStr || !endStr) return false;

  const start = parseDMY(startStr);
  const end = parseDMY(endStr);
  if (!start || !end) return false;

  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return d >= start && d <= end;
};