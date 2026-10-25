import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { FiBell } from "react-icons/fi";
import { COL, fsUpdate, fsWatch } from "@/lib/db/firestore";
import type { AdminTodo } from "@/components/admin/notes-manager";
import { useAuth } from "@/lib/auth/auth-context";
import { isReminderDue, reminderKey } from "@/lib/admin-reminders";

/** Short two-tone chime generated with WebAudio — no sound file needed. */
function playReminderSound(ctx: AudioContext | null) {
  try {
    if (!ctx) return;
    void ctx.resume().catch(() => undefined);
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.05);
    };
    // Three rising tones, repeated once so it is hard to miss.
    playTone(660, 0, 0.25);
    playTone(880, 0.25, 0.25);
    playTone(1100, 0.5, 0.35);
    playTone(660, 1.1, 0.25);
    playTone(880, 1.35, 0.25);
    playTone(1100, 1.6, 0.4);
  } catch {
    // Audio blocked until the user interacts with the page — the toast still shows.
  }
}

/**
 * Watches admin todos and fires a sound + on-screen alert when a reminder
 * becomes due. Mounted once in the admin layout, so it works on every admin
 * screen no matter which panel is open.
 */
export function ReminderWatcher() {
  const { isStaff, user } = useAuth();
  const todosRef = useRef<AdminTodo[]>([]);
  const firingRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isStaff || !user) return;
    const unlockAudio = () => {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      audioRef.current ??= new Ctx();
      void audioRef.current.resume().catch(() => undefined);
    };
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    const off = fsWatch<AdminTodo>(COL.adminTodos, (rows) => {
      todosRef.current = rows;
    }, () => {
      toast.error("Reminders could not be loaded. Please refresh to reconnect.");
    });
    return () => {
      off();
      todosRef.current = [];
      firingRef.current.clear();
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      void audioRef.current?.close().catch(() => undefined);
      audioRef.current = null;
    };
  }, [isStaff, user?.uid]);

  useEffect(() => {
    if (!isStaff || !user) return;
    const check = () => {
      const now = Date.now();
      for (const t of todosRef.current) {
        if (!isReminderDue(t, now, firingRef.current) || !t.reminder_at) continue;
        firingRef.current.add(reminderKey(t));
        playReminderSound(audioRef.current);
        toast(`Reminder: ${t.title}`, {
          icon: <FiBell />,
          duration: 30_000,
          description: `Scheduled for ${new Date(t.reminder_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`,
        });
        // Mark as notified so it fires once, not on every check.
        fsUpdate(COL.adminTodos, t.id, { notified: true }).catch(() => {
          toast.error("Reminder shown, but its delivery status could not be saved.");
        });
      }
    };
    const id = window.setInterval(check, 1000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    check();
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [isStaff, user?.uid]);

  return null;
}
