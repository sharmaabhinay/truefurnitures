import { useEffect, useMemo, useState } from "react";
import {
  FiPlus, FiEdit2, FiTrash2, FiCheck, FiClock, FiBell, FiLoader,
  FiCheckSquare, FiSquare, FiEdit3,
} from "react-icons/fi";
import { toast } from "sonner";
import { COL, fsAdd, fsDelete, fsUpdate, fsWatch } from "@/lib/db/firestore";
import { useAuth } from "@/lib/auth/auth-context";
import { AButton, AInput, AModal, ATextarea, dark } from "@/components/admin/ui";

export type AdminNote = {
  id: string;
  title: string;
  body: string;
  color?: string;
  pinned?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type AdminTodo = {
  id: string;
  title: string;
  done?: boolean;
  reminder_at?: string | null;
  notified?: boolean;
  created_by?: string;
  created_at?: string;
};

const NOTE_COLORS = ["#C8A86B", "#7FB2F0", "#4CAF82", "#E05050", "#B388EB"] as const;

function formatReminder(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

/** Admin "Notes & Todos" panel: sticky-style notes plus todos with timed reminders. */
export function NotesManager() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [todos, setTodos] = useState<AdminTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [noteModal, setNoteModal] = useState<AdminNote | "new" | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteColor, setNoteColor] = useState<string>(NOTE_COLORS[0]);

  const [todoTitle, setTodoTitle] = useState("");
  const [todoReminder, setTodoReminder] = useState("");
  const [todoBusy, setTodoBusy] = useState(false);

  useEffect(() => {
    let ready = 0;
    const done = () => { ready += 1; if (ready === 2) setLoading(false); };
    const offNotes = fsWatch<AdminNote>(COL.adminNotes, (rows) => { setNotes(rows); done(); }, (e) => { setErr(e.message); done(); });
    const offTodos = fsWatch<AdminTodo>(COL.adminTodos, (rows) => { setTodos(rows); done(); }, (e) => { setErr(e.message); done(); });
    return () => { offNotes(); offTodos(); };
  }, []);

  const sortedNotes = useMemo(
    () =>
      [...notes].sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return String(b.updated_at ?? b.created_at ?? "").localeCompare(String(a.updated_at ?? a.created_at ?? ""));
      }),
    [notes],
  );

  const sortedTodos = useMemo(
    () =>
      [...todos].sort((a, b) => {
        if (Boolean(a.done) !== Boolean(b.done)) return a.done ? 1 : -1;
        const ar = a.reminder_at ?? "9999";
        const br = b.reminder_at ?? "9999";
        return ar.localeCompare(br);
      }),
    [todos],
  );

  const openNewNote = () => {
    setNoteTitle("");
    setNoteBody("");
    setNoteColor(NOTE_COLORS[0]);
    setNoteModal("new");
  };

  const openEditNote = (n: AdminNote) => {
    setNoteTitle(n.title);
    setNoteBody(n.body);
    setNoteColor(n.color ?? NOTE_COLORS[0]);
    setNoteModal(n);
  };

  const saveNote = async () => {
    if (!noteTitle.trim() && !noteBody.trim()) {
      toast.error("Write something first");
      return;
    }
    try {
      if (noteModal === "new") {
        await fsAdd(COL.adminNotes, {
          title: noteTitle.trim() || "Untitled note",
          body: noteBody,
          color: noteColor,
          pinned: false,
          created_by: user?.uid ?? null,
        });
        toast.success("Note added");
      } else if (noteModal) {
        await fsUpdate(COL.adminNotes, noteModal.id, {
          title: noteTitle.trim() || "Untitled note",
          body: noteBody,
          color: noteColor,
          updated_at: new Date().toISOString(),
        });
        toast.success("Note updated");
      }
      setNoteModal(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save note");
    }
  };

  const togglePin = async (n: AdminNote) => {
    try {
      await fsUpdate(COL.adminNotes, n.id, { pinned: !n.pinned });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update note");
    }
  };

  const removeNote = async (n: AdminNote) => {
    try {
      await fsDelete(COL.adminNotes, n.id);
      toast.success("Note deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete note");
    }
  };

  const addTodo = async () => {
    const title = todoTitle.trim();
    if (!title) return;
    setTodoBusy(true);
    try {
      const reminderIso = todoReminder ? new Date(todoReminder).toISOString() : null;
      await fsAdd(COL.adminTodos, {
        title,
        done: false,
        reminder_at: reminderIso,
        notified: false,
        created_by: user?.uid ?? null,
      });
      setTodoTitle("");
      setTodoReminder("");
      toast.success(reminderIso ? "Todo added with reminder" : "Todo added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add todo");
    } finally {
      setTodoBusy(false);
    }
  };

  const toggleTodo = async (t: AdminTodo) => {
    try {
      await fsUpdate(COL.adminTodos, t.id, { done: !t.done });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update todo");
    }
  };

  const removeTodo = async (t: AdminTodo) => {
    try {
      await fsDelete(COL.adminTodos, t.id);
      toast.success("Todo deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete todo");
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-[13px]" style={{ color: dark.mute }}>
        <FiLoader className="inline animate-spin mr-2" /> Loading notes…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-lg px-4 py-3 text-[12px]" style={{ background: "rgba(224,80,80,0.1)", color: dark.danger }}>
          {err}
        </div>
      )}

      {/* Todos */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FiCheckSquare style={{ color: dark.accent }} />
          <h3 className="text-[14px] font-semibold" style={{ color: dark.text }}>Todos & reminders</h3>
        </div>
        <div className="rounded-xl p-4 space-y-3" style={{ background: dark.card, border: `1px solid ${dark.border}` }}>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <AInput
              value={todoTitle}
              onChange={(e) => setTodoTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addTodo(); }}
              placeholder="e.g. Call Mr. Sharma about delivery"
            />
            <AInput
              type="datetime-local"
              value={todoReminder}
              onChange={(e) => setTodoReminder(e.target.value)}
              title="Reminder time (optional)"
            />
            <AButton onClick={addTodo} disabled={todoBusy || !todoTitle.trim()}>
              <span className="inline-flex items-center gap-1.5"><FiPlus /> Add</span>
            </AButton>
          </div>
          <p className="text-[11px]" style={{ color: dark.mute }}>
            <FiBell className="inline mr-1" />
            Set a time and you’ll get a sound alert on any admin screen when it’s due.
          </p>

          {sortedTodos.length === 0 ? (
            <div className="py-6 text-center text-[12px]" style={{ color: dark.mute }}>No todos yet.</div>
          ) : (
            <ul className="divide-y" style={{ borderColor: dark.border }}>
              {sortedTodos.map((t) => {
                const due = t.reminder_at ? new Date(t.reminder_at).getTime() <= Date.now() : false;
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <button onClick={() => toggleTodo(t)} aria-label={t.done ? "Mark as not done" : "Mark as done"} style={{ color: t.done ? dark.good : dark.mute }}>
                      {t.done ? <FiCheckSquare className="text-lg" /> : <FiSquare className="text-lg" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[13px] truncate"
                        style={{ color: t.done ? dark.mute : dark.text, textDecoration: t.done ? "line-through" : "none" }}
                      >
                        {t.title}
                      </div>
                      {t.reminder_at && (
                        <div className="text-[11px] inline-flex items-center gap-1" style={{ color: due && !t.done ? dark.danger : dark.mute }}>
                          <FiClock /> {formatReminder(t.reminder_at)}
                          {due && !t.done && <span className="font-semibold">· due</span>}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeTodo(t)} aria-label="Delete todo" className="rounded-md p-1.5 hover:bg-white/10" style={{ color: dark.danger }}>
                      <FiTrash2 />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Notes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FiEdit3 style={{ color: dark.accent }} />
            <h3 className="text-[14px] font-semibold" style={{ color: dark.text }}>Notes</h3>
          </div>
          <AButton variant="ghost" onClick={openNewNote}>
            <span className="inline-flex items-center gap-1.5"><FiPlus /> New note</span>
          </AButton>
        </div>

        {sortedNotes.length === 0 ? (
          <div className="rounded-xl p-10 text-center text-[13px]" style={{ background: dark.card, border: `1px solid ${dark.border}`, color: dark.mute }}>
            No notes yet. Create your first note to keep track of ideas and details.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedNotes.map((n) => (
              <div
                key={n.id}
                className="group rounded-xl p-4 flex flex-col gap-2"
                style={{ background: dark.card, border: `1px solid ${dark.border}`, borderTop: `3px solid ${n.color ?? dark.accent}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[13px] font-semibold truncate" style={{ color: dark.text }}>{n.title}</div>
                  <div className="flex gap-1 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => togglePin(n)}
                      aria-label={n.pinned ? "Unpin note" : "Pin note"}
                      title={n.pinned ? "Unpin" : "Pin to top"}
                      className="rounded-md p-1 hover:bg-white/10 text-[11px] font-bold"
                      style={{ color: n.pinned ? dark.accent : dark.mute }}
                    >
                      PIN
                    </button>
                    <button onClick={() => openEditNote(n)} aria-label="Edit note" className="rounded-md p-1.5 hover:bg-white/10" style={{ color: dark.text }}>
                      <FiEdit2 />
                    </button>
                    <button onClick={() => removeNote(n)} aria-label="Delete note" className="rounded-md p-1.5 hover:bg-white/10" style={{ color: dark.danger }}>
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
                <button type="button" onClick={() => openEditNote(n)} title="Click to edit" className="text-left text-[12px] whitespace-pre-wrap flex-1 rounded-md hover:bg-white/5 -mx-1 px-1" style={{ color: dark.mute }}>{n.body || "Tap to add details…"}</button>
                {n.updated_at && <div className="text-[10px]" style={{ color: dark.mute }}>Edited {new Date(n.updated_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>}
                {n.pinned && <div className="text-[10px] font-semibold" style={{ color: dark.accent }}>Pinned</div>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Note editor */}
      <AModal
        open={noteModal !== null}
        onClose={() => setNoteModal(null)}
        title={noteModal === "new" ? "New note" : "Edit note"}
        footer={
          <>
            <AButton variant="ghost" onClick={() => setNoteModal(null)}>Cancel</AButton>
            <AButton onClick={saveNote}>
              <span className="inline-flex items-center gap-1.5"><FiCheck /> Save note</span>
            </AButton>
          </>
        }
      >
        <div className="space-y-3">
          <AInput value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Note title" />
          <ATextarea rows={6} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Write your note…" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: dark.mute }}>Colour</div>
            <div className="flex gap-2">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`Colour ${c}`}
                  onClick={() => setNoteColor(c)}
                  className="h-7 w-7 rounded-full transition-transform"
                  style={{
                    background: c,
                    transform: noteColor === c ? "scale(1.15)" : "none",
                    outline: noteColor === c ? `2px solid ${c}` : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </AModal>
    </div>
  );
}
