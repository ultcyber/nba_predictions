export const getDefaultDate = (): Date => {
  const now = new Date();
  
  const pacificTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
  
  const cutoffHour = 15; // 3 PM in 24-hour format
  
  if (pacificTime.getHours() < cutoffHour) {
    const yesterday = new Date(pacificTime);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  
  return pacificTime;
};

export const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};