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