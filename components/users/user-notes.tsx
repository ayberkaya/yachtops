"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a private note</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateNote} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Title</label>
              <Input
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Owner meeting prep"
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creatingNote} className="w-full md:w-auto">
                {creatingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Note"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {notes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          You haven’t added any notes yet.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {notes.map((note) => (
            <Card key={note.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{note.title}</CardTitle>
                  <p className="text-xs text-slate-500">
                    Created {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteNote(note.id)}
                  disabled={noteLoading === note.id}
                >
                  {noteLoading === note.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="space-y-3">
                  {note.checklist.length === 0 ? (
                    <p className="text-sm text-slate-500">No checklist items yet.</p>
                  ) : (
                    note.checklist.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 p-3">
                        <label className="flex w-full cursor-pointer items-start gap-3">
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={(checked) =>
                              handleToggleChecklistItem(note.id, item, Boolean(checked))
                            }
                            disabled={noteLoading === item.id}
                          />
                          <span
                            className={cn(
                              "text-sm text-slate-700",
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
                          onClick={() => handleDeleteChecklistItem(note.id, item.id)}
                          disabled={noteLoading === item.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={noteItemInputs[note.id] || ""}
                    onChange={(e) =>
                      setNoteItemInputs((prev) => ({ ...prev, [note.id]: e.target.value }))
                    }
                    placeholder="Add checklist item"
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddChecklistItem(note.id)}
                    disabled={noteLoading === note.id}
                  >
                    {noteLoading === note.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

