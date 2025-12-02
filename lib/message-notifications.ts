import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";
import { createNotification } from "./notifications";

/**
 * Parse @mentions from message content
 * Returns array of mentioned usernames/emails
 */
export function parseMentions(content: string | null): string[] {
  if (!content) return [];
  
  // Match @username or @email patterns (more flexible)
  const mentionRegex = /@([\w.@-]+)/g;
  const matches = Array.from(content.matchAll(mentionRegex));
  if (!matches || matches.length === 0) return [];
  
  // Extract usernames/emails (remove @)
  const mentions = matches.map(match => match[1].trim());
  
  // Remove duplicates
  return [...new Set(mentions)];
}

/**
 * Find users by username or email
 */
export async function findUsersByMention(
  mentions: string[],
  yachtId: string | null
): Promise<Array<{ id: string; name: string | null; email: string }>> {
  if (mentions.length === 0) return [];
  
  const users = await db.user.findMany({
    where: {
      yachtId: yachtId || undefined,
      OR: [
        { email: { in: mentions } },
        { name: { in: mentions } },
        // Also check if email starts with mention (for partial matches)
        ...mentions.map(mention => ({
          email: { startsWith: mention },
        })),
        ...mentions.map(mention => ({
          name: { contains: mention },
        })),
      ],
    },
    select: { id: true, name: true, email: true },
  });
  
  return users;
}

/**
 * Notify mentioned users
 */
export async function notifyMentions(
  messageId: string,
  channelId: string,
  content: string | null,
  senderName: string,
  yachtId: string | null
) {
  try {
    const mentions = parseMentions(content);
    if (mentions.length === 0) return;
    
    const mentionedUsers = await findUsersByMention(mentions, yachtId);
    if (mentionedUsers.length === 0) return;
    
    // Get channel name
    const channel = await db.messageChannel.findUnique({
      where: { id: channelId },
      select: { name: true },
    });
    
    const channelName = channel?.name || "Unknown channel";
    
    // Create notifications for mentioned users
    await Promise.all(
      mentionedUsers.map(user =>
        createNotification(
          user.id,
          NotificationType.MESSAGE_MENTION,
          `${senderName} mentioned you in #${channelName}`,
          undefined,
          messageId
        )
      )
    );
  } catch (error) {
    console.error("Error notifying mentions:", error);
  }
}

/**
 * Notify channel members of new message (if preferences allow)
 * This is a simplified version - in production, you might want to only notify
 * when user is mentioned or when they have specific channel notification settings
 */
export async function notifyNewMessage(
  messageId: string,
  channelId: string,
  senderId: string,
  senderName: string,
  content: string | null,
  yachtId: string | null
) {
  try {
    // For now, we'll only notify mentions via notifyMentions
    // Regular message notifications can be added later if needed
    // This function is kept for future use
  } catch (error) {
    console.error("Error notifying new message:", error);
  }
}

