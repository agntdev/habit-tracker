export interface User {
  userId: number;
  timezone: string;
  createdAt: number;
}

export interface Habit {
  habitId: string;
  userId: number;
  name: string;
  frequency: "daily" | "weekdays" | "times-per-week";
  weekdays?: number[];
  timesPerWeek?: number;
  scheduledTime: string;
  timezone: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Checkin {
  userId: number;
  habitId: string;
  date: string;
  status: "done" | "skipped";
  timestamp: number;
}

export interface Streak {
  userId: number;
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastUpdated: number;
}
