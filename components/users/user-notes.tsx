"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarIcon,
  CheckSquare,
  Loader2,
  Plus,
  TextCursorInput,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TextBlock = {
  id: string;
  type: "text";
  text: string;
};

type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
};

type ChecklistBlock = {
  id: string;
  type: "checklist";
  items: ChecklistItem[];
};

type NoteBlock = TextBlock | ChecklistBlock;

type UserNote = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  content: NoteBlock[];
};

type UserNotesProps = {
  initialNotes: UserNote[];
};

const makeId = () => crypto.randomUUID();

const ensureBlocks = (content?: NoteBlock[]): NoteBlock[] => {
  if (!content || content.length === 0) {
    return [
      {
        id: makeId(),
        type: "text",
        text: "",
      },
    ];
  }
  return content.map((block) => {
    if (block.type === "text") {
      return { ...block, text: block.text ?? "" };
    }
    return {
      ...block,
      items:
        block.items && block.items.length > 0
          ? block.items.map((item) => ({
              ...item,
              text: item.text ?? "",
              completed: Boolean(item.completed),
            }))
          : [{ id: makeId(), text: "", completed: false }],
    };
  });
};

export function UserNotes({ initialNotes }: UserNotesProps) {
  const [notes, setNotes] = useState<UserNote[]>(
    initialNotes.map((note) => ({ ...note, content: ensureBlocks(note.content) }))
  );
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [creatingNote, setCreatingNote] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(initialNotes[0]?.id ?? null);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (!activeNoteId && notes.length > 0) {
      setActiveNoteId(notes[0].id);
    }
  }, [notes, activeNoteId]);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? notes[0] ?? null,
    [activeNoteId, notes]
  );

  const scheduleSave = useCallback(
    (noteId: string) => {
      if (saveTimers.current[noteId]) {
        clearTimeout(saveTimers.current[noteId]);
      }
      saveTimers.current[noteId] = setTimeout(async () => {
        const note = notes.find((n) => n.id === noteId);
        if (!note) return;
        setSavingNoteId(noteId);
        try {
          await fetch(`/api/user-notes/${noteId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: note.content }),
          });
        } catch (error) {
          console.error(error);
        } finally {
          setSavingNoteId(null);
        }
      }, 500);
    },
    [notes]
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
      setNotes((prev) => [{ ...note, content: ensureBlocks(note.content) }, ...prev]);
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
    try {
      const response = await fetch(`/api/user-notes/${noteId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete note");
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      if (activeNoteId === noteId) {
        const remaining = notes.filter((note) => note.id !== noteId);
        setActiveNoteId(remaining[0]?.id ?? null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const updateActiveNote = (updater: (note: UserNote) => UserNote) => {
    if (!activeNote) return;
    setNotes((prev) =>
      prev.map((note) => (note.id === activeNote.id ? updater(note) : note))
    );
    scheduleSave(activeNote.id);
  };

  const addBlock = (type: "text" | "checklist") => {
    updateActiveNote((note) => ({
      ...note,
      content: [
        ...note.content,
        type === "text"
          ? { id: makeId(), type: "text", text: "" }
          : {
              id: makeId(),
              type: "checklist",
              items: [{ id: makeId(), text: "", completed: false }],
            },
      ],
    }));
  };

  const updateTextBlock = (blockId: string, text: string) => {
    updateActiveNote((note) => ({
      ...note,
      content: note.content.map((block) =>
        block.id === blockId && block.type === "text" ? { ...block, text } : block
      ),
    }));
  };

  const addChecklistItem = (blockId: string, afterId?: string) => {
    updateActiveNote((note) => ({
      ...note,
      content: note.content.map((block) => {
        if (block.id !== blockId || block.type !== "checklist") return block;
        const newItem = { id: makeId(), text: "", completed: false };
        if (!afterId) return { ...block, items: [...block.items, newItem] };
        const idx = block.items.findIndex((item) => item.id === afterId);
        if (idx === -1) return { ...block, items: [...block.items, newItem] };
        const items = [...block.items];
        items.splice(idx + 1, 0, newItem);
        return { ...block, items };
      }),
    }));
  };

  const updateChecklistItem = (blockId: string, itemId: string, text: string) => {
    updateActiveNote((note) => ({
      ...note,
      content: note.content.map((block) => {
        if (block.id !== blockId || block.type !== "checklist") return block;
        return {
          ...block,
          items: block.items.map((item) =>
            item.id === itemId ? { ...item, text } : item
          ),
        };
      }),
    }));
  };

  const toggleChecklistItem = (blockId: string, itemId: string, completed: boolean) => {
    updateActiveNote((note) => ({
      ...note,
      content: note.content.map((block) => {
        if (block.id !== blockId || block.type !== "checklist") return block;
        return {
          ...block,
          items: block.items.map((item) =>
            item.id === itemId ? { ...item, completed } : item
          ),
        };
      }),
    }));
  };

  const removeChecklistItem = (blockId: string, itemId: string) => {
    updateActiveNote((note) => ({
      ...note,
      content: note.content.map((block) => {
        if (block.id !== blockId || block.type !== "checklist") return block;
        const nextItems = block.items.filter((item) => item.id !== itemId);
        return {
          ...block,
          items: nextItems.length ? nextItems : [{ id: makeId(), text: "", completed: false }],
        };
      }),
    }));
  };

  const removeBlock = (blockId: string) => {
    updateActiveNote((note) => {
      const filtered = note.content.filter((block) => block.id !== blockId);
      return { ...note, content: filtered.length ? filtered : ensureBlocks([]) };
    });
  };

  const handleChecklistKeyDown = (
    blockId: string,
    item: ChecklistItem,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addChecklistItem(blockId, item.id);
    }
    if (event.key === "Backspace" && !item.text) {
      event.preventDefault();
      removeChecklistItem(blockId, item.id);
    }
  };

  if (notes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">Welcome to your notes</p>
        <p className="mt-2 text-sm text-slate-500">
          Capture quick voyage prep, crew reminders, or provisioning details. Only you
          can see them.
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
                required
              />
              <Button type="submit" size="icon" className="h-9 w-9" disabled={creatingNote}>
                {creatingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </form>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-3 py-4">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={cn(
                  "w-full rounded-2xl px-4 py-3 text-left transition-all",
                  note.id === activeNote?.id ? "bg-white shadow-sm shadow-slate-200" : "hover:bg-white/70"
                )}
              >
                <p className="text-sm font-semibold text-slate-900 truncate">{note.title}</p>
                <p className="text-xs text-slate-500">
                  {new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {note.content.filter((block) => block.type === "checklist").length} checklist blocks
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
            <>
              <div className="rounded-3xl border border-slate-200 bg-slate-900 text-white p-6 shadow-inner">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Private note</p>
                    <h3 className="text-2xl font-bold">{activeNote.title}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    className="text-white hover:text-red-200"
                    onClick={() => handleDeleteNote(activeNote.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-blue-100">
                  <CalendarIcon className="h-4 w-4" />
                  Last updated{" "}
                  {new Date(activeNote.updatedAt).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  {savingNoteId === activeNote.id && (
                    <span className="flex items-center gap-1 text-blue-200">
                      <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2"
                    onClick={() => addBlock("text")}
                  >
                    <TextCursorInput className="h-4 w-4" /> Add Text
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2"
                    onClick={() => addBlock("checklist")}
                  >
                    <CheckSquare className="h-4 w-4" /> Add Checklist
                  </Button>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                {activeNote.content.map((block) =>
                  block.type === "text" ? (
                    <TextEditorBlock
                      key={block.id}
                      block={block}
                      onChange={(text) => updateTextBlock(block.id, text)}
                      onRemove={() => removeBlock(block.id)}
                    />
                  ) : (
                    <ChecklistEditorBlock
                      key={block.id}
                      block={block}
                      onToggle={(itemId, completed) => toggleChecklistItem(block.id, itemId, completed)}
                      onChange={(itemId, text) => updateChecklistItem(block.id, itemId, text)}
                      onAddItem={(afterId) => addChecklistItem(block.id, afterId)}
                      onRemoveItem={(itemId) => removeChecklistItem(block.id, itemId)}
                      onRemoveBlock={() => removeBlock(block.id)}
                      onKeyDown={(itemId, event) => {
                        const targetItem = block.items.find((item) => item.id === itemId);
                        if (!targetItem) return;
                        handleChecklistKeyDown(block.id, targetItem, event);
                      }}
                    />
                  )
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

type TextBlockProps = {
  block: TextBlock;
  onChange: (text: string) => void;
  onRemove: () => void;
};

function TextEditorBlock({ block, onChange, onRemove }: TextBlockProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Text</p>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-red-500"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <textarea
        value={block.text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write something..."
        className="mt-3 w-full resize-none rounded-xl border border-transparent bg-white/80 p-3 text-sm text-slate-800 outline-none focus:border-slate-300 focus:bg-white"
        rows={4}
      />
    </div>
  );
}

type ChecklistBlockProps = {
  block: ChecklistBlock;
  onToggle: (itemId: string, completed: boolean) => void;
  onChange: (itemId: string, text: string) => void;
  onAddItem: (afterId?: string) => void;
  onRemoveItem: (itemId: string) => void;
  onRemoveBlock: () => void;
  onKeyDown: (itemId: string, event: React.KeyboardEvent<HTMLInputElement>) => void;
};

function ChecklistEditorBlock({
  block,
  onToggle,
  onChange,
  onAddItem,
  onRemoveItem,
  onRemoveBlock,
  onKeyDown,
}: ChecklistBlockProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Checklist</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-xs text-slate-500" onClick={() => onAddItem()}>
            Add item
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-red-500"
            onClick={onRemoveBlock}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {block.items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center rounded-xl border px-3 py-2",
              item.completed
                ? "border-slate-200 bg-slate-50 text-slate-400"
                : "border-transparent bg-slate-50/80 text-slate-800"
            )}
          >
            <Checkbox
              checked={item.completed}
              onCheckedChange={(checked) => onToggle(item.id, Boolean(checked))}
              className="mr-3 h-5 w-5 rounded-lg"
            />
            <input
              value={item.text}
              onChange={(e) => onChange(item.id, e.target.value)}
              onKeyDown={(event) => onKeyDown(item.id, event)}
              placeholder="Checklist item"
              className={cn(
                "flex-1 bg-transparent text-sm outline-none",
                item.completed && "line-through"
              )}
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-red-500"
              onClick={() => onRemoveItem(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}


