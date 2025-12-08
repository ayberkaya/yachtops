"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { CheckSquare, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TextLine = {
  id: string;
  type: "text";
  text: string;
};

type CheckLine = {
  id: string;
  type: "checkItem";
  text: string;
  completed: boolean;
};

type NoteLine = TextLine | CheckLine;

type UserNote = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  content: NoteLine[];
};

type UserNotesProps = {
  initialNotes: UserNote[];
};

const makeId = () => crypto.randomUUID();

const makeTextLine = (text = ""): TextLine => ({
  id: makeId(),
  type: "text",
  text,
});

const makeCheckLine = (text = "", completed = false): CheckLine => ({
  id: makeId(),
  type: "checkItem",
  text,
  completed,
});

const normalizeContent = (content?: unknown): NoteLine[] => {
  if (!Array.isArray(content)) {
    return [makeTextLine()];
  }

  const lines: NoteLine[] = [];

  content.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const record = entry as Record<string, unknown>;

    switch (record.type) {
      case "text":
        lines.push({
          id: typeof record.id === "string" ? record.id : makeId(),
          type: "text",
          text: typeof record.text === "string" ? record.text : "",
        });
        break;
      case "checkItem":
        lines.push({
          id: typeof record.id === "string" ? record.id : makeId(),
          type: "checkItem",
          text: typeof record.text === "string" ? record.text : "",
          completed: Boolean(record.completed),
        });
        break;
      case "checklist":
        if (Array.isArray(record.items)) {
          (record.items as unknown[]).forEach((item) => {
            if (!item || typeof item !== "object") return;
            const checklistItem = item as Record<string, unknown>;
            lines.push({
              id: typeof checklistItem.id === "string" ? checklistItem.id : makeId(),
              type: "checkItem",
              text: typeof checklistItem.text === "string" ? checklistItem.text : "",
              completed: Boolean(checklistItem.completed),
            });
          });
        }
        break;
      default:
        break;
    }
  });

  if (!lines.length) {
    return [makeTextLine()];
  }

  if (lines[0].type !== "text") {
    return [makeTextLine(), ...lines];
  }

  return lines;
};

