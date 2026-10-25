export type Reminder = { id: string; done?: boolean; notified?: boolean; reminder_at?: string | null };

export function reminderKey(todo: Reminder): string {
  return `${todo.id}:${todo.reminder_at ?? ""}`;
}

export function isReminderDue(todo: Reminder, now: number, delivered: ReadonlySet<string>): boolean {
  if (todo.done || todo.notified || !todo.reminder_at || delivered.has(reminderKey(todo))) return false;
  const due = Date.parse(todo.reminder_at);
  return Number.isFinite(due) && due <= now;
}