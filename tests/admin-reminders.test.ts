import { describe, expect, it } from "vitest";
import { isReminderDue, reminderKey } from "../src/lib/admin-reminders";

describe("scheduled admin reminders", () => {
  const todo = { id: "delivery", reminder_at: "2026-10-25T02:00:00Z" };
  it("alerts at the scheduled time, never before", () => {
    expect(isReminderDue(todo, Date.parse("2026-10-25T01:59:59Z"), new Set())).toBe(false);
    expect(isReminderDue(todo, Date.parse("2026-10-25T02:00:00Z"), new Set())).toBe(true);
  });
  it("does not alert for completed or already delivered reminders", () => {
    const now = Date.parse("2026-10-25T03:00:00Z");
    expect(isReminderDue({ ...todo, done: true }, now, new Set())).toBe(false);
    expect(isReminderDue({ ...todo, notified: true }, now, new Set())).toBe(false);
    expect(isReminderDue(todo, now, new Set([reminderKey(todo)]))).toBe(false);
  });
  it("allows a rescheduled reminder to alert again", () => {
    expect(isReminderDue({ ...todo, reminder_at: "2026-10-25T03:00:00Z" }, Date.parse("2026-10-25T03:00:00Z"), new Set([reminderKey(todo)]))).toBe(true);
  });
});