export function UserNotes({ initialNotes }: UserNotesProps) {
  const [notes, setNotes] = useState<UserNote[]>(
    initialNotes.map((note) => ({
      ...note,
      content: normalizeContent(note.content),
    }))
  );
  const [creatingNote, setCreatingNote] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes[0]?.id ?? null);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [focusedLineId, setFocusedLineId] = useState<string | null>(null);
  const [pendingFocusLineId, setPendingFocusLineId] = useState<string | null>(null);

  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const titleTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const lineRefs = useRef<
    Record<string, HTMLInputElement | HTMLTextAreaElement | null>
  >({});
  const notesRef = useRef(notes);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    if (!activeNoteId && notes.length) {
      setActiveNoteId(notes[0].id);
    }
  }, [notes, activeNoteId]);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? notes[0] ?? null,
    [activeNoteId, notes]
  );

  useEffect(() => {
    if (!activeNote) return;
    const firstLineId = activeNote.content[0]?.id ?? null;
    setFocusedLineId(firstLineId);
    setPendingFocusLineId(firstLineId);
  }, [activeNote?.id]);

  useEffect(() => {
    if (!pendingFocusLineId) return;
    const element = lineRefs.current[pendingFocusLineId];
    if (element) {
      element.focus();
      if ("value" in element) {
        const value = element.value;
        element.setSelectionRange(value.length, value.length);
      }
    }
    setPendingFocusLineId(null);
  }, [pendingFocusLineId]);

  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
      Object.values(titleTimers.current).forEach(clearTimeout);
    };
  }, []);

  const scheduleContentSave = useCallback((noteId: string) => {
    if (saveTimers.current[noteId]) {
      clearTimeout(saveTimers.current[noteId]);
    }

    saveTimers.current[noteId] = setTimeout(async () => {
      const note = notesRef.current.find((n) => n.id === noteId);
      if (!note) return;
      setSavingNoteId(noteId);
      try {
        await fetch(`/api/user-notes/${noteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: note.content }),
        });
      } catch (error) {
        console.error("Error saving note content:", error);
      } finally {
        setSavingNoteId((current) => (current === noteId ? null : current));
      }
    }, 500);
  }, []);

  const scheduleTitleSave = useCallback((noteId: string, title: string) => {
    if (titleTimers.current[noteId]) {
      clearTimeout(titleTimers.current[noteId]);
    }

    titleTimers.current[noteId] = setTimeout(async () => {
      try {
        await fetch(`/api/user-notes/${noteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
      } catch (error) {
        console.error("Error saving note title:", error);
      }
    }, 400);
  }, []);

  const mutateNote = useCallback(
    (
      noteId: string,
      mutator: (note: UserNote) => UserNote,
      options?: { skipSave?: boolean }
    ) => {
      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? mutator(note) : note))
      );
      if (!options?.skipSave) {
        scheduleContentSave(noteId);
      }
    },
    [scheduleContentSave]
  );

  const handleCreateNote = async () => {
    setCreatingNote(true);
    try {
      const response = await fetch("/api/user-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled note" }),
      });
      if (!response.ok) {
        throw new Error("Failed to create note");
      }
      const note = await response.json();
      const normalized: UserNote = {
        ...note,
        content: normalizeContent(note.content),
      };
      setNotes((prev) => [normalized, ...prev]);
      setActiveNoteId(normalized.id);
      setFocusedLineId(normalized.content[0]?.id ?? null);
    } catch (error) {
      console.error("Error creating note:", error);
    } finally {
      setCreatingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const snapshot = notesRef.current;
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
    if (activeNoteId === noteId) {
      const next = snapshot.find((note) => note.id !== noteId);
      setActiveNoteId(next?.id ?? null);
    }

    try {
      const response = await fetch(`/api/user-notes/${noteId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete note");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      setNotes(snapshot);
    }
  };

  const handleTitleChange = (noteId: string, title: string) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === noteId ? { ...note, title } : note))
    );
    scheduleTitleSave(noteId, title);
  };

  const updateLine = (lineId: string, updater: (line: NoteLine) => NoteLine) => {
    if (!activeNote) return;
    mutateNote(activeNote.id, (note) => ({
      ...note,
      content: note.content.map((line) => (line.id === lineId ? updater(line) : line)),
    }));
  };

  const insertLineAfter = (lineId: string, newLine: NoteLine) => {
    if (!activeNote) return;
    mutateNote(activeNote.id, (note) => {
      const idx = note.content.findIndex((line) => line.id === lineId);
      if (idx === -1) {
        return { ...note, content: [...note.content, newLine] };
      }
      const next = [...note.content];
      next.splice(idx + 1, 0, newLine);
      return { ...note, content: next };
    });
    setPendingFocusLineId(newLine.id);
  };

  const removeLine = (lineId: string) => {
    if (!activeNote) return;
    mutateNote(activeNote.id, (note) => ({
      ...note,
      content: note.content.filter((line) => line.id !== lineId),
    }));
  };

  const handleToggleLine = (lineId: string, completed: boolean) => {
    updateLine(lineId, (line) =>
      line.type === "checkItem" ? { ...line, completed } : line
    );
  };

  const handleCheckLineKeyDown = (
    line: CheckLine,
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const newLine = makeCheckLine();
      insertLineAfter(line.id, newLine);
      return;
    }

    if (event.key === "Backspace" && !line.text) {
      event.preventDefault();
      removeLine(line.id);
      setPendingFocusLineId(focusedLineId === line.id ? activeNote?.content[0]?.id ?? null : focusedLineId);
    }
  };

  const handleAddChecklistInline = () => {
    if (!activeNote) return;
    const focusedCheckLine = activeNote.content.find(
      (line) => line.type === "checkItem" && line.id === focusedLineId
    ) as CheckLine | undefined;

    const anchorId = focusedCheckLine?.id ?? activeNote.content[0]?.id ?? null;
    if (!anchorId) return;

    const newLine = makeCheckLine();
    insertLineAfter(anchorId, newLine);
  };

  if (notes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">Welcome to your notes</p>
        <p className="mt-2 text-sm text-slate-500">
          Capture quick voyage prep, crew reminders, or provisioning details. Only you
          can see them.
        </p>
        <Button className="mt-6" onClick={handleCreateNote} disabled={creatingNote}>
          {creatingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create your first note"}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-100 overflow-hidden">
      <div className="grid min-h-[520px] md:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">Personal</p>
              <h2 className="text-lg font-bold text-slate-900">Notes</h2>
            </div>
            <Button
              type="button"
              size="icon"
              className="h-9 w-9"
              onClick={handleCreateNote}
              disabled={creatingNote}
            >
              {creatingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-3 py-4">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={cn(
                  "w-full rounded-2xl px-4 py-3 text-left transition-all border",
                  note.id === activeNote?.id
                    ? "bg-white shadow-xl shadow-blue-200 border-blue-200 ring-2 ring-blue-400/50"
                    : "border-transparent hover:bg-white/70"
                )}
              >
                <p className="text-sm font-semibold text-slate-900 truncate">{note.title}</p>
                <p className="text-xs text-slate-500">
                  {new Date(note.updatedAt).toLocaleDateString("en-GB")}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex flex-col gap-4 bg-white p-6 md:p-8">
          {!activeNote ? (
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-slate-500">
              Select a note to start writing.
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-slate-900 text-white p-6 shadow-inner space-y-4">
              <div className="flex items-start justify-between gap-4">
                <Input
                  value={activeNote.title}
                  onChange={(e) => handleTitleChange(activeNote.id, e.target.value)}
                  placeholder="Add a title"
                  className="rounded-2xl border border-white/20 bg-white/5 text-2xl font-semibold text-white placeholder:text-white/60 focus:border-white focus:bg-white/10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="text-white hover:text-red-200"
                  onClick={() => handleDeleteNote(activeNote.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {(() => {
                const textLine = activeNote.content.find(
                  (line): line is TextLine => line.type === "text"
                );
                const checkLines = activeNote.content.filter(
                  (line): line is CheckLine => line.type === "checkItem"
                );

                return (
                  <>
                    <textarea
                      ref={(el) => {
                        if (textLine) {
                          lineRefs.current[textLine.id] = el;
                        }
                      }}
                      value={textLine?.text ?? ""}
                      onChange={(event) =>
                        textLine && updateLine(textLine.id, (line) =>
                          line.type === "text" ? { ...line, text: event.target.value } : line
                        )
                      }
                      onFocus={() => textLine && setFocusedLineId(textLine.id)}
                      placeholder="Start writing..."
                      className="min-h-[220px] w-full rounded-2xl border border-white/15 bg-white/5 p-4 text-base text-white placeholder:text-white/40 outline-none focus:border-white focus:bg-white/10"
                    />

                    <div className="space-y-2">
                      {checkLines.map((line) => (
                        <div
                          key={line.id}
                          className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2 hover:bg-white/5"
                        >
                          <Checkbox
                            checked={line.completed}
                            onCheckedChange={(checked) => handleToggleLine(line.id, Boolean(checked))}
                            className="h-5 w-5 rounded-lg border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-slate-900"
                          />
                          <Input
                            ref={(el) => {
                              lineRefs.current[line.id] = el;
                            }}
                            value={line.text}
                            onChange={(event) =>
                              updateLine(line.id, (current) =>
                                current.type === "checkItem"
                                  ? { ...current, text: event.target.value }
                                  : current
                              )
                            }
                            onKeyDown={(event) => handleCheckLineKeyDown(line, event)}
                            onFocus={() => setFocusedLineId(line.id)}
                            placeholder=""
                            className={cn(
                              "flex-1 border-none bg-transparent text-base text-white placeholder:text-white/50 focus-visible:ring-0",
                              line.completed && "line-through text-white/50"
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}

              {savingNoteId === activeNote.id && (
                <div className="flex items-center gap-2 text-xs text-blue-100">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving…
                </div>
              )}

              <div className="flex flex-wrap gap-2 justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  onClick={handleAddChecklistInline}
                >
                  <CheckSquare className="h-4 w-4" /> Add Checklist
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

