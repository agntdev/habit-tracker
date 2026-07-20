let clockOverride: (() => Date) | null = null;

export function now(): Date {
  return clockOverride ? clockOverride() : new Date();
}

export function setClock(fn: () => Date): void {
  clockOverride = fn;
}

export function resetClock(): void {
  clockOverride = null;
}

export function todayKey(tz?: string): string {
  const d = now();
  if (tz) {
    try {
      return d.toLocaleDateString("en-CA", { timeZone: tz });
    } catch {
      // fallback to UTC
    }
  }
  return d.toISOString().slice(0, 10);
}

export function formatTime(date: Date, tz?: string): string {
  if (tz) {
    try {
      return date.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
    } catch {
      // fallback
    }
  }
  return date.toISOString().slice(11, 16);
}
