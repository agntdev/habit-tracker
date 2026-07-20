import type { StorageAdapter } from "grammy";
import { MemorySessionStorage } from "./toolkit/session/memory.js";
import { RedisSessionStorage, type RedisLike } from "./toolkit/session/redis.js";
import { createRequire } from "node:module";
import type { User, Habit, Checkin, Streak } from "./types.js";

let sharedRedisClient: RedisLike | undefined;

function getRedisClient(): RedisLike {
  if (sharedRedisClient) return sharedRedisClient;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL not set");
  const req = createRequire(import.meta.url);
  const ioredis: any = req("ioredis");
  const Redis = ioredis.default ?? ioredis.Redis ?? ioredis;
  const client = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: false });
  sharedRedisClient = client as RedisLike;
  return sharedRedisClient;
}

function makeAdapter<T>(prefix: string): StorageAdapter<T> {
  if (process.env.REDIS_URL) {
    return new RedisSessionStorage<T>(getRedisClient(), prefix);
  }
  return new MemorySessionStorage<T>();
}

export interface Storage {
  getUser(userId: number): Promise<User | undefined>;
  saveUser(user: User): Promise<void>;
  getHabit(habitId: string): Promise<Habit | undefined>;
  saveHabit(habit: Habit): Promise<void>;
  deleteHabit(habitId: string): Promise<void>;
  getUserHabits(userId: number): Promise<Habit[]>;
  getCheckin(userId: number, habitId: string, date: string): Promise<Checkin | undefined>;
  saveCheckin(checkin: Checkin): Promise<void>;
  getStreak(userId: number, habitId: string): Promise<Streak | undefined>;
  saveStreak(streak: Streak): Promise<void>;
}

let _current: Storage | null = null;

export function setCurrentStorage(s: Storage): void {
  _current = s;
}

export function getStorage(): Storage {
  if (!_current) throw new Error("Storage not initialized");
  return _current;
}

export function createStorage(): Storage {
  const userAd = makeAdapter<User>("u:");
  const habitAd = makeAdapter<Habit>("h:");
  const userHabitsAd = makeAdapter<string[]>("uh:");
  const checkinAd = makeAdapter<Checkin>("ci:");
  const streakAd = makeAdapter<Streak>("st:");

  const storage: Storage = {
    async getUser(userId) {
      return userAd.read(String(userId));
    },
    async saveUser(user) {
      await userAd.write(String(user.userId), user);
    },
    async getHabit(habitId) {
      return habitAd.read(habitId);
    },
    async saveHabit(habit) {
      await habitAd.write(habit.habitId, habit);
      const existing = (await userHabitsAd.read(String(habit.userId))) ?? [];
      if (!existing.includes(habit.habitId)) {
        existing.push(habit.habitId);
        await userHabitsAd.write(String(habit.userId), existing);
      }
    },
    async deleteHabit(habitId) {
      const habit = await habitAd.read(habitId);
      if (!habit) return;
      await habitAd.delete(habitId);
      const existing = (await userHabitsAd.read(String(habit.userId))) ?? [];
      const idx = existing.indexOf(habitId);
      if (idx >= 0) {
        existing.splice(idx, 1);
        await userHabitsAd.write(String(habit.userId), existing);
      }
    },
    async getUserHabits(userId) {
      const ids = (await userHabitsAd.read(String(userId))) ?? [];
      const habits: Habit[] = [];
      for (const id of ids) {
        const h = await habitAd.read(id);
        if (h) habits.push(h);
      }
      return habits;
    },
    async getCheckin(userId, habitId, date) {
      return checkinAd.read(`${userId}:${habitId}:${date}`);
    },
    async saveCheckin(checkin) {
      await checkinAd.write(
        `${checkin.userId}:${checkin.habitId}:${checkin.date}`,
        checkin,
      );
    },
    async getStreak(userId, habitId) {
      return streakAd.read(`${userId}:${habitId}`);
    },
    async saveStreak(streak) {
      await streakAd.write(`${streak.userId}:${streak.habitId}`, streak);
    },
  };

  return storage;
}
