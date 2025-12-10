import { randomUUID } from "crypto";
import { z } from "zod";

export const noteLineSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("checkItem"),
    text: z.string(),
    completed: z.boolean(),
  }),
]);

export type NoteLine = z.infer<typeof noteLineSchema>;

const makeTextLine = (text = ""): NoteLine => ({
  id: randomUUID(),
  type: "text",
  text,
});

const makeCheckLine = (text = "", completed = false): NoteLine => ({
  id: randomUUID(),
  type: "checkItem",
  text,
  completed,
});

export const createDefaultNoteContent = (): NoteLine[] => [makeTextLine()];

export const normalizeContent = (raw: unknown): NoteLine[] => {
  if (!Array.isArray(raw)) {
    return createDefaultNoteContent();
  }

  const lines: NoteLine[] = [];
  raw.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const record = entry as Record<string, unknown>;

    if (record.type === "text") {
      lines.push({
        id: typeof record.id === "string" ? record.id : makeTextLine().id,
        type: "text",
        text: typeof record.text === "string" ? record.text : "",
      });
    } else if (record.type === "checkItem") {
      lines.push({
        id: typeof record.id === "string" ? record.id : makeCheckLine().id,
        type: "checkItem",
        text: typeof record.text === "string" ? record.text : "",
        completed: Boolean(record.completed),
      });
    } else if (record.type === "checklist" && Array.isArray(record.items)) {
      record.items.forEach((item) => {
        if (!item || typeof item !== "object") return;
        const listItem = item as Record<string, unknown>;
        lines.push({
          id: typeof listItem.id === "string" ? listItem.id : makeCheckLine().id,
          type: "checkItem",
          text: typeof listItem.text === "string" ? listItem.text : "",
          completed: Boolean(listItem.completed),
        });
      });
    }
  });

  return lines.length ? lines : createDefaultNoteContent();
};

