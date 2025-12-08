"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChecklistItem = {
  id: string;
  content: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserNote = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  checklist: ChecklistItem[];
};

type UserNotesProps = {
  initialNotes: UserNote[];
};

export function UserNotes({ initialNotes }: UserNotesProps) {
  const [notes, setNotes] = useState<UserNote[]>(initialNotes);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [creatingNote, setCreatingNote] = useState(false);
  const [noteItemInputs, setNoteItemInputs] = useState<Record<string, string>>({});
  const [noteLoading, setNoteLoading] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(initialNotes[0]?.id ?? null);

  useEffect(() => {
    if (!activeNoteId && notes.length > 0) {
      setActiveNoteId(notes[0].id);
    }
  }, [notes, activeNoteId]);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? notes[0] ?? null,
    [activeNoteId, notes]
  );

  const handleCreateNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newNoteTitle.trim()) return;
    setCreatingNote(true);
    try {
      const response = await fetch("/api/user-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newNoteTitle.trim() }),
      });
      if (!response.ok) {
        throw new Error("Failed to create note");
      }
      const note: UserNote = await response.json();
      setNotes((prev) => [note, ...prev]);
      setActiveNoteId(note.id);
      setNewNoteTitle("");
    } catch (error) {
      console.error(error);
    } finally {
      setCreatingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    setNoteLoading(noteId);
    try {
      const response = await fetch(`/api/user-notes/${noteId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete note");
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      if (activeNoteId === noteId) {
        setActiveNoteId((prev) => {
          const remaining = notes.filter((note) => note.id !== noteId);
          return remaining[0]?.id ?? null;
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setNoteLoading(null);
    }
  };

  const handleAddChecklistItem = async (noteId: string) => {
    const content = noteItemInputs[noteId]?.trim();
    if (!content) return;
    setNoteLoading(noteId);
    try {
      const response = await fetch(`/api/user-notes/${noteId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("Failed to create item");
      const item: ChecklistItem = await response.json();
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId ? { ...note, checklist: [...note.checklist, item] } : note
        )
      );
      setNoteItemInputs((prev) => ({ ...prev, [noteId]: "" }));
    } catch (error) {
      console.error(error);
    } finally {
      setNoteLoading(null);
    }
  };

  const handleToggleChecklistItem = async (noteId: string, item: ChecklistItem, completed: boolean) => {
    setNoteLoading(item.id);
    try {
      const response = await fetch(`/api/user-notes/checklist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!response.ok) throw new Error("Failed to update item");
      const updated = await response.json();
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? {
                ...note,
                checklist: note.checklist.map((entry) =>
                  entry.id === item.id ? { ...entry, completed: updated.completed } : entry
                ),
              }
            : note
        )
      );
    } catch (error) {
      console.error(error);
    } finally {
      setNoteLoading(null);
    }
  };

  const handleDeleteChecklistItem = async (noteId: string, itemId: string) => {
    setNoteLoading(itemId);
    try {
      const response = await fetch(`/api/user-notes/checklist/${itemId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete item");
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? {
                ...note,
                checklist: note.checklist.filter((item) => item.id !== itemId),
              }
            : note
        )
      );
    } catch (error) {
      console.error(error);
    } finally {
      setNoteLoading(null);
    }
  };

  if (notes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">Welcome to your notes</p>
        <p className="mt-2 text-sm text-slate-500">
          Create checklists, reminders, or mini logs. Only you can see what you write here.
        </p>
        <form onSubmit={handleCreateNote} className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Input
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
            placeholder="New note title"
            className="sm:w-64"
            required
          />
          <Button type="submit" disabled={creatingNote}>
            {creatingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create note"}
          </Button>
        </form>
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
            <form onSubmit={handleCreateNote} className="flex items-center gap-2">
              <Input
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="New note"
                className="hidden h-9 w-32 text-sm md:block"
              />
              <Button type="submit" size="icon" className="h-9 w-9" disabled={creatingNote}>
                {creatingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </form>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-3 py-4">
            {notes.map((note) => {
              const isActive = note.id === activeNote?.id;
              const completed = note.checklist.filter((item) => item.completed).length;
              return (
                <button
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={cn(
                    "w-full rounded-2xl px-4 py-3 text-left transition-all",
                    isActive
                      ? "bg-white shadow-sm shadow-slate-200"
                      : "hover:bg-white/70"
                  )}
                >
                  <p className="text-sm font-semibold text-slate-900 truncate">{note.title}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {completed}/{note.checklist.length || 1} checklist items
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="p-6 md:p-8">
          {!activeNote ? (
            <div className="h-full rounded-3xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500">
              Select a note to start writing.
            </div>
          ) : (
            <div className="flex h-full flex-col gap-6">
              <div className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-slate-900 text-white p-6 shadow-inner">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Private checklist</p>
                    <h3 className="text-2xl font-bold">{activeNote.title}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    className="text-white hover:text-red-200"
                    onClick={() => handleDeleteNote(activeNote.id)}
                    disabled={noteLoading === activeNote.id}
                  >
                    {noteLoading === activeNote.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-100">
                  <CalendarIcon className="h-4 w-4" />
                  Last updated{" "}
                  {new Date(activeNote.updatedAt).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>

              <div className="flex-1 space-y-4">
                {activeNote.checklist.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
                    Add your first checklist item for this note.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeNote.checklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <label className="flex flex-1 cursor-pointer items-start gap-3">
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={(checked) =>
                              handleToggleChecklistItem(activeNote.id, item, Boolean(checked))
                            }
                            disabled={noteLoading === item.id}
                            className="mt-0.5"
                          />
                          <span
                            className={cn(
                              "text-sm leading-relaxed text-slate-800",
                              item.completed && "text-slate-400 line-through"
                            )}
                          >
                            {item.content}
                          </span>
                        </label>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-slate-400 hover:text-red-500"
                          onClick={() => handleDeleteChecklistItem(activeNote.id, item.id)}
                          disabled={noteLoading === item.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
                  <Input
                    value={noteItemInputs[activeNote.id] || ""}
                    onChange={(e) =>
                      setNoteItemInputs((prev) => ({ ...prev, [activeNote.id]: e.target.value }))
                    }
                    placeholder="Add checklist item"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    className="md:w-36"
                    onClick={() => handleAddChecklistItem(activeNote.id)}
                    disabled={noteLoading === activeNote.id}
                  >
                    {noteLoading === activeNote.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Item"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

